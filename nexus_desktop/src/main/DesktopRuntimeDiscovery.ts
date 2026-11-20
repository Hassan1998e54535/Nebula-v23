// SPDX-License-Identifier: Nebula

import {NEXUS_PRIVATE_INSTANCE_URL} from '@electron/common/Constants';
import {getLaunchInstanceEndpointOverride} from '@electron/common/DesktopConfig';
import {createChildLogger} from '@electron/common/Logger';
import {getDesktopAppStorage} from '@electron/main/DesktopAppStorage';
import {setDynamicDesktopPackageOrigin} from '@electron/main/ShellDownloadFormats';
import {net} from 'electron';
import {
	DesktopAddressRequirement,
	getDesktopOutboundHTTP,
	isDesktopHostResolutionFailure,
	requireDesktopHTTPOrigin,
} from '@electron/main/DesktopOutboundHTTP';
import {
	type LocalAppRuntimePlan,
	localAppRuntimePlanFromDiscovery,
	runtimePlanTrustedHTTPOrigins,
} from '@electron/main/LocalAppRuntimePlans';
import {getDesktopSelectedInstanceClient} from '@electron/main/SelectedInstanceFetch';
import {Headers as HttpHeader} from '@nexus/constants/src/Headers';
import {HttpStatus, MimeType} from '@nexus/constants/src/HttpConstants';
import {DESKTOP_RUNTIME_DISCOVERY_UNREACHABLE_ERROR_NAME} from '@nexus/desktop_ipc/src/LocalAppRuntimeContract';
import {
	buildInstanceDiscoveryCandidates,
	parseInstanceDiscoveryDocument,
	requireDiscoveryDeclaresItsOwnOrigin,
} from '@nexus/instance_bootstrap/src/Discovery';
import {InstanceEndpointKind, normalizeInstanceEndpoint} from '@nexus/instance_bootstrap/src/EndpointNormalization';
import {officialClientApiEndpointForAlias} from '@nexus/instance_bootstrap/src/OfficialInstance';

const log = createChildLogger('DesktopRuntimeDiscovery');

const DISCOVERY_TIMEOUT_MS = 15_000;
const LAST_SERVED_DISCOVERY_MARKER_PREFIX = 'runtime_discovery.v1:';

interface ResolveDesktopRuntimeConfigInput {
	readonly input: string;
	readonly signal: AbortSignal | null;
}

interface DiscoveryAttempt {
	readonly url: string;
	readonly reason: string;
}

interface LastServedDiscovery {
	readonly url: string;
	readonly document: unknown;
	readonly anchorRequirement?: DesktopAddressRequirement;
}

interface ResolvedRuntimePlan {
	readonly plan: LocalAppRuntimePlan;
	readonly served: LastServedDiscovery | null;
	readonly rememberedAnchorRequirement: DesktopAddressRequirement | null;
	readonly attempts: ReadonlyArray<DiscoveryAttempt>;
}

class InstanceAnsweredWithoutDiscoveryError extends Error {
	public constructor(reason: string) {
		super(reason);
		this.name = 'InstanceAnsweredWithoutDiscoveryError';
	}
}

class DesktopRuntimeEndpointInputError extends TypeError {
	public constructor(input: string) {
		super(`Desktop runtime endpoint input is not an absolute http(s) API endpoint: ${input}`);
		this.name = 'DesktopRuntimeEndpointInputError';
	}
}

class DesktopRuntimeDiscoveryFailedError extends Error {
	public readonly attempts: ReadonlyArray<DiscoveryAttempt>;

	public constructor(apiEndpoint: string, attempts: ReadonlyArray<DiscoveryAttempt>) {
		const described = attempts.map((attempt) => `${attempt.url} (${attempt.reason})`).join('; ');
		super(`No usable instance discovery document was served for ${apiEndpoint}: ${described}`);
		this.name = 'DesktopRuntimeDiscoveryFailedError';
		this.attempts = attempts;
	}
}

class DesktopRuntimeDiscoveryUnreachableError extends DesktopRuntimeDiscoveryFailedError {
	public constructor(apiEndpoint: string, attempts: ReadonlyArray<DiscoveryAttempt>) {
		super(apiEndpoint, attempts);
		this.name = DESKTOP_RUNTIME_DISCOVERY_UNREACHABLE_ERROR_NAME;
	}
}

