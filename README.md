# SplatVault

**Local-first multimodal asset search for 3D, video, and scan teams**

SplatVault helps teams search local images, video clips, scan-related assets, and project files without relying on filenames alone.

It is designed for workflows where assets are scattered across folders, long videos are hard to navigate, and historical project material is difficult to reuse.

## Why SplatVault

Teams working with image-, video-, and scan-heavy projects often hit the same bottlenecks:

- folders are deep, inconsistent, and poorly named
- long videos are painful to search manually
- project notes and media assets are separated
- historical material is hard to find and reuse
- data preparation before training or reconstruction takes too long

SplatVault is being built to solve those problems with a local-first workflow.

## Core Use Cases

- Search local images by natural language
- Search long videos by matched frames or time anchors
- Keep projects, collections, and tags close to the underlying files
- Reuse historical project assets faster
- Curate assets before 3D, video, or scan-heavy downstream workflows

## Target Users

- 3D / scan / capture teams
- video production and media-heavy teams
- technical artists and project owners managing large local asset libraries
- AI and data teams preparing image/video datasets

## Product Scope

SplatVault is intended to be:

- a local-first asset retrieval workspace
- a multimodal asset organization tool
- a practical pre-production / pre-training curation layer

SplatVault is **not** intended to be:

- a 3D Gaussian Splatting renderer
- an image compression product
- a generic AI chatbot
- a "quantum / consciousness / qimen" concept product

## Community vs Future Pro Direction

The current repository is the foundation for the community product surface.

Planned split:

| Feature | Community | Future Pro |
|---|---|---|
| Local single-user install | Yes | Yes |
| Image / video / text asset import | Yes | Yes |
| Basic previews and thumbnails | Yes | Yes |
| Basic search workspace | Yes | Yes |
| Projects, collections, tags | Yes | Yes |
| Advanced video clip retrieval | No | Planned |
| Faster batch indexing workflows | No | Planned |
| Advanced export and review workflows | No | Planned |
| Easier packaging / premium builds | No | Planned |

## Current Status

Current development stage:

- P0 completed
- P1 ready to begin

P0 currently covers:

- pnpm workspace setup
- Node.js + Express backend
- React + Vite frontend
- shared TypeScript types
- health check API
- SQLite initialization

## Repository Structure

```text
SplatVault/
├── apps/
│   ├── server/              # Express + TypeScript backend
│   └── web/                 # React + Vite frontend
├── packages/
│   ├── shared-types/        # Shared TypeScript contracts
│   └── embedding/           # Embedding abstraction layer
├── data/                    # Local SQLite DB and derived files
├── docs/                    # Product and repository strategy docs
├── ROADMAP.md
└── CHANGELOG.md
```

## Quick Start

```bash
pnpm install
pnpm dev
```

Or run each app separately:

```bash
pnpm --filter @splatvault/server dev
pnpm --filter @splatvault/web dev
```

Default local ports:

- API: `http://localhost:3001`
- Web: `http://localhost:5173`

## Development Priorities

Near-term priorities:

1. asset storage and CRUD hardening
2. local import pipeline
3. thumbnail generation
4. search workspace basics
5. video frame extraction foundation

See [ROADMAP.md](./ROADMAP.md) for the current phased plan.

## Documentation

- [Product Definition](./docs/product-definition.md)
- [Repository Strategy](./docs/repo-strategy.md)
- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)

## License

License strategy is not finalized yet.

This repository is currently under active product formation, and licensing / open-core packaging decisions will be documented before public release.
