// SPDX-License-Identifier: Nebula

#[derive(Debug, Default)]
pub struct RelayMetrics {
    pub relay_upstream_success: Counter,
    pub relay_upstream_retries: Counter,
    pub relay_upstream_failures_retryable: Counter,
    pub relay_upstream_failures_hard: Counter,
}

impl RelayMetrics {}

use super::Counter;
