// SPDX-License-Identifier: Nebula

#[derive(Debug, Default)]
pub struct HTTPClientMetrics {
    pub http_retries: Counter,
    pub http_retries_exhausted: Counter,
    pub http_retryable_status: Counter,
    pub http_retryable_error: Counter,
}

impl HTTPClientMetrics {}

use super::Counter;
