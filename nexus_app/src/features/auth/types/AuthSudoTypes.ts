// SPDX-License-Identifier: Nebula

export interface SudoVerificationPayload extends Record<string, unknown> {
	password?: string;
	mfa_method?: 'totp' | 'webauthn';
	mfa_code?: string;
	webauthn_response?: unknown;
	webauthn_challenge?: string;
}
