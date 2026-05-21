# Release Architecture

This document defines how `SplatVault` should be packaged and distributed.

The goal is to reduce white-label reuse while keeping GitHub useful for discovery.

## Distribution Layers

### 1. Public GitHub repository

Purpose:

- discoverability
- trust
- documentation
- community evaluation

Contents:

- product overview
- roadmap
- install docs
- demo screenshots or short video
- Community Edition source

Not intended for:

- commercial production use without licensing
- premium-only features

### 2. Private source repository

Purpose:

- commercial source control
- paid feature development
- private packaging

Contents:

- Pro features
- internal release tooling
- commercial build logic
- protected workflows

Access:

- private customers
- sponsored tiers
- commercial license holders

### 3. Binary release channel

Purpose:

- deliver runnable software without exposing source code to every user

Artifacts:

- Windows installer
- portable ZIP
- signed update package

Advantages:

- easier for paid users
- harder to reuse as a source dump
- better fit for a paid community/pro model

## Recommended Public/Private Split

Public:

- community docs
- public demo
- public issue tracker
- limited community code

Private:

- commercial source
- pro capabilities
- build/signing pipeline
- release automation

Binary:

- compiled community build
- compiled pro build
- installer/update artifacts

## Anti-White-Label Guidance

To reduce white-label reuse:

- keep source-visible public scope narrow and useful
- keep commercial production rights explicit
- distribute paid value through private source and binaries
- sign release artifacts when possible

## Launch Rule

Do not publish the public repository until the launch snapshot is intentional and the distribution story is clear.
