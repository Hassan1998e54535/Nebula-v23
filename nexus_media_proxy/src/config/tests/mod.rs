// SPDX-License-Identifier: Nebula

mod attachment_signature;
mod cors;
mod public_endpoint;
mod s3_read;

use super::*;
use base64::{Engine as _, engine::general_purpose};

fn base_env() -> Vec<(&'static str, &'static str)> {
    vec![("NEXUS_MEDIA_PROXY_SECRET_KEY", "secret")]
}

fn allowed_origins(cfg: &Config) -> Vec<&str> {
    cfg.cors
        .allowed_origins
        .iter()
        .map(|origin| origin.to_str().unwrap())
        .collect()
}

fn env_with<'a>(extra: &[(&'a str, &'a str)]) -> Vec<(&'a str, &'a str)> {
    let mut env: Vec<(&'a str, &'a str)> = base_env();
    env.extend_from_slice(extra);
    env
}

fn with_shared_runtime_env(release: &[(&str, &str)]) -> Vec<(String, String)> {
    [
        ("NEXUS_ENV", "production"),
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "shared-runtime-secret"),
        ("NEXUS_S3_ENDPOINT", "https://ewr1.vultrobjects.com"),
        ("NEXUS_S3_REGION", "ewr1"),
        ("NEXUS_S3_ACCESS_KEY_ID", "AKIAIOSFODNN7EXAMPLE"),
        (
            "NEXUS_S3_SECRET_ACCESS_KEY",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        ),
    ]
    .iter()
    .chain(release.iter())
    .map(|(key, value)| ((*key).to_owned(), (*value).to_owned()))
    .collect()
}

#[test]
fn requires_secret_key() {
    let err = Config::load_from_iter(std::iter::empty::<(&str, &str)>()).unwrap_err();
    assert!(err.to_string().contains("NEXUS_MEDIA_PROXY_SECRET_KEY"));
}

#[test]
fn upload_mode_requires_relay_secret() {
    let err = Config::load_from_iter([
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "secret"),
        ("NEXUS_MEDIA_PROXY_MODE", "upload"),
    ])
    .unwrap_err();
    assert!(
        err.to_string()
            .contains("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64")
    );
}

#[test]
fn rejects_a_body_limit_above_the_spool_budget() {
    let err = Config::load_from_iter([
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "secret"),
        ("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_MAX_BODY_BYTES", "2"),
        ("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SPOOL_MAX_TOTAL_BYTES", "1"),
    ])
    .unwrap_err();
    assert!(
        err.to_string()
            .contains("must not exceed NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SPOOL_MAX_TOTAL_BYTES")
    );
}

#[test]
fn rejects_a_zero_spool_budget() {
    let err = Config::load_from_iter([
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "secret"),
        ("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SPOOL_MAX_TOTAL_BYTES", "0"),
    ])
    .unwrap_err();
    assert!(
        err.to_string()
            .contains("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_MAX_BODY_BYTES")
    );
}

#[test]
fn accepts_a_body_limit_equal_to_the_spool_budget() {
    let cfg = Config::load_from_iter([
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "secret"),
        ("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_MAX_BODY_BYTES", "4096"),
        (
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SPOOL_MAX_TOTAL_BYTES",
            "4096",
        ),
    ])
    .unwrap();
    assert_eq!(4096, cfg.upload_relay.max_body_bytes);
    assert_eq!(4096, cfg.upload_relay.spool_max_total_bytes);
}

#[test]
fn production_media_proxy_release_env_loads() {
    let cfg = Config::load_from_iter(with_shared_runtime_env(&[
        ("RELEASE_CHANNEL", "canary"),
        (
            "NEXUS_NSFW_SERVICE_ENDPOINT",
            "http://int.flx-nyc-misc1.srv.nexus.dev:8000",
        ),
        ("NEXUS_MEDIA_PROXY_MODE", "mp"),
        ("NEXUS_MEDIA_PROXY_NSFW_THRESHOLD", "0.95"),
        ("NEXUS_MEDIA_PROXY_STORAGE_BACKEND", "s3"),
        ("NEXUS_MEDIA_PROXY_READ_ONLY", "true"),
        ("NEXUS_MEDIA_PROXY_MAX_NATIVE_TRANSFORMS", "4"),
        ("NEXUS_MEDIA_PROXY_WORKER_QUEUE_CAPACITY", "128"),
        ("NEXUS_MEDIA_PROXY_TRANSFORM_TIMEOUT_MS", "30000"),
        ("NEXUS_MEDIA_PROXY_MAX_ENCODE_FRAMES", "4096"),
        ("NEXUS_MEDIA_PROXY_MAX_ENCODE_DURATION_MS", "30000"),
        ("NEXUS_MEDIA_PROXY_TRANSFORM_CACHE_BYTES", "1073741824"),
        (
            "NEXUS_MEDIA_PROXY_TRANSFORM_CACHE_MAX_ENTRY_BYTES",
            "134217728",
        ),
        ("NEXUS_MEDIA_PROXY_TRANSFORM_CACHE_TTL_MS", "1800000"),
        ("NEXUS_MEDIA_PROXY_SOCKET_IO_TIMEOUT_MS", "30000"),
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "enforce"),
        (
            "NEXUS_MEDIA_PROXY_CORS_ALLOWED_ORIGINS",
            "https://web.nexus.app,https://web.canary.nexus.app",
        ),
    ]))
    .unwrap();

    assert_eq!(DeploymentMode::Mp, cfg.mode);
    assert_eq!(PolicyMode::Enforce, cfg.cors.mode);
    assert_eq!(
        vec!["https://web.nexus.app", "https://web.canary.nexus.app"],
        allowed_origins(&cfg)
    );
    assert!(cfg.read_only);
    assert_eq!(StorageBackend::S3, cfg.storage.backend);
    assert_eq!("ewr1", cfg.storage.s3_region);
    assert_eq!(4, cfg.media.max_native_transforms);
    assert_eq!(128, cfg.media.worker_queue_capacity);
    assert_eq!(30_000, cfg.media.transform_timeout_ms);
    assert_eq!(4_096, cfg.media.max_encode_frames);
    assert_eq!(30_000, cfg.media.max_encode_duration_ms);
    assert_eq!(1 << 30, cfg.media.transform_cache_capacity_bytes);
    assert_eq!(128 << 20, cfg.media.transform_cache_max_entry_bytes);
    assert_eq!(1_800_000, cfg.media.transform_cache_ttl_ms);
    assert_eq!(30_000, cfg.socket_io_timeout_ms);
    assert!((cfg.media.nsfw_threshold - 0.95).abs() < f32::EPSILON);
    assert_eq!(
        "http://int.flx-nyc-misc1.srv.nexus.dev:8000",
        cfg.media.nsfw_service_endpoint
    );
}

