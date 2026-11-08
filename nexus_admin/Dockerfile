# syntax=docker/dockerfile:1.7
# SPDX-License-Identifier: Nebula

FROM rust:1-trixie AS builder

ARG TARGETARCH
ENV CARGO_HTTP_TIMEOUT=180 \
    CARGO_HTTP_LOW_SPEED_LIMIT=1 \
    CARGO_NET_RETRY=5

WORKDIR /usr/src/app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates nodejs npm pkg-config \
	&& npm install -g pnpm@11.27.0 \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install --no-audit --no-fund @tailwindcss/cli@4.2.1 tailwindcss@4.2.1
RUN TAILWIND_OXIDE_VERSION="4.2.1" \
	&& case "${TARGETARCH}" in \
		amd64) OXIDE_PKG="@tailwindcss/oxide-linux-x64-gnu" ;; \
		arm64) OXIDE_PKG="@tailwindcss/oxide-linux-arm64-gnu" ;; \
		*) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
	esac \
	&& npm install --no-audit --no-fund "${OXIDE_PKG}@${TAILWIND_OXIDE_VERSION}" \
	&& ls -la node_modules/.bin/tailwindcss

COPY Cargo.lock Cargo.lock
COPY nexus_admin nexus_admin
COPY nexus_common nexus_common
COPY packages/fonts/manifest.json packages/fonts/manifest.json
COPY packages/fonts/NOTICE.md packages/fonts/NOTICE.md
COPY packages/fonts/LICENSE-IBM-PLEX.txt packages/fonts/LICENSE-IBM-PLEX.txt
COPY packages/fonts/files/NEXUSSans packages/fonts/files/NEXUSSans
COPY packages/fonts/files/NEXUSMono packages/fonts/files/NEXUSMono
RUN printf '%s\n' \
	'[workspace]' \
	'members = ["nexus_admin", "nexus_common"]' \
	'resolver = "2"' \
	'' \
	'[workspace.package]' \
	'edition = "2024"' \
	'license = "Nebula"' \
	'' \
	'[profile.release]' \
	'lto = "fat"' \
	'codegen-units = 1' \
	'strip = "symbols"' \
	> Cargo.toml

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build --release -p nexus_admin \
	&& cp target/release/nexus_admin /usr/local/bin/nexus-admin

RUN test -s target/release/build/nexus_admin-*/out/static/app.css \
	&& echo "Tailwind CSS compiled successfully"

RUN test "$(ls target/release/build/nexus_admin-*/out/static/fonts/*.woff2 | wc -l)" -eq 16 \
	&& ls target/release/build/nexus_admin-*/out/static/fonts/fonts.*.css \
	&& echo "Latin-core fonts bundled successfully"

FROM debian:trixie-slim AS runtime

ARG BUILD_VERSION=""
ARG SOURCE_SHA=""
ARG SOURCE_DATE=""

LABEL org.opencontainers.image.title="nexus-admin"
LABEL org.opencontainers.image.description="NEXUS admin console"
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

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/nexus-admin /usr/local/bin/nexus-admin

ENV BUILD_VERSION="${BUILD_VERSION}"
ENV NEXUS_ADMIN_HOST="0.0.0.0"
ENV NEXUS_ADMIN_PORT="8080"

USER 65532:65532

EXPOSE 8080

CMD ["/usr/local/bin/nexus-admin"]
