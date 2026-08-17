import { openDb } from './db.js';

const customers = ['Aarav Shah', 'Diya Patel', 'Ishaan Rao', 'Meera Kapoor', 'Rohan Gupta', 'Sara Khan', 'Vihaan Singh'];
const products = ['Notebook', 'Desk Lamp', 'Wireless Mouse', 'Water Bottle', 'Headphones', 'Laptop Stand'];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function dateInPastMonth() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Math.floor(Math.random() * 30));
  return date.toISOString().slice(0, 10);
}

const db = openDb();
db.exec('DELETE FROM orders');
const insert = db.prepare('INSERT INTO orders (customer, product, amount, created_at) VALUES (?, ?, ?, ?)');

for (let id = 0; id < 200; id += 1) {
  insert.run(randomItem(customers), randomItem(products), Number((5 + Math.random() * 195).toFixed(2)), dateInPastMonth());
}

console.log(JSON.stringify({ orders: db.prepare('SELECT COUNT(*) AS count FROM orders').get().count }, null, 2));
db.close();
