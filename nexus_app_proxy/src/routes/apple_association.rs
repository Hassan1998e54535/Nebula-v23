// SPDX-License-Identifier: Nebula

use axum::{
    Json,
    http::header,
    response::{IntoResponse, Response},
};
use serde_json::json;

pub async fn apple_app_site_association() -> Response {
    let body = json!({
        "webcredentials": {
            "apps": [
                "3G5837T29K.app.nexus",
                "3G5837T29K.app.nexus.canary",
                "3G5837T29K.com.nexus",
                "3G5837T29K.com.nexus.canary"
            ]
        }
    });

    (
        [(header::CACHE_CONTROL, "public, max-age=1800")],
        Json(body),
    )
        .into_response()
}
