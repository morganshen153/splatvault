# Contributing

Thanks for your interest in SplatVault.

This project is still in its early product-formation stage, so contribution rules are intentionally simple.

## Before You Contribute

Please keep in mind:

- SplatVault is a **product-first** repository, not a general experiment sandbox
- changes should support the local-first asset search direction
- avoid introducing unrelated research concepts or branding

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

This repository is expected to evolve toward an open-core structure.

That means:

- the public repository should remain genuinely useful
- some future advanced workflows may live in separate commercial packaging

Exact licensing and product-tier rules will be documented separately as the project matures.
