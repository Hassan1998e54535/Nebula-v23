// SPDX-License-Identifier: Nebula

import Accessibility from '@app/features/accessibility/state/Accessibility';
import {showGenericErrorModal} from '@app/features/app/components/alerts/GenericErrorModalCommands';
import type {RuntimeConfigSnapshot} from '@app/features/app/state/InstanceSnapshotStore';
import {usesUniqueUsernames} from '@app/features/app/utils/AccountIdentityFeatures';
import * as AuthenticationCommands from '@app/features/auth/commands/AuthenticationCommands';
import FormField from '@app/features/auth/flow/AuthFormField';
import styles from '@app/features/auth/flow/AuthPageStyles.module.css';
import {DateOfBirthField} from '@app/features/auth/flow/DateOfBirthField';
import {
	getEmailUsernameSuggestion,
	getNextProgressiveRegisterStep,
	getPreviousProgressiveRegisterStep,
	getProgressiveRegisterStepForField,
	getProgressiveRegisterSteps,
	isDateOfBirthComplete,
	ProgressiveRegisterStep,
} from '@app/features/auth/flow/ProgressiveRegisterFlow';
import {
	getRegistrationLegalConsentConfig,
	RegistrationLegalConsent,
} from '@app/features/auth/flow/RegistrationLegalConsent';
import {type MissingField, SubmitTooltip, shouldDisableSubmit} from '@app/features/auth/flow/SubmitTooltip';
import {useAuthForm} from '@app/features/auth/hooks/useAuthForm';
import {useUsernameAvailability} from '@app/features/auth/hooks/useUsernameAvailability';
import {
	type AuthRegisterFormDraft,
	EMPTY_AUTH_REGISTER_FORM_DRAFT,
	useAuthRegisterDraftContext,
} from '@app/features/auth/state/AuthRegisterDraftContext';
import {
	DISPLAY_NAME_OPTIONAL_DESCRIPTOR,
	EMAIL_DESCRIPTOR,
	PASSWORD_DESCRIPTOR,
	PASSWORDS_DO_NOT_MATCH_DESCRIPTOR,
	SOMETHING_WENT_WRONG_DESCRIPTOR,
	USERNAME_DESCRIPTOR,
	WHAT_SHOULD_PEOPLE_CALL_YOU_DESCRIPTOR,
} from '@app/features/i18n/utils/CommonMessageDescriptors';
import {useLocation} from '@app/features/platform/components/router/RouterReact';
import {instanceTargetFromSnapshot} from '@app/features/platform/transport/InstanceHTTP';
import {readBlobAsDataUrl} from '@app/features/platform/utils/BlobDataUrl';
import {failureValidationErrors} from '@app/features/platform/utils/ResponseInspection';
import {Button} from '@app/features/ui/button/Button';
import {isMobileExperienceEnabled} from '@app/features/ui/utils/MobileExperience';
import {createRecoveryKitWithPasswordAndOpen} from '@app/features/user/commands/RecoveryKitCommands';
import * as UserCommands from '@app/features/user/commands/UserCommands';
import {AvatarUploader} from '@app/features/user/components/modals/tabs/my_profile_tab/AvatarUploader';
import {useUsernameSuggestions} from '@app/features/user/hooks/useUsernameSuggestions';
import registrationAvatar1 from '@app/media/images/avatars/registration/avatar-1.webp';
import registrationAvatar2 from '@app/media/images/avatars/registration/avatar-2.webp';
import registrationAvatar3 from '@app/media/images/avatars/registration/avatar-3.webp';
import registrationAvatar4 from '@app/media/images/avatars/registration/avatar-4.webp';
import registrationAvatar5 from '@app/media/images/avatars/registration/avatar-5.webp';
import registrationAvatar6 from '@app/media/images/avatars/registration/avatar-6.webp';
import NEXUSLogoAsset from '@app/media/images/nexus-brand-icon.svg?react';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import type {ThemeType} from '@nexus/constants/src/UserConstants';
import {ValidationErrorCodes} from '@nexus/constants/src/ValidationErrorCodes';
import {getErrorMessageUnsafe} from '@nexus/errors/src/i18n/ErrorI18n';
import {AnimatePresence, motion} from 'framer-motion';
import {observer} from 'mobx-react-lite';
import {type FormEvent, type SubmitEvent, useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';

const COULDN_T_UPLOAD_AVATAR_DESCRIPTOR = msg({
	message: "Couldn't upload avatar",
	comment: 'Title of the modal where a profile avatar upload failed.',
});
const CONFIRM_PASSWORD_DESCRIPTOR = msg({
	message: 'Confirm password',
	comment: 'Short label in the authentication auth register form core. Keep the tone plain and specific.',
});
const DATE_OF_BIRTH_DESCRIPTOR = msg({
	message: 'Date of birth',
	comment: 'Short label in the authentication auth register form core. Keep the tone plain and specific.',
});
const DATE_OF_BIRTH_WITHOUT_USERNAME_DESCRIPTOR = msg({
	message: 'Date of birth',
	comment: 'Short label in the authentication auth minimal register form core. Keep the tone plain and specific.',
});
const USERNAME_MUST_BE_CHARACTERS_OR_LESS_DESCRIPTOR = msg({
	message: 'Username must be {maxUsernameLength} characters or fewer',
	comment: 'Registration form validation error when the username exceeds the maximum length. Limit is interpolated.',
});
const ONLY_LETTERS_NUMBERS_AND_UNDERSCORES_DESCRIPTOR = msg({
	message: 'Only letters, numbers, and underscores',
	comment: 'Short label in the authentication auth register form core. Keep the tone plain and specific.',
});
const USERNAME_OPTIONAL_DESCRIPTOR = msg({
	message: 'Username (optional)',
	comment: 'Short label in the authentication auth register form core. Keep the tone plain and specific.',
});
const LEAVE_BLANK_FOR_A_RANDOM_USERNAME_DESCRIPTOR = msg({
	message: 'Leave blank for a random username',
	comment: 'Short label in the authentication auth register form core. Keep the tone plain and specific.',
});
const USERNAME_SIGN_IN_HINT_DESCRIPTOR = msg({
	message: 'You sign in with this username. Pick one you will remember.',
	comment: 'Helper text under the required username field when the instance uses usernames to sign in.',
});
const USERNAME_TAKEN_DESCRIPTOR = msg({
	message: 'This username is already taken',
	comment: 'Registration form message when the chosen username belongs to someone else.',
});
const USERNAME_CHECKING_DESCRIPTOR = msg({
	message: 'Checking username availability',
	comment: 'Status text while checking the username in the mobile registration flow.',
});
const USERNAME_AVAILABLE_DESCRIPTOR = msg({
	message: 'This username is available',
	comment: 'Registration form message when the chosen username is free to use.',
});
const PROGRESSIVE_EMAIL_HEADING = msg({
	message: 'Start with your email',
	comment: 'Heading for the first step of mobile NEXUS registration.',
});
const PROGRESSIVE_NAME_HEADING = msg({
	message: 'What should we call you?',
	comment: 'Heading for the optional display name step of mobile NEXUS registration.',
});
const PROGRESSIVE_CREDENTIALS_HEADING = msg({
	message: 'Choose your username and password',
	comment: 'Heading for the credentials step of mobile NEXUS registration.',
});
const PROGRESSIVE_DETAILS_HEADING = msg({
	message: 'A little about you',
	comment: 'Heading for the final details step of mobile NEXUS registration.',
});
const PROGRESSIVE_AVATAR_HEADING = msg({
	message: 'Avatar',
	comment: 'Heading for the optional profile picture step of mobile NEXUS registration.',
});
const CHANGE_AVATAR_BUTTON = msg({
	message: 'Change avatar',
	comment: 'Accessible label for the circular profile photo picker in mobile registration.',
});
const PROGRESSIVE_BACK = msg({message: 'Back', comment: 'Back button in the mobile registration flow.'});
const PROGRESSIVE_STEP_LABEL = msg({
	message: 'Step {current} of {total}',
	comment: 'Accessible progress label in the mobile registration flow.',
});
const MAX_USERNAME_LENGTH = 32;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const REGISTRATION_AVATAR_PRESETS = [
	registrationAvatar1,
	registrationAvatar2,
	registrationAvatar3,
	registrationAvatar4,
	registrationAvatar5,
	registrationAvatar6,
] as const;

interface FieldConfig {
	showEmail?: boolean;
	showPassword?: boolean;
	showPasswordConfirmation?: boolean;
	showUsername?: boolean;
	showUsernameValidation?: boolean;
	requireUsername?: boolean;
}

interface AuthRegisterFormCoreProps {
	fields?: FieldConfig;
	submitLabel: React.ReactNode;
	redirectPath: string;
	runtimeSnapshot: RuntimeConfigSnapshot;
	onRegister?: (response: AuthenticationCommands.TokenResponse) => Promise<void>;
	onAuthenticated?: () => void;
	inviteCode?: string;
	extraContent?: React.ReactNode;
	showLegalConsent?: boolean;
	theme?: ThemeType;
	offerRecoveryKit?: boolean;
	setupToken?: string;
	onSetupTokenRejected?: (message: string) => void;
	progressiveMobile?: boolean;
}

export const AuthRegisterFormCore = observer(function AuthRegisterFormCore({
	fields = {},
	submitLabel,
	redirectPath,
	runtimeSnapshot,
	onRegister,
	onAuthenticated,
	inviteCode,
	extraContent,
	showLegalConsent = true,
	theme,
	offerRecoveryKit = false,
	setupToken,
	onSetupTokenRejected,
	progressiveMobile = false,
}: AuthRegisterFormCoreProps) {
	const {i18n} = useLingui();
	const {
		showEmail = false,
		showPassword = false,
		showPasswordConfirmation = false,
		showUsername = true,
		showUsernameValidation = false,
		requireUsername = false,
	} = fields;
	const progressiveEnabled = progressiveMobile && isMobileExperienceEnabled();
	const progressiveSteps = useMemo(() => getProgressiveRegisterSteps(showEmail), [showEmail]);
	const [progressiveStep, setProgressiveStep] = useState<ProgressiveRegisterStep>(
		showEmail ? ProgressiveRegisterStep.EMAIL : ProgressiveRegisterStep.DISPLAY_NAME,
	);
	const generatedUsernameRef = useRef('');
	const progressiveHeadingRef = useRef<HTMLHeadingElement>(null);
	const progressiveStepIndex = progressiveSteps.indexOf(progressiveStep);
	useEffect(() => {
		if (progressiveEnabled) progressiveHeadingRef.current?.focus();
	}, [progressiveEnabled, progressiveStep]);
	const flx = showUsername ? 'auth.flow.auth-register-form-core' : 'auth.flow.auth-minimal-register-form-core';
	const firstFieldName = showEmail ? 'email' : requireUsername ? 'username' : 'global_name';
	const location = useLocation();
	const draftKey = `register:${location.pathname}${location.search}`;
	const registrationUrlCode = useMemo(() => {
		const value = new URLSearchParams(location.search).get('registration_url')?.trim();
		return value || undefined;
	}, [location.search]);
	const registrationTarget = useMemo(() => instanceTargetFromSnapshot(runtimeSnapshot), [runtimeSnapshot]);
	const isPublicRegistrationClosed = runtimeSnapshot.registration.mode === 'closed' && !registrationUrlCode;
	const collectDateOfBirth = runtimeSnapshot.appPublic.registration.collect_date_of_birth;
	const {getRegisterFormDraft, setRegisterFormDraft, clearRegisterFormDraft} = useAuthRegisterDraftContext();
	const emailId = useId();
	const globalNameId = useId();
	const usernameId = useId();
	const passwordId = useId();
	const confirmPasswordId = useId();
	const initialDraft = useMemo<AuthRegisterFormDraft>(() => {
		const persistedDraft = getRegisterFormDraft(draftKey);
		if (!persistedDraft) {
			return EMPTY_AUTH_REGISTER_FORM_DRAFT;
		}
		return {
			...persistedDraft,
			formValues: {...persistedDraft.formValues},
		};
	}, [draftKey, getRegisterFormDraft]);
	const draftRef = useRef<AuthRegisterFormDraft>({
		...initialDraft,
		formValues: {...initialDraft.formValues},
	});
	const [selectedMonth, setSelectedMonthState] = useState(initialDraft.selectedMonth);
	const [selectedDay, setSelectedDayState] = useState(initialDraft.selectedDay);
	const [selectedYear, setSelectedYearState] = useState(initialDraft.selectedYear);
	const [consent, setConsentState] = useState(initialDraft.consent);
	const [pendingApprovalUserId, setPendingApprovalUserId] = useState<string | null>(null);
	const [registrationAvatar, setRegistrationAvatar] = useState<string | null>(null);
	const [selectedRegistrationAvatarPreset, setSelectedRegistrationAvatarPreset] = useState<number | null>(null);
	const [registrationAvatarPickerOpen, setRegistrationAvatarPickerOpen] = useState(false);
	const [emailRegistrationError, setEmailRegistrationError] = useState<string | null>(null);
	const skipAvatarUploadRef = useRef(false);
	const legalConsentConfig = getRegistrationLegalConsentConfig(runtimeSnapshot, showLegalConsent);
	const effectiveConsent = legalConsentConfig.requirement ? consent : true;
	const initialValues: Record<string, string> = {
		global_name: initialDraft.formValues.global_name ?? '',
	};
	if (showUsername) initialValues.username = initialDraft.formValues.username ?? '';
	if (showEmail) initialValues.email = initialDraft.formValues.email ?? '';
	if (showPassword) initialValues.password = initialDraft.formValues.password ?? '';
	if (showPassword && showPasswordConfirmation) {
		initialValues.confirm_password = initialDraft.formValues.confirm_password ?? '';
	}
	const persistDraft = useCallback(
		(partialDraft: Partial<AuthRegisterFormDraft>) => {
			const currentDraft = draftRef.current;
			const nextDraft: AuthRegisterFormDraft = {
				...currentDraft,
				...partialDraft,
				formValues: partialDraft.formValues ? {...partialDraft.formValues} : currentDraft.formValues,
			};
			draftRef.current = nextDraft;
			setRegisterFormDraft(draftKey, nextDraft);
		},
		[draftKey, setRegisterFormDraft],
	);
	const handleMonthChange = useCallback(
		(month: string) => {
			setSelectedMonthState(month);
			persistDraft({selectedMonth: month});
		},
		[persistDraft],
	);
	const handleDayChange = useCallback(
		(day: string) => {
			setSelectedDayState(day);
			persistDraft({selectedDay: day});
		},
		[persistDraft],
	);
	const handleYearChange = useCallback(
		(year: string) => {
			setSelectedYearState(year);
			persistDraft({selectedYear: year});
		},
		[persistDraft],
	);
	const handleConsentChange = useCallback(
		(nextConsent: boolean) => {
			setConsentState(nextConsent);
			persistDraft({consent: nextConsent});
		},
		[persistDraft],
	);
	const handleRegisterSubmit = async (values: Record<string, string>) => {
		const selectedAvatarPreset = selectedRegistrationAvatarPreset;
		const shouldUploadAvatar =
			(registrationAvatar !== null || selectedAvatarPreset !== null) && !skipAvatarUploadRef.current;
		skipAvatarUploadRef.current = false;
		if (showPasswordConfirmation && showPassword && values.password !== values.confirm_password) {
			form.setError('confirm_password', i18n._(PASSWORDS_DO_NOT_MATCH_DESCRIPTOR));
			return false;
		}
		if (isPublicRegistrationClosed) {
			return false;
		}
		setPendingApprovalUserId(null);
		const dateOfBirth =
			collectDateOfBirth && selectedYear && selectedMonth && selectedDay
				? `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`
				: undefined;
		let response: Awaited<ReturnType<typeof AuthenticationCommands.register>>;
		try {
			response = await AuthenticationCommands.register(
				{
					global_name: values.global_name || undefined,
					username: (requireUsername ? values.username.trim() : values.username) || undefined,
					email: showEmail ? values.email : undefined,
					password: showPassword ? values.password : undefined,
					date_of_birth: dateOfBirth,
					consent: effectiveConsent,
					invite_code: inviteCode,
					registration_url_code: registrationUrlCode,
					theme,
					setup_token: setupToken || undefined,
				},
				registrationTarget,
			);
		} catch (error) {
			const validationErrors = failureValidationErrors(error) ?? [];
			const emailViolation = validationErrors.find((violation) => violation.path === 'email');
			if (emailViolation?.code === ValidationErrorCodes.EMAIL_ALREADY_IN_USE) {
				setProgressiveStep(ProgressiveRegisterStep.EMAIL);
				setEmailRegistrationError(
					getErrorMessageUnsafe(
						ValidationErrorCodes.EMAIL_ALREADY_IN_USE,
						i18n.locale,
						undefined,
						emailViolation.message,
					),
				);
				return false;
			}
			for (const violation of validationErrors) {
				const errorStep = getProgressiveRegisterStepForField(progressiveSteps, violation.path);
				if (errorStep) {
					setProgressiveStep(errorStep);
					break;
				}
			}
			const setupTokenViolation = failureValidationErrors(error)?.find((violation) => violation.path === 'setup_token');
			if (!setupTokenViolation) {
				throw error;
			}
			if (onSetupTokenRejected) {
				onSetupTokenRejected(setupTokenViolation.message);
			} else {
				form.setError(firstFieldName, setupTokenViolation.message);
			}
			return false;
		}
		if (AuthenticationCommands.isRegistrationPendingApprovalResponse(response)) {
			clearRegisterFormDraft(draftKey);
			setPendingApprovalUserId(response.user_id);
			return false;
		}
		if (onRegister) {
			await onRegister(response);
		} else {
			const userData = AuthenticationCommands.authResponseUserToUserData(response.user);
			await AuthenticationCommands.completeLogin({
				token: response.token,
				userId: response.user_id,
				...(userData ? {userData} : {}),
				runtimeSnapshot,
			});
		}
		if (shouldUploadAvatar) {
			try {
				let avatarData = registrationAvatar;
				if (!avatarData && selectedAvatarPreset !== null) {
					const presetUrl = REGISTRATION_AVATAR_PRESETS[selectedAvatarPreset];
					if (!presetUrl) throw new Error('The selected avatar is unavailable');
					const response = await fetch(presetUrl);
					if (!response.ok) throw new Error('Unable to load the selected avatar');
					avatarData = await readBlobAsDataUrl(await response.blob());
				}
				if (avatarData) await UserCommands.update({avatar: avatarData});
			} catch {
				showGenericErrorModal({
					title: i18n._(COULDN_T_UPLOAD_AVATAR_DESCRIPTOR),
					message: i18n._(SOMETHING_WENT_WRONG_DESCRIPTOR),
					dataFlx: 'auth.flow.auth-register-form-core.avatar-upload-error',
				});
			}
		}
		if (offerRecoveryKit && showPassword && values.password) {
			void createRecoveryKitWithPasswordAndOpen({
				userId: response.user_id,
				password: values.password,
				username: response.user?.username,
				discriminator: response.user?.discriminator,
			});
		}
		onAuthenticated?.();
		clearRegisterFormDraft(draftKey);
		return undefined;
	};
	const {form, isLoading, fieldErrors} = useAuthForm({
		initialValues,
		onSubmit: handleRegisterSubmit,
		redirectPath,
		firstFieldName,
	});
	useEffect(() => {
		if (!progressiveEnabled || progressiveStep !== ProgressiveRegisterStep.EMAIL || !emailRegistrationError) return;
		document.getElementById(emailId)?.focus();
	}, [emailId, emailRegistrationError, progressiveEnabled, progressiveStep]);
	const setDraftedFormValue = useCallback(
		(fieldName: string, value: string) => {
			form.setValue(fieldName, value);
			const nextFormValues = {
				...draftRef.current.formValues,
				[fieldName]: value,
			};
			persistDraft({formValues: nextFormValues});
		},
		[form, persistDraft],
	);
	const handleEmailChange = useCallback(
		(value: string) => {
			setEmailRegistrationError(null);
			setDraftedFormValue('email', value);
			if (!progressiveEnabled) return;
			const suggestion = getEmailUsernameSuggestion(value, form.getValue('username'), generatedUsernameRef.current);
			if (suggestion !== null) {
				generatedUsernameRef.current = suggestion;
				setDraftedFormValue('username', suggestion);
			}
		},
		[form, progressiveEnabled, setDraftedFormValue],
	);
	const advanceProgressiveStep = useCallback(() => {
		const nextStep = getNextProgressiveRegisterStep(progressiveSteps, progressiveStep);
		if (nextStep) setProgressiveStep(nextStep);
	}, [progressiveSteps, progressiveStep]);
	const {suggestions} = useUsernameSuggestions({
		globalName: form.getValue('global_name'),
		username: form.getValue('username'),
		target: registrationTarget,
		enabled: showUsername,
	});
	const missingFields = useMemo(() => {
		const missing: Array<MissingField> = [];
		if (showEmail && !form.getValue('email')) {
			missing.push({key: 'email', label: i18n._(EMAIL_DESCRIPTOR)});
		}
		if (requireUsername && !form.getValue('username')?.trim()) {
			missing.push({key: 'username', label: i18n._(USERNAME_DESCRIPTOR)});
		}
		if (showPassword && !form.getValue('password')) {
			missing.push({key: 'password', label: i18n._(PASSWORD_DESCRIPTOR)});
		}
		if (showPassword && showPasswordConfirmation && !form.getValue('confirm_password')) {
			missing.push({key: 'confirm_password', label: i18n._(CONFIRM_PASSWORD_DESCRIPTOR)});
		}
		if (collectDateOfBirth && !isDateOfBirthComplete(selectedMonth, selectedDay, selectedYear)) {
			missing.push({
				key: 'date_of_birth',
				label: i18n._(showUsername ? DATE_OF_BIRTH_DESCRIPTOR : DATE_OF_BIRTH_WITHOUT_USERNAME_DESCRIPTOR),
			});
		}
		return missing;
	}, [
		form,
		selectedMonth,
		selectedDay,
		selectedYear,
		showEmail,
		requireUsername,
		showPassword,
		showPasswordConfirmation,
		showUsername,
		collectDateOfBirth,
		i18n.locale,
	]);
	type HelperTextState =
		| {type: 'error'; message: string}
		| {type: 'hint'; message: string}
		| {type: 'suggestion'; username: string}
		| null;
	const usernameValue = form.getValue('username');
	const trimmedUsername = usernameValue?.trim() || '';
	const usernameFormatValid = trimmedUsername.length <= MAX_USERNAME_LENGTH && USERNAME_PATTERN.test(trimmedUsername);
	const uniqueUsernames = usesUniqueUsernames(runtimeSnapshot.features);
	const usernameAvailability = useUsernameAvailability(
		registrationTarget,
		trimmedUsername,
		showUsername && uniqueUsernames && trimmedUsername.length > 0 && usernameFormatValid,
	);
	const helperTextState = useMemo<HelperTextState>(() => {
		if ((showUsernameValidation || requireUsername) && trimmedUsername.length > 0) {
			if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
				return {
					type: 'error',
					message: i18n._(USERNAME_MUST_BE_CHARACTERS_OR_LESS_DESCRIPTOR, {maxUsernameLength: MAX_USERNAME_LENGTH}),
				};
			}
			if (!USERNAME_PATTERN.test(trimmedUsername)) {
				return {type: 'error', message: i18n._(ONLY_LETTERS_NUMBERS_AND_UNDERSCORES_DESCRIPTOR)};
			}
		}
		if (uniqueUsernames && usernameAvailability === 'taken') {
			return {type: 'error', message: i18n._(USERNAME_TAKEN_DESCRIPTOR)};
		}
		if (uniqueUsernames && usernameAvailability === 'checking') {
			return {type: 'hint', message: i18n._(USERNAME_CHECKING_DESCRIPTOR)};
		}
		if (uniqueUsernames && usernameAvailability === 'available') {
			return {type: 'hint', message: i18n._(USERNAME_AVAILABLE_DESCRIPTOR)};
		}
		if (trimmedUsername.length === 0 && suggestions.length === 1) {
			return {type: 'suggestion', username: suggestions[0]};
		}
		if (requireUsername) {
			return {type: 'hint', message: i18n._(USERNAME_SIGN_IN_HINT_DESCRIPTOR)};
		}
		return null;
	}, [
		trimmedUsername,
		suggestions,
		showUsernameValidation,
		requireUsername,
		uniqueUsernames,
		usernameAvailability,
		i18n.locale,
	]);
	const handleProgressiveContinue = useCallback(() => {
		if (progressiveStep === ProgressiveRegisterStep.EMAIL) {
			if (emailRegistrationError) {
				document.getElementById(emailId)?.focus();
				return;
			}
			const emailInput = document.getElementById(emailId) as HTMLInputElement | null;
			if (!emailInput?.reportValidity()) return;
		}
		if (progressiveStep === ProgressiveRegisterStep.DETAILS) {
			if (collectDateOfBirth && !isDateOfBirthComplete(selectedMonth, selectedDay, selectedYear)) {
				document
					.querySelector<HTMLInputElement>(
						'[data-flx="auth.flow.date-of-birth-field.native-date-picker.native-date-input.date-change"]',
					)
					?.focus();
				return;
			}
			if (!effectiveConsent) return;
		}
		if (progressiveStep === ProgressiveRegisterStep.CREDENTIALS) {
			const password = form.getValue('password') ?? '';
			const confirmation = form.getValue('confirm_password') ?? '';
			if (!password) {
				document.getElementById(passwordId)?.focus();
				return;
			}
			if (showPasswordConfirmation && password !== confirmation) {
				form.setError('confirm_password', i18n._(PASSWORDS_DO_NOT_MATCH_DESCRIPTOR));
				document.getElementById(confirmPasswordId)?.focus();
				return;
			}
			if (requireUsername && (!trimmedUsername || !usernameFormatValid)) {
				document.getElementById(usernameId)?.focus();
				return;
			}
			if (trimmedUsername && (!usernameFormatValid || (uniqueUsernames && usernameAvailability !== 'available'))) {
				document.getElementById(usernameId)?.focus();
				return;
			}
		}
		advanceProgressiveStep();
	}, [
		progressiveStep,
		emailId,
		emailRegistrationError,
		collectDateOfBirth,
		selectedMonth,
		selectedDay,
		selectedYear,
		effectiveConsent,
		form,
		passwordId,
		showPasswordConfirmation,
		i18n,
		confirmPasswordId,
		requireUsername,
		trimmedUsername,
		usernameFormatValid,
		usernameId,
		uniqueUsernames,
		usernameAvailability,
		advanceProgressiveStep,
	]);
	const handleProgressiveSubmit = (event: FormEvent<HTMLFormElement>) => {
		if (progressiveEnabled && progressiveStep !== ProgressiveRegisterStep.AVATAR) {
			event.preventDefault();
			handleProgressiveContinue();
			return;
		}
		void form.handleSubmit(event.nativeEvent as unknown as SubmitEvent<HTMLFormElement>);
	};
	const submitDisabled =
		isLoading ||
		form.isSubmitting ||
		isPublicRegistrationClosed ||
		pendingApprovalUserId !== null ||
		(requireUsername && !usernameFormatValid) ||
		(progressiveEnabled &&
			trimmedUsername.length > 0 &&
			(!usernameFormatValid || (uniqueUsernames && usernameAvailability !== 'available'))) ||
		(uniqueUsernames && usernameAvailability === 'taken') ||
		emailRegistrationError !== null ||
		shouldDisableSubmit(effectiveConsent, missingFields);
	const progressiveHeading =
		progressiveStep === ProgressiveRegisterStep.EMAIL
			? i18n._(PROGRESSIVE_EMAIL_HEADING)
			: progressiveStep === ProgressiveRegisterStep.DISPLAY_NAME
				? i18n._(PROGRESSIVE_NAME_HEADING)
				: progressiveStep === ProgressiveRegisterStep.CREDENTIALS
					? i18n._(PROGRESSIVE_CREDENTIALS_HEADING)
					: progressiveStep === ProgressiveRegisterStep.DETAILS
						? i18n._(PROGRESSIVE_DETAILS_HEADING)
						: i18n._(PROGRESSIVE_AVATAR_HEADING);
	const isProgressiveDetails = progressiveStep === ProgressiveRegisterStep.DETAILS;
	const isProgressiveAvatar = progressiveStep === ProgressiveRegisterStep.AVATAR;
	const registrationAvatarPreview =
		registrationAvatar ??
		(selectedRegistrationAvatarPreset !== null
			? (REGISTRATION_AVATAR_PRESETS[selectedRegistrationAvatarPreset] ?? null)
			: null);
	return (
		<form
			className={`${styles.form} ${progressiveEnabled ? styles.progressiveForm : ''}`}
			onSubmit={handleProgressiveSubmit}
			data-flx={`${flx}.form.submit`}
		>
			{progressiveEnabled && !isProgressiveAvatar && (
				<div className={styles.progressiveBrand} data-flx="auth.flow.auth-register-form-core.progressive-brand">
					<NEXUSLogoAsset className={styles.progressiveBrandIcon} aria-hidden="true" />
					<span
						className={styles.progressiveBrandWordmark}
						role="img"
						aria-label="NEXUS"
						data-flx="auth.flow.auth-register-form-core.progressive-wordmark"
					>
						NEXUS
					</span>
				</div>
			)}
			{isPublicRegistrationClosed ? (
				<div className={styles.registrationNotice} role="alert" data-flx={`${flx}.closed-notice`}>
					<Trans>Registration is currently closed. Use a registration link from an admin to create an account.</Trans>
				</div>
			) : null}
			{pendingApprovalUserId ? (
				<div className={styles.registrationNotice} role="status" data-flx={`${flx}.pending-approval-notice`}>
					<Trans>Your account request is pending approval. You can sign in after an admin approves it.</Trans>
				</div>
			) : null}
			{progressiveEnabled && (
				<header className={styles.progressiveHeader}>
					{(progressiveStepIndex > 0 || isProgressiveAvatar) && (
						<div className={styles.progressiveHeaderActions}>
							{progressiveStepIndex > 0 && (
								<button
									type="button"
									className={styles.progressiveBack}
									onClick={() => {
										const previousStep = getPreviousProgressiveRegisterStep(progressiveSteps, progressiveStep);
										if (previousStep) setProgressiveStep(previousStep);
									}}
									aria-label={i18n._(PROGRESSIVE_BACK)}
									data-flx="auth.flow.auth-register-form-core.progressive-back"
								>
									<Trans>Back</Trans>
								</button>
							)}
							{isProgressiveAvatar && (
								<button
									type="submit"
									className={styles.progressiveHeaderSkip}
									disabled={submitDisabled}
									onClick={() => {
										skipAvatarUploadRef.current = true;
									}}
									data-flx="auth.flow.auth-register-form-core.skip-avatar.top"
								>
									<Trans>Skip</Trans>
								</button>
							)}
						</div>
					)}
					<div className={styles.progressiveProgress}>
						<span className={styles.progressiveStepCount} aria-live="polite">
							{i18n._(PROGRESSIVE_STEP_LABEL, {current: progressiveStepIndex + 1, total: progressiveSteps.length})}
						</span>
						<div
							className={styles.progressiveTrack}
							role="progressbar"
							aria-label={i18n._(PROGRESSIVE_STEP_LABEL, {
								current: progressiveStepIndex + 1,
								total: progressiveSteps.length,
							})}
							aria-valuemin={1}
							aria-valuemax={progressiveSteps.length}
							aria-valuenow={progressiveStepIndex + 1}
						>
							<span style={{transform: `scaleX(${(progressiveStepIndex + 1) / progressiveSteps.length})`}} />
						</div>
					</div>
					<h2 ref={progressiveHeadingRef} tabIndex={-1} className={styles.progressiveHeading}>
						{progressiveHeading}
					</h2>
				</header>
			)}
			{showEmail && (!progressiveEnabled || progressiveStep === ProgressiveRegisterStep.EMAIL) && (
				<FormField
					id={emailId}
					name="email"
					type="email"
					autoComplete="email"
					required
					label={i18n._(EMAIL_DESCRIPTOR)}
					value={form.getValue('email')}
					onChange={handleEmailChange}
					error={emailRegistrationError || form.getError('email') || fieldErrors?.get('email')}
					data-flx="auth.flow.auth-register-form-core.form-field.set-drafted-form-value.email"
				/>
			)}
			{(!progressiveEnabled || progressiveStep === ProgressiveRegisterStep.DISPLAY_NAME) && (
				<FormField
					id={globalNameId}
					name="global_name"
					type="text"
					label={i18n._(DISPLAY_NAME_OPTIONAL_DESCRIPTOR)}
					placeholder={i18n._(WHAT_SHOULD_PEOPLE_CALL_YOU_DESCRIPTOR)}
					value={form.getValue('global_name')}
					onChange={(value) => setDraftedFormValue('global_name', value)}
					error={form.getError('global_name') || fieldErrors?.get('global_name')}
					data-flx={`${flx}.form-field.set-drafted-form-value.text`}
				/>
			)}
			{showUsername && (!progressiveEnabled || progressiveStep === ProgressiveRegisterStep.CREDENTIALS) && (
				<div data-flx="auth.flow.auth-register-form-core.div">
					<FormField
						id={usernameId}
						name="username"
						type="text"
						autoComplete="username"
						autoCapitalize={requireUsername ? 'none' : undefined}
						autoCorrect={requireUsername ? 'off' : undefined}
						spellCheck={requireUsername ? false : undefined}
						required={requireUsername}
						label={i18n._(requireUsername ? USERNAME_DESCRIPTOR : USERNAME_OPTIONAL_DESCRIPTOR)}
						placeholder={requireUsername ? undefined : i18n._(LEAVE_BLANK_FOR_A_RANDOM_USERNAME_DESCRIPTOR)}
						value={usernameValue}
						onChange={(value) => setDraftedFormValue('username', value)}
						error={form.getError('username') || fieldErrors?.get('username')}
						data-flx="auth.flow.auth-register-form-core.form-field.set-drafted-form-value.text--2"
					/>
					<AnimatePresence mode="wait" initial={false} data-flx="auth.flow.auth-register-form-core.animate-presence">
						{helperTextState?.type === 'error' && (
							<motion.span
								key="error"
								className={styles.usernameError}
								initial={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: -5}}
								animate={{opacity: 1, y: 0}}
								exit={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: 5}}
								transition={{duration: Accessibility.useReducedMotion ? 0 : 0.2}}
								data-flx="auth.flow.auth-register-form-core.username-error"
							>
								{helperTextState.message}
							</motion.span>
						)}
						{helperTextState?.type === 'hint' && (
							<motion.span
								key={`hint-${helperTextState.message}`}
								className={styles.usernameHint}
								initial={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: -5}}
								animate={{opacity: 1, y: 0}}
								exit={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: 5}}
								transition={{duration: Accessibility.useReducedMotion ? 0 : 0.2}}
								data-flx="auth.flow.auth-register-form-core.username-sign-in-hint"
							>
								{helperTextState.message}
							</motion.span>
						)}
						{helperTextState?.type === 'suggestion' && (
							<motion.span
								key="suggestion"
								className={styles.usernameHint}
								initial={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: -5}}
								animate={{opacity: 1, y: 0}}
								exit={Accessibility.useReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: 5}}
								transition={{duration: Accessibility.useReducedMotion ? 0 : 0.2}}
								data-flx="auth.flow.auth-register-form-core.username-hint"
							>
								<Trans>How about:</Trans>{' '}
								<button
									type="button"
									className={styles.suggestionLink}
									onClick={() => setDraftedFormValue('username', helperTextState.username)}
									data-flx="auth.flow.auth-register-form-core.suggestion-link.set-drafted-form-value.button"
								>
									{helperTextState.username}
								</button>
							</motion.span>
						)}
					</AnimatePresence>
				</div>
			)}
			{showPassword && (!progressiveEnabled || progressiveStep === ProgressiveRegisterStep.CREDENTIALS) && (
				<FormField
					id={passwordId}
					name="password"
					type="password"
					autoComplete="new-password"
					required
					label={i18n._(PASSWORD_DESCRIPTOR)}
					value={form.getValue('password')}
					onChange={(value) => setDraftedFormValue('password', value)}
					error={form.getError('password') || fieldErrors?.get('password')}
					data-flx="auth.flow.auth-register-form-core.form-field.set-drafted-form-value.password"
				/>
			)}
			{showPassword &&
				showPasswordConfirmation &&
				(!progressiveEnabled || progressiveStep === ProgressiveRegisterStep.CREDENTIALS) && (
					<FormField
						id={confirmPasswordId}
						name="confirm_password"
						type="password"
						autoComplete="new-password"
						required
						label={i18n._(CONFIRM_PASSWORD_DESCRIPTOR)}
						value={form.getValue('confirm_password')}
						onChange={(value) => setDraftedFormValue('confirm_password', value)}
						error={form.getError('confirm_password')}
						data-flx="auth.flow.auth-register-form-core.form-field.set-drafted-form-value.password--2"
					/>
				)}
			{collectDateOfBirth && (!progressiveEnabled || isProgressiveDetails) ? (
				<DateOfBirthField
					selectedMonth={selectedMonth}
					selectedDay={selectedDay}
					selectedYear={selectedYear}
					onMonthChange={handleMonthChange}
					onDayChange={handleDayChange}
					onYearChange={handleYearChange}
					error={fieldErrors?.get('date_of_birth')}
					data-flx={`${flx}.date-of-birth-field`}
				/>
			) : null}
			{progressiveEnabled && isProgressiveAvatar && (
				<div className={styles.progressiveAvatarStep} data-flx="auth.flow.auth-register-form-core.avatar-step">
					<div className={styles.progressiveAvatarRing}>
						{registrationAvatarPreview ? (
							<img
								className={styles.progressiveAvatarPreview}
								src={registrationAvatarPreview}
								alt=""
								aria-hidden="true"
								data-flx="auth.flow.auth-register-form-core.avatar-preview"
							/>
						) : (
							<NEXUSLogoAsset
								className={styles.progressiveAvatarPlaceholder}
								aria-hidden="true"
								data-flx="auth.flow.auth-register-form-core.avatar-preview.placeholder"
							/>
						)}
						<button
							type="button"
							className={styles.progressiveAvatarAdd}
							aria-label={i18n._(CHANGE_AVATAR_BUTTON)}
							onClick={() => setRegistrationAvatarPickerOpen(true)}
							disabled={isLoading || form.isSubmitting}
							data-flx="auth.flow.auth-register-form-core.avatar-add"
						>
							<span aria-hidden="true">+</span>
						</button>
					</div>
					<div className={styles.progressiveAvatarChoices} role="group" aria-label={i18n._(PROGRESSIVE_AVATAR_HEADING)}>
						{REGISTRATION_AVATAR_PRESETS.map((avatar, index) => (
							<button
								key={avatar}
								type="button"
								className={`${styles.progressiveAvatarChoice} ${
									selectedRegistrationAvatarPreset === index ? styles.progressiveAvatarChoiceSelected : ''
								}`}
								aria-label={`${i18n._(PROGRESSIVE_AVATAR_HEADING)} ${index + 1}`}
								aria-pressed={selectedRegistrationAvatarPreset === index}
								onClick={() => {
									setRegistrationAvatar(null);
									setSelectedRegistrationAvatarPreset(index);
								}}
								disabled={isLoading || form.isSubmitting}
								data-flx={`auth.flow.auth-register-form-core.avatar-preset.${index + 1}`}
							>
								<img src={avatar} alt="" aria-hidden="true" />
							</button>
						))}
					</div>
					<div className={styles.progressiveAvatarUploader} aria-hidden="true">
						<AvatarUploader
							hasAvatar={registrationAvatar !== null}
							onAvatarChange={(avatar) => {
								setRegistrationAvatar(avatar);
								setSelectedRegistrationAvatarPreset(null);
							}}
							onAvatarClear={() => {
								setRegistrationAvatar(null);
								setSelectedRegistrationAvatarPreset(null);
							}}
							disabled={isLoading || form.isSubmitting}
							disableModeSelection
							isPerGuildProfile={false}
							avatarMode="custom"
							autoOpen={registrationAvatarPickerOpen}
							onAutoOpen={() => setRegistrationAvatarPickerOpen(false)}
						/>
					</div>
				</div>
			)}
			{(!progressiveEnabled || isProgressiveDetails) && extraContent}
			{(!progressiveEnabled || isProgressiveDetails) && (
				<RegistrationLegalConsent
					checked={consent}
					config={legalConsentConfig}
					onChange={handleConsentChange}
					data-flx={`${flx}.registration-legal-consent.consent-change`}
				/>
			)}
			{!progressiveEnabled || isProgressiveAvatar ? (
				<SubmitTooltip
					consent={effectiveConsent}
					legalConsentRequirement={legalConsentConfig.requirement ?? undefined}
					missingFields={missingFields}
					data-flx={`${flx}.submit-tooltip`}
				>
					<Button type="submit" fitContainer disabled={submitDisabled} data-flx={`${flx}.button.submit`}>
						{submitLabel}
					</Button>
				</SubmitTooltip>
			) : (
				<div className={styles.progressiveActions}>
					<Button
						type="button"
						fitContainer
						onClick={handleProgressiveContinue}
						disabled={
							progressiveStep === ProgressiveRegisterStep.CREDENTIALS &&
							((requireUsername && !trimmedUsername) ||
								(trimmedUsername.length > 0 &&
									(!usernameFormatValid || (uniqueUsernames && usernameAvailability !== 'available'))))
						}
						data-flx="auth.flow.auth-register-form-core.progressive-continue"
					>
						<Trans>Continue</Trans>
					</Button>
					{progressiveStep === ProgressiveRegisterStep.DISPLAY_NAME && (
						<button
							type="button"
							className={styles.progressiveSkip}
							onClick={advanceProgressiveStep}
							data-flx="auth.flow.auth-register-form-core.progressive-skip"
						>
							<Trans>Skip</Trans>
						</button>
					)}
				</div>
			)}
		</form>
	);
});
