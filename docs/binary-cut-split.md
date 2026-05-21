# Binary Cut Split

This document defines what should stay in source, what should move to private source, and what should only appear in binary releases.

## Keep in Public Source

- Community Edition core workflow
- basic import pipeline
- thumbnails and previews
- basic search workspace
- public docs and examples

## Move to Private Source

- Pro feature code
- commercial license logic
- build and signing scripts
- private release automation
- premium packaging rules

## Only in Binary Release

- installer bundle
- portable ZIP
- signed update package
- release metadata for paid users

## Why This Split Works

- public source stays useful for discovery
- private source keeps commercial value protected
- binary delivery reduces casual source reuse

## Operator Rule

If a file helps users evaluate the product, it can stay public.
If a file creates commercial advantage, it should move private.
If a file is only needed to install or update the app, it should live in the binary release flow.
