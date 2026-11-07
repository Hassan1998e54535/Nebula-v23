// SPDX-License-Identifier: Nebula

import PiP, {type PiPContent} from '@app/features/ui/state/PiP';

export function openPiP(content: PiPContent): void {
	PiP.open(content);
}

export function closePiP(): void {
	PiP.close();
}

export function clearPiPForChannel(channelId: string): void {
	PiP.clearForChannel(channelId);
}
