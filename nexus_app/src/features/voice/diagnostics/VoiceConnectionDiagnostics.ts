// SPDX-License-Identifier: Nebula

import {Store} from '@app/features/voice/engine/Store';

export type VoiceConnectionDiagnosticStatus = 'idle' | 'connecting' | 'connected' | 'failed';
export type VoiceMicrophonePermissionStatus =
	| 'unknown'
	| 'requesting'
	| 'granted'
	| 'denied'
	| 'unavailable'
	| 'failed';
export type VoiceAudioPlaybackStatus = 'not-tested' | 'playing' | 'blocked';

export interface VoiceConnectionDiagnosticEvent {
	readonly at: number;
	readonly label: string;
	readonly detail?: string;
}

export interface VoiceConnectionDiagnosticSnapshot {
	readonly status: VoiceConnectionDiagnosticStatus;
	readonly startedAt: number | null;
	readonly endpoint: string | null;
	readonly hasToken: boolean | null;
	readonly signalConnected: boolean;
	readonly iceState: string | null;
	readonly audioPublished: boolean;
	readonly microphonePermission: VoiceMicrophonePermissionStatus;
	readonly audioContextState: string | null;
	readonly voicePresence: 'unknown' | 'requested' | 'joined' | 'left';
	readonly remoteAudioSubscriptions: number;
	readonly remoteAudioPlayback: VoiceAudioPlaybackStatus;
	readonly connectedAt: number | null;
	readonly error: string | null;
	readonly events: ReadonlyArray<VoiceConnectionDiagnosticEvent>;
}

const MAX_EVENTS = 24;

const initialSnapshot: VoiceConnectionDiagnosticSnapshot = {
	status: 'idle',
	startedAt: null,
	endpoint: null,
	hasToken: null,
	signalConnected: false,
	iceState: null,
	audioPublished: false,
	microphonePermission: 'unknown',
	audioContextState: null,
	voicePresence: 'unknown',
	remoteAudioSubscriptions: 0,
	remoteAudioPlayback: 'not-tested',
	connectedAt: null,
	error: null,
	events: [],
};

export function safeVoiceEndpoint(endpoint: string | null | undefined): string | null {
	if (!endpoint) return null;
	try {
		const url = new URL(endpoint);
		if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return 'رابط غير صالح (المتوقع ws أو wss)';
		return `${url.protocol}//${url.host}`;
	} catch {
		return 'رابط غير صالح';
	}
}

function safeDiagnosticText(message: string): string {
	return message
		.replace(/\b(?:wss?|https?):\/\/[^\s"'<>]+/gi, (rawUrl) => {
			try {
				const url = new URL(rawUrl.replace(/[),.;]+$/, ''));
				return `${url.protocol}//${url.host}`;
			} catch {
				return '[رابط مخفي]';
			}
		})
		.replace(/\b(authorization|access[_-]?token|token|api[_-]?key|secret|password)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^&\s,;]+)/gi, '$1=[مخفي]')
		.replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [مخفي]')
		.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]{8,})?\b/g, '[token مخفي]')
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 160);
}

export function safeVoiceError(error: unknown): string {
	if (!error || typeof error !== 'object') return 'خطأ غير معروف';
	const value = error as {
		name?: unknown;
		code?: unknown;
		message?: unknown;
		reasonName?: unknown;
		status?: unknown;
	};
	const name =
		typeof value.name === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,50}$/.test(value.name)
			? value.name
			: 'ConnectionError';
	const code = typeof value.code === 'number' && Number.isFinite(value.code) ? `رمز ${value.code}` : null;
	const status =
		typeof value.status === 'number' && Number.isInteger(value.status) && value.status >= 100 && value.status <= 599
			? `HTTP ${value.status}`
			: null;
	const reasonLabels: Record<string, string> = {
		NotAllowed: 'رفض صلاحية أو مصادقة',
		ServerUnreachable: 'تعذر الوصول إلى الخادم',
		InternalError: 'خطأ داخلي في الإشارة',
		Cancelled: 'أُلغي الاتصال',
		LeaveRequest: 'طلب مغادرة',
		Timeout: 'انتهت المهلة',
		WebSocket: 'WebSocket',
		ServiceNotFound: 'مسار LiveKit غير موجود',
	};
	const reason =
		typeof value.reasonName === 'string' && Object.prototype.hasOwnProperty.call(reasonLabels, value.reasonName)
			? reasonLabels[value.reasonName]
			: null;
	const rawMessage = typeof value.message === 'string' ? value.message : '';
	const message = rawMessage.toLowerCase();
	const safeMessage = safeDiagnosticText(rawMessage);
	const authRejected =
		status === 'HTTP 401' ||
		status === 'HTTP 403' ||
		value.reasonName === 'NotAllowed' ||
		message.includes('unauthorized') ||
		message.includes('forbidden') ||
		message.includes('401');
	const category = authRejected
		? 'رفض LiveKit للمصادقة'
		: value.reasonName === 'ServerUnreachable' || message.includes('failed to fetch')
			? 'تعذّر الوصول إلى LiveKit'
			: value.reasonName === 'Timeout' || message.includes('timeout') || message.includes('timed out')
				? 'انتهت مهلة الاتصال'
				: message.includes('ice') || message.includes('peer connection') || message.includes('candidate')
					? 'فشل تفاوض ICE/WebRTC'
					: message.includes('websocket') || message.includes('signal') || value.reasonName === 'WebSocket'
						? 'فشل اتصال WebSocket/الإشارة'
						: message.includes('permission') || message.includes('notallowed')
							? 'تعذّر إذن الميكروفون'
							: message.includes('microphone') || message.includes('audio device')
								? 'مشكلة في جهاز الصوت'
								: null;
	const details = [code, reason ? `سبب LiveKit: ${reason}` : null, status, category].filter(Boolean);
	return `${name}${details.length ? ` — ${details.join(' · ')}` : ''}${safeMessage ? ` · تفصيل آمن: ${safeMessage}` : ''}`;
}

