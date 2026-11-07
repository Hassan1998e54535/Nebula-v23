// SPDX-License-Identifier: Nebula

pub async fn run(mode: crate::config::Mode) -> anyhow::Result<()> {
    nexus_common::healthcheck::run(
        nexus_common::config::env_value("NEXUS_PUSH_SERVICE_HOST").as_deref(),
        nexus_common::config::env_value("NEXUS_PUSH_SERVICE_PORT").as_deref(),
        "NEXUS_PUSH_SERVICE_HOST",
        "NEXUS_PUSH_SERVICE_PORT",
        mode.default_port(),
    )
    .await
}