const LIVE_SERVER_POINTER_URL =
	'https://api.github.com/repos/Hassan1998e54535/nexus-live-config/contents/server.json';
const LIVE_SERVER_POINTER_TIMEOUT_MS = 4_000;
let cachedLiveServerOrigin: string | null = null;
let lastMigratedLiveHost: string | null = null;

async function migrateStoredTunnelOrigin(newHost: string): Promise<void> {
	if (lastMigratedLiveHost === newHost) {
		return;
	}
	const storage = getDesktopAppStorage();
	if (storage === null) {
		return;
	}
	try {
		const replaceHost = (text: string): string =>
			text.replace(/([a-z0-9-]+)\.trycloudflare\.com/giu, newHost);
		const accounts = await storage.getAllAccounts();
		for (const account of accounts) {
			const serializedRecord = JSON.stringify(account.record);
			const keyNeedsUpdate = account.storageKey.includes('.trycloudflare.com') && !account.storageKey.includes(newHost);
			const recordNeedsUpdate = serializedRecord.includes('.trycloudflare.com') && !serializedRecord.includes(newHost);
			if (!keyNeedsUpdate && !recordNeedsUpdate) {
				continue;
			}
			const updatedKey = replaceHost(account.storageKey);
			const updatedRecord = JSON.parse(replaceHost(serializedRecord)) as typeof account.record;
			await storage.upsertAccount({
				storageKey: updatedKey,
				record: updatedRecord,
			});
			if (updatedKey !== account.storageKey) {
				try {
					const scopedEntries = await storage.loadEntries(account.storageKey);
					for (const entry of scopedEntries) {
						await storage.setEntry(updatedKey, replaceHost(entry.key), replaceHost(entry.value));
					}
					await storage.clearAllForScope(account.storageKey);
				} catch {}
				await storage.deleteAccount(account.storageKey);
			}
		}
		const knownInstances = await storage.getAllKnownInstances();
		for (const instance of knownInstances) {
			const serializedInstance = JSON.stringify(instance);
			if (!serializedInstance.includes('.trycloudflare.com') || serializedInstance.includes(newHost)) {
				continue;
			}
			const updatedInstance = JSON.parse(replaceHost(serializedInstance)) as typeof instance;
			await storage.upsertKnownInstance(updatedInstance);
			if (updatedInstance.instanceKey !== instance.instanceKey) {
				try {
					const scopedEntries = await storage.loadEntries(instance.instanceKey);
					for (const entry of scopedEntries) {
						await storage.setEntry(updatedInstance.instanceKey, replaceHost(entry.key), replaceHost(entry.value));
					}
					await storage.clearAllForScope(instance.instanceKey);
				} catch {}
				await storage.deleteKnownInstance(instance.instanceKey);
			}
		}
		const globalEntries = await storage.loadEntries('global');
		for (const entry of globalEntries) {
			if (
				(entry.key.includes('.trycloudflare.com') || entry.value.includes('.trycloudflare.com')) &&
				(!entry.key.includes(newHost) || !entry.value.includes(newHost))
			) {
				const newKey = replaceHost(entry.key);
				const newValue = replaceHost(entry.value);
				await storage.setEntry('global', newKey, newValue);
				if (newKey !== entry.key) {
					await storage.deleteEntry('global', entry.key);
				}
			}
		}
		lastMigratedLiveHost = newHost;
	} catch (error) {
		log.warn('Failed to migrate stored tunnel origin', {newHost, error});
	}
}

export async function refreshLiveServerOrigin(): Promise<string | null> {
	try {
		const response = await net.fetch(`${LIVE_SERVER_POINTER_URL}?t=${Date.now().toString()}`, {
			cache: 'no-store',
			headers: {
				Accept: 'application/vnd.github.v3.raw',
				'Cache-Control': 'no-cache',
				'User-Agent': 'NEXUS-Desktop',
			},
			signal: AbortSignal.timeout(LIVE_SERVER_POINTER_TIMEOUT_MS),
		});
		if (!response.ok) {
			return cachedLiveServerOrigin;
		}
		const payload = (await response.json()) as {url?: unknown};
		if (typeof payload.url === 'string' && payload.url.startsWith('https://')) {
			const parsed = new URL(payload.url.trim());
			cachedLiveServerOrigin = parsed.origin;
			setDynamicDesktopPackageOrigin(parsed.origin);
			if (parsed.hostname.endsWith('.trycloudflare.com')) {
				await migrateStoredTunnelOrigin(parsed.hostname);
			}
			return cachedLiveServerOrigin;
		}
	} catch (error) {
		log.debug('Could not fetch live server pointer', {error});
	}
	return cachedLiveServerOrigin;
}

