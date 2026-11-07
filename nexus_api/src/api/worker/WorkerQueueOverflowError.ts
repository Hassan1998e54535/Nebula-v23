// SPDX-License-Identifier: Nebula

export class WorkerQueueOverflowError extends Error {
	readonly taskType: string;

	constructor(taskType: string, reason: string) {
		super(`Jobs stream rejected task "${taskType}": ${reason}`);
		this.name = 'WorkerQueueOverflowError';
		this.taskType = taskType;
	}
}
