# syntax=docker/dockerfile:1.7
# SPDX-License-Identifier: Nebula
FROM erlang:28-slim AS build

ARG RUST_TOOLCHAIN=1.98.1
ARG REBAR3_VERSION=3.28.0
ARG REBAR3_SHA256=5a28b1cca082d3b023ec0f5df9d9f9d52557036c6f2a21c1ffa11b93a984dd42

ENV PATH="/root/.cargo/bin:${PATH}"
ENV CARGO_HTTP_TIMEOUT=180 \
	CARGO_HTTP_LOW_SPEED_LIMIT=1 \
	CARGO_NET_RETRY=5

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	curl \
	make \
	gcc \
	g++ \
	libc6-dev \
	ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Use the upstream S3 distribution mirror rather than the GitHub release asset,
# which can return transient 5xx responses in some Docker build environments.
# The checksum pins the exact Rebar3 release and fails closed if the mirror changes.
RUN set -eux; \
	curl --retry 5 --retry-delay 2 --retry-all-errors --connect-timeout 15 --max-time 180 \
		--proto '=https' --tlsv1.2 -fsSL https://s3.amazonaws.com/rebar3/rebar3 \
		-o /tmp/rebar3; \
	printf '%s  %s\n' "${REBAR3_SHA256}" /tmp/rebar3 | sha256sum --check --strict; \
	install -m 0755 /tmp/rebar3 /usr/local/bin/rebar3; \
	rm /tmp/rebar3; \
	rebar3 version | grep -F "${REBAR3_VERSION}"

RUN curl --retry 5 --retry-delay 2 --retry-all-errors --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | \
	sh -s -- -y --profile minimal --default-toolchain "${RUST_TOOLCHAIN}"

COPY . .
WORKDIR /usr/src/app/nexus_gateway
RUN --mount=type=cache,target=/root/.cargo/registry,sharing=locked \
	--mount=type=cache,target=/root/.cargo/git,sharing=locked \
	rebar3 compile --deps_only

RUN --mount=type=cache,target=/root/.cargo/registry,sharing=locked \
	--mount=type=cache,target=/root/.cargo/git,sharing=locked \
	cp config/sys.config.template config/sys.config && \
	rebar3 as prod release

FROM erlang:28-slim

ARG BUILD_VERSION=""
ARG SOURCE_SHA=""
ARG SOURCE_DATE=""

LABEL org.opencontainers.image.title="nexus-gateway"
LABEL org.opencontainers.image.description="NEXUS realtime gateway"
LABEL org.opencontainers.image.licenses="Nebula"
LABEL org.opencontainers.image.vendor="NEXUS"
LABEL org.opencontainers.image.url="https://nexus.app"
LABEL org.opencontainers.image.documentation="https://docs.nexus.app"
LABEL org.opencontainers.image.source="https://github.com/hasoon7/Nebula-v23"
LABEL org.opencontainers.image.version="${BUILD_VERSION}"
LABEL org.opencontainers.image.revision="${SOURCE_SHA}"
LABEL org.opencontainers.image.created="${SOURCE_DATE}"
LABEL app.nexus.build-version="${BUILD_VERSION}"

WORKDIR /opt/nexus_gateway

RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	libstdc++6 \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/src/app/nexus_gateway/_build/prod/rel/nexus_gateway .
COPY nexus_gateway/scripts/docker_entrypoint.sh /opt/nexus_gateway/bin/docker_entrypoint.sh
COPY nexus_gateway/scripts/nexus_gateway_release_wrapper.sh /opt/nexus_gateway/bin/nexus_gateway.wrapper

RUN mv /opt/nexus_gateway/bin/nexus_gateway /opt/nexus_gateway/bin/nexus_gateway.real && \
	mv /opt/nexus_gateway/bin/nexus_gateway.wrapper /opt/nexus_gateway/bin/nexus_gateway && \
	chmod +x /opt/nexus_gateway/bin/docker_entrypoint.sh /opt/nexus_gateway/bin/nexus_gateway && \
	groupadd -r -g 65532 nexus && \
	useradd -r -u 65532 -g 65532 -s /sbin/nologin -d /opt/nexus_gateway nexus && \
	chown -R 65532:65532 /opt/nexus_gateway

USER 65532:65532

ENV BUILD_VERSION="${BUILD_VERSION}"

EXPOSE 8080 8081 4369

ENTRYPOINT ["/opt/nexus_gateway/bin/docker_entrypoint.sh"]
