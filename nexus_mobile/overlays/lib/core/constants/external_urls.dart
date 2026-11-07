import 'package:fluxer_app/core/instance/instance_constants.dart';

/// Optional operator-owned destinations. No inherited Fluxer store/status URLs.
abstract final class ExternalUrls {
  static const String serviceStatus = String.fromEnvironment('NEXUS_STATUS_URL');
  static const String serviceStatusHistory = serviceStatus;
  static const String fluxerMarketing = InstanceConstants.origin;
  static const String fluxerPatchNotes = String.fromEnvironment('NEXUS_RELEASE_NOTES_URL');
  static const String fluxerDownload = String.fromEnvironment('NEXUS_DOWNLOAD_URL');
  static const String fluxerAppStore = String.fromEnvironment('NEXUS_APP_STORE_URL');
}
