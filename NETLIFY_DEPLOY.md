# Netlify launch checklist

## 1. Upload the source project

Use either of these supported flows:

- Push this folder to a Git repository, then choose **Add new project → Import an existing project** in Netlify.
- Or unzip the supplied source package and run `netlify deploy --build --prod` from this folder.

The included `netlify.toml` runs `pnpm run build`, publishes `dist`, bundles `netlify/functions`, and routes `/api/*` to the API function.

## 2. Add runtime environment variables

In **Project configuration → Environment variables**, add:

| Variable | Required value |
| --- | --- |
| `SESSION_SECRET` | A random secret of at least 32 characters |
| `ADMIN_USER` | `Admin@Royco` (or your replacement administrator ID) |
| `ADMIN_PASSWORD` | Change `Admin@123` before public launch |
| `PUBLIC_SITE_URL` | The final `https://your-domain` URL |
| `STORE_NOTIFICATION_EMAIL` | The address that should receive order notifications when an email provider is connected |

Never expose these values through `VITE_*` variables.

## 3. Database and uploads

- Netlify detects `netlify/database/migrations/` during deployment, provisions Netlify Database, and applies the SQL migrations before publishing.
- Product image uploads use a site-wide Netlify Blobs store and require no connection string.
- Netlify Database requires a current credit-based Netlify plan.

## 4. First launch

1. Open `/admin/login`.
2. Sign in using the administrator environment values.
3. Change or rotate the administrator password environment value after the first verification.
4. Review Products, Promotions and Orders.
5. Upload Royco-owned product images and confirm all catalogue data.
6. Create a customer account and place one complete test order.
7. Verify the sales CSV from Admin → Orders or Admin → Database.

## 5. Payments

The included checkout supports reservation/pay-in-showroom, confirmed cash on delivery and verified UPI/bank-transfer preference. These flows create real orders without storing card data. Add a regulated payment provider such as Razorpay only after Royco supplies a merchant account and production keys.
