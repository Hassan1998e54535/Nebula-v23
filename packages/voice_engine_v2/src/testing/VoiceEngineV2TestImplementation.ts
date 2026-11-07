// SPDX-License-Identifier: Nebula

import {VoiceEngineV2ImplementationBase} from '@nexus/voice_engine_v2/src/implementations/VoiceEngineV2ImplementationBase';

export class VoiceEngineV2TestImplementation extends VoiceEngineV2ImplementationBase {
	readonly kind = 'js' as const;
}
