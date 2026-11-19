import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const REFS_FILE = path.join(DATA_DIR, 'referencias.json');
const PKG_FILE = path.resolve(__dirname, 'package.json');

interface ReferenceRecord {
  ref: string;
  peca: string;
}

function getBuildFingerprint(): { version: string; buildHash: string } {
  let version = '4.2.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'));
    if (pkg?.version && pkg.version !== '0.0.0') {
      version = String(pkg.version);
    }
  } catch {
    // default version
  }

  const hash = crypto.createHash('sha256');
  hash.update(version);

  const candidates = [
    path.resolve(__dirname, 'dist', 'index.html'),
    path.resolve(__dirname, 'src', 'App.tsx'),
    path.resolve(__dirname, 'src', 'components', 'StopLabelCard.tsx'),
    path.resolve(__dirname, 'src', 'components', 'DatabaseModal.tsx'),
    path.resolve(__dirname, 'index.html'),
  ];

  for (const filePath of candidates) {
    try {
      const stat = fs.statSync(filePath);
      hash.update(`${filePath}:${stat.mtimeMs}:${stat.size}`);
    } catch {
      // ignore missing file
    }
  }

  return {
    version,
    buildHash: hash.digest('hex').slice(0, 12),
  };
}

function ensureDataFiles(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REFS_FILE)) {
    fs.writeFileSync(REFS_FILE, '[]', 'utf8');
  }
}

function readReferences(): ReferenceRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(REFS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        ref: String(item?.ref ?? '').trim(),
        peca: String(item?.peca ?? '').trim(),
      }))
      .filter((item) => item.ref.length > 0);
  } catch {
    return [];
  }
}

function writeReferences(items: ReferenceRecord[]): void {
  ensureDataFiles();
  const tmpPath = `${REFS_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmpPath, REFS_FILE);
}

async function startServer(): Promise<void> {
  ensureDataFiles();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/version', (_req, res) => {
    const { version, buildHash } = getBuildFingerprint();
    let refsMtime = 0;
    try {
      refsMtime = fs.statSync(REFS_FILE).mtimeMs;
    } catch {
      refsMtime = 0;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      version,
      buildHash,
      refsMtime,
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/references', (_req, res) => {
    const items = readReferences();
    res.json({
      items,
      total: items.length,
    });
  });

  app.post('/api/references', (req, res) => {
    const ref = String(req.body?.ref ?? '').trim();
    const peca = String(req.body?.peca ?? '').trim();

    if (!ref) {
      res.status(400).json({ error: 'O campo Referência é obrigatório.' });
      return;
    }

    const items = readReferences();
    const existingIndex = items.findIndex(
      (item) => item.ref.toLowerCase() === ref.toLowerCase()
    );

    if (existingIndex !== -1) {
      res.status(409).json({
        error: `A referência "${items[existingIndex].ref}" já existe na base de dados.`,
      });
      return;
    }

    const created: ReferenceRecord = { ref, peca };
    const updatedItems = [created, ...items];
    writeReferences(updatedItems);

    res.status(201).json({ item: created, total: updatedItems.length });
  });

  app.put('/api/references/:originalRef', (req, res) => {
    const originalRef = decodeURIComponent(req.params.originalRef).trim();
    const nextRef = String(req.body?.ref ?? '').trim();
    const nextPeca = String(req.body?.peca ?? '').trim();

    if (!nextRef) {
      res.status(400).json({ error: 'O campo Referência não pode ficar vazio.' });
      return;
    }

    const items = readReferences();
    const targetIndex = items.findIndex(
      (item) => item.ref.toLowerCase() === originalRef.toLowerCase()
    );

    if (targetIndex === -1) {
      res.status(404).json({ error: 'Referência não encontrada.' });
      return;
    }

    if (nextRef.toLowerCase() !== originalRef.toLowerCase()) {
      const collision = items.some(
        (item, idx) =>
          idx !== targetIndex && item.ref.toLowerCase() === nextRef.toLowerCase()
      );
      if (collision) {
        res.status(409).json({
          error: `Já existe outra entrada com a referência "${nextRef}".`,
        });
        return;
      }
    }

    const updatedItem: ReferenceRecord = { ref: nextRef, peca: nextPeca };
    items[targetIndex] = updatedItem;
    writeReferences(items);

    res.json({ item: updatedItem, total: items.length });
  });

  app.delete('/api/references/:ref', (req, res) => {
    const targetRef = decodeURIComponent(req.params.ref).trim();
    const items = readReferences();
    const nextItems = items.filter(
      (item) => item.ref.toLowerCase() !== targetRef.toLowerCase()
    );

    if (nextItems.length === items.length) {
      res.status(404).json({ error: 'Referência não encontrada.' });
      return;
    }

    writeReferences(nextItems);
    res.json({ deleted: targetRef, total: nextItems.length });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trigo - STOP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
