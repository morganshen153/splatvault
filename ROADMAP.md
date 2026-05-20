# Roadmap

## Status

- Current stage: `P4 complete`
- Completed: `P0`, `P1`, `P2`, `P3`, `P4`

## P0 - Foundation

Completed:

- pnpm workspace setup
- Express backend skeleton
- React + Vite frontend skeleton
- shared type package
- SQLite initialization
- `/api/health` connectivity

## P1 - Asset Storage

Completed:

- SQLite schema hardening
- `AssetStore` CRUD stabilization
- single-file asset creation flow
- image thumbnail generation
- basic asset listing UI support

## P2 - Product Experience

Completed:

- import page
- asset grid with thumbnails
- asset detail modal
- top navigation bar
- stats cards on home page

## P3 - Independent Search

Completed:

- `SearchEngine.ts` independent search layer
- `GET /api/search` endpoint
- keyword, type, path, date range filters
- frontend updated to new search API
- thumbnail URL normalization
- `dateTo` end-of-day semantics

## P4 - Batch Workflow (completed)

Completed:

- multi-select on search and asset pages
- batch add to collection (existing or create new)
- batch tag (existing tags or create new)
- batch export (JSON)
- collection management API
- tag management API
- project management API

## Later

- stronger multimodal search
- video frame indexing
- advanced export and review flows
- optional Pro packaging
