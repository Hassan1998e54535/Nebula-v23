// SPDX-License-Identifier: Nebula

import {defineConfig} from 'vitest/config';

export default defineConfig({
	resolve: {tsconfigPaths: true},
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'dist'],
		benchmark: {
			include: ['**/*.bench.{ts,tsx}'],
			exclude: ['node_modules', 'dist'],
		},
	},
});
