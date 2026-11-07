// SPDX-License-Identifier: Nebula

import type {VoiceRoomStore} from '@app/api/infrastructure/VoiceRoomStore';

export type IVoiceRoomStore = Pick<VoiceRoomStore, 'pinRoomServer' | 'getPinnedRoomServer' | 'deleteRoomServer'>;
