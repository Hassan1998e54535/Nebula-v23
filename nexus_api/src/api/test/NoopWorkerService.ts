// SPDX-License-Identifier: Nebula

import type {IWorkerService} from '@pkgs/worker/src/contracts/IWorkerService';

export class NoopWorkerService implements IWorkerService {
	async addJob(): Promise<bigint> {
		return 0n;
	}

	async cancelJob(_jobId: bigint): Promise<boolean> {
		return false;
	}
}
