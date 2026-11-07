// SPDX-License-Identifier: Nebula

export interface ISnowflakeService {
	initialize(): Promise<void>;
	shutdown(): Promise<void>;
	generate(): Promise<bigint>;
	generateForChannel(channelId: string | bigint): Promise<bigint>;
}
