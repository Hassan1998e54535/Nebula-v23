// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {ConnectionError} from '../room/errors.ts';

const VALIDATION_TIMEOUT_MS = 3_000;

/**
 * When a browser WebSocket never opens, browsers often provide no HTTP status
 * or useful error detail. Reuse LiveKit's token-bearing validate URL to safely
 * distinguish rejected credentials from an unavailable WebSocket path.
 */
export async function diagnoseSignalTimeout(validateUrl: string): Promise<ConnectionError> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

	try {
		const response = await fetch(validateUrl, {signal: controller.signal});
		if (response.status === 401 || response.status === 403) {
			return ConnectionError.notAllowed(
				`LiveKit validation rejected the join request (HTTP ${response.status})`,
				response.status,
			);
		}
		if (!response.ok) {
			return ConnectionError.internal(
				`Signal WebSocket did not open; LiveKit validation returned HTTP ${response.status}`,
				{status: response.status},
			);
		}
		return ConnectionError.timeout(
			`Signal WebSocket did not open; LiveKit validation returned HTTP ${response.status}`,
		);
	} catch {
		return ConnectionError.serverUnreachable(
			'Signal WebSocket did not open; this browser could not complete the LiveKit HTTPS validation request',
		);
	} finally {
		clearTimeout(timeout);
	}
}
