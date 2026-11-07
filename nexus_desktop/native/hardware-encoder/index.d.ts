// SPDX-License-Identifier: Nebula

export interface HardwareEncoderCapability {
	available: boolean;
	backend: 'nvenc' | 'videotoolbox' | 'none';
	compiled: boolean;
	runtime: boolean;
	codecs: Array<string>;
	zeroCopy: boolean;
	nativeInputs: Array<'dmabuf' | 'd3d11-texture' | string>;
	reason?: string;
	detail?: string;
}

export declare function getHardwareEncoderCapabilities(): HardwareEncoderCapability;
