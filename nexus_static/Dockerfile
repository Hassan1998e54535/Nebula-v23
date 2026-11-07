# syntax=docker/dockerfile:1.7
# SPDX-License-Identifier: Nebula

FROM alpine:3.24 AS spellcheck-dictionaries
RUN apk add --no-cache curl
COPY nexus_static/fetch-spellcheck-dictionaries.sh nexus_static/spellcheck-dictionaries.sha256 /src/
RUN sh /src/fetch-spellcheck-dictionaries.sh /dictionaries

FROM caddy:2.11-alpine

ARG BUILD_VERSION=""
ARG SOURCE_SHA=""
ARG SOURCE_DATE=""

LABEL org.opencontainers.image.title="nexus-static"
LABEL org.opencontainers.image.description="Self-hostable static asset bundle for NEXUS"
LABEL org.opencontainers.image.licenses="Nebula AND CC-BY-SA-4.0 AND CC-BY-4.0"
LABEL org.opencontainers.image.vendor="NEXUS"
LABEL org.opencontainers.image.url="https://nexus.app"
LABEL org.opencontainers.image.documentation="https://docs.nexus.app"
LABEL org.opencontainers.image.source="https://github.com/hasoon7/Nebula-v23"
LABEL org.opencontainers.image.version="${BUILD_VERSION}"
LABEL org.opencontainers.image.revision="${SOURCE_SHA}"
LABEL org.opencontainers.image.created="${SOURCE_DATE}"
LABEL app.nexus.build-version="${BUILD_VERSION}"

COPY nexus_static/Caddyfile /etc/caddy/Caddyfile
COPY --chown=65532:65532 nexus_static/LICENSE nexus_static/THIRD_PARTY_LICENSES.md /srv/nexus-static/
COPY --chown=65532:65532 nexus_static/avatars /srv/nexus-static/avatars
COPY --chown=65532:65532 nexus_static/badges /srv/nexus-static/badges
COPY --chown=65532:65532 nexus_static/desktop /srv/nexus-static/desktop
COPY --chown=65532:65532 --from=spellcheck-dictionaries /dictionaries /srv/nexus-static/desktop/spellcheck/dictionaries
COPY --chown=65532:65532 nexus_static/emoji /srv/nexus-static/emoji
COPY --chown=65532:65532 nexus_static/web /srv/nexus-static/web

RUN setcap -r /usr/bin/caddy \
	&& mkdir -p /config/caddy /data/caddy \
	&& chown -R 65532:65532 /config /data /srv/nexus-static

USER 65532:65532

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -q -O - http://127.0.0.1:8080/_health | grep -q OK
