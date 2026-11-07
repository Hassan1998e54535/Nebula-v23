# SPDX-License-Identifier: Nebula
ARG BUILD_VERSION

FROM node:26-trixie-slim AS base

WORKDIR /usr/src/app

RUN npm install -g pnpm@11.27.0

FROM base AS deploy

RUN apt-get update && apt-get install -y --no-install-recommends \
		build-essential \
		gcc \
		libssl-dev \
		pkg-config \
		openssl \
		libvips-dev \
		python3 && \
	rm -rf /var/lib/apt/lists/*

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter nexus_api run build
RUN pnpm deploy --legacy --filter=nexus_api --prod --config.allow-unused-patches=true /out

FROM node:26-trixie-slim

ARG BUILD_VERSION
ARG SOURCE_SHA
ARG SOURCE_DATE

LABEL org.opencontainers.image.title="nexus-api"
LABEL org.opencontainers.image.description="NEXUS HTTP API and background workers"
LABEL org.opencontainers.image.licenses="Nebula"
LABEL org.opencontainers.image.vendor="NEXUS"
LABEL org.opencontainers.image.url="https://nexus.app"
LABEL org.opencontainers.image.documentation="https://docs.nexus.app"
LABEL org.opencontainers.image.source="https://github.com/hasoon7/Nebula-v23"
LABEL org.opencontainers.image.version="${BUILD_VERSION}"
LABEL org.opencontainers.image.revision="${SOURCE_SHA}"
LABEL org.opencontainers.image.created="${SOURCE_DATE}"
LABEL app.nexus.build-version="${BUILD_VERSION}"

WORKDIR /usr/src/app/nexus_api

RUN apt-get update && apt-get install -y --no-install-recommends \
		ca-certificates \
		ffmpeg \
		libimage-exiftool-perl \
		libwebp7 \
		libwebpmux3 \
		libheif1 \
		libheif-plugin-libde265 \
		libheif-plugin-dav1d \
		libvips42t64 && \
	rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11.27.0

COPY --from=deploy /out ./
COPY --from=deploy /usr/src/app/nexus_api/dist ./dist
COPY --from=deploy /usr/src/app/tsconfigs /usr/src/app/tsconfigs

RUN rm -rf pkgs && \
	chown -R 65532:65532 /usr/src/app

ENV HOME=/usr/src/app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
ENV BUILD_VERSION=${BUILD_VERSION}

USER 65532:65532

EXPOSE 8080

CMD ["node", "dist/AppEntrypoint.js"]
