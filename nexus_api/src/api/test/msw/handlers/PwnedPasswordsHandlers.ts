// SPDX-License-Identifier: Nebula

import {HttpResponse, http} from 'msw';

export function createPwnedPasswordsRangeHandler() {
	return http.get('https://api.pwnedpasswords.com/range/:prefix', () => {
		return HttpResponse.text('', {
			status: 200,
			headers: {
				'content-type': 'text/plain; charset=utf-8',
			},
		});
	});
}
