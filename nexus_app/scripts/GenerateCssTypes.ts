// SPDX-License-Identifier: Nebula

import {run} from 'typed-css-modules';

const watch = process.argv.includes('--watch');

run('src', {pattern: '**/*.module.css', watch}).catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