function remapTunnelInputToLiveOrigin(input: string, liveOrigin: string | null): string {
	if (liveOrigin === null) {
		return input;
	}
	try {
		const liveHost = new URL(liveOrigin).hostname;
		if (input.includes('.trycloudflare.com') && !input.includes(liveHost)) {
			return input.replace(/([a-z0-9-]+)\.trycloudflare\.com/giu, liveHost);
		}
	} catch {}
	return input;
}

function requireDesktopRuntimeAPIEndpoint(input: string): string {
	const normalized = normalizeInstanceEndpoint(input, InstanceEndpointKind.API);
	if (normalized == null || !normalized.includes('://')) {
		throw new DesktopRuntimeEndpointInputError(input);
	}
	return officialClientApiEndpointForAlias(normalized) ?? normalized;
}

export async function resolveDesktopRuntimePlan({
	input,
	signal,
}: ResolveDesktopRuntimeConfigInput): Promise<LocalAppRuntimePlan> {
	const liveOrigin = await refreshLiveServerOrigin();
	const effectiveInput = remapTunnelInputToLiveOrigin(input, liveOrigin);
	const apiEndpoint = requireDesktopRuntimeAPIEndpoint(effectiveInput);
	const anchorOrigin = requireDesktopHTTPOrigin(new URL(apiEndpoint).origin);
	const resolved = await fetchRuntimePlan(apiEndpoint, anchorOrigin, signal);
	let anchorRequirement: DesktopAddressRequirement;
	try {
		anchorRequirement = await getDesktopOutboundHTTP().registerAnchoredOrigins({
			anchorOrigin,
			origins: runtimePlanTrustedHTTPOrigins(resolved.plan),
			unresolvedAnchorRequirement: resolved.rememberedAnchorRequirement,
		});
	} catch (error) {
		if (resolved.served === null && isDesktopHostResolutionFailure(error)) {
			throw new DesktopRuntimeDiscoveryUnreachableError(apiEndpoint, resolved.attempts);
		}
		throw error;
	}
	if (resolved.served !== null) {
		void rememberLastServedDiscovery(apiEndpoint, {...resolved.served, anchorRequirement});
	}
	return resolved.plan;
}

export async function restoreRememberedRuntimePlan(instanceKey: string): Promise<LocalAppRuntimePlan | null> {
	const liveOrigin = cachedLiveServerOrigin ?? (await refreshLiveServerOrigin());
	const effectiveKey = remapTunnelInputToLiveOrigin(instanceKey, liveOrigin);
	let apiEndpoint: string;
	try {
		apiEndpoint = requireDesktopRuntimeAPIEndpoint(effectiveKey);
	} catch {
		return null;
	}
	const remembered = await readLastServedDiscovery(apiEndpoint);
	if (remembered === null || remembered.plan.instanceKey !== effectiveKey) {
		return null;
	}
	await getDesktopOutboundHTTP().registerAnchoredOrigins({
		anchorOrigin: requireDesktopHTTPOrigin(new URL(apiEndpoint).origin),
		origins: runtimePlanTrustedHTTPOrigins(remembered.plan),
		unresolvedAnchorRequirement: remembered.anchorRequirement,
	});
	return remembered.plan;
}

export async function desktopRuntimeInitialInput(): Promise<string | null> {
	const override = getLaunchInstanceEndpointOverride();
	if (override !== null) {
		return override;
	}
	const liveOrigin = await refreshLiveServerOrigin();
	return liveOrigin ?? NEXUS_PRIVATE_INSTANCE_URL;
}

