// SPDX-License-Identifier: Nebula

import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import SavedMessages from '@app/features/messaging/state/SavedMessages';
import type {Message} from '@nexus/schema/src/domains/message/MessageResponseSchemas';

export function handleSavedMessageCreate(data: Message, _context: GatewayHandlerContext): void {
	SavedMessages.handleMessageCreate(data);
}
