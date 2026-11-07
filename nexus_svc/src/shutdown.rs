// SPDX-License-Identifier: Nebula

use std::time::Duration;

pub const DEFAULT_DRAIN_TIMEOUT: Duration = Duration::from_secs(20);

pub use nexus_common::shutdown::wait_for_shutdown;

pub async fn drain_with_timeout<F: std::future::Future<Output = ()>>(
    quiesce: F,
    timeout: Duration,
) {
    match tokio::time::timeout(timeout, quiesce).await {
        Ok(()) => {
            tracing::info!("graceful drain completed");
        }
        Err(_) => {
            tracing::warn!(
                timeout_secs = timeout.as_secs(),
                "drain timeout exceeded, proceeding with shutdown"
            );
        }
    }
}
