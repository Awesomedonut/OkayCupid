import { createApp } from './app.js';
const { app, db } = createApp();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8788);
const server = app.listen(port, host, () => process.stdout.write(`okaycupid listening on ${host}:${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
