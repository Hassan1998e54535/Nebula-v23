// SPDX-License-Identifier: Nebula

import type {GatewayErrorData} from '@app/features/gateway/transport/GatewaySocket';
import type {GuildReadyData} from '@app/features/gateway/types/GatewayGuildTypes';
import MediaEngine from '@app/features/voice/engine/MediaEngineFacade';

export function seedVoiceStatesFromReady(guilds: Array<GuildReadyData>): void {
	MediaEngine.handleGatewayReady(guilds);
}

export function reportGatewayErrorToVoice(error: GatewayErrorData): void {
	MediaEngine.handleGatewayError(error);
}

export function teardownVoiceForFatalGatewayCrash(): void {
	MediaEngine.cleanup();
}
