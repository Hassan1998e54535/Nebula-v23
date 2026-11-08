---
name: Cargo BuildKit cache locking
description: Avoid Cargo registry extraction races in parallel self-hosted Docker builds.
---

When multiple self-hosted service images compile Rust concurrently, shared BuildKit Cargo registry and Git cache mounts must use `sharing=locked` (or separate cache IDs). Otherwise separate Cargo processes can race while extracting the same crate and fail with `.cargo-ok` reporting `File exists`.

On resource-limited Docker Desktop hosts, also bound Compose service parallelism and Cargo/native compiler jobs instead of letting each builder use every reported CPU. Many advertised CPUs do not imply enough memory for many simultaneous C++ and Rust compiler processes.

**Why:** A parallel Windows Compose build reproduced a shared-cache extraction race and then spent over 45 minutes on one native media compilation stage. Limiting concurrent work is safer than assuming the host can use all reported cores.

**How to apply:** Whenever adding Cargo cache mounts to independent Dockerfiles, lock shared registry/Git cache access, conservatively cap parallel Compose/Cargo/native jobs for local builds, and validate affected Dockerfiles with BuildKit checks.
