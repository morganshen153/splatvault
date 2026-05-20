# Repository Strategy

## Purpose

This document defines how current and future software projects should be classified, named, published, and maintained.

The goal is to prevent repository sprawl and avoid mixing:

- product code
- shared infrastructure
- experiments
- private commercial work

## Repository Categories

### `product-*`

User-facing software products.

Examples:

- `product-splatvault`

Use this category when:

- the repository represents a standalone product
- the repository has a target user group
- the repository is expected to have releases, roadmap, or public documentation

Default visibility:

- public for community editions

### `core-*`

Reusable infrastructure or shared libraries used across multiple products.

Examples:

- `core-embedding`
- `core-indexer`

Use this category when:

- the code is not a product by itself
- the repository exists for reuse

Default visibility:

- public if broadly reusable
- private if commercially sensitive

### `lab-*`

Research, experiments, prototypes, and concept exploration.

Examples:

- `lab-quantumsplat`

Use this category when:

- the project is exploratory
- the architecture is unstable
- the repository is not a product yet

Default visibility:

- public or private depending on strategic value

Important:

- `lab-*` repositories must not be presented as production products

### `ops-*`

Engineering workflow, release, automation, or repository tooling.

Examples:

- `ops-release-scripts`
- `ops-repo-templates`

Default visibility:

- usually private

### `private-pro-*`

Private commercial or premium extensions.

Examples:

- `private-pro-splatvault`

Use this category when:

- the repository contains paid features
- the repository contains commercial-only extensions

Default visibility:

- private only

## Current Project Mapping

### `E:\QuantumSplat-V2-Architecture`

Classification:

- `lab-quantumsplat`

Reason:

- research-heavy
- architecture-first
- not the main commercial product repository

### `E:\SplatVault`

Classification:

- `product-splatvault`

Reason:

- intended as a user-facing product
- has a target market
- aligns with paid open-source / GitHub-led distribution

## Naming Rules

- use lowercase
- use hyphens
- use a category prefix

Allowed prefixes:

- `product-`
- `core-`
- `lab-`
- `ops-`
- `private-pro-`

## Visibility Rules

### Public by default

Use public visibility for:

- community editions
- reusable libraries
- selected research projects that support visibility

### Private by default

Use private visibility for:

- Pro features
- customer-specific work
- internal tooling
- licensing or commercial internals

## Open-Core Policy

For products using a paid open-source model:

### Public repository should contain

- core product code
- install instructions
- roadmap
- issue tracker
- useful community functionality

### Private commercial repository may contain

- premium features
- commercial packaging
- private builds
- license-gated workflows

## Standard Repository Files

### Required for `product-*`

- `README.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `.gitignore`
- `.editorconfig`

### Recommended later

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.github/FUNDING.yml`

## Separation Rules

- do not mix research branding into product repositories
- do not mix customer-facing product plans into lab repositories
- do not use one repository as both a research sandbox and a stable commercial product

If a feature matures in a `lab-*` repository, port it intentionally instead of blurring the boundaries.
