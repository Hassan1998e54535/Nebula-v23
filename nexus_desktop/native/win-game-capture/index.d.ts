// SPDX-License-Identifier: Nebula

export declare function elevateGpuSchedulingPriority(processId?: number, priorityClass?: 'high' | 'realtime'): boolean;
export declare function restoreGpuSchedulingPriority(processId?: number): boolean;
export declare function reuseWindowCaptureItems(): boolean;
export declare function windowCaptureItemCalls(): {forwarded: number; reused: number} | null;
export declare const loadError: Error | null;
