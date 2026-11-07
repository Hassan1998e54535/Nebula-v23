// SPDX-License-Identifier: Nebula

import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import Invites from '@app/features/invite/state/Invites';
import {currentInstanceTarget} from '@app/features/platform/transport/InstanceHTTP';

interface InviteDeletePayload {
	code: string;
	guild_id: string;
}

export function handleInviteDelete(data: InviteDeletePayload, _context: GatewayHandlerContext): void {
	Invites.handleInviteDelete(data.code, currentInstanceTarget());
}
