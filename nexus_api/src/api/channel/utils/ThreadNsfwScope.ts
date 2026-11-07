// SPDX-License-Identifier: Nebula

import type {ChannelID} from '@app/api/BrandedTypes';
import type {Channel} from '@app/api/models/Channel';

export async function resolveNsfwScopeChannel(
	channel: Channel,
	findChannel: (channelId: ChannelID) => Promise<Channel | null>,
): Promise<Channel> {
	if (!channel.isThread() || channel.parentId === null) return channel;
	return (await findChannel(channel.parentId)) ?? channel;
}
