// SPDX-License-Identifier: Nebula

import {Config} from '@app/api/Config';

export interface ContactEmails {
	appealsEmail: string | null;
	safetyEmail: string | null;
	supportEmail: string | null;
}

const HOSTED_CONTACT_EMAILS: ContactEmails = {
	appealsEmail: null,
	safetyEmail: null,
	supportEmail: null,
};

const SELF_HOSTED_CONTACT_EMAILS: ContactEmails = {
	appealsEmail: null,
	safetyEmail: null,
	supportEmail: null,
};

export function resolveContactEmails(): ContactEmails {
	return Config.instance.selfHosted ? SELF_HOSTED_CONTACT_EMAILS : HOSTED_CONTACT_EMAILS;
}
