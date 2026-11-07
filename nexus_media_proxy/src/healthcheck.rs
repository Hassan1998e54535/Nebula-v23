// SPDX-License-Identifier: Nebula

pub async fn run() -> anyhow::Result<()> {
    nexus_common::healthcheck::run(
        nexus_common::config::env_value("NEXUS_MEDIA_PROXY_HOST").as_deref(),
        nexus_common::config::env_value("NEXUS_MEDIA_PROXY_PORT").as_deref(),
        "NEXUS_MEDIA_PROXY_HOST",
        "NEXUS_MEDIA_PROXY_PORT",
        8080,
    )
    .await
}
