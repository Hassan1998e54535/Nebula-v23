// SPDX-License-Identifier: Nebula

use super::env_with;
use crate::config::{BucketStyle, Config};

#[test]
fn every_new_var_tolerates_a_blank_value_individually() {
    for var in [
        "NEXUS_S3_READ_ENDPOINT",
        "NEXUS_S3_READ_BUCKET",
        "NEXUS_S3_READ_BUCKET_STYLE",
        "NEXUS_S3_READ_SIGNED",
    ] {
        for blank in ["", "  "] {
            let cfg = Config::load_from_iter(env_with(&[(var, blank)]))
                .unwrap_or_else(|err| panic!("{var}={blank:?} must be treated as unset: {err}"));
            assert_eq!(None, cfg.storage.s3_read_endpoint);
            assert_eq!("cdn", cfg.storage.s3_read_bucket);
            assert_eq!(BucketStyle::Path, cfg.storage.s3_read_bucket_style);
            assert!(!cfg.storage.s3_read_signed);
        }
    }
}

#[test]
fn read_bucket_defaults_to_cdn_bucket_and_can_be_overridden() {
    let cfg = Config::load_from_iter(env_with(&[("NEXUS_S3_BUCKET_CDN", "nexus")])).unwrap();
    assert_eq!("nexus", cfg.storage.s3_read_bucket);

    let cfg = Config::load_from_iter(env_with(&[
        ("NEXUS_S3_BUCKET_CDN", "nexus"),
        ("NEXUS_S3_READ_BUCKET", "nexus-static"),
    ]))
    .unwrap();
    assert_eq!("nexus-static", cfg.storage.s3_read_bucket);
}

#[test]
fn read_bucket_style_inherits_force_path_style() {
    let cfg = Config::load_from_iter(env_with(&[("NEXUS_S3_FORCE_PATH_STYLE", "false")])).unwrap();
    assert_eq!(BucketStyle::VirtualHosted, cfg.storage.s3_read_bucket_style);

    let cfg = Config::load_from_iter(env_with(&[
        ("NEXUS_S3_FORCE_PATH_STYLE", "false"),
        ("NEXUS_S3_READ_BUCKET_STYLE", "root"),
    ]))
    .unwrap();
    assert_eq!(BucketStyle::Rooted, cfg.storage.s3_read_bucket_style);
    assert!(!cfg.storage.s3_force_path_style);
}

#[test]
fn read_endpoint_is_validated_at_startup() {
    let cfg = Config::load_from_iter(env_with(&[(
        "NEXUS_S3_READ_ENDPOINT",
        "https://cdn.example.net",
    )]))
    .unwrap();
    assert_eq!(
        Some("https://cdn.example.net".to_owned()),
        cfg.storage.s3_read_endpoint
    );

    for (bad, expected) in [
        ("cdn.example.net", "not a valid URL"),
        ("ftp://cdn.example.net", "must be an http or https URL"),
        ("https://", "not a valid URL"),
        (
            "https://user:pw@cdn.example.net",
            "must not contain credentials",
        ),
        (
            "https://cdn.example.net/?token=abc",
            "must not contain a query string or fragment",
        ),
        (
            "https://cdn.example.net/#frag",
            "must not contain a query string or fragment",
        ),
    ] {
        let err =
            Config::load_from_iter(env_with(&[("NEXUS_S3_READ_ENDPOINT", bad)])).unwrap_err();
        let message = err.to_string();
        assert!(
            message.contains("NEXUS_S3_READ_ENDPOINT") && message.contains(expected),
            "bad={bad} err={message}"
        );
    }
}
