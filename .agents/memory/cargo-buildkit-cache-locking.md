---
name: Cargo BuildKit cache locking
description: Avoid Cargo registry extraction races in parallel self-hosted Docker builds.
---

When multiple self-hosted service images compile Rust concurrently, shared BuildKit Cargo registry and Git cache mounts must use `sharing=locked` (or separate cache IDs). Otherwise separate Cargo processes can race while extracting the same crate and fail with `.cargo-ok` reporting `File exists`.

**Why:** A parallel Windows Compose build reproduced this race while unpacking a Cargo crate into a shared registry cache.

**How to apply:** Whenever adding Cargo cache mounts to independent Dockerfiles, lock shared registry/Git cache access and validate all affected Dockerfiles with BuildKit checks.
