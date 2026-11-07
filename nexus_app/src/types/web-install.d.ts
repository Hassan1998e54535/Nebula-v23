// SPDX-License-Identifier: Nebula

export interface WebInstallResult {
	manifestId: string;
}

declare global {
	interface Navigator {
		install?: (installUrl?: string, manifestId?: string) => Promise<WebInstallResult>;
	}
}
