// SPDX-License-Identifier: Nebula

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CodesResponse {
    pub codes: Vec<String>,
}
