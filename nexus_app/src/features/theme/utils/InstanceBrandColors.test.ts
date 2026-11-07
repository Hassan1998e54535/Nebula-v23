// SPDX-License-Identifier: Nebula

import {describe, expect, it} from 'vitest';
import {getInstanceBrandVariables} from './InstanceBrandColors';

describe('getInstanceBrandVariables', () => {
	it('uses the new NEXUS defaults for the legacy built-in brand color', () => {
		expect(getInstanceBrandVariables('#4641D9')).toBeNull();
	});

	it('continues to derive brand shades from a custom instance color', () => {
		const variables = getInstanceBrandVariables('#123456');

		expect(variables).not.toBeNull();
		expect(variables?.['--instance-brand-primary']).toMatch(/^hsl\(/);
		expect(variables?.['--instance-brand-primary-deep']).toMatch(/^hsl\(/);
	});
});
