# syntax=docker/dockerfile:1.7
# SPDX-License-Identifier: Nebula

FROM rust:1-trixie AS builder
ENV CARGO_HTTP_TIMEOUT=180 \
    CARGO_HTTP_LOW_SPEED_LIMIT=1 \
    CARGO_NET_RETRY=5

WORKDIR /usr/src/app

COPY . .

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build --release -p nexus-users --features scylla

FROM debian:trixie-slim

ARG BUILD_VERSION=""
ARG SOURCE_SHA=""
ARG SOURCE_DATE=""

LABEL org.opencontainers.image.title="nexus-users"
LABEL org.opencontainers.image.description="NEXUS user storage service"
LABEL org.opencontainers.image.licenses="Nebula"
LABEL org.opencontainers.image.vendor="NEXUS"
LABEL org.opencontainers.image.url="https://nexus.app"
LABEL org.opencontainers.image.documentation="https://docs.nexus.app"
LABEL org.opencontainers.image.source="https://github.com/hasoon7/Nebula-v23"
LABEL org.opencontainers.image.version="${BUILD_VERSION}"
LABEL org.opencontainers.image.revision="${SOURCE_SHA}"
LABEL org.opencontainers.image.created="${SOURCE_DATE}"
LABEL app.nexus.build-version="${BUILD_VERSION}"

WORKDIR /usr/local/bin

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
	rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/nexus-users /usr/local/bin/nexus-users

ENV BUILD_VERSION="${BUILD_VERSION}"

USER 65532:65532

EXPOSE 8090

CMD ["/usr/local/bin/nexus-users"]
