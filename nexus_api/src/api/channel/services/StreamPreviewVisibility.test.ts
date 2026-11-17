// SPDX-License-Identifier: Nebula

import {isStreamPreviewHiddenFromViewer} from '@app/api/channel/services/StreamPreviewVisibility';
import type {GatewayVoiceStateEntry} from '@app/api/infrastructure/IGatewayService';
import {describe, expect, it} from 'vitest';

const voiceStates: ReadonlyArray<GatewayVoiceStateEntry> = [
	{
		connectionId: 'streamer-connection',
		userId: 'streamer',
		channelId: 'voice-channel',
		hideStreamPreviewOutsideChannel: true,
	},
	{
		connectionId: 'viewer-connection',
		userId: 'viewer',
		channelId: 'voice-channel',
	},
];

describe('stream preview visibility', () => {
	it('hides a private stream preview from users outside its voice channel', () => {
		expect(isStreamPreviewHiddenFromViewer([voiceStates[0]!], 'streamer-connection', 'outside')).toBe(true);
	});

	it('keeps a private stream preview visible to voice channel participants', () => {
		expect(isStreamPreviewHiddenFromViewer(voiceStates, 'streamer-connection', 'viewer')).toBe(false);
	});

	it('keeps previews visible when the streamer has not enabled privacy', () => {
		expect(
			isStreamPreviewHiddenFromViewer(
				[{...voiceStates[0]!, hideStreamPreviewOutsideChannel: false}],
				'streamer-connection',
				'outside',
			),
		).toBe(false);
	});
});
