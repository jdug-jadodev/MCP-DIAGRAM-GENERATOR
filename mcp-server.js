#!/usr/bin/env node
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { generate } = require('./scripts/generate-diagram');

const pkg = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  } catch (e) {
    return { name: 'mermaid-diagram-generator', version: '0.0.0' };
  }
})();

// MCP stdio server implementation
class McpDaemon {
  constructor() {
    this.requestId = 0;
    this.initialized = false;
  }

  async handleMessage(msg) {
    try {
      const req = JSON.parse(msg);
      
      if (req.method === 'initialize') {
        this.initialized = true;
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: {
              name: pkg.name,
              version: pkg.version
            }
          }
        };
      }

      if (req.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            tools: [
              {
                name: 'generate-diagram',
                description: 'Genera un diagrama SVG desde código Mermaid',
                inputSchema: {
                  type: 'object',
                  properties: {
                    source: {
                      type: 'string',
                      description: 'Código Mermaid'
                    },
                    filename: {
                      type: 'string',
                      description: 'Nombre del archivo SVG (sin extensión)'
                    }
                  },
                  required: ['source']
                }
              }
            ]
          }
        };
      }

      if (req.method === 'tools/call') {
        const { name, arguments: args } = req.params;
        
        if (name === 'generate-diagram') {
          const { source, filename } = args;
          
          if (!source || !String(source).trim()) {
            return {
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32600,
                message: 'source es requerido'
              }
            };
          }

          try {
            const outputPath = await generate(source, filename);
            const content = fs.readFileSync(outputPath, 'utf8');
            
            return {
              jsonrpc: '2.0',
              id: req.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Diagrama generado exitosamente: ${outputPath}`
                  },
                  {
                    type: 'resource',
                    resource: {
                      uri: `file://${outputPath}`,
                      mimeType: 'image/svg+xml'
                    }
                  }
                ]
              }
            };
          } catch (err) {
            return {
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: `Error generando diagrama: ${err.message}`
              }
            };
          }
        }

        return {
          jsonrpc: '2.0',
          id: req.id,
          error: {
            code: -32601,
            message: `Herramienta no encontrada: ${name}`
          }
        };
      }

      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32601,
          message: `Método no implementado: ${req.method}`
        }
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: `Parse error: ${err.message}`
        }
      };
    }
  }
}

if (require.main === module) {
  const daemon = new McpDaemon();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (line.trim()) {
      const response = await daemon.handleMessage(line);
      console.log(JSON.stringify(response));
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

module.exports = { McpDaemon };
