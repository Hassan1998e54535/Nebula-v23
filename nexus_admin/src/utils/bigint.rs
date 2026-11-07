// SPDX-License-Identifier: Nebula

pub fn format_discriminator(discriminator: &str) -> String {
    let num: u16 = discriminator.parse().unwrap_or(0);
    format!("{num:04}")
}
