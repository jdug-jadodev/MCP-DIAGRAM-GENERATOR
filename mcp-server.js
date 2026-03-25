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
            capabilities: {
              tools: {}
            },
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
                description: 'Genera un diagrama SVG a partir de código Mermaid. Acepta el código Mermaid como entrada y genera un archivo SVG en el workspace actual. Soporta todos los tipos de diagramas de Mermaid (flowchart, sequence, class, state, etc.)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    source: {
                      type: 'string',
                      description: 'Código Mermaid del diagrama. Por ejemplo: "flowchart TD\\n  A --> B\\n  B --> C"'
                    },
                    filename: {
                      type: 'string',
                      description: 'Nombre del archivo SVG sin extensión (ej: "diagrama-flujo"). Si no se proporciona, usa "diagrama-flujo" por defecto'
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
                message: 'El parámetro "source" es requerido y no puede estar vacío'
              }
            };
          }

          try {
            // Generar el diagrama
            const outputPath = await generate(source, filename);
            
            // Leer el contenido del SVG generado
            let svgContent = '';
            try {
              svgContent = fs.readFileSync(outputPath, 'utf8');
            } catch (e) {
              console.error('No se pudo leer el SVG generado:', e.message);
            }

            return {
              jsonrpc: '2.0',
              id: req.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `✅ Diagrama generado exitosamente en: ${outputPath}`
                  },
                  {
                    type: 'resource',
                    resource: {
                      uri: `file://${outputPath}`,
                      mimeType: 'image/svg+xml',
                      text: svgContent
                    }
                  }
                ]
              }
            };
          } catch (err) {
            const errorMsg = err.message || String(err);
            const errorDetails = errorMsg.includes('mermaid-cli-exit') 
              ? 'Error de mermaid-cli. Verifica que el código Mermaid sea válido: usa flowchart, sequence, class, state, etc. Revisa https://mermaid.live para validar tu diagrama.'
              : errorMsg;
            
            return {
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: `Error generando diagrama: ${errorDetails}`,
                data: {
                  originalError: errorMsg,
                  suggestion: 'Valida tu código Mermaid en https://mermaid.live/'
                }
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
