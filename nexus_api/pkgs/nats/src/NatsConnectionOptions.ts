// SPDX-License-Identifier: Nebula

export interface NatsConnectionOptions {
	url: string;
	token?: string;
	name?: string;
	maxReconnectAttempts?: number;
	reconnectTimeWaitMs?: number;
	connectTimeoutMs?: number;
	drainTimeoutMs?: number;
}
