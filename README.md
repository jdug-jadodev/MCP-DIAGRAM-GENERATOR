# mermaid-diagram-generator (MCP adapter)

Servidor MCP compatible que genera imágenes SVG a partir de diagramas Mermaid (`.mmd`). Ideal para integración con Copilot, VSCode y herramientas JetBrains.

**Versión:** 0.2.0 | **Licencia:** MIT | **Autor:** jdug | **Repositorio:** [GitHub](https://github.com/jdug-jadodev/MCP-DIAGRAM-GENERATOR)

## Instalación

### Desde npm (recomendado)

```bash
npm install -g mermaid-diagram-generator
```

Inicia el servidor:

```bash
mermaid-mcp
# Servidor MCP disponible en http://localhost:3456
```

### Instalación local / Desarrollo

Desde el repositorio:

```bash
git clone https://github.com/jdug-jadodev/MCP-DIAGRAM-GENERATOR.git
cd MCP-DIAGRAM-GENERATOR
npm install
npm start
# Servidor MCP disponible en http://localhost:3456
```

## API endpoints

- **`GET /.well-known/mcp`** — Manifiesto MCP con información del servidor y endpoints disponibles
- **`POST /generate`** — Genera diagrama SVG desde Mermaid. Acepta:
  - Texto plano Mermaid (`text/plain`)
  - JSON: `{ "source": "...", "filename": "..." }` (filename opcional)
- **`GET /diagram`** — Devuelve el SVG generado (`image/svg+xml`)
  - Parámetro query: `?name=` para especificar archivo SVG
- **`GET /health`** — Healthcheck del servidor

### Parámetros POST /generate

- `source` (obligatorio) — Código Mermaid en string
- `mmd` (alternativa) — Código Mermaid en string
- `prompt` (opcional) — Descripción adicional del diagrama
- `filename` (opcional) — Nombre personalizado para el SVG (sin extensión)

## Ejemplos de uso

### Con curl - Generar desde Mermaid

```bash
curl -X POST http://localhost:3456/generate \
  -H "Content-Type: application/json" \
  -d ''{"source":"graph TD; A-->B;","filename":"diagrama-login"}''
```

### Con curl - Descargar SVG

```bash
curl http://localhost:3456/diagram -o diagrama.svg
```

### Desde archivo .mmd

```bash
curl -X POST http://localhost:3456/generate --data-binary @mi-diagrama.mmd
```

## Distribución

### Publicar en npm

```bash
npm login
npm publish --access public
```

El paquete estará disponible como `mermaid-diagram-generator` en npm.

### Instalar globalmente

```bash
npm install -g mermaid-diagram-generator
mermaid-mcp  # Inicia el servidor
```

## Integración con entornos

### VSCode

Requisitos: Node.js instalado

#### 1. Instalar el servidor MCP

```bash
npm install -g mermaid-diagram-generator
```

> VSCode lanza el proceso automáticamente al usar la herramienta. No es necesario iniciar el servidor manualmente.

#### 2. Configurar VSCode

- Abre la carpeta de configuración de VSCode:
  - **Windows:** `%APPDATA%\Code\User\`
  - **Linux/Mac:** `~/.config/Code/User/`

- Busca o crea el archivo `mcp.json`

- Añade la siguiente configuración:

```json
{
  "servers": {
    "mermaid-diagram-generator": {
      "command": "mermaid-mcp",
      "type": "stdio"
    }
  }
}
```

- Guarda el archivo y reinicia VSCode

- Ahora puedes usar Copilot para generar diagramas Mermaid

### IntelliJ / JetBrains (WebStorm, PyCharm, etc.)

Requisitos: Node.js instalado y el plugin MCP de JetBrains

#### 1. Instalar el servidor MCP (IntelliJ)

```bash
npm install -g mermaid-diagram-generator
```

> IntelliJ lanza el proceso automáticamente al usar la herramienta. No es necesario iniciar el servidor manualmente.

#### 2. Configurar el plugin MCP en IntelliJ

- Abre **Settings/Preferences** → **Tools** → **MCP**

- Haz clic en **+** para añadir un nuevo servidor

- Configura:
  - **Name:** `mermaid-diagram-generator`
  - **Command:** `mermaid-mcp`
  - **Type:** `stdio`

- Haz clic en **OK** y reinicia IntelliJ

- El servidor debería aparecer en las herramientas disponibles

## Flujo de operación

1. El IDE lanza el proceso `mermaid-mcp` automáticamente (protocolo stdio)
2. Copilot descubre las herramientas disponibles con `tools/list`
3. El usuario solicita "genera un diagrama de flujo"
4. Copilot genera el código Mermaid y llama a `generate-diagram` con `{ "source": "..." }`
5. El servidor genera el SVG y lo guarda en el workspace
6. Copilot recibe la ruta del archivo generado como respuesta de texto

## Cambios recientes (v0.2.0)

- ✨ Soporte para JSON payload con `source`, `mmd`, `prompt`
- ✨ Parámetro `filename` para personalizar nombres de SVG
- ✨ Endpoint `/.well-known/mcp` con manifiesto MCP
- ✨ Query parameter `?name=` en `GET /diagram`
- ✨ Binary `mermaid-mcp` registrado en npm
- 🔧 Refactor de `scripts/generate-diagram.js`
- ✅ Mejor manejo de errores

## Scripts disponibles

```bash
npm start                 # Inicia el servidor MCP
npm run generate-diagram  # Genera un diagrama desde CLI
npm run serve-diagram     # Sirve diagrama en HTTP
npm publish              # Publica en npm (requiere npm login)
```

## Requisitos

- Node.js >= 14
- npm

## Licencia

MIT
