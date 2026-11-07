// SPDX-License-Identifier: Nebula

use anyhow::Context;
use nexus_admin::{build_router, config::AdminConfig};
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(nexus_common::config::env_filter("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AdminConfig::from_env()?;
    let addr = format!("{}:{}", config.host, config.port);
    let router = build_router(config);

    let listener = TcpListener::bind(&addr)
        .await
        .with_context(|| format!("failed to bind NEXUS admin service on {addr}"))?;
    tracing::info!(%addr, "starting NEXUS admin service");

    axum::serve(listener, router)
        .with_graceful_shutdown(nexus_common::shutdown::wait_for_shutdown())
        .await
        .context("admin server exited unexpectedly")?;

    Ok(())
}
