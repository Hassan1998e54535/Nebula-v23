#![deny(clippy::all)]
// SPDX-License-Identifier: Nebula

pub mod permission_probe;

#[cfg(all(target_os = "macos", not(test)))]
mod napi_surface_macos;

#[cfg(all(not(target_os = "macos"), not(test)))]
mod napi_surface_stub;
