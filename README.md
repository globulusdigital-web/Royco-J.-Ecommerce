# Royco Jewellers — Render-ready ecommerce system

A production-structured, JavaScript-only jewellery storefront for Royco Jewellers, Chandannagar. It recreates the requested admin/customer capabilities of the referenced PHP/MySQL project using a Render-native Node runtime:

- React + Vite storefront, responsive from mobile to desktop
- Three.js animated 3D hero with reduced-motion support
- Node server API with the same customer/admin workflow contract
- Postgres-backed repository for customers, products, promotions, orders, inventory, sessions and audit records
- Persistent uploads on the Render disk volume
- Server-side customer/admin authentication, signed HttpOnly sessions and role checks
- SQL migrations with a complete seeded Royco catalogue

## Included customer features

- Browse Gold, Silver, Platinum and Diamond collections
- Rings, earrings, necklaces, bangles, chains, pendants, bracelets and mangalsutra
- Search, material/category filters and sorting
- Product detail, stock, purity, weight and price information
- Persistent shopping bag
- Customer sign-up, sign-in and sign-out
- Delivery/billing information and offer codes
- Checkout with showroom payment, confirmed cash-on-delivery or verified UPI/bank-transfer preference
- Order history and pending-order cancellation

## Included administrator features

- Requested initial login: `Admin@Royco` / `Admin@123`
- Product create, update, delete, visibility, price and stock control
- Local product image upload (JPG, PNG or WebP, maximum 3.5 MB)
- Promotion/offer create, update and delete
- Order queue and fulfilment-status management
- Revenue, order, customer, stock and best-seller dashboard
- Database record summary and administrator audit trail
- Downloadable sales CSV

## Run locally

On Windows, double-click `OPEN_ROYCO_WEBSITE.cmd`. It starts the storefront and
backend together, waits for the health check, and opens Google Chrome at the
correct URL.

Or run it from a terminal:

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4173`.

The local server is full-stack: accounts, signed sessions, checkout, inventory,
orders, Admin CRUD, image uploads, dashboard data and sales CSV all work and
persist between restarts. Runtime data is stored in `local-server/data/` and
uploads in `local-server/uploads/`.

Do not double-click `index.html`; this is a JavaScript SPA with an API and must
be opened through the local server. `pnpm dev:frontend` remains available for a
frontend-only hot-reload preview. `pnpm dev:netlify` starts Netlify's emulator
when the workspace supports symlinks.

Database migrations are applied automatically by the Render startup path:

```bash
node scripts/apply-migrations.mjs
```

## Deploy to Render

Use the included [render.yaml](./render.yaml) to deploy the source project to Render with a Node web service, a Postgres database and a persistent disk mount.

## Security before launch

The requested administrator credentials work as the initial bootstrap values. Before a public production launch:

1. Set a new `ADMIN_PASSWORD` in Netlify.
2. Set a random `SESSION_SECRET` containing at least 32 characters.
3. Set `PUBLIC_SITE_URL` to the final `https://` domain.
4. Confirm product prices, weights, purity, stock and policies with Royco.
5. Replace the included licensed demonstration catalogue photography with Royco-owned originals.

No password is stored in plain text: the backend creates a salted scrypt hash on first successful bootstrap login. All protected operations are checked again on the server.

## Important source note

The supplied Google Maps HTML contains no Royco logo, storefront or product-photo files. Google Maps imagery cannot safely be scraped or rehosted as a product catalogue. This project therefore packages reliable local demonstration jewellery photography and links visitors to the stable Royco Maps listing for directions. Replace the demo images with Royco-owned originals through Admin → Products before public launch.
