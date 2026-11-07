// SPDX-License-Identifier: Nebula

import {lookupGeoip} from '@app/api/utils/IpUtils';

const KLIPY_DEFAULT_COUNTRY = 'US';

export async function resolveGifRequestCountry(req: Request): Promise<string> {
	try {
		const geoip = await lookupGeoip(req);
		return geoip.countryCode?.trim().toUpperCase() || KLIPY_DEFAULT_COUNTRY;
	} catch {
		return KLIPY_DEFAULT_COUNTRY;
	}
}
