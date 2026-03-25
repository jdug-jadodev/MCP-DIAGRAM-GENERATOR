#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const INPUT = path.resolve(__dirname, '..', 'diagrama-flujo-mantenimiento.mmd');
const OUTPUT_BASE = path.resolve(process.cwd(), 'diagrama-flujo-mantenimiento');

function generate(source) {
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

  // Usa el binario local de mermaid-cli si existe, sino intenta con npx
  const localBin = path.resolve(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');
  const useLocal = fs.existsSync(localBin);
  const cmd = useLocal ? localBin : 'npx';

  // Generar solo SVG (vectorial) — evita pixelado al hacer zoom.
  const svgArgs = ['-i', INPUT, '-o', `${OUTPUT_BASE}.svg`, '-b', '#000000', '-t', 'dark', '--quiet'];
  const args = useLocal ? svgArgs : ['-y', '@mermaid-js/mermaid-cli@10.0.0', ...svgArgs];
  const p = spawn(cmd, args, { shell: true });
  p.stdout.on('data', d => process.stdout.write(d));
  p.stderr.on('data', d => process.stderr.write(d));
  return new Promise((resolve, reject) => {
    p.on('close', code => {
      if (code === 0) {
        console.log(`Generado: ${OUTPUT_BASE}.svg`);
        resolve(`${OUTPUT_BASE}.svg`);
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
          await generate(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', outputs: [`${OUTPUT_BASE}.svg`] }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/diagram') {
      const svgPath = `${OUTPUT_BASE}.svg`;
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
