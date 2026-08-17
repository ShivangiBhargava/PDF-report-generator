# PDF report generator

A small Express API that queries seeded shop orders from SQLite, renders a multi-page sales report with Playwright, stores it on disk, and serves it by link.

## Requirements

- Node.js 22+
- Chromium for Playwright

## Run it

```bash
npm install
npm run install-browser
npm run seed
npm start
```

In another terminal:

```bash
curl http://localhost:3000/health
curl -i -X POST http://localhost:3000/reports
curl -o my-report.pdf http://localhost:3000/reports/1/file
```

The first `POST /reports` returns `201 Created` and a file link. A second request on the same UTC day returns `200 OK` with the same report id. Use `curl -X POST -H 'Content-Type: application/json' -d '{"force":true}' http://localhost:3000/reports` to explicitly make a fresh report.

## Dataset

The project uses the little-shop option: `seed.js` first deletes old data, then inserts exactly 200 random orders across six products and the preceding 30 days. It is safe to run repeatedly.

## Aggregation SQL

```sql
SELECT COUNT(*) AS totalOrders, ROUND(COALESCE(SUM(amount), 0), 2) AS totalRevenue FROM orders;

SELECT product, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue
FROM orders GROUP BY product ORDER BY revenue DESC LIMIT 5;

SELECT created_at AS date, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue
FROM orders WHERE created_at >= date('now', '-6 days')
GROUP BY created_at ORDER BY created_at ASC;
```

Run `npm run report-data` to inspect the full JSON object that feeds the PDF.

## Pipeline and API

`POST /reports` queries the database, renders the PDF to `reports/<id>.pdf`, stores the path in SQLite, and returns a tiny JSON link. `GET /reports/:id` returns the report record; `GET /reports/:id/file` is the only endpoint that sends PDF bytes. Unknown ids return `404`.

The table uses print CSS (`thead { display: table-header-group }` and `tr { break-inside: avoid }`) so headers repeat and rows stay intact over page breaks.

## Why this is synchronous

Generation stays inside the request while reports are small and infrequent. Once rendering becomes slow, reports grow, or many users request them at once, I would move query-render-store work to a background job and return `202` immediately.

## Idempotency

The same-day check protects against duplicate PDFs caused by double-clicks or request retries. Without such a check, a payment or email operation could charge or contact a customer twice.

## Git hygiene

`report.db` and `reports/` are ignored because they are generated artifacts; the seed script recreates the database deterministically in structure and count.
