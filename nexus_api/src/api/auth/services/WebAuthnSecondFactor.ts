// SPDX-License-Identifier: Nebula

import type {ApiContext} from '@app/api/ApiContext';
import type {User} from '@app/api/models/User';
import {UserAuthenticatorTypes} from '@nexus/constants/src/UserConstants';

interface WebAuthnSecondFactorUser {
	passwordHash: string | null;
	authenticatorTypes?: Set<number> | null;
}

function webAuthnIsSecondFactor(user: WebAuthnSecondFactorUser, hasPasskeyCredentials: boolean): boolean {
	return (
		(user.authenticatorTypes?.has(UserAuthenticatorTypes.WEBAUTHN) ?? false) ||
		(user.passwordHash === null && hasPasskeyCredentials)
	);
}

export async function resolveWebAuthnSecondFactor(ctx: ApiContext, user: User): Promise<boolean> {
	const credentials = await ctx.services.users.listWebAuthnCredentials(user.id);
	return webAuthnIsSecondFactor(user, credentials.length > 0);
}
