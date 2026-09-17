import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.js';
mkdirSync(resolve('.data'), { recursive: true });
const dir = mkdtempSync(resolve('.data/e2e-'));
const { app, db } = createApp({ database: `${dir}/test.sqlite` });
const server = app.listen(8799, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { db.close(); rmSync(dir, { recursive: true, force: true }); process.exit(0); }));
