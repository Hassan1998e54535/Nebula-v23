// SPDX-License-Identifier: Nebula
import type {VideoCodec} from 'livekit-client';
export const CODEC_DISPLAY_LABEL: Record<VideoCodec, string> = {
	av1: 'AV1',
	vp9: 'VP9',
	vp8: 'VP8',
	h264: 'H.264',
	h265: 'H.265 (HEVC)',
};
