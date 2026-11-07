// SPDX-License-Identifier: Nebula

use super::{allowed_origins, base_env, env_with};
use crate::config::{Config, DeploymentMode, PolicyMode};
use base64::{Engine as _, engine::general_purpose};

const ORIGINS_KEY: &str = "NEXUS_MEDIA_PROXY_CORS_ALLOWED_ORIGINS";

fn enforce_with_origins(raw: &'static str) -> anyhow::Result<Config> {
    Config::load_from_iter(env_with(&[
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "enforce"),
        (ORIGINS_KEY, raw),
    ]))
}

#[test]
fn cors_defaults_to_off_with_an_empty_allowlist() {
    let cfg = Config::load_from_iter(base_env()).unwrap();
    assert_eq!(PolicyMode::Off, cfg.cors.mode);
    assert!(cfg.cors.allowed_origins.is_empty());
}

#[test]
fn rejects_an_unknown_cors_mode() {
    for raw in ["strict", "true", "1"] {
        let err = Config::load_from_iter(env_with(&[
            ("NEXUS_MEDIA_PROXY_CORS_MODE", raw),
            (ORIGINS_KEY, "https://web.nexus.app"),
        ]))
        .unwrap_err();
        assert_eq!(
            "NEXUS_MEDIA_PROXY_CORS_MODE must be one of: off, report, enforce",
            err.to_string(),
            "{raw:?}"
        );
    }
}

#[test]
fn allowed_origins_are_normalised_to_their_browser_serialisation() {
    for (raw, expected) in [
        ("https://Web.NEXUS.App", vec!["https://web.nexus.app"]),
        ("https://web.nexus.app/", vec!["https://web.nexus.app"]),
        ("https://web.nexus.app:443", vec!["https://web.nexus.app"]),
        ("http://localhost:8088", vec!["http://localhost:8088"]),
        ("nexus-app://app", vec!["nexus-app://app"]),
        (
            "https://web.nexus.app,nexus-app://app,nexus-app://app",
            vec!["https://web.nexus.app", "nexus-app://app"],
        ),
        ("http://127.0.0.1:8088", vec!["http://127.0.0.1:8088"]),
        ("http://[::1]:8088", vec!["http://[::1]:8088"]),
        (
            "https://xn--bcher-kva.example",
            vec!["https://xn--bcher-kva.example"],
        ),
        (
            " https://a.example , ,https://b.example,",
            vec!["https://a.example", "https://b.example"],
        ),
        (
            "https://a.example,https://A.example",
            vec!["https://a.example"],
        ),
    ] {
        let cfg = enforce_with_origins(raw).unwrap();
        assert_eq!(expected, allowed_origins(&cfg), "{raw:?}");
    }
}

#[test]
fn rejects_an_allowed_origin_that_is_not_a_bare_http_origin() {
    for entry in [
        "*",
        "null",
        "web.nexus.app",
        "ftp://web.nexus.app",
        "file:///tmp/x",
        "nexus-app://app/",
        "nexus-app://evil",
        "nexus-app://app:443",
        "NEXUS-APP://APP",
        "other-app://app",
        "https://user@web.nexus.app",
        "https://user:pw@web.nexus.app",
        "https://web.nexus.app/app",
        "https://web.nexus.app?x=1",
        "https://web.nexus.app#f",
        "https://*.nexus.app",
        "https://{web}.nexus.app",
        "https://*",
        "https://web.*.nexus.app",
        "https://~",
        "https://$",
        "https://a..b",
        "https://.nexus.app",
        "https://web.nexus.app.",
        "https://bücher.example",
        "https://w\u{435}b.nexus.app",
    ] {
        let err = enforce_with_origins(entry).unwrap_err();
        assert_eq!(
            format!("{ORIGINS_KEY} contains an invalid origin: {entry}"),
            err.to_string()
        );
    }

    let err = enforce_with_origins("https://{web,canary}.nexus.app").unwrap_err();
    assert_eq!(
        format!("{ORIGINS_KEY} contains an invalid origin: https://{{web"),
        err.to_string()
    );
}

#[test]
fn an_invalid_entry_fails_even_beside_a_valid_one() {
    let err =
        enforce_with_origins("https://web.nexus.app, https://web.nexus.app/app").unwrap_err();
    assert_eq!(
        format!("{ORIGINS_KEY} contains an invalid origin: https://web.nexus.app/app"),
        err.to_string()
    );
}

