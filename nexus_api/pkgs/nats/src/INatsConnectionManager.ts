// SPDX-License-Identifier: Nebula

import type {NatsConnection} from '@nats-io/transport-node';

export interface INatsConnectionManager {
	connect(): Promise<void>;
	getConnection(): NatsConnection;
	drain(): Promise<void>;
	isClosed(): boolean;
}
