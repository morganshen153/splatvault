# Contributing

Thanks for your interest in SplatVault.

This project is a product-first repository with a clear public Community Edition and a separate commercial path.

## Before You Contribute

Please keep in mind:

- SplatVault is a **product-first** repository, not a general experiment sandbox
- changes should support the local-first asset search direction
- avoid introducing unrelated research concepts or branding
- avoid adding commercial or premium logic to the public Community Edition

## Contribution Priorities

Current high-priority areas:

- asset import foundations
- local preview and thumbnail workflow
- shared type consistency
- search workflow foundations
- UI clarity for the local workspace

Lower-priority areas for now:

- speculative architecture expansion
- premature plugin systems
- unrelated AI assistant features
- branding-heavy concept work
- commercial-only workflows that belong in private packaging

## Development Workflow

1. install dependencies
2. run type checks
3. make focused changes
4. keep docs aligned with code

Useful commands:

```bash
pnpm install
pnpm -r typecheck
pnpm dev
```

## Style Expectations

- keep changes small and clear
- prefer explicit naming over clever naming
- preserve local-first and product-focused framing
- update documentation when behavior or scope changes

## Issues and Feature Requests

When opening an issue, please be specific about:

- the problem
- the asset workflow involved
- the expected behavior
- whether the use case is image, video, text, or scan-related

## Product Direction Reminder

SplatVault is being built as:

- a local-first multimodal asset search workspace
- a practical tool for 3D / video / scan teams

It is not being built as:

- a generic chatbot
- a research-theory showcase
- a 3DGS renderer

## Commercial Note

This repository is the public Community Edition foundation.

That means:

- the public repository should remain genuinely useful
- premium and commercial workflows belong in separate private packaging
- commercial production use requires separate licensing

See `LICENSE`, `docs/community-vs-pro.md`, and `docs/release-architecture.md`.
