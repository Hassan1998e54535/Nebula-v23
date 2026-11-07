// SPDX-License-Identifier: Nebula

import {createInt32EnumType} from '@nexus/schema/src/primitives/SchemaPrimitives';

export const WebhookTypeSchema = createInt32EnumType(
	[
		[1, 'INCOMING', 'Incoming webhook'],
		[2, 'CHANNEL_FOLLOWER', 'Channel follower webhook'],
	],
	'The type of webhook',
	'WebhookType',
);
