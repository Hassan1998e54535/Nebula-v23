// SPDX-License-Identifier: Nebula

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SendSystemDmResponse {
    pub recipient_count: Option<i64>,
}
