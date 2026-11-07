// SPDX-License-Identifier: Nebula

import {generateUniqueGiftCode} from '@app/api/models/GiftCode';
import {expect, it, vi} from 'vitest';

it('bounds repeated gift-code collisions so reconciliation cannot loop forever', async () => {
	const findGiftCode = vi.fn(async (_code: string) => ({}));
	await expect(generateUniqueGiftCode(findGiftCode)).rejects.toThrow('after 100 attempts');
	expect(findGiftCode).toHaveBeenCalledTimes(100);
	for (const [code] of findGiftCode.mock.calls) expect(code).toHaveLength(32);
});
