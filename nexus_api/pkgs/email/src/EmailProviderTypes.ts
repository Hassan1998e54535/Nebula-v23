// SPDX-License-Identifier: Nebula

export interface EmailConfig {
	enabled: boolean;
	fromEmail: string;
	fromName: string;
	replyTo?: string | null;
	appBaseUrl: string;
	termsUrl: string | null;
	guidelinesUrl: string | null;
	appealsEmail: string | null;
	safetyEmail: string | null;
	supportEmail: string | null;
	productName: string;
}

export interface EmailMessage {
	to: string;
	from: {
		email: string;
		name: string;
	};
	replyTo?: string;
	subject: string;
	text: string;
}

export interface IEmailProvider {
	sendEmail(message: EmailMessage): Promise<boolean>;
}

export interface UserBouncedEmailChecker {
	isEmailBounced(email: string): Promise<boolean>;
}
