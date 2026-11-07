// SPDX-License-Identifier: Nebula

#[derive(Debug, Default)]
pub struct ExternalMetrics {
    pub fetch_failures: Counter,
    pub blocked_url_attempts: Counter,
    pub external_buffer_rejected: Counter,
    pub external_stream_overruns: Counter,
}

impl ExternalMetrics {}

use super::Counter;
