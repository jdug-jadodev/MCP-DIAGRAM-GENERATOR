#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const INPUT = path.resolve(__dirname, '..', 'diagrama-flujo-mantenimiento.mmd');
const DEFAULT_BASENAME = 'diagrama-flujo';

function outputBaseFor(filename) {
  const base = filename && String(filename).trim() ? filename : DEFAULT_BASENAME;
  return path.resolve(process.cwd(), base);
}

function generate(source, filename) {
  if (source && String(source).trim()) {
    try {
      fs.writeFileSync(INPUT, source, 'utf8');
    } catch (e) {
      console.error('No se pudo escribir el archivo de entrada:', e.message || e);
      throw e;
    }
  }

  if (!fs.existsSync(INPUT)) {
    console.error('No se encontró el archivo de entrada:', INPUT);
    const err = new Error('input-not-found');
    err.code = 'INPUT_NOT_FOUND';
    throw err;
  }

  const outputBase = outputBaseFor(filename);

  // Usa el binario local de mermaid-cli si existe, sino intenta con npx
  const localBin = path.resolve(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');
  const useLocal = fs.existsSync(localBin);
  const cmd = useLocal ? localBin : 'npx';

  // Generar solo SVG (vectorial) — evita pixelado al hacer zoom.
  const svgArgs = ['-i', INPUT, '-o', `${outputBase}.svg`, '-b', '#000000', '-t', 'dark', '--quiet'];
  const args = useLocal ? svgArgs : ['-y', '@mermaid-js/mermaid-cli@10.0.0', ...svgArgs];
  const p = spawn(cmd, args, { shell: true });
  p.stdout.on('data', d => process.stdout.write(d));
  p.stderr.on('data', d => process.stderr.write(d));
  return new Promise((resolve, reject) => {
    p.on('close', code => {
      if (code === 0) {
        const outPath = `${outputBase}.svg`;
        console.log(`Generado: ${outPath}`);
        resolve(outPath);
      } else {
        const e = new Error('mermaid-cli-exit-' + code);
        e.code = code;
        console.error('mermaid-cli finalizó con código', code);
        reject(e);
      }
    });
    p.on('error', err => {
      console.error('Error ejecutando mermaid-cli:', err.message || err);
      reject(err);
    });
  });
}

function createHttpServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/generate') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          let source = '';
          const ct = req.headers['content-type'] || '';
          if (ct.includes('application/json')) {
            try {
              const obj = JSON.parse(body || '{}');
              source = obj.source || obj.mmd || obj.prompt || '';
              var filename = obj.filename;
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: 'invalid-json' }));
              return;
            }
          } else {
            source = body;
          }

          if (!String(source || '').trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'empty-source' }));
            return;
          }

          const out = await generate(source, filename);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', outputs: [out] }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url && req.url.startsWith('/diagram')) {
      // support optional query param ?name=basename (without .svg)
      const u = new URL(req.url, `http://localhost`);
      const name = u.searchParams.get('name');
      const svgPath = `${outputBaseFor(name)}.svg`;
      if (fs.existsSync(svgPath)) {
        const stat = fs.statSync(svgPath);
        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': stat.size
        });
        fs.createReadStream(svgPath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mermaid generator server. POST /generate with mermaid source, GET /diagram to fetch SVG');
  });

  return server;
}

module.exports = { generate, createHttpServer };

if (require.main === module) {
  if (process.argv.includes('--server')) {
    const server = createHttpServer();
    const port = process.env.PORT || 3456;
    server.listen(port, () => console.log('Server listening on', port));
  } else {
    generate().catch(err => process.exit(1));
  }
}
