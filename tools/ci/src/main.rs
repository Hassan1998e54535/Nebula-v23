// SPDX-License-Identifier: Nebula

#[tokio::main]
async fn main() {
    if let Err(error) = nexus_ci::run().await {
        eprintln!("{error:?}");
        std::process::exit(1);
    }
}
