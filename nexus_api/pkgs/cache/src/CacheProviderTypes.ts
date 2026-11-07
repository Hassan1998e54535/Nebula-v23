// SPDX-License-Identifier: Nebula

export interface CacheLogger {
	error(obj: unknown, message: string): void;
}

export interface CacheTelemetry {
	recordCounter(metric: {name: string; dimensions?: Record<string, string>}): void;
	recordHistogram(metric: {name: string; valueMs: number; dimensions?: Record<string, string>}): void;
}
