import { openDb } from './db.js';

export function getReportData(db) {
  const totals = db.prepare(`
    SELECT COUNT(*) AS totalOrders, ROUND(COALESCE(SUM(amount), 0), 2) AS totalRevenue
    FROM orders
  `).get();
  const topProducts = db.prepare(`
    SELECT product, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue
    FROM orders
    GROUP BY product
    ORDER BY revenue DESC
    LIMIT 5
  `).all();
  const ordersPerDay = db.prepare(`
    SELECT created_at AS date, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue
    FROM orders
    WHERE created_at >= date('now', '-6 days')
    GROUP BY created_at
    ORDER BY created_at ASC
  `).all();
  const allOrders = db.prepare(`
    SELECT id, customer, product, ROUND(amount, 2) AS amount, created_at
    FROM orders
    ORDER BY created_at DESC, id DESC
  `).all();

  return { totals, topProducts, ordersPerDay, allOrders };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const db = openDb();
  console.log(JSON.stringify(getReportData(db), null, 2));
  db.close();
}
