// SPDX-License-Identifier: Nebula

export const ProgressiveRegisterStep = Object.freeze({
	EMAIL: 'email',
	DISPLAY_NAME: 'display_name',
	CREDENTIALS: 'credentials',
	DETAILS: 'details',
	AVATAR: 'avatar',
} as const);

export type ProgressiveRegisterStep = (typeof ProgressiveRegisterStep)[keyof typeof ProgressiveRegisterStep];

const FIELD_PROGRESSIVE_STEPS: Readonly<Record<string, ProgressiveRegisterStep>> = Object.freeze({
	email: ProgressiveRegisterStep.EMAIL,
	global_name: ProgressiveRegisterStep.DISPLAY_NAME,
	username: ProgressiveRegisterStep.CREDENTIALS,
	password: ProgressiveRegisterStep.CREDENTIALS,
	confirm_password: ProgressiveRegisterStep.CREDENTIALS,
	date_of_birth: ProgressiveRegisterStep.DETAILS,
});

export function getProgressiveRegisterSteps(showEmail: boolean): ReadonlyArray<ProgressiveRegisterStep> {
	return showEmail
		? [
				ProgressiveRegisterStep.EMAIL,
				ProgressiveRegisterStep.DISPLAY_NAME,
				ProgressiveRegisterStep.CREDENTIALS,
				ProgressiveRegisterStep.DETAILS,
				ProgressiveRegisterStep.AVATAR,
			]
		: [
				ProgressiveRegisterStep.DISPLAY_NAME,
				ProgressiveRegisterStep.CREDENTIALS,
				ProgressiveRegisterStep.DETAILS,
				ProgressiveRegisterStep.AVATAR,
			];
}

export function getProgressiveRegisterStepForField(
	steps: ReadonlyArray<ProgressiveRegisterStep>,
	fieldName: string,
): ProgressiveRegisterStep | undefined {
	const step = FIELD_PROGRESSIVE_STEPS[fieldName];
	return step && steps.includes(step) ? step : undefined;
}

export function getNextProgressiveRegisterStep(
	steps: ReadonlyArray<ProgressiveRegisterStep>,
	current: ProgressiveRegisterStep,
): ProgressiveRegisterStep | undefined {
	return steps[steps.indexOf(current) + 1];
}

export function getPreviousProgressiveRegisterStep(
	steps: ReadonlyArray<ProgressiveRegisterStep>,
	current: ProgressiveRegisterStep,
): ProgressiveRegisterStep | undefined {
	return steps[steps.indexOf(current) - 1];
}

export function suggestUsernameFromEmail(email: string): string {
	const localPart = email.trim().split('@')[0] ?? '';
	return (localPart.match(/[a-zA-Z0-9_]/g) ?? []).join('').slice(0, 4);
}

export function getEmailUsernameSuggestion(
	email: string,
	currentUsername: string,
	lastGeneratedSuggestion: string,
): string | null {
	if (currentUsername.length > 0 && currentUsername !== lastGeneratedSuggestion) return null;
	return suggestUsernameFromEmail(email);
}

export function isDateOfBirthComplete(month: string, day: string, year: string): boolean {
	return month.length > 0 && day.length > 0 && year.length > 0;
}
