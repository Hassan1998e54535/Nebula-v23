// SPDX-License-Identifier: Nebula

export type MacScreenRecordingProbeResult = 'granted' | 'denied' | 'timeout' | 'unsupported';

export declare function probeScreenRecordingAccess(): Promise<MacScreenRecordingProbeResult>;

export declare const loadError: Error | null;
