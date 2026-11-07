// SPDX-License-Identifier: Nebula
import type {VideoCodec} from 'livekit-client';

export function isScreenShareVideoCodecValue(value: unknown): value is VideoCodec {
	return value === 'av1' || value === 'h265' || value === 'h264' || value === 'vp9' || value === 'vp8';
}
