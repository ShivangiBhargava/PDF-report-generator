import express from 'express';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { getReportData } from './report-data.js';
import { renderReport } from './render.js';

const app = express();
const port = process.env.PORT || 3000;
const root = dirname(fileURLToPath(import.meta.url));
const reportsDirectory = resolve(root, 'reports');

app.use(express.json());
app.get('/health', (_request, response) => response.json({ status: 'ok' }));

function present(report) {
  return { id: report.id, created_at: report.created_at, file: `/reports/${report.id}/file` };
}

app.post('/reports', async (request, response, next) => {
  const force = request.body?.force === true;
  const db = openDb();
  let reportId;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const existing = !force && db.prepare("SELECT id, path, created_at FROM reports WHERE date(created_at) = ? AND path != 'pending' ORDER BY id DESC LIMIT 1").get(today);
    if (existing) return response.status(200).json(present(existing));

    await mkdir(reportsDirectory, { recursive: true });
    const createdAt = new Date().toISOString();
    const result = db.prepare('INSERT INTO reports (path, created_at) VALUES (?, ?)').run('pending', createdAt);
    const id = Number(result.lastInsertRowid);
    reportId = id;
    const path = resolve(reportsDirectory, `${id}.pdf`);
    await renderReport(getReportData(db), path);
    db.prepare('UPDATE reports SET path = ? WHERE id = ?').run(path, id);
    return response.status(201).json({ id, file: `/reports/${id}/file` });
  } catch (error) {
    if (reportId) db.prepare('DELETE FROM reports WHERE id = ?').run(reportId);
    return next(error);
  } finally {
    db.close();
  }
});

app.get('/reports/:id', (request, response) => {
  const db = openDb();
  try {
    const report = db.prepare('SELECT id, path, created_at FROM reports WHERE id = ?').get(Number(request.params.id));
    if (!report || report.path === 'pending') return response.status(404).json({ error: 'Report not found' });
    return response.json(present(report));
  } finally { db.close(); }
});

app.get('/reports/:id/file', (request, response) => {
  const db = openDb();
  try {
    const report = db.prepare('SELECT id, path FROM reports WHERE id = ?').get(Number(request.params.id));
    if (!report || report.path === 'pending') return response.status(404).json({ error: 'Report not found' });
    return response.sendFile(report.path, (error) => { if (error && !response.headersSent) response.status(404).json({ error: 'Report file not found' }); });
  } finally { db.close(); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Unable to generate report' });
});

app.listen(port, () => console.log(`Report API listening on http://localhost:${port}`));
