// SPDX-License-Identifier: Nebula

export interface ConnectionVerificationParams {
	identifier: string;
	verification_token: string;
}

export interface IConnectionVerifier {
	verify(params: ConnectionVerificationParams): Promise<boolean>;
}
