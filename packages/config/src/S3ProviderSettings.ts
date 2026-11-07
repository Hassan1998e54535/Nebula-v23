// SPDX-License-Identifier: Nebula

export interface S3ProviderSettings {
	endpoint: string;
	presignedUrlBase?: string;
	forcePathStyle: boolean;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
}