class VoiceConnectionDiagnosticsStore extends Store {
	snapshot: VoiceConnectionDiagnosticSnapshot = initialSnapshot;

	private ensureAttemptStarted(): void {
		if (this.snapshot.status === 'idle') this.begin();
	}

	begin(): void {
		this.update(() => {
			this.snapshot = {
				...initialSnapshot,
				status: 'connecting',
				startedAt: Date.now(),
				events: [{at: Date.now(), label: 'بدأ طلب الانضمام'}],
			};
		});
	}

	record(label: string, detail?: string): void {
		if (this.snapshot.status === 'idle') this.begin();
		const safeDetail = detail ? safeDiagnosticText(detail) : undefined;
		this.update(() => {
			this.snapshot = {
				...this.snapshot,
				events: [...this.snapshot.events, {at: Date.now(), label, ...(safeDetail ? {detail: safeDetail} : {})}].slice(
					-MAX_EVENTS,
				),
			};
		});
	}

	microphonePermission(status: VoiceMicrophonePermissionStatus, detail?: string): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, microphonePermission: status};
		});
		this.record('إذن الميكروفون', detail ?? status);
	}

	audioContextState(state: string | null, detail?: string): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, audioContextState: state};
		});
		this.record('حالة AudioContext', detail ?? state ?? 'غير متاح');
	}

	voiceStateRequested(wasSent: boolean): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, voicePresence: wasSent ? 'requested' : 'unknown'};
		});
		this.record(
			wasSent ? 'أُرسل طلب الحضور إلى بوابة التطبيق' : 'تعذر إرسال طلب الحضور إلى بوابة التطبيق',
		);
	}

	voicePresenceChanged(joined: boolean): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, voicePresence: joined ? 'joined' : 'left'};
		});
		this.record('حضور الغرفة عبر البوابة', joined ? 'انضمام مؤكد (ليس إثباتًا لاتصال الصوت)' : 'خروج مؤكد');
	}

	serverReply(endpoint: string | null | undefined, hasToken: boolean): void {
		this.ensureAttemptStarted();
		const safeEndpoint = safeVoiceEndpoint(endpoint);
		this.update(() => {
			this.snapshot = {
				...this.snapshot,
				endpoint: safeEndpoint,
				hasToken,
			};
		});
		this.record(
			'وصل رد خادم الصوت',
			`الرابط: ${safeEndpoint ?? 'غير موجود'} · التوكن: ${hasToken ? 'موجود' : 'مفقود'}`,
		);
	}

	signalConnected(): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, signalConnected: true};
		});
		this.record('اتصال WebSocket مع LiveKit نجح');
	}

	iceStateChanged(iceState: string): void {
		this.ensureAttemptStarted();
		if (this.snapshot.iceState === iceState) return;
		this.update(() => {
			this.snapshot = {...this.snapshot, iceState};
		});
		this.record('حالة ICE', iceState);
	}

	connected(): void {
		this.ensureAttemptStarted();
		if (this.snapshot.status === 'connected') return;
		const connectedAt = Date.now();
		this.update(() => {
			this.snapshot = {...this.snapshot, status: 'connected', connectedAt};
		});
		this.record('دخل الجهاز إلى غرفة LiveKit');
	}

	audioPublished(): void {
		this.ensureAttemptStarted();
		if (this.snapshot.audioPublished) return;
		this.update(() => {
			this.snapshot = {...this.snapshot, audioPublished: true};
		});
		this.record('نُشر مسار الصوت المحلي');
	}

	remoteAudioSubscribed(): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {
				...this.snapshot,
				remoteAudioSubscriptions: this.snapshot.remoteAudioSubscriptions + 1,
			};
		});
		this.record('تم الاشتراك في مسار صوت مشارك بعيد');
	}

	remoteAudioPlayback(status: 'playing' | 'blocked', error?: unknown): void {
		this.ensureAttemptStarted();
		this.update(() => {
			this.snapshot = {...this.snapshot, remoteAudioPlayback: status};
		});
		this.record(
			status === 'playing' ? 'بدأ تشغيل صوت مشارك بعيد' : 'تعذر تشغيل صوت مشارك بعيد',
			error ? safeVoiceError(error) : undefined,
		);
	}

	failed(error: unknown, label = 'فشل اتصال LiveKit'): void {
		this.ensureAttemptStarted();
		const safeError = safeVoiceError(error);
		this.update(() => {
			this.snapshot = {...this.snapshot, status: 'failed', error: safeError};
		});
		this.record(label, safeError);
	}
}

export const voiceConnectionDiagnostics = new VoiceConnectionDiagnosticsStore();
