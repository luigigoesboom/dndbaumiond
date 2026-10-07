import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { customClassRouter, spellCollectionRouter } from './customClassRoutes.ts';
import { errorHandler } from './http.ts';
import { charactersRouter } from './routes.ts';
import { srdRouter } from './srdRoutes.ts';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/characters', charactersRouter);
app.use('/api/srd', srdRouter);
app.use('/api/classes', customClassRouter);
app.use('/api/spell-collections', spellCollectionRouter);

// In production, serve the built frontend from the same process.
const dist = path.resolve('dist');
if (existsSync(dist)) app.use(express.static(dist));

app.use(errorHandler);

// Deliberately not the generic PORT: dev tooling often sets that for the Vite server.
const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
