// SPDX-License-Identifier: Nebula

import {makeAutoObservable} from 'mobx';

export const OVERLAY_STACK_BASE_Z_INDEX = 10000;
const BASE_Z_INDEX = OVERLAY_STACK_BASE_Z_INDEX;
const ABOVE_OVERLAY_BASE_Z_INDEX = 41000;
const Z_INDEX_INCREMENT = 10;

class OverlayStack {
	private sequence = 0;
	private activeZIndices: Array<number> = [];
	private aboveOverlayBaseDepth = 0;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
	}

	acquire(): number {
		const zIndex = this.getBaseZIndex() + this.sequence * Z_INDEX_INCREMENT;
		this.sequence++;
		this.activeZIndices.push(zIndex);
		return zIndex;
	}

	release(zIndex: number): void {
		const index = this.activeZIndices.lastIndexOf(zIndex);
		if (index === -1) return;
		this.activeZIndices.splice(index, 1);
		if (this.activeZIndices.length === 0) {
			this.sequence = 0;
		}
	}

	peek(): number {
		return this.getBaseZIndex() + this.sequence * Z_INDEX_INCREMENT;
	}

	isTopmost(zIndex: number): boolean {
		if (this.activeZIndices.length === 0) return false;
		return zIndex >= Math.max(...this.activeZIndices);
	}

	enableAboveOverlayBase(): () => void {
		this.aboveOverlayBaseDepth++;
		return () => this.disableAboveOverlayBase();
	}

	private disableAboveOverlayBase(): void {
		this.aboveOverlayBaseDepth = Math.max(0, this.aboveOverlayBaseDepth - 1);
		if (this.activeZIndices.length === 0) {
			this.sequence = 0;
		}
	}

	private getBaseZIndex(): number {
		return this.aboveOverlayBaseDepth > 0 ? ABOVE_OVERLAY_BASE_Z_INDEX : BASE_Z_INDEX;
	}
}

export default new OverlayStack();
