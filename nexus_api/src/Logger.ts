// SPDX-License-Identifier: Nebula

import {createLogger, type Logger as NEXUSLogger} from '@nexus/logger/src/Logger';

export const Logger = createLogger('nexus-api');

export type Logger = NEXUSLogger;
