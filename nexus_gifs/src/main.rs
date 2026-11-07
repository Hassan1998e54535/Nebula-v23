// SPDX-License-Identifier: Nebula

mod klipy;
mod media_proxy;
mod router_impl;
mod shard_impl;
mod types;

use nexus_svc::config::{Mode, ServiceConfig};
use nexus_svc::transport::NatsTransport;
use router_impl::GifsRouter;
use shard_impl::GifsShard;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    nexus_svc::init_tracing();
    let config = ServiceConfig::from_env()?;
    let transport =
        NatsTransport::connect(&config.nats_url, config.nats_auth_token.as_deref()).await?;

    tracing::info!(
        service = config.service_name,
        mode = ?config.mode,
        shard_id = config.shard_id,
        shard_count = config.shard_count,
        listen_addr = %config.listen_addr,
        "starting gifs service"
    );

    match config.mode {
        Mode::Router => {
            let router = GifsRouter::new(config.cache_max_entries, config.cache_ttl);
            nexus_svc::router::run_router(&config, router, transport).await
        }
        Mode::Shard => {
            let shard = GifsShard::new()?;
            nexus_svc::shard::run_shard(&config, shard, transport).await
        }
    }
}
