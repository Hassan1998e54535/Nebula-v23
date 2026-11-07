// SPDX-License-Identifier: Nebula

import {createContext} from 'react';

export type VoicePopoutScope = 'tile' | 'call' | null;

export const VoicePopoutScopeContext = createContext<VoicePopoutScope>(null);
