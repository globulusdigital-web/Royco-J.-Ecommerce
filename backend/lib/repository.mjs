import { randomUUID } from "node:crypto";
import { ApiError } from "./http.mjs";
import {
  serializeAppointment,
  serializeOrder,
  serializeProduct,
  serializePromotion,
  serializeUser,
  rupees,
} from "./serializers.mjs";

function resultRows(result) {
  return Array.isArray(result) ? result : result?.rows || [];
}

function rowCount(result) {
  return result?.rowCount ?? resultRows(result).length;
}

function placeholders(values, offset = 1) {
  return values.map((_, index) => `$${index + offset}`).join(", ");
}

function makeOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `RJ${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function createDatabaseRepository(db) {
  const pool = db.pool;
  const query = async (sql, values = []) => pool.query(sql, values);

  async function loadOrderItems(orderIds) {
    if (!orderIds.length) return new Map();
    const result = await query(
      `SELECT * FROM order_items WHERE order_id = ANY($1::text[]) ORDER BY id`,
      [orderIds],
    );
    const grouped = new Map(orderIds.map((id) => [String(id), []]));
    for (const item of resultRows(result)) grouped.get(String(item.order_id))?.push(item);
    return grouped;
  }

  async function serializeOrders(orderRows) {
    const itemMap = await loadOrderItems(orderRows.map((order) => String(order.id)));
    return orderRows.map((order) => serializeOrder(order, itemMap.get(String(order.id)) || []));
  }

  async function calculateQuote(database, items, couponCode, { lock = false } = {}) {
    const productIds = items.map((item) => item.productId);
    const productResult = await database.query(
      `SELECT * FROM products WHERE id = ANY($1::int[])${lock ? " FOR UPDATE" : ""}`,
      [productIds],
    );
    const products = new Map(resultRows(productResult).map((product) => [Number(product.id), product]));
    if (products.size !== productIds.length) {
      throw new ApiError(409, "product_unavailable", "One or more products are no longer available");
    }

    let subtotalPaise = 0;
    for (const item of items) {
      const product = products.get(item.productId);
      if (!product.active || Number(product.stock) < item.quantity) {
        throw new ApiError(409, "insufficient_stock", `${product?.name || "A product"} does not have enough stock`);
      }
      subtotalPaise += Number(product.price_paise) * item.quantity;
    }

    let promotion = null;
    let discountPaise = 0;
    if (couponCode) {
      const promotionResult = await database.query(
        `SELECT * FROM promotions
         WHERE code = $1 AND active = TRUE
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (ends_at IS NULL OR ends_at > NOW())
         LIMIT 1`,
        [couponCode],
      );
      promotion = resultRows(promotionResult)[0];
      if (!promotion || subtotalPaise < Number(promotion.min_order_paise)) {
        throw new ApiError(422, "promotion_invalid", "That offer is not active for this order");
      }
      discountPaise = promotion.discount_type === "percent"
        ? Math.round(subtotalPaise * Number(promotion.discount_value) / 100)
        : Number(promotion.discount_value);
      if (promotion.max_discount_paise != null) {
        discountPaise = Math.min(discountPaise, Number(promotion.max_discount_paise));
      }
      discountPaise = Math.min(discountPaise, subtotalPaise);
    }

    const shippingPaise = subtotalPaise - discountPaise >= 5_000_000 ? 0 : 49_900;
    return {
      products,
      promotion,
      subtotalPaise,
      discountPaise,
      shippingPaise,
      totalPaise: subtotalPaise - discountPaise + shippingPaise,
    };
  }

  return {
    async ping() {
      const result = await query("SELECT 1 AS ok");
      return resultRows(result)[0]?.ok === 1;
    },

    async getUserByEmail(emailNormalized) {
      const result = await query(
        "SELECT * FROM users WHERE email_normalized = $1 AND active = TRUE LIMIT 1",
        [emailNormalized],
      );
      return resultRows(result)[0] || null;
    },

    async getUserById(id) {
      const result = await query("SELECT * FROM users WHERE id = $1 AND active = TRUE LIMIT 1", [id]);
      return resultRows(result)[0] || null;
    },

    async getUserByPhone(phoneNormalized) {
      const result = await query(
        "SELECT * FROM users WHERE phone_normalized = $1 AND active = TRUE LIMIT 1",
        [phoneNormalized],
      );
      return resultRows(result)[0] || null;
    },

    async createUser({ id, email, emailNormalized, name, phone, passwordHash }) {
      const result = await query(
        `INSERT INTO users (id, email, email_normalized, name, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, 'customer')
         RETURNING *`,
        [id, email, emailNormalized, name, phone, passwordHash],
      );
      return resultRows(result)[0];
    },

    async createOtpUser({ id, name, phone, phoneNormalized }) {
      const result = await query(
        `INSERT INTO users (id, email, email_normalized, name, phone, phone_normalized, password_hash, role)
         VALUES ($1, NULL, NULL, $2, $3, $4, NULL, 'customer')
         RETURNING *`,
        [id, name, phone, phoneNormalized],
      );
      return resultRows(result)[0];
    },

    async upsertAdmin({ id, email, emailNormalized, name, passwordHash }) {
      const result = await query(
        `INSERT INTO users (id, email, email_normalized, name, password_hash, role, active)
         VALUES ($1, $2, $3, $4, $5, 'admin', TRUE)
         ON CONFLICT (email_normalized) DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = 'admin',
           active = TRUE,
           updated_at = NOW()
         RETURNING *`,
        [id, email, emailNormalized, name, passwordHash],
      );
      return resultRows(result)[0];
    },

    async createSession({ id, userId, tokenHash, expiresAt, ipAddress, userAgent }) {
      await query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, userId, tokenHash, expiresAt, ipAddress, userAgent],
      );
    },

    async getSession(tokenHash) {
      const result = await query(
        `SELECT s.id AS session_id, s.expires_at, u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
           AND u.active = TRUE
         LIMIT 1`,
        [tokenHash],
      );
      const row = resultRows(result)[0];
      if (row) {
        query("UPDATE sessions SET last_seen_at = NOW() WHERE id = $1", [row.session_id]).catch(() => {});
      }
      return row || null;
    },

    async revokeSession(sessionId) {
      await query(
        "UPDATE sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1",
        [sessionId],
      );
    },

    async listProducts(filters = {}) {
      const clauses = [];
      const values = [];
      if (!filters.includeInactive) clauses.push("active = TRUE");
      if (filters.material) {
        values.push(filters.material);
        clauses.push(`material = $${values.length}`);
      }
      if (filters.category) {
        values.push(filters.category);
        clauses.push(`category = $${values.length}`);
      }
      if (filters.featured === true) clauses.push("featured = TRUE");
      if (filters.search) {
        values.push(`%${filters.search}%`);
        clauses.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR description ILIKE $${values.length})`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await query(
        `SELECT * FROM products ${where} ORDER BY featured DESC, created_at DESC, id DESC LIMIT 500`,
        values,
      );
      return resultRows(result).map(serializeProduct);
    },

    async getProduct(identifier, includeInactive = false) {
      const numeric = /^\d+$/.test(String(identifier));
      const active = includeInactive ? "" : "AND active = TRUE";
      const result = await query(
        `SELECT * FROM products WHERE ${numeric ? "id = $1" : "slug = $1"} ${active} LIMIT 1`,
        [numeric ? Number(identifier) : identifier],
      );
      return serializeProduct(resultRows(result)[0]);
    },

    async createProduct(product) {
      const result = await query(
        `INSERT INTO products
          (sku, slug, name, bengali_name, description, material, category, purity, weight_grams,
           price_paise, compare_at_price_paise, stock, image_url, gallery, featured, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16)
         RETURNING *`,
        [product.sku, product.slug, product.name, product.bengaliName, product.description,
          product.material, product.category, product.purity, product.weightG, product.pricePaise,
          product.compareAtPricePaise, product.stock, product.imageUrl, JSON.stringify(product.gallery),
          product.featured, product.active],
      );
      return serializeProduct(resultRows(result)[0]);
    },

    async updateProduct(id, product) {
      const result = await query(
        `UPDATE products SET
           sku = $2, slug = $3, name = $4, bengali_name = $5, description = $6, material = $7,
           category = $8, purity = $9, weight_grams = $10, price_paise = $11,
           compare_at_price_paise = $12, stock = $13, image_url = $14, gallery = $15::jsonb,
           featured = $16, active = $17, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, product.sku, product.slug, product.name, product.bengaliName, product.description,
          product.material, product.category, product.purity, product.weightG, product.pricePaise,
          product.compareAtPricePaise, product.stock, product.imageUrl, JSON.stringify(product.gallery),
          product.featured, product.active],
      );
      return serializeProduct(resultRows(result)[0]);
    },

    async deleteProduct(id) {
      const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
      return rowCount(result) > 0;
    },

    async listPromotions(includeInactive = false) {
      const publicWhere = includeInactive
        ? ""
        : "WHERE active = TRUE AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW())";
      const result = await query(`SELECT * FROM promotions ${publicWhere} ORDER BY created_at DESC`);
      return resultRows(result).map(serializePromotion);
    },

    async createPromotion(promotion) {
      const result = await query(
        `INSERT INTO promotions
          (id, code, title, description, discount_type, discount_value, min_order_paise,
           max_discount_paise, starts_at, ends_at, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [promotion.id, promotion.code, promotion.title, promotion.description, promotion.discountType,
          promotion.discountValue, promotion.minOrderPaise, promotion.maxDiscountPaise,
          promotion.startsAt, promotion.endsAt, promotion.active],
      );
      return serializePromotion(resultRows(result)[0]);
    },

    async updatePromotion(identifier, promotion) {
      const result = await query(
        `UPDATE promotions SET
           code = $2, title = $3, description = $4, discount_type = $5, discount_value = $6,
           min_order_paise = $7, max_discount_paise = $8, starts_at = $9, ends_at = $10,
           active = $11, updated_at = NOW()
         WHERE id = $1 OR code = $1
         RETURNING *`,
        [identifier, promotion.code, promotion.title, promotion.description, promotion.discountType,
          promotion.discountValue, promotion.minOrderPaise, promotion.maxDiscountPaise,
          promotion.startsAt, promotion.endsAt, promotion.active],
      );
      return serializePromotion(resultRows(result)[0]);
    },

    async deletePromotion(identifier) {
      const result = await query("DELETE FROM promotions WHERE id = $1 OR code = $1 RETURNING id", [identifier]);
      return rowCount(result) > 0;
    },

    async quoteCheckout({ items, couponCode }) {
      const quote = await calculateQuote(pool, items, couponCode);
      return {
        subtotalPaise: quote.subtotalPaise,
        discountPaise: quote.discountPaise,
        shippingPaise: quote.shippingPaise,
        totalPaise: quote.totalPaise,
        promoCode: quote.promotion?.code || null,
      };
    },

    async createPaymentIntent({ id, userId, providerOrderId, amountPaise, checkoutPayload }) {
      const result = await query(
        `INSERT INTO payment_intents
          (id, user_id, provider_order_id, amount_paise, checkout_payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [id, userId, providerOrderId, amountPaise, JSON.stringify(checkoutPayload)],
      );
      return resultRows(result)[0];
    },

    async getPaymentIntent(providerOrderId, userId) {
      const result = await query(
        "SELECT * FROM payment_intents WHERE provider_order_id = $1 AND user_id = $2 LIMIT 1",
        [providerOrderId, userId],
      );
      const row = resultRows(result)[0];
      if (!row) return null;
      return { ...row, checkoutPayload: row.checkout_payload };
    },

    async completePaymentIntent(providerOrderId, paymentId, orderId) {
      await query(
        `UPDATE payment_intents SET status = 'paid', provider_payment_id = $2,
           completed_order_id = $3, updated_at = NOW()
         WHERE provider_order_id = $1`,
        [providerOrderId, paymentId, orderId],
      );
    },

    async appointmentAvailability(startIso, endIso) {
      const result = await query(
        `SELECT scheduled_at FROM appointments
         WHERE scheduled_at >= $1 AND scheduled_at < $2 AND status <> 'cancelled'
         ORDER BY scheduled_at`,
        [startIso, endIso],
      );
      return resultRows(result).map((row) => row.scheduled_at);
    },

    async createAppointment({ id, user, service, scheduledAt, language, notes }) {
      const result = await query(
        `INSERT INTO appointments
          (id, user_id, customer_name, customer_phone, service, scheduled_at, language, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, user.id, user.name, user.phone, service, scheduledAt, language, notes],
      );
      return serializeAppointment(resultRows(result)[0]);
    },

    async listAppointmentsForUser(userId) {
      const result = await query(
        "SELECT * FROM appointments WHERE user_id = $1 ORDER BY scheduled_at DESC LIMIT 100",
        [userId],
      );
      return resultRows(result).map(serializeAppointment);
    },

    async listAppointmentsAdmin() {
      const result = await query(
        "SELECT * FROM appointments ORDER BY scheduled_at DESC LIMIT 1000",
      );
      return resultRows(result).map(serializeAppointment);
    },

    async updateAppointmentStatus(id, status) {
      const result = await query(
        "UPDATE appointments SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        [id, status],
      );
      return serializeAppointment(resultRows(result)[0]);
    },

    async checkout({
      user,
      items,
      couponCode,
      paymentMethod,
      shippingAddress,
      razorpayOrderId = null,
      razorpayPaymentId = null,
      now = new Date(),
    }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const quote = await calculateQuote(client, items, couponCode, { lock: true });
        const {
          products, promotion, subtotalPaise, discountPaise, shippingPaise, totalPaise,
        } = quote;
        const orderId = randomUUID();
        const orderNumber = makeOrderNumber(now);
        const orderResult = await client.query(
          `INSERT INTO orders
            (id, order_number, user_id, subtotal_paise, discount_paise, shipping_paise, total_paise,
             promo_code, customer_name, customer_email, customer_phone, shipping_address,
             payment_method, payment_status, razorpay_order_id, razorpay_payment_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
           RETURNING *`,
          [orderId, orderNumber, user.id, subtotalPaise, discountPaise, shippingPaise, totalPaise,
            promotion?.code || null, shippingAddress.name, user.email || "", shippingAddress.phone,
            JSON.stringify(shippingAddress), paymentMethod, paymentMethod === "razorpay" ? "paid" : "pending",
            razorpayOrderId, razorpayPaymentId, shippingAddress.instructions || ""],
        );

        const itemRows = [];
        for (const item of items) {
          const product = products.get(item.productId);
          const lineTotal = Number(product.price_paise) * item.quantity;
          const itemResult = await client.query(
            `INSERT INTO order_items
              (order_id, product_id, sku, name, material, category, image_url, unit_price_paise, quantity, line_total_paise)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [orderId, product.id, product.sku, product.name, product.material, product.category,
              product.image_url, product.price_paise, item.quantity, lineTotal],
          );
          itemRows.push(resultRows(itemResult)[0]);
          await client.query("UPDATE products SET stock = stock - $2, updated_at = NOW() WHERE id = $1", [product.id, item.quantity]);
        }

        await client.query(
          `INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, metadata)
           VALUES ($1, 'customer', 'order.created', 'order', $2, $3::jsonb)`,
          [user.id, orderId, JSON.stringify({ orderNumber, totalPaise })],
        );
        await client.query("COMMIT");
        return serializeOrder(resultRows(orderResult)[0], itemRows);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async listOrdersForUser(userId) {
      const result = await query(
        `SELECT o.*, COALESCE(SUM(oi.quantity), 0)::int AS item_count
         FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
        [userId],
      );
      return serializeOrders(resultRows(result));
    },

    async cancelOrder(userId, orderId) {
      const result = await query(
        `UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'pending'
         RETURNING *`,
        [orderId, userId],
      );
      const order = resultRows(result)[0];
      if (!order) return null;
      await query(
        `UPDATE products p SET stock = p.stock + source.quantity, updated_at = NOW()
         FROM (SELECT product_id, SUM(quantity)::int AS quantity FROM order_items WHERE order_id = $1 GROUP BY product_id) source
         WHERE p.id = source.product_id`,
        [orderId],
      );
      await this.audit({ actorUserId: userId, actorRole: "customer", action: "order.cancelled", entityType: "order", entityId: orderId });
      return serializeOrder(order, []);
    },

    async listOrdersAdmin() {
      const result = await query(
        `SELECT o.*, COALESCE(SUM(oi.quantity), 0)::int AS item_count
         FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
         GROUP BY o.id ORDER BY o.created_at DESC LIMIT 1000`,
      );
      return serializeOrders(resultRows(result));
    },

    async updateOrderStatus(orderId, status) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const currentResult = await client.query(
          "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
          [orderId],
        );
        const current = resultRows(currentResult)[0];
        if (!current) {
          await client.query("COMMIT");
          return null;
        }
        if (current.status === status) {
          await client.query("COMMIT");
          return serializeOrder(current, []);
        }
        if (current.status === "cancelled") {
          throw new ApiError(409, "cancelled_order_final", "A cancelled order cannot be reopened");
        }

        const result = await client.query(
          `UPDATE orders SET status = $2,
             cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE cancelled_at END,
             updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [orderId, status],
        );
        if (status === "cancelled") {
          await client.query(
            `UPDATE products p SET stock = p.stock + source.quantity, updated_at = NOW()
             FROM (
               SELECT product_id, SUM(quantity)::int AS quantity
               FROM order_items
               WHERE order_id = $1 AND product_id IS NOT NULL
               GROUP BY product_id
             ) source
             WHERE p.id = source.product_id`,
            [orderId],
          );
        }
        await client.query("COMMIT");
        return serializeOrder(resultRows(result)[0], []);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async dashboard() {
      const [metricsResult, recentResult, bestResult, dailyResult] = await Promise.all([
        query(`SELECT
          COALESCE(SUM(total_paise) FILTER (WHERE status <> 'cancelled'), 0) AS revenue_paise,
          COUNT(*)::int AS orders,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
          (SELECT COUNT(*)::int FROM products WHERE active = TRUE) AS active_products,
          (SELECT COUNT(*)::int FROM products WHERE active = TRUE AND stock < 5) AS low_stock,
          (SELECT COUNT(*)::int FROM users WHERE role = 'customer' AND active = TRUE) AS customers,
          (SELECT COUNT(*)::int FROM appointments
            WHERE status IN ('requested', 'confirmed') AND scheduled_at >= NOW()) AS upcoming_appointments
          FROM orders`),
        query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"),
        query(`SELECT p.id, p.name, p.image_url, COALESCE(SUM(oi.quantity), 0)::int AS units,
          COALESCE(SUM(oi.line_total_paise), 0) AS revenue_paise
          FROM products p JOIN order_items oi ON oi.product_id = p.id JOIN orders o ON o.id = oi.order_id
          WHERE o.status <> 'cancelled' GROUP BY p.id ORDER BY units DESC, revenue_paise DESC LIMIT 4`),
        query(`SELECT day::date AS date, TO_CHAR(day, 'Dy') AS label,
          COALESCE(SUM(o.total_paise) FILTER (WHERE o.status <> 'cancelled'), 0) AS total_paise
          FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
          LEFT JOIN orders o ON o.created_at >= day AND o.created_at < day + INTERVAL '1 day'
          GROUP BY day ORDER BY day`),
      ]);
      const metricsRow = resultRows(metricsResult)[0] || {};
      return {
        metrics: {
          revenue: rupees(metricsRow.revenue_paise),
          orders: Number(metricsRow.orders || 0),
          pending_orders: Number(metricsRow.pending_orders || 0),
          active_products: Number(metricsRow.active_products || 0),
          low_stock: Number(metricsRow.low_stock || 0),
          customers: Number(metricsRow.customers || 0),
          upcoming_appointments: Number(metricsRow.upcoming_appointments || 0),
        },
        recentOrders: resultRows(recentResult).map((row) => serializeOrder(row, [])),
        bestSellers: resultRows(bestResult).map((row) => ({
          id: String(row.id), name: row.name, imageUrl: row.image_url,
          units: Number(row.units || 0), revenue: rupees(row.revenue_paise),
        })),
        dailySales: resultRows(dailyResult).map((row) => ({
          date: row.date, label: row.label, total: rupees(row.total_paise),
        })),
      };
    },

    async databaseSummary() {
      const result = await query(`SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM sessions) AS sessions,
        (SELECT COUNT(*)::int FROM products) AS products,
        (SELECT COUNT(*)::int FROM promotions) AS promotions,
        (SELECT COUNT(*)::int FROM orders) AS orders,
        (SELECT COUNT(*)::int FROM order_items) AS order_items,
        (SELECT COUNT(*)::int FROM appointments) AS appointments,
        (SELECT COUNT(*)::int FROM payment_intents) AS payment_intents,
        (SELECT COUNT(*)::int FROM audit_logs) AS audit_logs`);
      const counts = resultRows(result)[0] || {};
      return {
        connected: true,
        counts,
        tables: Object.entries(counts).map(([name, count]) => ({ name, count: Number(count || 0) })),
      };
    },

    async listAudit() {
      const result = await query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
      return resultRows(result);
    },

    async salesRows() {
      const result = await query(`SELECT o.order_number, o.created_at, o.status, o.customer_name,
        o.customer_email, o.customer_phone, o.payment_method, o.promo_code,
        o.subtotal_paise, o.discount_paise, o.shipping_paise, o.total_paise,
        COALESCE(STRING_AGG(oi.name || ' x' || oi.quantity, '; ' ORDER BY oi.id), '') AS items
        FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id ORDER BY o.created_at DESC`);
      return resultRows(result);
    },

    async audit({ actorUserId, actorRole, action, entityType, entityId = null, metadata = {}, ipAddress = null }) {
      await query(
        `INSERT INTO audit_logs
          (actor_user_id, actor_role, action, entity_type, entity_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [actorUserId, actorRole, action, entityType, entityId, JSON.stringify(metadata), ipAddress],
      );
    },

    serializeUser,
  };
}

export async function getProductionRepository() {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  pool.on("error", (error) => {
    console.error("Render Postgres pool error", error);
  });
  return createDatabaseRepository({ pool });
}
