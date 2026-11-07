// SPDX-License-Identifier: Nebula

import {SmtpEmailProvider} from '@pkgs/email/src/SmtpEmailProvider';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {createTransport} = vi.hoisted(() => ({createTransport: vi.fn()}));

vi.mock('nodemailer', () => ({default: {createTransport}}));

describe('SmtpEmailProvider', () => {
	const message = {
		to: 'recipient@example.com',
		from: {email: 'sender@example.com', name: 'NEXUS'},
		subject: 'Test',
		text: 'Test message',
	};

	beforeEach(() => {
		createTransport.mockReset();
		createTransport.mockReturnValue({sendMail: vi.fn(), verify: vi.fn()});
	});

	it.each([
		{port: 465, tlsMode: undefined, secure: true, requireTLS: false, ignoreTLS: false},
		{port: 587, tlsMode: undefined, secure: false, requireTLS: true, ignoreTLS: false},
		{port: 587, tlsMode: null, secure: false, requireTLS: true, ignoreTLS: false},
		{port: 587, tlsMode: 'implicit', secure: true, requireTLS: false, ignoreTLS: false},
		{port: 465, tlsMode: 'starttls', secure: false, requireTLS: true, ignoreTLS: false},
		{port: 25, tlsMode: 'opportunistic', secure: false, requireTLS: false, ignoreTLS: false},
		{port: 587, tlsMode: 'none', secure: false, requireTLS: false, ignoreTLS: true},
	] as const)('maps TLS mode $tlsMode on port $port to nodemailer options', ({port, tlsMode, ...expected}) => {
		new SmtpEmailProvider({host: 'smtp.example.com', port, username: 'user', password: 'pass', tlsMode});
		expect(createTransport).toHaveBeenCalledWith(expect.objectContaining(expected));
	});

	it('reports success only when the SMTP server accepts the intended recipient', async () => {
		const sendMail = vi.fn().mockResolvedValue({accepted: ['recipient@example.com'], rejected: []});
		createTransport.mockReturnValue({sendMail, verify: vi.fn()});
		const provider = new SmtpEmailProvider({
			host: 'smtp.example.com',
			port: 587,
			username: 'user',
			password: 'pass',
			tlsMode: 'starttls',
		});

		await expect(provider.sendEmail(message)).resolves.toBe(true);
	});

	it('reports failure when the SMTP server rejects the recipient', async () => {
		const sendMail = vi.fn().mockResolvedValue({accepted: [], rejected: ['recipient@example.com']});
		createTransport.mockReturnValue({sendMail, verify: vi.fn()});
		const provider = new SmtpEmailProvider({
			host: 'smtp.example.com',
			port: 587,
			username: 'user',
			password: 'pass',
			tlsMode: 'starttls',
		});

		await expect(provider.sendEmail(message)).resolves.toBe(false);
	});
});
