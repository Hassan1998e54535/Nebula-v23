// SPDX-License-Identifier: Nebula

import {
	getEmailUsernameSuggestion,
	getNextProgressiveRegisterStep,
	getPreviousProgressiveRegisterStep,
	getProgressiveRegisterStepForField,
	getProgressiveRegisterSteps,
	isDateOfBirthComplete,
	ProgressiveRegisterStep,
	suggestUsernameFromEmail,
} from '@app/features/auth/flow/ProgressiveRegisterFlow';
import {describe, expect, it} from 'vitest';

describe('progressive registration flow', () => {
	it('orders the mobile steps and starts without email when username sign-in is configured', () => {
		expect(getProgressiveRegisterSteps(true)).toEqual([
			ProgressiveRegisterStep.EMAIL,
			ProgressiveRegisterStep.DISPLAY_NAME,
			ProgressiveRegisterStep.CREDENTIALS,
			ProgressiveRegisterStep.DETAILS,
			ProgressiveRegisterStep.AVATAR,
		]);
		expect(getProgressiveRegisterSteps(false)).toEqual([
			ProgressiveRegisterStep.DISPLAY_NAME,
			ProgressiveRegisterStep.CREDENTIALS,
			ProgressiveRegisterStep.DETAILS,
			ProgressiveRegisterStep.AVATAR,
		]);
	});

	it('allows the optional display-name step to be skipped', () => {
		const steps = getProgressiveRegisterSteps(true);
		expect(getNextProgressiveRegisterStep(steps, ProgressiveRegisterStep.DISPLAY_NAME)).toBe(
			ProgressiveRegisterStep.CREDENTIALS,
		);
		expect(getNextProgressiveRegisterStep(steps, ProgressiveRegisterStep.DETAILS)).toBe(ProgressiveRegisterStep.AVATAR);
		expect(getPreviousProgressiveRegisterStep(steps, ProgressiveRegisterStep.CREDENTIALS)).toBe(
			ProgressiveRegisterStep.DISPLAY_NAME,
		);
		expect(getPreviousProgressiveRegisterStep(steps, ProgressiveRegisterStep.AVATAR)).toBe(
			ProgressiveRegisterStep.DETAILS,
		);
	});

	it('returns server field errors to the step that owns the field', () => {
		const emailSteps = getProgressiveRegisterSteps(true);
		const usernameSteps = getProgressiveRegisterSteps(false);

		expect(getProgressiveRegisterStepForField(emailSteps, 'email')).toBe(ProgressiveRegisterStep.EMAIL);
		expect(getProgressiveRegisterStepForField(emailSteps, 'date_of_birth')).toBe(ProgressiveRegisterStep.DETAILS);
		expect(getProgressiveRegisterStepForField(usernameSteps, 'email')).toBeUndefined();
		expect(getProgressiveRegisterStepForField(emailSteps, 'unknown_field')).toBeUndefined();
	});

	it('seeds an editable username from the first four valid email local-part characters', () => {
		expect(suggestUsernameFromEmail('om.a-ar+hasan99@example.com')).toBe('omaa');
		expect(suggestUsernameFromEmail('xy@example.com')).toBe('xy');
		expect(getEmailUsernameSuggestion('another@example.com', '', '')).toBe('anot');
		expect(getEmailUsernameSuggestion('another@example.com', 'my_choice', 'anot')).toBeNull();
	});

	it('requires a complete date of birth at the final submit boundary', () => {
		expect(isDateOfBirthComplete('10', '21', '1996')).toBe(true);
		expect(isDateOfBirthComplete('10', '', '1996')).toBe(false);
	});
});
