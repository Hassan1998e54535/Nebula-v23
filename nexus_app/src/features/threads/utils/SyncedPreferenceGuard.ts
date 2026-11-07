// SPDX-License-Identifier: Nebula

import Channels from '@app/features/channel/state/Channels';
import {THREAD_FEATURE_CHANNEL_TYPES} from '@nexus/constants/src/ThreadConstants';

export function isSyncExcludedChannelId(channelId: string | null | undefined): boolean {
	if (channelId == null) return false;
	const channel = Channels.getChannel(channelId);
	return channel != null && THREAD_FEATURE_CHANNEL_TYPES.has(channel.type);
}
