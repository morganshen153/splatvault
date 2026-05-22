# Public Preview Launch Checklist

## Goal

Use this checklist when opening `splatvault` as a public preview on GitHub.

This is for a **preview launch**, not a final `1.0` release.

## Pre-Launch Repo Check

- Confirm `main` points to the intended preview snapshot.
- Confirm `README.md` clearly explains:
  - who the product is for
  - what problem it solves
  - what it is not
  - Community vs Pro direction
- Confirm `LICENSE` is present and readable.
- Confirm `CHANGELOG.md` and `ROADMAP.md` are committed.
- Confirm no private keys, private customer data, or local secrets exist in the repo.
- Confirm local-only data directories are ignored.

## GitHub Repository Setup

- Repository name: `splatvault`
- Short description:
  - `Local-first multimodal asset search for 3D, video, and scan teams.`
- Suggested topics:
  - `asset-management`
  - `local-first`
  - `multimodal-search`
  - `video-search`
  - `dataset-curation`
  - `computer-vision`
  - `3d-pipeline`
  - `media-workflow`
  - `typescript`
  - `react`
- Pin the repository on the profile.
- If possible, add:
  - 1 cover screenshot
  - 1 search-results screenshot
  - 1 import/progress screenshot

## Release Positioning

- Describe the current state as:
  - `Public Preview`
  - `Single-user local-first build`
  - `Community foundation for a future Pro product`
- Do not describe it as:
  - production-ready for teams
  - enterprise-ready
  - fully hardened commercial release

## Release Assets

- If sharing binaries, prefer preview-labelled files only.
- Recommended labels:
  - `splatvault-portable-preview.zip`
  - `splatvault-update-preview.zip`
- If signatures are not fully wired yet, say so honestly.

## Public Messaging

- Lead with the problem:
  - local media libraries are hard to search
  - filenames are unreliable
  - long videos are painful to navigate
  - historical project assets are underused
- Then explain the wedge:
  - natural-language search
  - image/video/text asset indexing
  - local-first workflow
  - project/collection/tag organization

## First GitHub Release Notes Structure

- What SplatVault is
- Who it is for
- What is working now
- What is still preview-only
- What feedback is most useful
- How commercial licensing will work at a high level

## After Launch

- Watch stars, forks, issues, and discussions for 7-14 days.
- Track which description gets repeated back by users most often.
- Note what people ask for first:
  - better search quality
  - easier install
  - better video retrieval
  - export/review workflow
- Use that to decide whether the next public push is:
  - packaging polish
  - search quality
  - Pro feature split
