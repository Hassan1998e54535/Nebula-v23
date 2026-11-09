---
name: Desktop test harness
description: NEXUS Electron tests depend on generated build-channel configuration and the Rust toolchain.
---

The Electron test harness prepares build-channel configuration through the repository's Rust-based tooling before running tests. Running selected Node tests directly can pass tests that only import isolated code, but tests that import desktop modules may fail if the generated configuration is absent. In this workspace, the pinned pnpm bootstrap aborted and Cargo was unavailable, so the configured desktop test command could not prepare that file.

**Why:** Bypassing the preparation step can produce misleading test failures that look like application bugs, while manually adding generated source can leave the workspace in an invalid state.

**How to apply:** Before retrying Electron tests, check that the repository-pinned pnpm and Rust toolchain are available and run the supported setup command. If they are unavailable, report the validation limitation instead of altering application code to work around it.
