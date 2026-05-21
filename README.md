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

## Community vs Pro Direction

The current repository is the foundation for the public Community Edition.

Planned split:

| Feature | Community | Pro |
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
- P1 completed
- P2 completed
- P3 completed
- P4 completed
- P5 completed
- current launch posture: `P2 preview-ready`, with stronger internal progress already in place

P0 currently covers:

- pnpm workspace setup
- Node.js + Express backend
- React + Vite frontend
- shared TypeScript types
- health check API
- SQLite initialization

P1 currently covers:

- asset schema and storage foundation
- typed `AssetStore` mapping
- thumbnail generation path
- basic asset listing support

P2 currently covers:

- import page
- asset grid with thumbnails
- asset detail modal
- top navigation bar
- stats cards on the home page

P3-P5 currently cover:

- independent search API and filters
- batch collection/tag/export workflows
- real batch import with progress polling
- stronger product workflow foundations for a preview release

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
2. multimodal search hardening
3. video frame indexing
4. binary packaging
5. preview release polish

See [ROADMAP.md](./ROADMAP.md) for the current phased plan.

## Documentation

- [Product Definition](./docs/product-definition.md)
- [Repository Strategy](./docs/repo-strategy.md)
- [Community vs Pro](./docs/community-vs-pro.md)
- [Public vs Private Repos](./docs/public-vs-private-repos.md)
- [Release Architecture](./docs/release-architecture.md)
- [Distribution Plan](./docs/distribution-plan.md)
- [Binary Cut Split](./docs/binary-cut-split.md)
- [GitHub Release Checklist](./docs/github-release-checklist.md)
- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)

## License

SplatVault is currently planned for a source-visible commercial model built around `Business Source License 1.1 (BUSL-1.1)`.

That means:

- the repository can be public for discovery and evaluation
- commercial production use requires a separate commercial license
- future releases may move to the Change License on the timeline defined in `LICENSE`

See [LICENSE](./LICENSE) and [Community vs Pro](./docs/community-vs-pro.md).
