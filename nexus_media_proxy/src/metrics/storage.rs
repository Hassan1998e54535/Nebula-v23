// SPDX-License-Identifier: Nebula

#[derive(Debug, Default)]
pub struct StorageMetrics {
    pub storage_hits: Counter,
    pub storage_misses: Counter,
    pub storage_errors: Counter,
}

impl StorageMetrics {}

use super::Counter;
