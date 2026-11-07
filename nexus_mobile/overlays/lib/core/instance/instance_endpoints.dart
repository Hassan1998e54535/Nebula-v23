import 'package:fluxer_app/core/instance/instance_constants.dart';
import 'package:fluxer_dart/export.dart';

/// Endpoints from NEXUS discovery; never fall back to an unrelated operator.
abstract final class InstanceEndpoints {
  static const String defaultMedia = '${InstanceConstants.origin}/media';
  static const String defaultStaticCdn = InstanceConstants.origin;
  static const String defaultInvite = '${InstanceConstants.origin}/invite';
  static const String defaultGift = '${InstanceConstants.origin}/gift';
  static const String defaultWebApp = InstanceConstants.origin;

  static String staticCdn = defaultStaticCdn;
  static String media = defaultMedia;
  static String invite = defaultInvite;
  static String gift = defaultGift;
  static String webApp = defaultWebApp;
  static String api = InstanceConstants.defaultApiBaseUrl;
  static String gateway = InstanceConstants.defaultGatewayUrl;
  static bool selfHosted = true;

  static void apply(WellKnownFluxerResponse response) {
    final endpoints = response.endpoints;
    staticCdn = _normalizeBaseUrl(endpoints.staticCdn, fallback: defaultStaticCdn);
    media = mediaOf(response);
    invite = _normalizeBaseUrl(endpoints.invite, fallback: defaultInvite);
    gift = _normalizeBaseUrl(endpoints.gift, fallback: defaultGift);
    webApp = _normalizeBaseUrl(endpoints.webapp, fallback: defaultWebApp);
    api = _normalizeBaseUrl(
      endpoints.apiClient.isNotEmpty ? endpoints.apiClient : endpoints.api,
      fallback: InstanceConstants.defaultApiBaseUrl,
    );
    gateway = _normalizeBaseUrl(endpoints.gateway);
    selfHosted = response.features.selfHosted;
  }

  static String mediaOf(WellKnownFluxerResponse? response) =>
      _normalizeBaseUrl(response?.endpoints.media ?? '', fallback: defaultMedia);

  static String _normalizeBaseUrl(String value, {String fallback = ''}) {
    final trimmed = value.trim();
    return (trimmed.isEmpty ? fallback : trimmed).replaceAll(RegExp(r'/+$'), '');
  }

  static void resetToDefaults() {
    staticCdn = defaultStaticCdn;
    media = defaultMedia;
    invite = defaultInvite;
    gift = defaultGift;
    webApp = defaultWebApp;
    api = InstanceConstants.defaultApiBaseUrl;
    gateway = InstanceConstants.defaultGatewayUrl;
    selfHosted = true;
  }
}
