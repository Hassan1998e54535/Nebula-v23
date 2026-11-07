// SPDX-License-Identifier: Nebula

import type {VirusScanResult} from '@pkgs/virus_scan/src/VirusScanResult';

export interface IVirusScanService {
	readonly enabled: boolean;
	scanFile(filePath: string): Promise<VirusScanResult>;
}
