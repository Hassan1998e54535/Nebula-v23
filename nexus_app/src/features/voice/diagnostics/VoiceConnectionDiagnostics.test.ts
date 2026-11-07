// SPDX-License-Identifier: Nebula

import {describe, expect, it} from 'vitest';
import {safeVoiceEndpoint, safeVoiceError} from '@app/features/voice/diagnostics/VoiceConnectionDiagnostics';

describe('voice connection diagnostics redaction', () => {
	it('keeps only the websocket scheme and host from an endpoint', () => {
		expect(safeVoiceEndpoint('wss://user:password@voice.example.test:7443/livekit?token=private')).toBe(
			'wss://voice.example.test:7443',
		);
	});

	it('rejects non-websocket endpoints', () => {
		expect(safeVoiceEndpoint('https://voice.example.test/path')).toBe('رابط غير صالح (المتوقع ws أو wss)');
	});

	it('shows a sanitized original error detail without exposing sensitive values', () => {
		const privateToken = 'eyJhbGciOiJIUzI1NiJ9.private-value.signature';
		const result = safeVoiceError({
			name: 'ConnectionError',
			code: 1,
			reasonName: 'WebSocket',
			status: 401,
			message: `WebSocket failed for wss://voice.example.test/rtc?access_token=${privateToken} API_KEY=private-key`,
		});
		expect(result).toContain('سبب LiveKit: WebSocket');
		expect(result).toContain('HTTP 401');
		expect(result).toContain('تفصيل آمن: WebSocket failed for wss://voice.example.test');
		expect(result).not.toContain(privateToken);
		expect(result).not.toContain('private-key');
	});
});