async function fetchRuntimePlan(
	apiEndpoint: string,
	anchorOrigin: string,
	signal: AbortSignal | null,
): Promise<ResolvedRuntimePlan> {
	const candidates = buildInstanceDiscoveryCandidates({input: apiEndpoint});
	const attempts: Array<DiscoveryAttempt> = [];
	let instanceUnreachable = candidates.length > 0;
	for (const url of candidates) {
		let document: unknown;
		try {
			document = await fetchDiscoveryDocument(url, anchorOrigin, signal);
		} catch (error) {
			instanceUnreachable &&= signal?.aborted !== true && !(error instanceof InstanceAnsweredWithoutDiscoveryError);
			attempts.push({url, reason: error instanceof Error ? error.message : String(error)});
			continue;
		}
		try {
			const plan = runtimePlanFromServedDiscovery(url, document);
			return {plan, served: {url, document}, rememberedAnchorRequirement: null, attempts};
		} catch (error) {
			instanceUnreachable = false;
			attempts.push({url, reason: error instanceof Error ? error.message : String(error)});
		}
	}
	if (!instanceUnreachable) {
		throw new DesktopRuntimeDiscoveryFailedError(apiEndpoint, attempts);
	}
	throw new DesktopRuntimeDiscoveryUnreachableError(apiEndpoint, attempts);
}

async function rememberLastServedDiscovery(apiEndpoint: string, served: LastServedDiscovery): Promise<void> {
	const storage = getDesktopAppStorage();
	if (storage === null) {
		return;
	}
	try {
		await storage.setMarker(`${LAST_SERVED_DISCOVERY_MARKER_PREFIX}${apiEndpoint}`, JSON.stringify(served));
	} catch (error) {
		log.warn('Failed to remember the served discovery document', {apiEndpoint, error});
	}
}

interface RememberedRuntimePlan {
	readonly plan: LocalAppRuntimePlan;
	readonly anchorRequirement: DesktopAddressRequirement | null;
}

function readAnchorRequirement(value: unknown): DesktopAddressRequirement | null {
	return value === DesktopAddressRequirement.ANY || value === DesktopAddressRequirement.PUBLIC ? value : null;
}

async function readLastServedDiscovery(apiEndpoint: string): Promise<RememberedRuntimePlan | null> {
	const storage = getDesktopAppStorage();
	if (storage === null) {
		return null;
	}
	try {
		const value = await storage.getMarker(`${LAST_SERVED_DISCOVERY_MARKER_PREFIX}${apiEndpoint}`);
		if (value === null) {
			return null;
		}
		const {url, document, anchorRequirement} = JSON.parse(value) as Partial<LastServedDiscovery>;
		if (typeof url !== 'string') {
			return null;
		}
		return {
			plan: runtimePlanFromServedDiscovery(url, document),
			anchorRequirement: readAnchorRequirement(anchorRequirement),
		};
	} catch (error) {
		log.warn('Failed to read the last served discovery document', {apiEndpoint, error});
		return null;
	}
}

export function runtimePlanFromServedDiscovery(url: string, document: unknown): LocalAppRuntimePlan {
	requireDiscoveryDeclaresItsOwnOrigin(url, parseInstanceDiscoveryDocument(document));
	return localAppRuntimePlanFromDiscovery(document);
}

async function fetchDiscoveryDocument(
	url: string,
	expectedOrigin: string,
	signal: AbortSignal | null,
): Promise<unknown> {
	const response = await getDesktopSelectedInstanceClient().fetch({
		expectedOrigin,
		headers: {[HttpHeader.ACCEPT]: MimeType.JSON},
		method: 'GET',
		signal,
		timeoutMs: DISCOVERY_TIMEOUT_MS,
		url,
	});
	if (!response.ok) {
		const reason = `responded HTTP ${response.status.toString()}`;
		throw response.status >= HttpStatus.INTERNAL_SERVER_ERROR
			? new Error(reason)
			: new InstanceAnsweredWithoutDiscoveryError(reason);
	}
	if (!isJSONContentType(response.headers['content-type'])) {
		throw new Error('responded without a JSON content type');
	}
	if (response.body == null) {
		throw new Error('responded without a body');
	}
	try {
		return JSON.parse(response.body.toString('utf8'));
	} catch {
		throw new InstanceAnsweredWithoutDiscoveryError('responded with a malformed JSON body');
	}
}

function isJSONContentType(value: string | ReadonlyArray<string> | undefined): boolean {
	const header = typeof value === 'string' ? value : value?.[0];
	if (header == null) {
		return false;
	}
	const mediaType = header.split(';')[0]?.trim().toLowerCase() ?? '';
	return mediaType === MimeType.JSON || mediaType.endsWith('+json');
}
