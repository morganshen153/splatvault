# P2 Preview Freeze Checklist

This checklist defines the final steps required before `SplatVault` is pushed as a public `P2 preview` repository.

## Goal

Freeze a clean public preview snapshot that:

- builds successfully
- presents the right product story
- keeps commercial boundaries clear
- avoids leaking local-only files or workflow artifacts

## Freeze Requirements

### 1. Clean public worktree

Before launch:

- no local memory folders in git
- no stray logs
- no accidental runtime artifacts
- no unrelated experimental files

Current rule:

- `.agents/` must stay local-only

### 2. Build verification

Required checks:

- `pnpm -r typecheck`
- `pnpm build`

Current status:

- passing

### 3. Public product posture

The public repo should present:

- `P2 preview-ready`
- clear Community vs Pro split
- clear public/private/binary distribution story
- clear non-goals

### 4. Preview release scope

The first public preview should center on:

- local import
- asset grid
- thumbnails
- search workflow
- project and collection workflow foundations

It should not claim:

- finished multimodal retrieval
- full commercial packaging
- finished binary delivery pipeline

### 5. Commercial protection

Before public push:

- `BUSL-1.1` stays in place
- commercial production use remains separately licensed
- binary and private-source strategy stays documented

### 6. Final launch decision

The release should be framed as:

- `P2 preview`

Not as:

- final 1.0
- fully open-source unrestricted commercial product

## Final Push Standard

The repo is ready to push when:

- build passes
- typecheck passes
- public docs are aligned
- local-only artifacts are excluded
- the release message matches preview reality
