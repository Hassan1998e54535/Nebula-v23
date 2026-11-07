// SPDX-License-Identifier: Nebula

import {buildAPIConfigFromMaster} from '@app/api/Config';
import type {APIConfig} from '@app/api/config/APIConfig';
import {loadConfig} from '@nexus/config/src/ConfigLoader';

const master = await loadConfig();
const apiConfig = buildAPIConfigFromMaster(master);

interface ExtendedAPIConfig extends APIConfig {
	env: string;
}

export const Config: ExtendedAPIConfig = {
	env: master.env,
	...apiConfig,
};

export type Config = typeof Config;
