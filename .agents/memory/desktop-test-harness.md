---
name: Desktop test harness
description: NEXUS Electron tests depend on generated build-channel configuration and the Rust toolchain.
---

The Electron test harness prepares build-channel configuration through the repository's Rust-based tooling before running tests. Running selected Node tests directly can pass tests that only import isolated code, but tests that import desktop modules may fail if the generated configuration is absent. The shell initially provided pnpm 10.26 while the repository pins 11.27, and Rust had no active toolchain; the configured native workflow uses its own pnpm and installs the Rust toolchain and wasm target before building.

**Why:** Replit's interactive shell and the native workflow can expose different toolchain setup. Bypassing the preparation step can produce misleading test failures, while manually adding generated source can leave the workspace in an invalid state.

**How to apply:** Before running desktop or gateway checks that build Rust/NIF/WASM components, confirm the toolchain in the same environment that runs the check and use the configured setup workflow when needed. Do not work around missing generated configuration by editing application source.
