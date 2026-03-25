# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-25

### Added
- MCP HTTP adapter with `/.well-known/mcp` manifest endpoint
- Support for JSON payload in `POST /generate` (fields: `source`, `mmd`, `prompt`)
- Optional `filename` parameter in POST to control SVG output name
- Query parameter `?name=` in `GET /diagram` to fetch specific diagrams
- Health check endpoint `GET /health`
- CLI binary `mermaid-mcp` registered in npm
- Comprehensive README with VSCode and IntelliJ configuration examples

### Changed
- Default SVG filename changed to `diagrama-flujo.svg`
- `scripts/generate-diagram.js` refactored to export `generate()` and `createHttpServer()`
- Server now returns actual SVG file path in responses

### Fixed
- Error handling for empty or invalid requests

## [0.1.0] - 2026-03-24

### Added
- Initial project structure
- Basic Mermaid diagram generation (SVG only)
- Simple HTTP endpoints `/generate` and `/diagram`
- CLI commands `generate-diagram` and `serve-diagram`
