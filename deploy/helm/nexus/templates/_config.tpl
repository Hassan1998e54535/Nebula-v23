{{- define "nexus.s3Endpoint" -}}
{{- .Values.s3.endpoint | default (ternary "http://seaweedfs:8333" "" .Values.seaweedfs.enabled) }}
{{- end }}

{{- define "nexus.configData" -}}
{{- $v := .Values }}
{{- $o := include "nexus.origin" . }}
{{- $hostOrigin := include "nexus.hostOrigin" . }}
{{- $media := printf "%s/media" $o }}
{{- $s3 := include "nexus.s3Endpoint" . }}
{{- $c := dict }}
{{- $_ := set $c "NEXUS_ENV" "production" }}
{{- $_ := set $c "NEXUS_SELF_HOSTED" "true" }}
{{- $_ := set $c "NEXUS_DATABASE_BACKEND" "postgres" }}
{{- $_ := set $c "NEXUS_TRUST_CLIENT_IP_HEADER" "true" }}
{{- $_ := set $c "NEXUS_BASE_DOMAIN" $v.domain }}
{{- $_ := set $c "NEXUS_PUBLIC_SCHEME" $v.scheme }}
{{- $_ := set $c "NEXUS_PUBLIC_PORT" (include "nexus.string" $v.port) }}
{{- $_ := set $c "NEXUS_PUBLIC_ORIGIN" (trimSuffix "/" ($v.publicOrigin | default "")) }}
{{- $_ := set $c "NEXUS_APP_ENDPOINT" $o }}
{{- $_ := set $c "NEXUS_MARKETING_ENDPOINT" $o }}
{{- $_ := set $c "NEXUS_MEDIA_ENDPOINT" $media }}
{{- $_ := set $c "NEXUS_MEDIA_PROXY_PUBLIC_ENDPOINT" $media }}
{{- $_ := set $c "NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT" $media }}
{{- $_ := set $c "NEXUS_GATEWAY_MEDIA_PROXY_ENDPOINT" $media }}
{{- $_ := set $c "NEXUS_ADMIN_ENDPOINT" (printf "%s%s" $o $v.adminBasePath) }}
{{- $_ := set $c "NEXUS_GATEWAY_STATIC_CDN_ENDPOINT" $o }}
{{- $_ := set $c "NEXUS_MEDIA_PROXY_CORS_ALLOWED_ORIGINS" $hostOrigin }}
{{- $_ := set $c "NEXUS_PASSKEY_RP_ID" $v.domain }}
{{- $_ := set $c "NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS" $o }}
{{- if $v.postgres.enabled }}
{{- $_ := set $c "NEXUS_POSTGRES_HOST" "postgres" }}
{{- $_ := set $c "NEXUS_POSTGRES_PORT" "5432" }}
{{- $_ := set $c "NEXUS_POSTGRES_DATABASE" $v.postgres.database }}
{{- $_ := set $c "NEXUS_POSTGRES_USERNAME" $v.postgres.username }}
{{- else }}
{{- with $v.postgres.external }}
{{- $_ := set $c "NEXUS_POSTGRES_HOST" (.host | default "") }}
{{- $_ := set $c "NEXUS_POSTGRES_PORT" (include "nexus.string" (.port | default "")) }}
{{- $_ := set $c "NEXUS_POSTGRES_DATABASE" (.database | default "") }}
{{- $_ := set $c "NEXUS_POSTGRES_USERNAME" (.username | default "") }}
{{- $_ := set $c "NEXUS_POSTGRES_SSL" (include "nexus.string" (.ssl | default "")) }}
{{- end }}
{{- end }}
{{- if not $v.valkey.enabled }}
{{- $_ := set $c "NEXUS_KV_URL" ($v.valkey.external.url | default "") }}
{{- end }}
{{- $nats := ternary "nats://nats:4222" ($v.nats.external.url | default "") $v.nats.enabled }}
{{- $_ := set $c "NEXUS_NATS_URL" $nats }}
{{- $_ := set $c "NEXUS_NATS_JETSTREAM_URL" $nats }}
{{- $_ := set $c "NEXUS_SVC_NATS_URL" $nats }}
{{- $_ := set $c "NEXUS_SEARCH_ENGINE" "meilisearch" }}
{{- $_ := set $c "NEXUS_SEARCH_URL" (ternary "http://meilisearch:7700" ($v.meilisearch.external.url | default "") $v.meilisearch.enabled) }}
{{- $_ := set $c "NEXUS_S3_ENDPOINT" $s3 }}
{{- $_ := set $c "NEXUS_S3_PUBLIC_ENDPOINT" ($v.s3.publicEndpoint | default $s3) }}
{{- $_ := set $c "NEXUS_S3_REGION" $v.s3.region }}
{{- $_ := set $c "NEXUS_S3_FORCE_PATH_STYLE" (toString $v.s3.forcePathStyle) }}
{{- $_ := set $c "NEXUS_S3_BUCKET_CDN" $v.s3.buckets.cdn }}
{{- $_ := set $c "NEXUS_S3_BUCKET_UPLOADS" $v.s3.buckets.uploads }}
{{- $_ := set $c "NEXUS_S3_BUCKET_REPORTS" $v.s3.buckets.reports }}
{{- $_ := set $c "NEXUS_S3_BUCKET_HARVESTS" $v.s3.buckets.harvests }}
{{- $livekit := include "nexus.livekitMode" . }}
{{- $_ := set $c "NEXUS_LIVEKIT_ENABLED" (toString (ne $livekit "off")) }}
{{- if eq $livekit "bundled" }}
{{- $_ := set $c "NEXUS_LIVEKIT_INTERNAL_URL" "http://livekit:7880" }}
{{- $_ := set $c "NEXUS_LIVEKIT_DEFAULT_REGION" $v.livekit.defaultRegion }}
{{- $_ := set $c "NEXUS_LIVEKIT_URL" (printf "%s/livekit" $hostOrigin) }}
{{- else if eq $livekit "external" }}
{{- $_ := set $c "NEXUS_LIVEKIT_INTERNAL_URL" $v.livekit.external.url }}
{{- $_ := set $c "NEXUS_LIVEKIT_DEFAULT_REGION" $v.livekit.defaultRegion }}
{{- $_ := set $c "NEXUS_LIVEKIT_URL" $v.livekit.external.publicUrl }}
{{- end }}
{{- $_ := set $c "NEXUS_API_PRESIGNED_HARVEST_DOWNLOADS_ENABLED" "false" }}
{{- $_ := set $c "NEXUS_EMAIL_FROM_EMAIL" "noreply@localhost" }}
{{- $_ := set $c "NEXUS_VAPID_EMAIL" ($v.email | default (printf "admin@%s" $v.domain)) }}
{{- $_ := set $c "NEXUS_INTERNAL_API_ENDPOINT" "http://api:8080" }}
{{- $_ := set $c "NEXUS_INTERNAL_MEDIA_PROXY_ENDPOINT" "http://media-proxy:8080" }}
{{- range $k, $val := $v.env | default dict }}
{{- $_ := set $c $k (include "nexus.string" ($val | default "")) }}
{{- end }}
{{- $out := dict }}
{{- range $k, $val := $c }}
{{- if $val }}
{{- $_ := set $out $k $val }}
{{- end }}
{{- end }}
{{- toYaml $out }}
{{- end }}

{{- define "nexus.appProxyConfigData" -}}
{{- $v := .Values }}
{{- $s3 := include "nexus.s3Endpoint" . }}
{{- $c := dict }}
{{- $_ := set $c "NEXUS_APP_PROXY_PORT" "8080" }}
{{- $_ := set $c "DISCOVERY_UPSTREAM_URL" "http://api:8080/.well-known/nexus" }}
{{- $_ := set $c "NEXUS_S3_PUBLIC_ENDPOINT" ($v.s3.publicEndpoint | default $s3) }}
{{- $_ := set $c "NEXUS_S3_BUCKET_UPLOADS" $v.s3.buckets.uploads }}
{{- $_ := set $c "NEXUS_MEDIA_ENDPOINT" (printf "%s/media" (include "nexus.origin" .)) }}
{{- range $k, $val := $v.appProxy.config | default dict }}
{{- $_ := set $c $k (include "nexus.string" ($val | default "")) }}
{{- end }}
{{- $out := dict }}
{{- range $k, $val := $c }}
{{- if $val }}
{{- $_ := set $out $k $val }}
{{- end }}
{{- end }}
{{- toYaml $out }}
{{- end }}
