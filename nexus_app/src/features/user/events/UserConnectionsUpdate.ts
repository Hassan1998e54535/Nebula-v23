// SPDX-License-Identifier: Nebula

import UserConnection from '@app/features/connection/state/UserConnection';
import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import type {ConnectionListResponse} from '@nexus/schema/src/domains/connection/ConnectionSchemas';

export function handleUserConnectionsUpdate(
	data: {
		connections: ConnectionListResponse;
	},
	_context: GatewayHandlerContext,
): void {
	UserConnection.setConnections(data.connections);
}
