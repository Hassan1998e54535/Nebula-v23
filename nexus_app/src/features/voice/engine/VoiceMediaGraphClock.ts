// SPDX-License-Identifier: Nebula

export interface VoiceMediaGraphClockPort {
	now(): number;
}

export const systemVoiceMediaGraphClock: VoiceMediaGraphClockPort = {
	now: () => Date.now(),
};
