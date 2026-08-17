import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { getReportData } from '../report-data.js';

test('report data has the four required sections', () => {
  const db = openDb();
  try {
    const data = getReportData(db);
    assert.ok(data.totals);
    assert.ok(Array.isArray(data.topProducts));
    assert.ok(Array.isArray(data.ordersPerDay));
    assert.ok(Array.isArray(data.allOrders));
  } finally { db.close(); }
});
