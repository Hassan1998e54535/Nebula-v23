// SPDX-License-Identifier: Nebula

export interface VirusScanResult {
	isClean: boolean;
	threat?: string;
	fileHash: string;
}
