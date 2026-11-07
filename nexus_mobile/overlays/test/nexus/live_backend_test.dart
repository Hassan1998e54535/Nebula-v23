// Explicit opt-in integration test. Creates one isolated disposable test account.
// No credentials/tokens are logged or written to disk; no customer data is edited.
import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fluxer_app/core/api/captcha_interceptor.dart';
import 'package:fluxer_app/core/instance/instance_constants.dart';
import 'package:fluxer_app/core/instance/instance_discovery_service.dart';
import 'package:fluxer_dart/export.dart';
import 'package:fluxer_dart/gateway_client/gateway_connection.dart';
import 'package:fluxer_dart/gateway_client/gateway_event.dart';

// Explicit compile-time opt-in: the default test suite must never create users.
// ignore: do_not_use_environment
const enabled = bool.fromEnvironment('NEXUS_LIVE_SMOKE');

void main() {
  test('native SDK: discover, register, fresh login, profile, status, notes and compressed gateway', () async {
    final snapshot = await InstanceDiscoveryService()
        .connectToEndpoint(InstanceConstants.origin);
    expect(snapshot.wellKnown?.appPublic.setup.configured, isTrue,
        reason: 'Never bootstrap a new owner account as part of this smoke test');
    final dio = Dio(BaseOptions(
      baseUrl: snapshot.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
    ));
    dio.interceptors.add(CaptchaInterceptor(
      dio: dio,
      showSlowSolveHint: () => () {},
    ));
    final api = FluxerClient(dio, baseUrl: snapshot.apiBaseUrl);
    final suffix = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final username = 'native_$suffix';
    final email = '$username@example.com';
    final random = Random.secure();
    final password = '${base64UrlEncode(List.generate(32, (_) => random.nextInt(256)))}Aa9!';
    final registration = await api.auth.registerAccount(body: RegisterRequest.fromJson({
      'email': email,
      'username': username,
      'global_name': 'NEXUS native test',
      'password': password,
      'date_of_birth': '2000-01-01',
      'consent': true,
    }));
    expect(registration.toJson()['token'] is String, isTrue);
    // Sign in through a fresh client instead of trusting the registration token.
    final fresh = Dio(BaseOptions(baseUrl: snapshot.apiBaseUrl));
    fresh.interceptors.add(CaptchaInterceptor(dio: fresh, showSlowSolveHint: () => () {}));
    final client = FluxerClient(fresh, baseUrl: snapshot.apiBaseUrl);
    final login = await client.auth.loginUser(body: LoginRequest.fromJson({
      'email': email, 'password': password,
    }));
    final token = login.toJson()['token'] as String;
    expect(token.isNotEmpty, isTrue);
    fresh.options.headers['Authorization'] = token;
    final user = await client.users.getCurrentUser();
    expect(user.username, username);
    final profile = await client.users.getUserProfile(targetId: user.id);
    expect(profile.toJson()['user'], isNotNull);
    await client.users.updateCurrentUserSettings(
      body: UserSettingsUpdateRequest.fromJson({'status': 'idle'}),
    );
    final settings = await fresh.get<Map<String, dynamic>>('/users/@me/settings');
    expect(settings.data?['status'], 'idle');
    final channel = await client.users.createPrivateChannel(
      body: CreatePrivateChannelRequest(recipientId: user.id),
    );
    final posted = await fresh.post<Map<String, dynamic>>(
      '/channels/${channel.id}/messages',
      data: {'content': 'NEXUS native integration test'},
    );
    final message = MessageResponseSchema.fromJson(posted.data!);
    expect(message.content, 'NEXUS native integration test');
    final fetched = await fresh.get<List<dynamic>>('/channels/${channel.id}/messages');
    expect(fetched.data!.any((row) => (row as Map)['id'] == message.id), isTrue);

    final gateway = GatewayConnection(
      token: token, dio: fresh, gatewayUrl: snapshot.gatewayUrl,
    );
    try {
      final ready = gateway.events.where((event) => event is ReadyEvent).first;
      await gateway.connect();
      expect(await ready.timeout(const Duration(seconds: 35)), isA<ReadyEvent>());
      // Continuation chunks and heartbeat ACK must work, not just the first frame.
      expect(await gateway.verifyLiveness(), isTrue);
      expect(gateway.compressionStats.compressionNegotiated, isTrue);
      expect(gateway.compressionStats.frames > 0, isTrue);
      expect(gateway.lastAckAt != null, isTrue);
    } finally {
      await gateway.dispose();
      fresh.close(force: true);
      dio.close(force: true);
    }
  }, skip: !enabled ? 'Opt in with mobile.sh live against your development instance' : false,
     timeout: const Timeout(Duration(minutes: 3)));
}
