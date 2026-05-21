# GitHub Release Checklist

This checklist defines the minimum cleanup needed before `SplatVault` is published as a public GitHub repository.

The goal is to make the repository consistent with the current strategy:

- `product-splatvault`
- public `Community Edition`
- future paid `Pro` path
- GitHub-led discovery and conversion

## Release Decision

Current recommendation:

- do not publish immediately
- complete a lightweight public-release cleanup first

Reason:

- the product direction is correct
- the repository strategy is correct
- the public packaging is not finished yet

## Must Finish Before Public GitHub Launch

### 1. License decision

Pick and publish the real repository license.

Current status:

- `BUSL-1.1` public-commercial boundary selected

Why it matters:

- public GitHub launch needs a clear legal posture
- the open-core strategy cannot stay ambiguous

Chosen direction:

- source-visible community repository
- commercial production use requires separate licensing

### 2. Community vs Pro boundary

Write a clearer product boundary for what stays public and what becomes paid.

Current status:

- README includes a first-pass table
- boundary is still too thin for launch

Need before launch:

- one dedicated public doc that explains:
  - what the Community Edition includes
  - what future Pro adds
  - what will stay local-first and single-user in public
  - whether the binary release channel is community-only or paid-only

### 3. Public-facing cleanup

Remove internal-facing wording and local-machine traces from public docs/UI copy.

Current cleanup targets already found:

- `docs/repo-strategy.md`
  - contains local absolute paths such as `E:\SplatVault`
  - contains references to the unrelated internal project path
- `apps/web/src/pages/SearchPage.tsx`
  - contains Windows-style example path `E:\images\query.jpg`

Notes:

- localhost development ports are acceptable in setup docs
- internal workstation paths are not

### 4. Public release state

Publish from a clean, intentional snapshot.

Current blocker:

- working tree contains uncommitted P2/search-related changes
- a local `server.log` file exists in the repo root and should not be shipped

Need before launch:

- decide whether the public release target is:
  - stable `P1 complete`
  - or an intentional `P2 preview`
- make the chosen snapshot run cleanly
- avoid publishing a half-transition state

### 5. GitHub storefront quality

The repository homepage should convert curious visitors into watchers, users, and buyers.

Need before launch:

- sharper README opening value proposition
- screenshot or short demo asset
- install steps that work
- status note that explains maturity honestly
- funding / paid path wording that matches the chosen license
- one doc describing public repo vs private repo vs binary release
- one note clarifying that `Follow` is not access control

## Recommended Launch Sequence

### Step A

Freeze the launch target:

- choose `P1 stable` or `P2 preview`

### Step B

Finalize legal and packaging:

- license
- Community vs Pro doc

### Step C

Clean the public surface:

- remove local absolute paths
- remove internal-only wording
- tighten README copy

### Step D

Prepare the GitHub launch package:

- screenshot
- short demo
- first release notes
- funding/profile links
- distribution plan

### Step E

Create the remote and push:

- public repo name should follow the repo strategy
- recommended public name: `product-splatvault`

## Extra Launch Decisions

- decide if the first public drop is Community-only or Community + paid binaries
- decide whether the first paid tier is GitHub Sponsors, private repo access, or both
- decide whether the private source repo is created immediately or after public launch

## Launch Readiness Summary

### Strategy fit

- yes

### Product fit for GitHub discovery

- yes

### Ready to publish right now

- not yet

### Minimum next action

- finish release cleanup, then publish intentionally
