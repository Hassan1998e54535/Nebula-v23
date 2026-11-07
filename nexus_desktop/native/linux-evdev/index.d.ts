// SPDX-License-Identifier: Nebula

export interface EvdevKeyEvent {
	type: 'keydown' | 'keyup';
	keycode: number;
	keyName: string;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
}

export interface EvdevMouseEvent {
	type: 'mousedown' | 'mouseup';
	button: number;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
}

export type NativeEvdevEvent = EvdevKeyEvent | EvdevMouseEvent;

export declare class EvdevHook {
	constructor(onEvent: (event: NativeEvdevEvent) => void);

	start(): boolean;

	stop(): void;
}

export declare function isKeyboardReadable(): boolean;

export declare const loadError: Error | null;