#[test]
fn production_static_proxy_release_env_loads() {
    let cfg = Config::load_from_iter(with_shared_runtime_env(&[
        ("RELEASE_CHANNEL", "canary"),
        ("NEXUS_MEDIA_PROXY_MODE", "static"),
        ("NEXUS_MEDIA_PROXY_STORAGE_BACKEND", "s3"),
        ("NEXUS_MEDIA_PROXY_READ_ONLY", "true"),
        ("NEXUS_MEDIA_PROXY_SOCKET_IO_TIMEOUT_MS", "30000"),
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "enforce"),
        (
            "NEXUS_MEDIA_PROXY_CORS_ALLOWED_ORIGINS",
            "https://web.nexus.app,https://web.canary.nexus.app",
        ),
    ]))
    .unwrap();

    assert_eq!(DeploymentMode::Static, cfg.mode);
    assert_eq!(PolicyMode::Off, cfg.cors.mode);
    assert!(cfg.cors.allowed_origins.is_empty());
    assert!(cfg.read_only);
    assert_eq!(StorageBackend::S3, cfg.storage.backend);
    assert_eq!("static", cfg.storage.bucket_static);
    assert_eq!(30_000, cfg.socket_io_timeout_ms);
    assert!(cfg.upload_relay.secret.expose().is_empty());
}

#[test]
fn production_uploads_release_env_loads() {
    let relay_secret = general_purpose::STANDARD.encode([9u8; 48]);
    let cfg = Config::load_from_iter(with_shared_runtime_env(&[
        ("RELEASE_CHANNEL", "stable"),
        ("NEXUS_MEDIA_PROXY_MODE", "relay"),
        ("NEXUS_MEDIA_PROXY_STORAGE_BACKEND", "s3"),
        ("NEXUS_MEDIA_PROXY_READ_ONLY", "false"),
        ("NEXUS_MEDIA_PROXY_SOCKET_IO_TIMEOUT_MS", "300000"),
        ("NEXUS_MEDIA_PROXY_UPLOAD_RELAY_S3_TIMEOUT_MS", "900000"),
        (
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_BUFFERED_RETRY_BYTES",
            "33554432",
        ),
        (
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_BUFFERED_RETRY_TOTAL_BYTES",
            "536870912",
        ),
        (
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64",
            relay_secret.as_str(),
        ),
    ]))
    .unwrap();

    assert_eq!(DeploymentMode::Relay, cfg.mode);
    assert!(!cfg.read_only);
    assert_eq!(300_000, cfg.socket_io_timeout_ms);
    assert_eq!(900_000, cfg.upload_relay.s3_timeout_ms);
    assert_eq!(32 << 20, cfg.upload_relay.buffered_retry_max_bytes);
    assert_eq!(512 << 20, cfg.upload_relay.buffered_retry_total_bytes);
    assert_eq!(500 * 1024 * 1024, cfg.upload_relay.max_body_bytes);
    assert_eq!(&[9u8; 48][..], cfg.upload_relay.secret.expose());
}

#[test]
fn debug_output_never_reveals_a_secret() {
    let relay_secret = general_purpose::STANDARD.encode(b"relay-secret-material-0123456789");
    let cfg = Config::load_from_iter([
        ("NEXUS_MEDIA_PROXY_SECRET_KEY", "signing-secret-material"),
        ("NEXUS_MEDIA_PROXY_MODE", "upload"),
        (
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64",
            relay_secret.as_str(),
        ),
    ])
    .unwrap();

    let rendered = format!("{cfg:?}");
    assert!(!rendered.contains("signing-secret-material"));
    assert!(!rendered.contains("relay-secret-material"));
    assert_eq!(2, rendered.matches("[REDACTED]").count());
    assert_eq!("signing-secret-material", cfg.secret_key.expose());
}
