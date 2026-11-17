// SPDX-License-Identifier: Nebula

import type {UserID} from '@app/api/BrandedTypes';
import type {ChannelService} from '@app/api/channel/services/ChannelService';
import {StreamService} from '@app/api/channel/services/StreamService';
import type {ThreadViewer} from '@app/api/experiment/ChannelThreadsGate';
import type {IGatewayService} from '@app/api/infrastructure/IGatewayService';
import {ChannelTypes} from '@nexus/constants/src/ChannelConstants';
import type {ICacheService} from '@pkgs/cache/src/ICacheService';
import {afterEach, describe, expect, it, vi} from 'vitest';

const streamKey = '200:300:stream-connection';
const streamPreview = {buffer: new Uint8Array([0xff, 0xd8, 0xff]), contentType: 'image/jpeg'};
const ownerVoiceState = {
	connectionId: 'stream-connection',
	userId: '10',
	channelId: '300',
	hideStreamPreviewOutsideChannel: true,
};

function createStreamService(
	voiceStates: Array<{
		connectionId: string;
		userId: string;
		channelId: string;
		hideStreamPreviewOutsideChannel?: boolean;
	}>,
) {
	const streamPreviewStore = {
		getPreview: vi.fn().mockResolvedValue(streamPreview),
	};
	const gatewayService = {
		checkPermission: vi.fn().mockResolvedValue(true),
		getVoiceStatesForChannel: vi.fn().mockResolvedValue({voiceStates}),
	};
	const channelService = {
		channelData: {
			operations: {
				getChannel: vi.fn().mockResolvedValue({
					guildId: '200',
					type: ChannelTypes.GUILD_VOICE,
				}),
			},
		},
	};
	const service = new StreamService(
		{} as ICacheService,
		channelService as unknown as ChannelService,
		gatewayService as unknown as IGatewayService,
		streamPreviewStore as never,
	);
	return {service, streamPreviewStore, gatewayService};
}

const userId = 11n as UserID;
const viewer = {} as ThreadViewer;

afterEach(() => {
	vi.clearAllMocks();
});

describe('stream preview privacy', () => {
	it('does not serve the screen preview to a viewer outside the voice channel', async () => {
		const {service, streamPreviewStore} = createStreamService([ownerVoiceState]);

		const result = await service.getPreview({userId, viewer, streamKey});

		expect(result).toBeNull();
		expect(streamPreviewStore.getPreview).not.toHaveBeenCalled();
	});

	it('serves the screen preview to members of the voice channel', async () => {
		const {service, streamPreviewStore} = createStreamService([
			ownerVoiceState,
			{connectionId: 'viewer-connection', userId: '11', channelId: '300'},
		]);

		const result = await service.getPreview({userId, viewer, streamKey});

		expect(result).toEqual(streamPreview);
		expect(streamPreviewStore.getPreview).toHaveBeenCalledWith(streamKey);
	});

	it('keeps previews visible outside the room when privacy is off', async () => {
		const {service, streamPreviewStore} = createStreamService([
			{connectionId: 'stream-connection', userId: '10', channelId: '300'},
		]);

		const result = await service.getPreview({userId, viewer, streamKey});

		expect(result).toEqual(streamPreview);
		expect(streamPreviewStore.getPreview).toHaveBeenCalledWith(streamKey);
	});
});
