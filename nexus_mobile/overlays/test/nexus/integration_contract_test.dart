import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fluxer_app/core/instance/instance_config_snapshot.dart';
import 'package:fluxer_app/core/instance/instance_constants.dart';
import 'package:fluxer_app/core/instance/instance_discovery_service.dart';
import 'package:fluxer_app/core/instance/instance_endpoint_normalizer.dart';
import 'package:fluxer_app/core/instance/instance_endpoints.dart';
import 'package:fluxer_app/core/theme/themes/dark.dart';
import 'package:fluxer_app/features/ui/icons/fluxer_brand_logo.dart';
import 'package:fluxer_app/material_ui.dart';

Map<String, dynamic> discovery() => {
  'api_code_version': 1,
  'codename': 'tungsten',
  'endpoints': {
    'api': '${InstanceConstants.origin}/api',
    'api_client': '${InstanceConstants.origin}/api',
    'api_public': '${InstanceConstants.origin}/api',
    'gateway': InstanceConstants.defaultGatewayUrl,
    'media': '${InstanceConstants.origin}/media',
    'static_cdn': InstanceConstants.origin,
    'webapp': InstanceConstants.origin,
  },
  'features': {
    'self_hosted': true,
    'voice_enabled': true,
    'stripe_enabled': false,
  },
};

void main() {
  test('NEXUS URL normalization and no inherited official-host shortcut', () {
    const normalizer = InstanceEndpointNormalizer();
    expect(
      normalizer.buildWellKnownUrl('${InstanceConstants.origin}/api'),
      '${InstanceConstants.origin}/api/.well-known/nexus',
    );
    expect(normalizer.isOfficialInstanceInput('fluxer.com'), isFalse);
    expect(normalizer.isOfficialInstanceInput('web.fluxer.app'), isFalse);
    expect(InstanceConstants.defaultProductName, 'NEXUS');
    expect(InstanceConstants.origin.startsWith('https://'), isTrue);
  });

  test('cold-start media, API and gateway defaults stay on our instance', () {
    InstanceEndpoints.resetToDefaults();
    expect(InstanceEndpoints.api, '${InstanceConstants.origin}/api');
    expect(InstanceEndpoints.gateway, InstanceConstants.defaultGatewayUrl);
    expect(InstanceEndpoints.media, '${InstanceConstants.origin}/media');
    expect(InstanceEndpoints.webApp, InstanceConstants.origin);
  });

  test('discovery and persisted snapshots use the real SDK parser', () async {
    final dio = Dio();
    String? requested;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          requested = options.uri.toString();
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: discovery(),
          ));
        },
      ),
    );
    final snapshot = await InstanceDiscoveryService(dio: dio)
        .connectToEndpoint(InstanceConstants.origin);
    expect(requested, '${InstanceConstants.origin}/api/.well-known/nexus');
    expect(snapshot.apiBaseUrl, '${InstanceConstants.origin}/api');
    expect(snapshot.productName, 'NEXUS');
    expect(snapshot.termsUrl, isNull);
    expect(snapshot.privacyUrl, isNull);
    final restored = InstanceConfigSnapshot.fromJson(snapshot.toJson());
    expect(restored.apiBaseUrl, snapshot.apiBaseUrl);
    expect(restored.gatewayUrl, snapshot.gatewayUrl);
  });

  test('default dark identity is NEXUS without changing status semantics', () {
    final colors = buildDarkColorTheme();
    expect(colors.backgroundPrimary.toARGB32(), 0xFF0A0B0F);
    expect(colors.brandPrimary.toARGB32(), 0xFF245DA7);
    expect(colors.textPrimary.toARGB32(), 0xFFF2F3F5);
    expect(colors.statusOnline, isNot(colors.brandPrimary));
  });

  testWidgets('existing brand widget renders the verified NEXUS mark', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: Center(child: FluxerBrandLogo(size: 64))),
    ));
    await tester.pumpAndSettle();
    expect(find.byType(FluxerBrandLogo), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