#[test]
fn report_and_enforce_require_an_allowed_origin() {
    for mode in ["report", "enforce"] {
        let unset = Config::load_from_iter(env_with(&[("NEXUS_MEDIA_PROXY_CORS_MODE", mode)]))
            .unwrap_err();
        let empty = Config::load_from_iter(env_with(&[
            ("NEXUS_MEDIA_PROXY_CORS_MODE", mode),
            (ORIGINS_KEY, ""),
        ]))
        .unwrap_err();
        let separators_only = Config::load_from_iter(env_with(&[
            ("NEXUS_MEDIA_PROXY_CORS_MODE", mode),
            (ORIGINS_KEY, " , "),
        ]))
        .unwrap_err();
        for err in [unset, empty, separators_only] {
            assert_eq!(
                "NEXUS_MEDIA_PROXY_CORS_ALLOWED_ORIGINS is required when NEXUS_MEDIA_PROXY_CORS_MODE is report or enforce",
                err.to_string(),
                "{mode}"
            );
        }
    }
}

#[test]
fn off_mode_keeps_a_staged_allowlist_and_still_rejects_an_invalid_one() {
    let cfg = Config::load_from_iter(env_with(&[
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "off"),
        (
            ORIGINS_KEY,
            "https://web.nexus.app,https://web.canary.nexus.app",
        ),
    ]))
    .unwrap();
    assert_eq!(PolicyMode::Off, cfg.cors.mode);
    assert_eq!(
        vec!["https://web.nexus.app", "https://web.canary.nexus.app"],
        allowed_origins(&cfg)
    );

    let cfg = Config::load_from_iter(env_with(&[(ORIGINS_KEY, "https://web.nexus.app")])).unwrap();
    assert_eq!(PolicyMode::Off, cfg.cors.mode);
    assert_eq!(vec!["https://web.nexus.app"], allowed_origins(&cfg));

    let err = Config::load_from_iter(env_with(&[
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "off"),
        (ORIGINS_KEY, "not an origin"),
    ]))
    .unwrap_err();
    assert_eq!(
        format!("{ORIGINS_KEY} contains an invalid origin: not an origin"),
        err.to_string()
    );
}

#[test]
fn static_mode_ignores_both_cors_keys() {
    let cfg = Config::load_from_iter(env_with(&[
        ("NEXUS_MEDIA_PROXY_MODE", "static"),
        ("NEXUS_MEDIA_PROXY_CORS_MODE", "enforce"),
        (ORIGINS_KEY, "not an origin"),
    ]))
    .unwrap();
    assert_eq!(DeploymentMode::Static, cfg.mode);
    assert_eq!(PolicyMode::Off, cfg.cors.mode);
    assert!(cfg.cors.allowed_origins.is_empty());
}

#[test]
fn relay_mode_ignores_both_cors_keys() {
    let relay_secret = general_purpose::STANDARD.encode([5u8; 32]);
    for (cors_mode, origins) in [
        ("enforce", "not an origin"),
        ("enforce", "https://*.nexus.app"),
        ("strict", "https://web.nexus.app"),
    ] {
        let mut env: Vec<(&str, &str)> = env_with(&[
            ("NEXUS_MEDIA_PROXY_MODE", "relay"),
            ("NEXUS_MEDIA_PROXY_CORS_MODE", cors_mode),
            (ORIGINS_KEY, origins),
        ]);
        env.push((
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64",
            relay_secret.as_str(),
        ));
        let cfg = Config::load_from_iter(env).unwrap();
        assert_eq!(DeploymentMode::Relay, cfg.mode);
        assert_eq!(PolicyMode::Off, cfg.cors.mode, "{cors_mode} {origins}");
        assert!(cfg.cors.allowed_origins.is_empty(), "{cors_mode} {origins}");
    }
}

#[test]
fn upload_mode_still_applies_the_cors_keys() {
    let relay_secret = general_purpose::STANDARD.encode([5u8; 32]);
    let upload_env = |origins: &'static str| {
        let mut env: Vec<(&str, &str)> = env_with(&[
            ("NEXUS_MEDIA_PROXY_MODE", "upload"),
            ("NEXUS_MEDIA_PROXY_CORS_MODE", "enforce"),
            (ORIGINS_KEY, origins),
        ]);
        env.push((
            "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64",
            relay_secret.as_str(),
        ));
        env
    };

    let cfg = Config::load_from_iter(upload_env("https://web.nexus.app")).unwrap();
    assert_eq!(DeploymentMode::Upload, cfg.mode);
    assert_eq!(PolicyMode::Enforce, cfg.cors.mode);
    assert_eq!(vec!["https://web.nexus.app"], allowed_origins(&cfg));

    let err = Config::load_from_iter(upload_env("not an origin")).unwrap_err();
    assert_eq!(
        format!("{ORIGINS_KEY} contains an invalid origin: not an origin"),
        err.to_string()
    );
}
