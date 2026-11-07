// SPDX-License-Identifier: Nebula

export interface HttpClientMetrics {
	counter(params: {name: string; dimensions?: Record<string, string>; value?: number}): void;
	histogram(params: {name: string; dimensions?: Record<string, string>; valueMs: number}): void;
}

export interface HttpClientTelemetry {
	metrics?: HttpClientMetrics;
}
