// SPDX-License-Identifier: Nebula

mod generator;
mod router_impl;
mod shard_impl;
mod types;

use nexus_svc::config::{Mode, ServiceConfig};
use nexus_svc::transport::NatsTransport;
use shard_impl::SnowflakesShard;
use types::SERVICE_NAME;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    nexus_svc::init_tracing();
    let config = ServiceConfig::from_env()?;
    let transport =
        NatsTransport::connect(&config.nats_url, config.nats_auth_token.as_deref()).await?;
    tracing::info!(
        service = SERVICE_NAME,
        mode = ?config.mode,
        shard_id = config.shard_id,
        shard_count = config.shard_count,
        listen_addr = %config.listen_addr,
        "starting snowflakes service"
    );
    match config.mode {
        Mode::Router => {
            nexus_svc::router::run_router(
                &config,
                router_impl::SnowflakesRouter::new(config.shard_count),
                transport,
            )
            .await
        }
        Mode::Shard => {
            let shard = SnowflakesShard::new(config.shard_id)?;
            nexus_svc::shard::run_shard(&config, shard, transport).await
        }
    }
}
