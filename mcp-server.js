#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fs = require('fs');
const { generate, createHttpServer } = require('./scripts/generate-diagram');

// Simple MCP-like manifest endpoint and adapter
const pkg = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  } catch (e) {
    return { name: 'mermaid-diagram-generator', version: '0.0.0' };
  }
})();

function createMcpServer() {
  const server = createHttpServer();

  // mount manifest and health endpoints
  const origListener = server.listeners('request')[0];
  server.removeAllListeners('request');

  server.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/.well-known/mcp') {
      const manifest = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || '',
        endpoints: {
          generate: { method: 'POST', path: '/generate' },
          diagram: { method: 'GET', path: '/diagram' }
        }
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // delegate to original handler (generate/diagram)
    origListener(req, res);
  });

  return server;
}

if (require.main === module) {
  const port = process.env.PORT || 3456;
  const server = createMcpServer();
  server.listen(port, () => console.log(`${pkg.name} MCP server listening on ${port}`));
}

module.exports = { createMcpServer };
