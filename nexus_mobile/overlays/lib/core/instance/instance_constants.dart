// NEXUS integration; upstream class/package names intentionally remain stable.
abstract final class InstanceConstants {
  static const String origin = String.fromEnvironment('NEXUS_ORIGIN');
  static const int apiCodeVersion = 1;
  static const String defaultApiBaseUrl = '$origin/api';
  static const String defaultGatewayUrl = String.fromEnvironment(
    'NEXUS_GATEWAY',
  );
  static const String defaultInstanceInputUrl = origin;
  static const String canaryApiBaseUrl = defaultApiBaseUrl;
  static const String canaryInstanceInputUrl = defaultInstanceInputUrl;
  static const String defaultTermsUrl = String.fromEnvironment('NEXUS_TERMS_URL');
  static const String defaultPrivacyUrl = String.fromEnvironment('NEXUS_PRIVACY_URL');
  static const String helpCenterUrl = String.fromEnvironment('NEXUS_HELP_URL');
  static const String defaultProductName = 'NEXUS';
  static const String defaultPremiumProductName = 'NEXUS Premium';
  static const int maxRecentInstances = 5;

  // Never bypass discovery for an inherited official Fluxer hostname.
  static const Set<String> officialInstanceHosts = <String>{};
}
