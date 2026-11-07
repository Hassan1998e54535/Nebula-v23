// SPDX-License-Identifier: Nebula

import {initializeConfig} from '@app/api/Config';
import {initializeLogger} from '@app/api/Logger';
import {startWorkerMain} from '@app/api/worker/WorkerMain';
import {Config} from '@app/Config';
import {Logger} from '@app/Logger';

initializeConfig(Config);

initializeLogger(Logger);

startWorkerMain().catch((error) => {
	Logger.fatal({error}, 'Failed to start NEXUS API worker');
	process.exit(1);
});
