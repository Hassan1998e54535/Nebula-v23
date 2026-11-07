// SPDX-License-Identifier: Nebula

import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import WebAuthnCredentials, {type WebAuthnCredential} from '@app/features/user/state/WebAuthnCredentials';

export function handleWebAuthnCredentialsUpdate(
	data: ReadonlyArray<WebAuthnCredential>,
	_context: GatewayHandlerContext,
): void {
	WebAuthnCredentials.setCredentials(data);
}
