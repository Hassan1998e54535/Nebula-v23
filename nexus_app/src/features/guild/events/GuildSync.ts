// SPDX-License-Identifier: Nebula

import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import type {GuildReadyData} from '@app/features/gateway/types/GatewayGuildTypes';
import {handleGuildCreate} from '@app/features/guild/events/GuildCreate';

export function handleGuildSync(data: GuildReadyData, context: GatewayHandlerContext): void {
	context.markGuildSynced(data.id);
	const syncContext = {...context, _isSync: true};
	handleGuildCreate(data, syncContext);
}
