// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ConnectionErrorReason} from '../room/errors.ts';
import {diagnoseSignalTimeout} from './SignalTimeoutDiagnostics.ts';

describe('diagnoseSignalTimeout', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reports successful HTTPS validation without exposing the signed URL', async () => {
		const signedUrl = 'https://voice.example.test/rtc/v1/validate?access_token=private-token';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, status: 200}));

		const error = await diagnoseSignalTimeout(signedUrl);

		expect(error.reason).toBe(ConnectionErrorReason.Timeout);
		expect(error.message).toContain('HTTP 200');
		expect(error.message).not.toContain('private-token');
	});

	it('reports token rejection as an authentication failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401}));

		const error = await diagnoseSignalTimeout('https://voice.example.test/rtc/v1/validate');

		expect(error.reason).toBe(ConnectionErrorReason.NotAllowed);
		expect(error.status).toBe(401);
	});

	it('reports an unreachable HTTPS validation path without raw browser errors', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('private transport detail')));

		const error = await diagnoseSignalTimeout('https://voice.example.test/rtc/v1/validate');

		expect(error.reason).toBe(ConnectionErrorReason.ServerUnreachable);
		expect(error.message).toContain('could not complete');
		expect(error.message).not.toContain('private transport detail');
	});
});
