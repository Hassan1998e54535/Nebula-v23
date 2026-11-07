// SPDX-License-Identifier: Nebula

import {buildServiceWorker} from './build/utils/ServiceWorker';

const isProduction = process.env.NODE_ENV === 'production';

buildServiceWorker(isProduction).catch((error) => {
	console.error('Service worker build failed:', error);
	process.exit(1);
});
