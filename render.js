import { chromium } from 'playwright';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

function rows(items, columns) {
  return items.map((item) => `<tr>${columns.map(([key, format]) => `<td>${escapeHtml(format ? format(item[key]) : item[key])}</td>`).join('')}</tr>`).join('');
}

export function reportHtml(data) {
  const generatedOn = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date());
  return `<!doctype html>
  <html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; }
    body { color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.4; }
    header { border-bottom: 3px solid #5b5ce2; display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; }
    h1 { color: #1e2761; font-size: 25px; letter-spacing: -.5px; margin: 0; }
    h2 { color: #1e2761; font-size: 14px; margin: 24px 0 8px; }
    .eyebrow { color: #5b5ce2; font-size: 9px; font-weight: bold; letter-spacing: 1.2px; margin: 0 0 4px; text-transform: uppercase; }
    .date { color: #667085; text-align: right; }
    .cards { display: flex; gap: 12px; }
    .card { background: #f4f5ff; border-radius: 8px; flex: 1; padding: 14px; }
    .card-label { color: #667085; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .card-value { color: #1e2761; font-size: 22px; font-weight: bold; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group; }
    th { background: #1e2761; color: white; font-size: 9px; letter-spacing: .3px; padding: 7px 8px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #e4e7ec; padding: 6px 8px; }
    tbody tr:nth-child(even) { background: #f8f9fc; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .number { text-align: right; }
    footer { color: #98a2b3; font-size: 8px; margin-top: 16px; text-align: center; }
  </style></head><body>
    <header><div><p class="eyebrow">Northstar Shop</p><h1>Sales report</h1></div><div class="date">Generated ${escapeHtml(generatedOn)}<br>Last 30 days of sample orders</div></header>
    <section class="cards"><div class="card"><div class="card-label">Total orders</div><div class="card-value">${data.totals.totalOrders}</div></div><div class="card"><div class="card-label">Total revenue</div><div class="card-value">${money.format(data.totals.totalRevenue)}</div></div></section>
    <h2>Top products by revenue</h2><table><thead><tr><th>Product</th><th class="number">Orders</th><th class="number">Revenue</th></tr></thead><tbody>${rows(data.topProducts, [['product'], ['orders'], ['revenue', money.format]])}</tbody></table>
    <h2>Orders per day - last 7 days</h2><table><thead><tr><th>Date</th><th class="number">Orders</th><th class="number">Revenue</th></tr></thead><tbody>${rows(data.ordersPerDay, [['date'], ['orders'], ['revenue', money.format]])}</tbody></table>
    <h2>All orders</h2><table><thead><tr><th>ID</th><th>Customer</th><th>Product</th><th class="number">Amount</th><th>Date</th></tr></thead><tbody>${rows(data.allOrders, [['id'], ['customer'], ['product'], ['amount', money.format], ['created_at']])}</tbody></table>
    <footer>Northstar Shop - generated from SQLite data</footer>
  </body></html>`;
}

export async function renderReport(data, path) {
  const browser = await chromium.launch({
    headless: true,
    // Avoid macOS app-shim registration in restricted CI/sandbox environments.
    args: ['--disable-features=MacAppShim'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(reportHtml(data), { waitUntil: 'load' });
    await page.pdf({ path, format: 'A4', printBackground: true, margin: { top: '16mm', right: '14mm', bottom: '18mm', left: '14mm' } });
  } finally {
    await browser.close();
  }
}
