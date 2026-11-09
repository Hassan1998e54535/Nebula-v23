// SPDX-License-Identifier: Nebula

import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path, {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
	Compilation,
	CopyRspackPlugin,
	DefinePlugin,
	HtmlRspackPlugin,
	LightningCssMinimizerRspackPlugin,
	SwcJsMinimizerRspackPlugin,
	sources,
} from '@rspack/core';
import {getLinguiSwcPluginConfig} from './scripts/build/rspack/lingui.mjs';
import {staticFilesPlugin} from './scripts/build/rspack/static-files.mjs';
import {buildMockDiscovery} from './scripts/dev/mock-discovery.mjs';
import {createMockGatewayDecoder} from './scripts/dev/mock-gateway.mjs';
import {WebSocketServer} from 'ws';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '.');
const MONOREPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PKGS_DIR = path.join(ROOT_DIR, 'pkgs');
const PUBLIC_DIR = path.join(ROOT_DIR, 'assets');
const RIVE_RUNTIME_WASM = require.resolve('@rive-app/canvas/rive.wasm', {
	paths: [dirname(require.resolve('@rive-app/react-canvas'))],
});
const BROWSER_ASSERT_STRICT_MODULE = path.join(SRC_DIR, 'features', 'platform', 'utils', 'BrowserAssertStrict.ts');
const DEFAULT_DEV_SERVER_PORT = 3000;
const BOOT_PRELOAD_CHUNK_GROUPS = ['app-bootstrap', 'boot-app'];
const BOOT_PRELOAD_FONT_FILES = [
	'NEXUSSans/NEXUSSans-Regular.woff2',
	'NEXUSSans/NEXUSSans-SemiBold.woff2',
	'NEXUSSans/NEXUSSans-Bold.woff2',
];
const BOOT_LOW_PRIORITY_FONT_FILES = ['NEXUSSans/NEXUSSans-Medium.woff2'];
const AUTH_ENTRY_DOCUMENT = 'auth-index.html';
const ENTRY_STYLESHEET_LINK_PATTERN = /<link href="([^"]+\.css)" rel="stylesheet">/gu;
const CSS_URL_PATTERN = /url\(\s*['"]?([^'")]+)/gu;
const DESKTOP_MODULE_ASSET_SOURCES = [
	{
		test: /[\\/]fonts[\\/]files[\\/]NEXUSSans(JP|KR|SC|TC)[\\/][^\\/]+\.woff2$/u,
		moduleName: (match) => `nexus_fonts_${match[1].toLowerCase()}`,
	},
	{
		test: /[\\/]@arborium[\\/]([a-z0-9-]+)[\\/]grammar_bg\.wasm$/u,
		moduleName: (match) => `nexus_grammar_${match[1].replace(/-/gu, '_')}`,
	},
	{
		test: /[\\/]deepfilternet3[\\/](df_bg\.wasm|[^\\/]+\.tar\.gz)$/u,
		moduleName: () => 'nexus_deepfilter',
	},
	{
		test: /[\\/]onnxruntime-web[\\/]dist[\\/][^\\/]+\.wasm$|[\\/]camera-effects[\\/]models[\\/][^\\/]+\.onnx$/u,
		moduleName: () => 'nexus_camera_effects',
	},
];

class UnusableDesktopModuleQueryError extends Error {
	constructor(resource) {
		super(`${resource} does not match a registered desktop module asset source.`);
		this.name = 'UnusableDesktopModuleQueryError';
	}
}

function desktopModuleAssetRules(isProduction) {
	return DESKTOP_MODULE_ASSET_SOURCES.map((source) => ({
		test: source.test,
		type: 'asset/resource',
		generator: {
			filename: (pathData) => {
				const match = source.test.exec(pathData.filename ?? '');
				if (match == null) {
					throw new UnusableDesktopModuleQueryError(pathData.filename ?? '');
				}
				const moduleName = source.moduleName(match);
				const extension = pathData.filename.endsWith('.tar.gz') ? '.tar.gz' : '[ext]';
				return isProduction
					? `assets/${moduleName}/[contenthash:16]${extension}`
					: `assets/${moduleName}/[name].[hash]${extension}`;
			},
		},
	}));
}

function resolveMode() {
	const modeIndex = process.argv.indexOf('--mode');
	if (modeIndex >= 0) {
		const modeValue = process.argv[modeIndex + 1];
		if (modeValue) {
			return modeValue;
		}
	}
	return 'production';
}

const ACCEPTED_CSS_ORDER_CONFLICTS = [
	['app/components/dialogs/ConfirmModal', 'ui/button/Button'],
	['app/components/dialogs/Modal', 'ui/button/Button'],
	['app/components/dialogs/components/SettingsModalHeader', 'ui/button/Button'],
	['app/components/dialogs/shared/SettingsHeadingLinkButton', 'ui/button/Button'],
	['ui/tooltip/Tooltip', 'ui/button/Button'],
];

function isAcceptedCssOrderConflict(warning) {
	const message = warning.message ?? '';
	if (!message.includes('Conflicting order between')) {
		return false;
	}
	return ACCEPTED_CSS_ORDER_CONFLICTS.some(([first, second]) => {
		const firstPath = `./src/features/${first}.module.css`;
		const secondPath = `./src/features/${second}.module.css`;
		return (
			message.includes(`between ${firstPath} and ${secondPath}`) ||
			message.includes(`between ${secondPath} and ${firstPath}`)
		);
	});
}

function isMainRuntimeChunk(chunk) {
	const runtime = chunk.runtime;
	if (runtime == null) {
		return chunk.name === 'main';
	}
	if (typeof runtime === 'string') {
		return runtime === 'main';
	}
	if (typeof runtime[Symbol.iterator] === 'function') {
		for (const name of runtime) {
			if (name !== 'main') return false;
		}
		return true;
	}
	return false;
}

function mirrorCacheGroups(groups) {
	const mirrored = {};
	for (const [key, group] of Object.entries(groups)) {
		if (group.chunks != null) {
			mirrored[key] = group;
			continue;
		}
		mirrored[key] = {...group, chunks: (chunk) => isMainRuntimeChunk(chunk) && chunk.canBeInitial()};
		mirrored[`${key}Async`] = {
			...group,
			name: `${group.name}-async`,
			chunks: (chunk) => isMainRuntimeChunk(chunk) && !chunk.canBeInitial(),
		};
	}
	return mirrored;
}

function bootPreloadPlugin() {
	return {
		apply(compiler) {
			compiler.hooks.thisCompilation.tap('BootPreloadPlugin', (compilation) => {
				compilation.hooks.processAssets.tap(
					{name: 'BootPreloadPlugin', stage: Compilation.PROCESS_ASSETS_STAGE_REPORT},
					() => {
						const asset = compilation.getAsset('index.html');
						if (asset == null) {
							return;
						}
						const html = String(asset.source.source());
						if (!html.includes('</body>')) {
							return;
						}
						const configuredPublicPath = compilation.outputOptions.publicPath;
						const base =
							typeof configuredPublicPath === 'string' && configuredPublicPath !== 'auto' ? configuredPublicPath : '/';
						const files = new Set();
						for (const name of BOOT_PRELOAD_CHUNK_GROUPS) {
							for (const group of compilation.chunkGroups) {
								if (group.name !== name) {
									continue;
								}
								for (const file of group.getFiles()) {
									if (!html.includes(file)) {
										files.add(file);
									}
								}
							}
						}
						const ordered = [...files];
						const links = [
							...ordered
								.filter((file) => file.endsWith('.css'))
								.map((file) => `<link rel="preload" as="style" fetchpriority="low" href="${base}${file}">`),
							...ordered
								.filter((file) => file.endsWith('.js'))
								.map((file) => `<link rel="preload" as="script" fetchpriority="low" href="${base}${file}">`),
						].join('');
						if (links === '') {
							return;
						}
						compilation.updateAsset('index.html', new sources.RawSource(html.replace('</body>', `${links}</body>`)));
					},
				);
			});
		},
	};
}

class UninlinableEntryStylesheetError extends Error {
	constructor(reason) {
		super(`Cannot inline the entry stylesheet into ${AUTH_ENTRY_DOCUMENT}: ${reason}`);
		this.name = 'UninlinableEntryStylesheetError';
	}
}

function inlineEntryStylesheet(css, href) {
	const content = css.replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*$/u, '');
	if (content.includes('</style')) {
		throw new UninlinableEntryStylesheetError(`${href} contains a closing style tag`);
	}
	for (const [, url] of content.matchAll(CSS_URL_PATTERN)) {
		if (!/^(?:\/|https?:|data:|#)/u.test(url)) {
			throw new UninlinableEntryStylesheetError(`${href} references ${url} relative to its own location`);
		}
	}
	return `<style>${content}</style><link rel="prefetch" as="style" href="${href}">`;
}

function authEntryDocumentPlugin() {
	return {
		apply(compiler) {
			compiler.hooks.thisCompilation.tap('AuthEntryDocumentPlugin', (compilation) => {
				compilation.hooks.processAssets.tap(
					{name: 'AuthEntryDocumentPlugin', stage: Compilation.PROCESS_ASSETS_STAGE_REPORT},
					() => {
						const asset = compilation.getAsset('index.html');
						if (asset == null) {
							return;
						}
						const html = String(asset.source.source());
						const links = [...html.matchAll(ENTRY_STYLESHEET_LINK_PATTERN)];
						if (links.length === 0) {
							throw new UninlinableEntryStylesheetError('index.html links no stylesheet');
						}
						let document = html;
						for (const [link, href] of links) {
							const name = compilation
								.getAssets()
								.find((candidate) => href.endsWith(`/${candidate.name}`) || href === candidate.name)?.name;
							if (name == null) {
								throw new UninlinableEntryStylesheetError(`${href} is not an emitted asset`);
							}
							const css = String(compilation.getAsset(name).source.source());
							document = document.replace(link, () => inlineEntryStylesheet(css, href));
						}
						compilation.emitAsset(AUTH_ENTRY_DOCUMENT, new sources.RawSource(document));
					},
				);
			});
		},
	};
}

function fontPreloadPlugin() {
	return {
		apply(compiler) {
			compiler.hooks.thisCompilation.tap('FontPreloadPlugin', (compilation) => {
				HtmlRspackPlugin.getCompilationHooks(compilation).alterAssetTagGroups.tap('FontPreloadPlugin', (data) => {
					const fonts = [];
					const lowPriority = new Set(BOOT_LOW_PRIORITY_FONT_FILES);
					for (const sourceName of [...BOOT_PRELOAD_FONT_FILES, ...BOOT_LOW_PRIORITY_FONT_FILES]) {
						const asset = compilation
							.getAssets()
							.find((candidate) => String(candidate.info.sourceFilename ?? '').endsWith(sourceName));
						if (asset == null) {
							throw new Error(`Cannot preload ${sourceName}: no emitted asset came from it`);
						}
						fonts.push({
							tagName: 'link',
							voidTag: true,
							attributes: {
								rel: 'preload',
								as: 'font',
								type: 'font/woff2',
								crossorigin: '',
								href: `${data.publicPath}${asset.name}`,
								...(lowPriority.has(sourceName) ? {fetchpriority: 'low'} : {}),
							},
						});
					}
					data.headTags.unshift(...fonts);
					return data;
				});
			});
		},
	};
}

function nodeAssertStrictSchemePlugin() {
	return {
		apply(compiler) {
			compiler.hooks.normalModuleFactory.tap('NodeAssertStrictSchemePlugin', (factory) => {
				factory.hooks.beforeResolve.tap('NodeAssertStrictSchemePlugin', (resolveData) => {
					if (resolveData.request === 'node:assert/strict') {
						resolveData.request = BROWSER_ASSERT_STRICT_MODULE;
					}
				});
			});
		},
	};
}

const mode = resolveMode();
const isProduction = mode === 'production';
const isDevelopment = !isProduction;
const isDesktopRenderer = envString('NEXUS_DESKTOP_RENDERER') === 'true';
const devJsName = 'assets/[name].js';
const devCssName = 'assets/[name].css';
const productionJsName = 'assets/[contenthash:16].js';
const productionWorkerJsName = 'assets/[contenthash:16].worker.js';
const devCorsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
	'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
};
const devNoStoreHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
	Pragma: 'no-cache',
	Expires: '0',
	'CDN-Cache-Control': 'no-store',
	'Cloudflare-CDN-Cache-Control': 'no-store',
};
function envString(name, fallback = undefined) {
	const value = process.env[name];
	if (value === undefined || value === null || value === '') {
		return fallback;
	}
	return value;
}

function withTrailingSlash(value) {
	return value.endsWith('/') ? value : `${value}/`;
}

function devServerHeaders() {
	return {...devCorsHeaders, ...devNoStoreHeaders};
}

function resolveReleaseChannel() {
	const value = envString('PUBLIC_RELEASE_CHANNEL', envString('RELEASE_CHANNEL', 'canary')).trim().toLowerCase();
	if (value === 'stable' || value === 'canary' || value === 'development') {
		return value;
	}
	throw new Error(`PUBLIC_RELEASE_CHANNEL must be stable, canary, or development, received ${JSON.stringify(value)}`);
}

function resolvePublicValues() {
	return {
		PUBLIC_BUILD_VERSION: envString('PUBLIC_BUILD_VERSION', envString('BUILD_VERSION', 'dev')),
		PUBLIC_RELEASE_CHANNEL: resolveReleaseChannel(),
	};
}

function getPublicEnvVar(values, name) {
	const value = values[name];
	return value === undefined ? 'undefined' : JSON.stringify(value);
}

function getChunkRuntimeNames(runtime) {
	if (runtime == null) {
		return [];
	}
	if (typeof runtime === 'string') {
		return [runtime];
	}
	if (typeof runtime[Symbol.iterator] === 'function') {
		return [...runtime].filter((name) => typeof name === 'string');
	}
	return [];
}

function getChunkPathNames(pathData) {
	const names = [];
	const chunkName = pathData.chunk?.name;
	if (typeof chunkName === 'string') {
		names.push(chunkName);
	}
	names.push(...getChunkRuntimeNames(pathData.runtime));
	names.push(...getChunkRuntimeNames(pathData.chunk?.runtime));
	return names;
}

function isWorkerPath(pathData) {
	return getChunkPathNames(pathData).some((name) => name.endsWith('.worker'));
}

function jsFilename(pathData) {
	if (pathData.chunk?.name === 'sw') {
		return 'sw.js';
	}
	if (!isProduction) {
		return devJsName;
	}
	return isWorkerPath(pathData) ? productionWorkerJsName : productionJsName;
}

export default () => {
	const linguiSwcPlugin = getLinguiSwcPluginConfig();
	const publicValues = resolvePublicValues();
	const assetBaseUrl = isDesktopRenderer ? undefined : envString('PUBLIC_ASSET_BASE_URL');
	const staticCdnEndpoint = isDesktopRenderer
		? ''
		: envString('PUBLIC_STATIC_CDN_ENDPOINT', envString('NEXUS_STATIC_CDN_ENDPOINT', isProduction ? '' : ''));
	function resolveArboriumWasmAliases() {
		const arbDir = path.join(ROOT_DIR, 'node_modules', '@arborium');
		const aliases = {};
		try {
			for (const pkg of readdirSync(arbDir)) {
				const grammarWasm = path.join(arbDir, pkg, 'grammar_bg.wasm');
				if (!existsSync(grammarWasm)) continue;
				const internalWasm = `arborium_${pkg.replace(/-/g, '_')}_plugin_bg.wasm`;
				aliases[internalWasm] = grammarWasm;
				aliases[`@arborium/${pkg}/${internalWasm}`] = grammarWasm;
			}
		} catch {}
		return aliases;
	}
	const normalizedStaticCdnEndpoint = staticCdnEndpoint?.replace(/\/+$/, '') ?? '';
	const workerWasmPublicPath =
		isProduction && normalizedStaticCdnEndpoint ? `${normalizedStaticCdnEndpoint}/` : undefined;
	const productionPublicPath = assetBaseUrl !== undefined ? withTrailingSlash(assetBaseUrl) : '/';
	const developmentPublicPath = normalizedStaticCdnEndpoint ? `${normalizedStaticCdnEndpoint}/` : '/';
	const publicPath = isProduction ? productionPublicPath : developmentPublicPath;
	return {
		mode,
		entry: isDesktopRenderer
			? {main: path.join(SRC_DIR, 'index.tsx')}
			: {
					main: path.join(SRC_DIR, 'index.tsx'),
					sw: path.join(SRC_DIR, 'features', 'platform', 'service_worker', 'Worker.ts'),
				},
		output: {
			path: DIST_DIR,
			publicPath,
			workerPublicPath: '/',
			workerChunkLoading: false,
			filename: jsFilename,
			chunkFilename: jsFilename,
			cssFilename: isProduction ? 'assets/[contenthash:16].css' : devCssName,
			cssChunkFilename: isProduction ? 'assets/[contenthash:16].css' : devCssName,
			assetModuleFilename: isProduction ? 'assets/[contenthash:16][ext]' : 'assets/[name].[hash][ext]',
			webAssemblyModuleFilename: isProduction ? 'assets/[contenthash:16].wasm' : 'assets/[name].[hash].wasm',
			clean: true,
		},
// Keep the full workspace's source maps out of the memory-constrained preview build.
// This changes debugging metadata only, not the application or its startup command.
devtool: isDevelopment ? (process.env.REPLIT_DEV_DOMAIN ? false : 'cheap-module-source-map') : 'source-map',
		target: ['web', 'browserslist'],
		lazyCompilation: false,
		performance: false,
		ignoreWarnings: [isAcceptedCssOrderConflict],
		resolve: {
			alias: {
				...resolveArboriumWasmAliases(),
				'@arborium/arborium/arborium_host_bg.wasm': path.resolve(
					ROOT_DIR,
					'node_modules/@arborium/arborium/dist/arborium_host_bg.wasm',
				),
				'@app': SRC_DIR,
				'@nexus/voice_engine_v2/bridge': path.join(
					MONOREPO_ROOT,
					'packages',
					'voice_engine_v2',
					'src',
					'bridge',
					'index.ts',
				),
				'@nexus': path.join(MONOREPO_ROOT, 'packages'),
				'@pkgs': PKGS_DIR,
				'assert/strict': BROWSER_ASSERT_STRICT_MODULE,
				'livekit-client$': path.join(PKGS_DIR, 'livekit-client/src/index.ts'),
				'livekit-client/e2ee-worker': path.join(PKGS_DIR, 'livekit-client/src/e2ee/worker/e2ee.worker.ts'),
				'node:assert/strict': BROWSER_ASSERT_STRICT_MODULE,
			},
			extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json', '.mjs', '.cjs'],
			extensionAlias: {
				'.js': ['.js', '.tsx', '.ts'],
				'.mjs': ['.mjs', '.mts'],
				'.cjs': ['.cjs', '.cts'],
			},
			conditionNames: ['import', 'module', 'webpack', 'browser', 'default'],
			mainFields: ['browser', 'module', 'main'],
		},
		module: {
			rules: [
				{
					test: /[\\/]@arborium[\\/]arborium[\\/]dist[\\/]arborium\.js$/,
					use: [{loader: path.join(ROOT_DIR, 'scripts/build/rspack/local-arborium-loader.cjs')}],
					parser: {
						wrappedContextRegExp: /^\b\B$/u,
						exprContextCritical: false,
						wrappedContextCritical: false,
					},
				},
				{
					test: /[\\/]@sapphi-red[\\/]web-noise-suppressor[\\/]dist[\\/][^\\/]+[\\/]workletProcessor\.js$/,
					type: 'asset/resource',
					use: [{loader: path.join(ROOT_DIR, 'scripts/build/rspack/noise-suppressor-worklet-loader.cjs')}],
					generator: {
						filename: isProduction ? 'assets/[contenthash:16].worklet.js' : 'assets/[name].[hash].worklet.js',
					},
				},
				{
					test: /[\\/]src[\\/].+\.worklet\.js$/,
					type: 'asset/resource',
					generator: {
						filename: isProduction ? 'assets/[contenthash:16].worklet.js' : 'assets/[name].[hash].worklet.js',
					},
				},
				{
					test: /\.(tsx|ts|jsx|js)$/,
					exclude: [/node_modules/, /\.worklet\.js$/],
					type: 'javascript/auto',
					parser: {
						dynamicImport: true,
					},
					use: {
						loader: 'builtin:swc-loader',
						options: {
							jsc: {
								parser: {
									syntax: 'typescript',
									tsx: true,
								},
								transform: {
									react: {
										runtime: 'automatic',
										development: isDevelopment,
										refresh: false,
									},
								},
								experimental: {
									plugins: [linguiSwcPlugin],
								},
								target: 'es2015',
							},
						},
					},
				},
				{
					test: /\.module\.css$/,
					use: [{loader: 'postcss-loader'}],
					type: 'css/module',
					parser: {namedExports: false, dashedIdents: false, grid: false, container: false},
				},
				{
					test: /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/][^\\/]+\.es\.js$/,
					use: [{loader: path.join(ROOT_DIR, 'scripts/build/rspack/phosphor-unused-weights-loader.cjs')}],
				},
				{
					test: /[\\/]node_modules[\\/]katex[\\/]dist[\\/]katex(\.min)?\.css$/,
					use: [{loader: path.join(ROOT_DIR, 'scripts/build/rspack/katex-legacy-fonts-loader.cjs')}],
					type: 'css',
				},
				{
					test: /\.css$/,
					exclude: /\.module\.css$/,
					use: [{loader: 'postcss-loader'}],
					type: 'css',
				},
				{
					test: /\.svg$/,
					issuer: /\.[jt]sx?$/,
					resourceQuery: /react/,
					type: 'javascript/auto',
					use: [
						{
							loader: 'builtin:swc-loader',
							options: {
								jsc: {
									parser: {syntax: 'typescript', tsx: true},
									transform: {react: {runtime: 'automatic', development: isDevelopment}},
									target: 'es2015',
								},
							},
						},
						{
							loader: '@svgr/webpack',
							options: {
								babel: false,
								typescript: true,
								jsxRuntime: 'automatic',
								svgoConfig: {
									plugins: [
										{
											name: 'preset-default',
											params: {overrides: {removeViewBox: false}},
										},
									],
								},
							},
						},
					],
				},
				{
					test: /\.svg$/,
					resourceQuery: {not: [/react/]},
					type: 'asset/resource',
				},
				{
					test: /\.wasm$/,
					type: 'asset/resource',
					generator: {
						filename: isProduction ? 'assets/[contenthash:16][ext]' : 'assets/[name].[hash][ext]',
						...(workerWasmPublicPath ? {publicPath: workerWasmPublicPath} : {}),
					},
				},
				{
					test: /[\\/]deepfilternet3[\\/][^\\/]+\.tar\.gz$/,
					type: 'asset/resource',
					generator: {
						filename: isProduction ? 'assets/[contenthash:16].tar.gz' : 'assets/[name].[hash].tar.gz',
					},
				},
				{
					test: /\.onnx$/,
					type: 'asset/resource',
					generator: {
						filename: isProduction ? 'assets/[contenthash:16][ext]' : 'assets/[name].[hash][ext]',
					},
				},
				{
					test: /\.(png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|eot|mp3|wav|ogg|mp4|webm)$/,
					type: 'asset/resource',
					generator: {
						filename: isProduction ? 'assets/[contenthash:16][ext]' : 'assets/[name].[hash][ext]',
					},
				},
				...(isDesktopRenderer ? desktopModuleAssetRules(isProduction) : []),
			],
			generator: {
				'css/module': {
					localIdentName: '[name]__[local]___[hash:base64:6]',
					exportsConvention: 'camel-case-only',
					exportsOnly: false,
				},
				'css/auto': {
					localIdentName: '[name]__[local]___[hash:base64:6]',
					exportsConvention: 'camel-case-only',
					exportsOnly: false,
				},
			},
		},
		plugins: [
			nodeAssertStrictSchemePlugin(),
			fontPreloadPlugin(),
			...(isProduction ? [bootPreloadPlugin()] : []),
			...(isProduction && !isDesktopRenderer ? [authEntryDocumentPlugin()] : []),
			new HtmlRspackPlugin({
				templateContent: () => {
					const raw = readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
					return raw
						.replaceAll('{{STATIC_CDN_ENDPOINT}}', '')
						.replaceAll('{{MEDIA_ENDPOINT}}', '')
						.replaceAll('{{CSP_NONCE_PLACEHOLDER}}', '');
				},
				filename: 'index.html',
				hash: isDevelopment,
				inject: 'body',
				scriptLoading: 'module',
				excludeChunks: ['sw'],
				...(isDesktopRenderer ? {publicPath: '/'} : {}),
			}),
			new CopyRspackPlugin({
				patterns: [
					{
						from: PUBLIC_DIR,
						to: DIST_DIR,
						noErrorOnMissing: true,
					},
					...(isProduction
						? [
								{
									from: path.join(MONOREPO_ROOT, 'generated-artifacts', 'profile-media'),
									to: path.join(DIST_DIR, 'assets', 'profile-media'),
									noErrorOnMissing: true,
								},
								{
									// This runtime is an npm dependency, not a profile-media input.
									// Copy it from the locked Rive package so every installed client can
									// render Rive effects even when the temporary media cache is absent.
									from: RIVE_RUNTIME_WASM,
									to: path.join(DIST_DIR, 'assets', 'profile-media', 'runtime', 'rive.wasm'),
									force: true,
								},
							]
						: []),
					...(isDesktopRenderer
						? [
								{
									from: path.join(MONOREPO_ROOT, 'nexus_static', 'web'),
									to: path.join(DIST_DIR, 'web'),
								},
							]
						: []),
				],
			}),
			staticFilesPlugin({
				staticCdnEndpoint: normalizedStaticCdnEndpoint,
				fontsDir: path.join(MONOREPO_ROOT, 'packages', 'fonts'),
				wasmCratesDir: path.join(ROOT_DIR, 'rust'),
			}),
			new DefinePlugin({
				define: 'undefined',
				__NEXUS_PRECACHE_MANIFEST__: JSON.stringify([]),
				__NEXUS_SW_VERSION__: JSON.stringify(publicValues.PUBLIC_BUILD_VERSION || 'dev'),
				'process.env.NODE_ENV': JSON.stringify(mode),
				'import.meta.env.DEV': JSON.stringify(isDevelopment),
				'import.meta.env.PROD': JSON.stringify(isProduction),
				'import.meta.env.MODE': JSON.stringify(mode),
				'import.meta.env.PUBLIC_BUILD_VERSION': getPublicEnvVar(publicValues, 'PUBLIC_BUILD_VERSION'),
				'import.meta.env.PUBLIC_RELEASE_CHANNEL': getPublicEnvVar(publicValues, 'PUBLIC_RELEASE_CHANNEL'),
			}),

			{
				apply(compiler) {
					compiler.hooks.afterEmit.tap('VersionJsonPlugin', () => {
						const versionData = {
							version: publicValues.PUBLIC_BUILD_VERSION,
						};
						mkdirSync(DIST_DIR, {recursive: true});
						writeFileSync(path.join(DIST_DIR, 'version.json'), JSON.stringify(versionData));
					});
				},
			},
		],
		optimization: {
			splitChunks: isProduction
				? {
						chunks: (chunk) => isMainRuntimeChunk(chunk),
						maxInitialRequests: 15,
						maxAsyncSize: 2_000_000,
						cacheGroups: mirrorCacheGroups({
							icons: {
								test: /[\\/]node_modules[\\/]@phosphor-icons[\\/]/,
								name: 'icons',
								priority: 60,
								reuseExistingChunk: true,
							},
							highlight: {
								test: /[\\/]node_modules[\\/](@arborium[\\/]arborium[\\/]|\.pnpm[\\/]@arborium\+arborium@)/,
								name: 'highlight',
								priority: 55,
								reuseExistingChunk: true,
								enforce: true,
								chunks: (chunk) => !chunk.canBeInitial() && !isWorkerPath({chunk}),
							},
							tts: {
								test: /[\\/]node_modules[\\/]mespeak[\\/]/,
								name: 'tts',
								priority: 54,
								reuseExistingChunk: true,
								enforce: true,
								chunks: (chunk) => !chunk.canBeInitial() && !isWorkerPath({chunk}),
							},
							editor: {
								test: /[\\/]node_modules[\\/](@codemirror|@lezer|codemirror|style-mod|w3c-keyname|crelt|@marijn)[\\/]/,
								name: 'editor',
								priority: 53,
								reuseExistingChunk: true,
								enforce: true,
								chunks: (chunk) => !chunk.canBeInitial() && !isWorkerPath({chunk}),
							},
							livekit: {
								test: /[\\/](node_modules|pkgs)[\\/](livekit-client|@livekit)[\\/]/,
								name: 'livekit',
								priority: 50,
								reuseExistingChunk: true,
							},
							katex: {
								test: /[\\/]node_modules[\\/]katex[\\/]/,
								name: 'katex',
								priority: 48,
								reuseExistingChunk: true,
								maxSize: 100_000,
							},
							animation: {
								test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
								name: 'animation',
								priority: 45,
								reuseExistingChunk: true,
							},
							mobx: {
								test: /[\\/]node_modules[\\/](mobx|mobx-react-lite|mobx-persist-store)[\\/]/,
								name: 'mobx',
								priority: 43,
								reuseExistingChunk: true,
							},
							i18n: {
								test: /[\\/]node_modules[\\/]@lingui[\\/]/,
								name: 'i18n',
								priority: 42,
								reuseExistingChunk: true,
								enforce: true,
							},
							colorPicker: {
								test: /[\\/]node_modules[\\/](@react-aria[\\/]color|@react-stately[\\/]color)[\\/]/,
								name: 'color-picker',
								priority: 42,
								reuseExistingChunk: true,
								enforce: true,
							},
							reactAria: {
								test: /[\\/]node_modules[\\/](react-aria-components|@react-aria|@react-stately|@internationalized)[\\/]/,
								name: 'react-aria',
								priority: 41,
								reuseExistingChunk: true,
							},
							validation: {
								test: /[\\/]node_modules[\\/](valibot)[\\/]/,
								name: 'validation',
								priority: 39,
								reuseExistingChunk: true,
							},
							datetime: {
								test: /[\\/]node_modules[\\/]luxon[\\/]/,
								name: 'datetime',
								priority: 38,
								reuseExistingChunk: true,
							},
							observable: {
								test: /[\\/]node_modules[\\/]rxjs[\\/]/,
								name: 'observable',
								priority: 37,
								reuseExistingChunk: true,
							},
							unicode: {
								test: /[\\/]node_modules[\\/](idna-uts46-hx|emoji-regex)[\\/]/,
								name: 'unicode',
								priority: 36,
								reuseExistingChunk: true,
							},
							dnd: {
								test: /[\\/]node_modules[\\/](@dnd-kit|react-dnd)[\\/]/,
								name: 'dnd',
								priority: 33,
								reuseExistingChunk: true,
							},
							radix: {
								test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
								name: 'radix',
								priority: 31,
								reuseExistingChunk: true,
							},
							ui: {
								test: /[\\/]node_modules[\\/](react-select|react-hook-form|@floating-ui)[\\/]/,
								name: 'ui',
								priority: 30,
								reuseExistingChunk: true,
							},
							utils: {
								test: /[\\/]node_modules[\\/](lodash|clsx|thumbhash|match-sorter)[\\/]/,
								name: 'utils',
								priority: 28,
								reuseExistingChunk: true,
							},
							networking: {
								test: /[\\/]node_modules[\\/](ws)[\\/]/,
								name: 'networking',
								priority: 26,
								reuseExistingChunk: true,
							},
							react: {
								test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
								name: 'react',
								priority: 25,
								reuseExistingChunk: true,
							},
							platform: {
								test: /[\\/]node_modules[\\/]bowser[\\/]/,
								name: 'platform',
								priority: 27,
								reuseExistingChunk: true,
								enforce: true,
							},
							phone: {
								test: /[\\/]node_modules[\\/]libphonenumber-js[\\/]/,
								name: 'phone',
								priority: 26,
								reuseExistingChunk: true,
								enforce: true,
							},
							qrcode: {
								test: /[\\/]node_modules[\\/](qrcode|dijkstrajs)[\\/]/,
								name: 'qrcode',
								priority: 24,
								reuseExistingChunk: true,
								enforce: true,
							},
							lexical: {
								test: /[\\/]node_modules[\\/](lexical|@lexical)[\\/]/,
								name: 'lexical',
								priority: 23,
								reuseExistingChunk: true,
								enforce: true,
							},
							calendar: {
								test: /[\\/]node_modules[\\/](react-day-picker|date-fns|@date-fns)[\\/]/,
								name: 'calendar',
								priority: 22,
								reuseExistingChunk: true,
								enforce: true,
							},
							webrtc: {
								test: /[\\/]node_modules[\\/](webrtc-adapter|sdp|sdp-transform)[\\/]/,
								name: 'webrtc',
								priority: 21,
								reuseExistingChunk: true,
								enforce: true,
							},
							noiseFilter: {
								test: /[\\/]node_modules[\\/]deepfilternet3-noise-filter[\\/]/,
								name: 'noise-filter',
								priority: 20,
								reuseExistingChunk: true,
								enforce: true,
							},
							virtualizer: {
								test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
								name: 'virtualizer',
								priority: 19,
								reuseExistingChunk: true,
								enforce: true,
							},
							vendor: {
								test: (module) => {
									if (!module.resource) return false;
									if (!/[\\/]node_modules[\\/]/.test(module.resource)) return false;
									if (/[\\/](@arborium|@phosphor-icons|katex)[\\/]/.test(module.resource)) return false;
									if (/[\\/]\.pnpm[\\/]@arborium\+/.test(module.resource)) return false;
									return true;
								},
								name: 'vendor',
								priority: 10,
								reuseExistingChunk: true,
							},
						}),
					}
				: false,
			runtimeChunk: false,
			moduleIds: isProduction ? 'deterministic' : 'named',
			chunkIds: isProduction ? 'deterministic' : 'named',
			minimize: isProduction,
			minimizer: [
				new SwcJsMinimizerRspackPlugin({
					compress: true,
					mangle: true,
					format: {comments: false},
					exclude: /\.worklet\.js$/,
				}),
				new LightningCssMinimizerRspackPlugin(),
			],
		},
		devServer: {
host: '0.0.0.0',
			port: Number(process.env.NEXUS_APP_DEV_PORT) || DEFAULT_DEV_SERVER_PORT,
hot: true,
liveReload: true,
client: {
webSocketURL: 'auto://0.0.0.0:0/ws',
overlay: {errors: true, warnings: false},
},
webSocketServer: {type: 'ws', options: {path: '/ws'}},
			historyApiFallback: true,
			allowedHosts: 'all',
			headers: isDevelopment ? devServerHeaders : devCorsHeaders,
			static: [
				{directory: DIST_DIR, watch: false},
				{
					directory: path.join(MONOREPO_ROOT, 'generated-artifacts', 'profile-media'),
					publicPath: '/assets/profile-media',
					watch: false,
				},
				{
					directory: path.join(MONOREPO_ROOT, 'nexus_static', 'web'),
					publicPath: '/web',
					watch: false,
				},
				{
					directory: path.join(MONOREPO_ROOT, 'nexus_static', 'emoji'),
					publicPath: '/emoji',
					watch: false,
				},
			],
			setupMiddlewares: (middlewares, devServer) => {
console.info('[NEXUS DEV] Standalone mock backend enabled; development data is separate and authentication is simulated.');
				const discoveryDoc = {
					codename: 'tungsten',
					api_code_version: 1,
					endpoints: {
api: '/api',
gateway: '/gateway',
api_client: '/api',
api_public: '/api',
media: '/assets/profile-media',
						upload_relay: null,
static_cdn: '/',
marketing: '/',
						docs: null,
admin: '/admin',
invite: '/invite',
gift: '/gift',
webapp: '/',
					},
					captcha: {provider: 'none'},
					features: {
						voice_enabled: true,
						stripe_enabled: false,
						premium_enabled: true,
						stripe_serviceable: false,
						self_hosted: true,
						presigned_attachment_uploads: false,
						emails_enabled: false,
						phone_verification_enabled: false,
					},
					gif: {provider: 'none', display_name: 'None', attribution_required: false},
sso: {enabled: false, enforced: false, display_name: null, redirect_uri: '/auth/sso'},
					registration: {mode: 'open', admin_registration_urls_enabled: true},
					community: {single_community: false, single_community_guild_id: null, direct_messages_disabled: false, guild_create_access: true},
					services: {gif_enabled: false, youtube_enabled: false, bluesky_enabled: false},
					limits: {version: 2, traitDefinitions: [], rules: [], defaultsHash: 'dev'},
					push: {public_vapid_key: null},
					app_public: {
						branding: {
							product_name: 'NEXUS',
							premium_product_name: 'NEXUS Pro',
							theme_color: '#4641D9',
							icon_url: null,
							symbol_url: null,
							logo_url: null,
							wordmark_url: null,
							favicon_url: null,
							status_page_url: null,
							status_page_incident_history_url: null,
							premium_info_url: null,
						},
						setup: {configured: true, admin_url: null},
						legal: {terms_url: null, privacy_url: null, guidelines_url: null},
						registration: {collect_date_of_birth: false},
					},
				};

				const DEV_STORAGE_FILE = path.join(ROOT_DIR, '.dev_storage.json');
				const loadDevStorage = () => {
					try {
						if (existsSync(DEV_STORAGE_FILE)) {
							const data = JSON.parse(readFileSync(DEV_STORAGE_FILE, 'utf8'));
							if (data && typeof data === 'object') {
								return {
									users: data.users || {},
									guilds: Array.isArray(data.guilds) ? data.guilds : [],
messages: data.messages && typeof data.messages === 'object' && !Array.isArray(data.messages) ? data.messages : {},
								};
							}
						}
					} catch (e) {
						console.warn('[Mock Storage] Could not read dev storage:', e);
					}
return {users: {}, guilds: [], messages: {}};
				};

				const devStorage = loadDevStorage();
				const saveDevStorage = () => {
					try {
						writeFileSync(DEV_STORAGE_FILE, JSON.stringify(devStorage, null, 2), 'utf8');
					} catch (e) {
						console.warn('[Mock Storage] Could not write dev storage:', e);
					}
				};

				const getOrCreateUser = (userId = '100000000000000000', overrides = {}) => {
					if (!devStorage.users[userId]) {
						devStorage.users[userId] = {
							id: userId,
							username: overrides.username || (userId === '100000000000000000' ? 'developer' : `user_${userId.slice(-4)}`),
							discriminator: '0',
							global_name: overrides.global_name || overrides.username || (userId === '100000000000000000' ? 'Developer' : 'User'),
							avatar: overrides.avatar || null,
							avatar_color: null,
							flags: 0,
							is_staff: true,
							acls: ['*'],
							traits: ['staff', 'premium'],
							email: overrides.email || (userId === '100000000000000000' ? 'developer@nexus.local' : `${userId}@nexus.local`),
							has_verified_phone: false,
							bio: overrides.bio || (userId === '100000000000000000' ? 'NEXUS Studio Developer' : ''),
							pronouns: null,
							accent_color: null,
							banner: null,
							banner_color: null,
							mfa_enabled: false,
							verified: true,
							premium_type: 2,
							premium_since: '2025-01-01T00:00:00.000Z',
							premium_until: '2030-01-01T00:00:00.000Z',
							premium_will_cancel: false,
							premium_billing_cycle: null,
							premium_lifetime_sequence: 1,
							premium_grace_ends_at: null,
							premium_discriminator: false,
							premium_badge_hidden: false,
							premium_badge_masked: false,
							premium_badge_timestamp_hidden: false,
							premium_badge_sequence_hidden: false,
							theme_colors: [4604889, 1447446],
							profile_appearance: null,
						};
						saveDevStorage();
					}
					if (Object.keys(overrides).length > 0) {
						Object.assign(devStorage.users[userId], overrides);
						saveDevStorage();
					}
					return devStorage.users[userId];
				};

				const createMockUser = (userId = '100000000000000000') => getOrCreateUser(userId);

				const createMockPremiumState = () => ({
					actual: {
						is_premium: true,
						premium_type: 2,
						premium_since: '2025-01-01T00:00:00.000Z',
						premium_until: '2030-01-01T00:00:00.000Z',
						premium_will_cancel: false,
						premium_billing_cycle: null,
						premium_lifetime_sequence: 1,
						premium_grace_ends_at: null,
						has_active_paid_premium: true,
						is_visionary: false,
						has_ever_purchased: true,
					},
					effective: {
						is_premium: true,
						premium_type: 2,
						premium_since: '2025-01-01T00:00:00.000Z',
						premium_until: '2030-01-01T00:00:00.000Z',
						premium_will_cancel: false,
						premium_billing_cycle: null,
						premium_lifetime_sequence: 1,
						premium_grace_ends_at: null,
						premium_enabled_override: false,
						premium_purchase_disabled: false,
						premium_perks_disabled: false,
						self_hosted: true,
						bot: false,
					},
					billing: {
						stripe_customer_id: null,
						current_subscription_price: null,
						pending_subscription_change: null,
						list_price_switch: null,
						subscription: null,
						invoices: [],
						invoices_has_more: false,
						payment_methods: [],
						refund_eligibility: {
							eligible: false,
							reason: 'no_refundable_purchase',
							invoice_id: null,
							invoice_amount_paid_cents: null,
							currency: null,
							paid_at: null,
							refund_window_expires_at: null,
							cooldown_expires_at: null,
							cancels_subscription: false,
						},
					},
					pricing: {
						country_code: 'US',
						localized: null,
					},
					store: null,
					subscription_provider: null,
				});

				const mockUserSettings = {
					status: 'online',
					status_resets_at: null,
					status_resets_to: null,
					theme: 'dark',
					locale: 'en-US',
					restricted_guilds: [],
					bot_restricted_guilds: [],
					default_guilds_restricted: false,
					bot_default_guilds_restricted: false,
					inline_attachment_media: true,
					inline_embed_media: true,
					gif_auto_play: true,
					render_embeds: true,
					render_reactions: true,
					animate_emoji: true,
					animate_stickers: 0,
					render_spoilers: 'explicit',
					message_display_compact: false,
					friend_source_flags: 14,
					incoming_call_flags: 0,
					group_dm_add_permission_flags: 0,
					guild_folders: [],
					custom_status: null,
					afk_timeout: 600,
					time_format: 0,
					developer_mode: true,
					trusted_domains: [],
					default_hide_muted_channels: false,
					sensitive_content_friend_dm_filter: 0,
					sensitive_content_non_friend_dm_filter: 0,
					sensitive_content_guild_filter: 0,
					suppress_unprivileged_self_mentions: false,
					suppress_unprivileged_self_mentions_bypass_user_ids: [],
					staff_dm_access_user_ids: [],
					synced_preferences: '',
					flags: 0,
					enable_tts: false,
					view_nsfw_guilds: true,
					view_nsfw_commands: true,
					inbound_phone_verification_override: false,
					allow_friend_requests_from: 14,
					disable_games_tab: false,
					show_current_game: true,
					timezone: null,
					friend_discovery_flags: 0,
					password_reset_nonce_secret_length: 0,
					activity_status_display_mode: 0,
					activity_joining_restricted_guild_ids: [],
					show_account_switcher_shortcut: true,
					show_unread_direct_messages_at_top: true,
				};

				const extractUserIdFromAuth = (header) => {
					if (!header || typeof header !== 'string') return '100000000000000000';
					try {
						const token = header.replace(/^Bearer\s+/i, '').trim();
						const first = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
						const decoded = Buffer.from(first, 'base64').toString('utf8');
						if (/^\d{15,22}$/.test(decoded)) {
							return decoded;
						}
					} catch (_) {}
					return '100000000000000000';
				};

				const sendJson = (res, data, status = 200) => {
					res.statusCode = status;
					res.setHeader('Content-Type', 'application/json');
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
					res.setHeader('Access-Control-Allow-Headers', '*');
					res.end(JSON.stringify(data));
				};

				const createdGuilds = devStorage.guilds;
				const activeSockets = new Set();
				const toGuildReadyData = (guild) => {
					const activeUserId = '100000000000000000';
					const rawMembers = Array.isArray(guild.members) && guild.members.length > 0 ? guild.members : [];
					const safeMembers = rawMembers.map((m) => {
						const u = (m.user && m.user.id) ? m.user : getOrCreateUser(m.user_id || activeUserId);
						return {
							...m,
							user: u,
						};
					});
					if (safeMembers.length === 0) {
						safeMembers.push({
							user: getOrCreateUser(activeUserId),
							nick: null,
							avatar: null,
							roles: [],
							joined_at: guild.joined_at || new Date().toISOString(),
							deaf: false,
							mute: false,
							flags: 0,
							pending: false,
							permissions: '2147483647',
						});
					}
					return {
						id: guild.id,
						properties: guild,
						channels: guild.channels || [],
						threads: [],
						emojis: guild.emojis || [],
						stickers: guild.stickers || [],
						members: safeMembers,
						member_count: safeMembers.length,
						online_count: safeMembers.length,
						presences: safeMembers.map((m) => ({
							user: {id: m.user.id},
							status: 'online',
							client_status: {desktop: 'online'},
							activities: [],
						})),
						voice_states: [],
						roles: guild.roles || [],
						joined_at: guild.joined_at || new Date().toISOString(),
						unavailable: false,
					};
				};

				const broadcastGateway = (payload) => {
					const raw = JSON.stringify(payload);
					for (const ws of activeSockets) {
						if (ws.readyState === 1) {
							try { ws.send(raw); } catch (_) {}
						}
					}
				};

				const readJsonBody = (req) =>
					new Promise((resolve) => {
						if (req.body && typeof req.body === 'object') {
							return resolve(req.body);
						}
						let body = '';
						req.on('data', (chunk) => { body += chunk; });
						req.on('end', () => {
							try { resolve(JSON.parse(body || '{}')); }
							catch (_) { resolve({}); }
						});
					});

				middlewares.unshift({
					name: 'nexus-dev-middleware',
					middleware: async (req, res, next) => {
						const url = (req.url || '').split('?')[0];

						if (req.method === 'GET' && (url === '/.well-known/nexus' || url === '/api/.well-known/nexus')) {
try {
sendJson(res, buildMockDiscovery(discoveryDoc, req));
} catch {
sendJson(res, {message: 'Invalid development discovery host.'}, 400);
}
							return;
						}

						if (req.method === 'GET' && (url === '/api/ip' || url === '/ip')) {
							sendJson(res, {
								country_code: 'US',
								region_code: null,
								latitude: null,
								longitude: null,
								age_restricted_geos: [],
								age_blocked_geos: [],
							});
							return;
						}

						if (req.method === 'GET' && (url === '/api/v1/discovery/categories' || url === '/discovery/categories')) {
							sendJson(res, [
								{ id: 1, name: 'Gaming', listed_in_all: true },
								{ id: 2, name: 'Music', listed_in_all: true },
								{ id: 3, name: 'Education', listed_in_all: true },
								{ id: 4, name: 'Science & Tech', listed_in_all: true },
								{ id: 5, name: 'Entertainment', listed_in_all: true },
								{ id: 6, name: 'Student Hubs', listed_in_all: true },
							]);
							return;
						}

						if (req.method === 'GET' && (url === '/api/v1/discovery/guilds' || url === '/discovery/guilds')) {
							sendJson(res, {
								total: createdGuilds.length,
								guilds: createdGuilds.map((g) => ({
									id: g.id,
									name: g.name,
									icon: g.icon,
									banner: g.banner,
									description: g.description || 'Community Server',
									category_type: 1,
									primary_language: 'en',
									custom_tags: ['community'],
									member_count: g.member_count || 1,
									online_count: g.online_count || 1,
									features: g.features || [],
									verification_level: 0,
								})),
								category_counts: [
									{ category_type: 1, count: createdGuilds.length },
								],
							});
							return;
						}

						if (req.method === 'POST' && url === '/api/v1/auth/register') {
							const body = await readJsonBody(req);
							const newUserId = '100' + String(Date.now()).slice(2) + String(Math.floor(Math.random() * 900) + 100);
							const user = getOrCreateUser(newUserId, {
								username: body.username || 'newuser',
								email: body.email || `${newUserId}@nexus.local`,
								global_name: body.global_name || body.username || 'New User',
							});
							const devToken = Buffer.from(newUserId).toString('base64') + '.mock_dev_token';
							sendJson(res, {
								user_id: newUserId,
								token: devToken,
								theme: 'dark',
								user,
							});
							return;
						}

						if (req.method === 'POST' && url === '/api/v1/auth/login') {
							const body = await readJsonBody(req);
							const loginIdent = (body.login || '').trim().toLowerCase();
							let targetUser = Object.values(devStorage.users).find(
								(u) => (u.email && u.email.toLowerCase() === loginIdent) || (u.username && u.username.toLowerCase() === loginIdent)
							);
							if (!targetUser) {
								targetUser = getOrCreateUser('100000000000000000');
							}
							const devToken = Buffer.from(targetUser.id).toString('base64') + '.mock_dev_token';
							sendJson(res, {
								user_id: targetUser.id,
								token: devToken,
								theme: 'dark',
								user: targetUser,
							});
							return;
						}

						if (req.method === 'GET' && (url === '/api/v1/users/@me' || url === '/users/@me')) {
							const userId = extractUserIdFromAuth(req.headers.authorization);
							sendJson(res, getOrCreateUser(userId));
							return;
						}

						const userProfileMatch = url.match(/^\/(?:api\/v1\/)?users\/([^/]+)\/profile$/);
						if (req.method === 'GET' && userProfileMatch) {
							const targetUserId = userProfileMatch[1] === '@me' ? extractUserIdFromAuth(req.headers.authorization) : userProfileMatch[1];
							const user = getOrCreateUser(targetUserId);
							sendJson(res, {
								user,
								user_profile: {
									bio: user.bio || '',
									accent_color: user.accent_color ?? null,
									banner: user.banner || null,
									theme_colors: user.theme_colors || null,
									pronouns: user.pronouns || '',
									profile_appearance: user.profile_appearance || null,
								},
								badges: [],
								mutual_guilds: [],
								mutual_friends: [],
							});
							return;
						}

						const singleUserMatch = url.match(/^\/(?:api\/v1\/)?users\/([^/]+)$/);
						if (req.method === 'GET' && singleUserMatch && singleUserMatch[1] !== '@me' && !url.includes('/@me/')) {
							sendJson(res, getOrCreateUser(singleUserMatch[1]));
							return;
						}

						if (req.method === 'PATCH' && (url === '/api/v1/users/@me' || url === '/users/@me')) {
							const body = await readJsonBody(req);
							const userId = extractUserIdFromAuth(req.headers.authorization);
							const user = getOrCreateUser(userId, body);
							saveDevStorage();
							sendJson(res, user);
							broadcastGateway({
								op: 0,
								t: 'USER_UPDATE',
								d: user,
							});
							return;
						}

						if (req.method === 'GET' && (url === '/api/v1/users/@me/guilds' || url === '/users/@me/guilds')) {
							sendJson(res, createdGuilds);
							return;
						}

						if (req.method === 'POST' && (url === '/api/v1/guilds' || url === '/guilds')) {
							const body = await readJsonBody(req);
							const userId = extractUserIdFromAuth(req.headers.authorization);
							const guildId = '200' + String(Date.now()).slice(3);
							const channelId = '300' + String(Date.now()).slice(3);
							const everyoneRoleId = guildId;

							const channel = {
								id: channelId,
								guild_id: guildId,
								name: 'general',
								type: 0,
								position: 0,
								permission_overwrites: [],
								parent_id: null,
								topic: null,
								nsfw: false,
								rate_limit_per_user: 0,
								last_message_id: null,
							};

							const guild = {
								id: guildId,
								name: body.name || 'New Community',
								icon: body.icon || null,
								banner: null,
								banner_width: null,
								banner_height: null,
								splash: null,
								splash_width: null,
								splash_height: null,
								splash_card_alignment: 'center',
								embed_splash: null,
								embed_splash_width: null,
								embed_splash_height: null,
								vanity_url_code: null,
								owner_id: userId,
								system_channel_id: channelId,
								system_channel_flags: 0,
								rules_channel_id: null,
								afk_channel_id: null,
								afk_timeout: 300,
								features: [],
								verification_level: 0,
								mfa_level: 0,
								nsfw_level: 0,
								nsfw: false,
								content_warning_level: 0,
								content_warning_text: null,
								explicit_content_filter: 0,
								default_message_notifications: 0,
								disabled_operations: 0,
								message_history_cutoff: null,
								permissions: '2147483647',
								roles: [
									{
										id: everyoneRoleId,
										name: '@everyone',
										color: 0,
										hoist: false,
										position: 0,
										permissions: '104324673',
										managed: false,
										mentionable: false,
										flags: 0,
									},
								],
								emojis: [],
								stickers: [],
								channels: [channel],
								member_count: 1,
								online_count: 1,
								joined_at: new Date().toISOString(),
								large: false,
								unavailable: false,
								members: [
									{
										user: createMockUser(userId),
										nick: null,
										avatar: null,
										roles: [],
										joined_at: new Date().toISOString(),
										deaf: false,
										mute: false,
										flags: 0,
										pending: false,
										permissions: '2147483647',
									},
								],
							};

							createdGuilds.push(guild);
							saveDevStorage();
							sendJson(res, guild);
							broadcastGateway({
								op: 0,
								t: 'GUILD_CREATE',
								d: toGuildReadyData(guild),
							});
							return;
						}

						if (req.method === 'POST' && url.startsWith('/api/v1/guilds/') && url.endsWith('/channels')) {
							const body = await readJsonBody(req);
							const parts = url.replace('/api/v1/guilds/', '').split('/');
							const guildId = parts[0];
							let targetGuild = createdGuilds.find((g) => g.id === guildId);
							if (!targetGuild) {
								targetGuild = {
									id: guildId,
									name: 'Community Server',
									channels: [],
									roles: [],
									members: [],
								};
								createdGuilds.push(targetGuild);
							}
							const channelId = '300' + String(Date.now()).slice(3);
							const newChannel = {
								id: channelId,
								guild_id: guildId,
								name: body.name || 'new-channel',
								type: body.type !== undefined ? body.type : 0,
								position: targetGuild.channels?.length || 0,
								permission_overwrites: body.permission_overwrites || [],
								parent_id: body.parent_id || null,
								topic: body.topic || null,
								nsfw: Boolean(body.nsfw),
								rate_limit_per_user: body.rate_limit_per_user || 0,
								last_message_id: null,
							};
							if (!targetGuild.channels) targetGuild.channels = [];
							targetGuild.channels.push(newChannel);
							saveDevStorage();
							sendJson(res, newChannel, 201);
							broadcastGateway({
								op: 0,
								t: 'CHANNEL_CREATE',
								d: newChannel,
							});
							return;
						}

						if (req.method === 'PATCH' && url.startsWith('/api/v1/guilds/') && url.endsWith('/channels')) {
							sendJson(res, []);
							return;
						}

						if (req.method === 'POST' && url.startsWith('/api/v1/guilds/') && url.endsWith('/roles')) {
							const body = await readJsonBody(req);
							const parts = url.replace('/api/v1/guilds/', '').split('/');
							const guildId = parts[0];
							const targetGuild = createdGuilds.find((g) => g.id === guildId);
							const roleId = '500' + String(Date.now()).slice(3);
							const role = {
								id: roleId,
								name: body.name || 'new role',
								color: body.color || 0,
								hoist: body.hoist || false,
								position: targetGuild?.roles?.length || 1,
								permissions: body.permissions || '104324673',
								managed: false,
								mentionable: body.mentionable || false,
								flags: 0,
							};
							if (targetGuild) {
								if (!targetGuild.roles) targetGuild.roles = [];
								targetGuild.roles.push(role);
								saveDevStorage();
							}
							sendJson(res, role, 201);
							broadcastGateway({
								op: 0,
								t: 'GUILD_ROLE_CREATE',
								d: {guild_id: guildId, role},
							});
							return;
						}

						if (req.method === 'PATCH' && url.startsWith('/api/v1/channels/')) {
							const body = await readJsonBody(req);
							const channelId = url.replace('/api/v1/channels/', '').split('/')[0].split('?')[0];
							for (const g of createdGuilds) {
								const found = g.channels?.find((c) => c.id === channelId);
								if (found) {
									Object.assign(found, body);
									saveDevStorage();
									sendJson(res, found);
									broadcastGateway({
										op: 0,
										t: 'CHANNEL_UPDATE',
										d: found,
									});
									return;
								}
							}
							sendJson(res, {id: channelId, ...body});
							return;
						}

						if (req.method === 'DELETE' && url.startsWith('/api/v1/channels/')) {
							const channelId = url.replace('/api/v1/channels/', '').split('/')[0].split('?')[0];
							for (const g of createdGuilds) {
								const idx = g.channels?.findIndex((c) => c.id === channelId) ?? -1;
								if (idx !== -1) {
									const [deleted] = g.channels.splice(idx, 1);
									saveDevStorage();
									sendJson(res, deleted);
									broadcastGateway({
										op: 0,
										t: 'CHANNEL_DELETE',
										d: deleted,
									});
									return;
								}
							}
							sendJson(res, {id: channelId});
							return;
						}

						if (req.method === 'GET' && url.startsWith('/api/v1/guilds/')) {
							const parts = url.replace('/api/v1/guilds/', '').split('/');
							const guildId = parts[0];
							const sub = parts[1];
							const targetGuild = createdGuilds.find((g) => g.id === guildId);
							if (!sub) {
								if (targetGuild) {
									sendJson(res, targetGuild);
								} else {
									sendJson(res, {message: 'Guild not found'}, 404);
								}
								return;
							}
							if (sub === 'channels') {
								sendJson(res, targetGuild ? targetGuild.channels : []);
								return;
							}
							if (sub === 'roles') {
								sendJson(res, targetGuild ? targetGuild.roles : []);
								return;
							}
							if (sub === 'members') {
								const activeUserId = extractUserIdFromAuth(req.headers.authorization);
								const raw = (targetGuild && targetGuild.members && targetGuild.members.length > 0) ? targetGuild.members : [];
								const safeMembers = raw.map((m) => ({
									...m,
									user: (m.user && m.user.id) ? m.user : getOrCreateUser(activeUserId),
								}));
								if (safeMembers.length === 0) {
									safeMembers.push({
										user: getOrCreateUser(activeUserId),
										nick: null,
										avatar: null,
										roles: [],
										joined_at: new Date().toISOString(),
										deaf: false,
										mute: false,
										flags: 0,
										pending: false,
										permissions: '2147483647',
									});
								}
								sendJson(res, safeMembers);
								return;
							}
						}

						if (req.method === 'GET' && url.includes('/channels/') && url.endsWith('/messages')) {
const channelId = url.split('/channels/')[1].split('/')[0];
const query = new URL(req.url, 'http://dev.invalid').searchParams;
const limit = Math.min(100, Math.max(1, Number.parseInt(query.get('limit') || '50', 10) || 50));
const before = query.get('before');
const after = query.get('after');
const messages = (devStorage.messages[channelId] || []).filter((message) =>
(!before || !/^\d+$/u.test(before) || BigInt(message.id) < BigInt(before)) &&
(!after || !/^\d+$/u.test(after) || BigInt(message.id) > BigInt(after))
);
sendJson(res, messages.slice(-limit).reverse());
							return;
						}

						if (req.method === 'POST' && url.includes('/channels/') && url.endsWith('/messages')) {
							const body = await readJsonBody(req);
							const userId = extractUserIdFromAuth(req.headers.authorization);
							const msgId = '400' + String(Date.now()).slice(3);
							const channelId = url.split('/channels/')[1].split('/')[0];
							const newMsg = {
								id: msgId,
								channel_id: channelId,
								author: createMockUser(userId),
								content: body.content || '',
								timestamp: new Date().toISOString(),
								edited_timestamp: null,
								tts: false,
								mention_everyone: false,
								mentions: [],
								mention_roles: [],
								attachments: [],
								embeds: [],
								pinned: false,
								type: 0,
							};
devStorage.messages[channelId] ??= [];
devStorage.messages[channelId].push(newMsg);
saveDevStorage();
							sendJson(res, newMsg);
							broadcastGateway({
								op: 0,
								t: 'MESSAGE_CREATE',
								d: newMsg,
							});
							return;
						}

						if (req.method === 'POST' && url.includes('/channels/') && (url.endsWith('/typing') || url.endsWith('/ack'))) {
							sendJson(res, {});
							return;
						}

						if (url.includes('/rtc-regions')) {
							sendJson(res, [
								{
									id: 'cloud',
									name: 'LiveKit Cloud',
									emoji: '☁️',
								},
							]);
							return;
						}

						if (
							req.method === 'GET' &&
							(url === '/api/v1/users/@me/channels' ||
								url === '/api/v1/users/@me/relationships' ||
								url === '/api/v1/users/@me/gifts' ||
								url === '/users/@me/gifts' ||
								url === '/api/v1/users/@me/saved-messages' ||
								url === '/users/@me/saved-messages' ||
								url === '/api/v1/users/@me/authorized-ips' ||
								url === '/api/v1/users/@me/sessions' ||
								url === '/api/v1/users/@me/affinities/users' ||
								url === '/api/v1/users/@me/affinities/guilds')
						) {
							sendJson(res, []);
							return;
						}

						if (url.startsWith('/emoji/')) {
							const emojiName = url.replace('/emoji/', '').split('?')[0];
							const emojiPath = path.join(MONOREPO_ROOT, 'nexus_static', 'emoji', emojiName);
							if (existsSync(emojiPath)) {
								res.statusCode = 200;
								res.setHeader('Content-Type', 'image/svg+xml');
								res.setHeader('Access-Control-Allow-Origin', '*');
								res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
								res.end(readFileSync(emojiPath));
								return;
							}
						}

						if (
							url === '/api/v1/users/@me/settings' ||
							url === '/users/@me/settings' ||
							url.startsWith('/api/v1/users/@me/settings') ||
							url.startsWith('/users/@me/settings') ||
							url === '/settings' ||
							url === '/api/v1/settings'
						) {
							if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') {
								const body = await readJsonBody(req);
								Object.assign(mockUserSettings, body);
								sendJson(res, mockUserSettings);
								broadcastGateway({
									op: 0,
									t: 'USER_SETTINGS_UPDATE',
									d: mockUserSettings,
								});
								return;
							}
							sendJson(res, mockUserSettings);
							return;
						}

						if (
							url === '/experiments' ||
							url === '/api/v1/experiments' ||
							url === '/api/experiments' ||
							url.startsWith('/experiments')
						) {
							sendJson(res, {
								poll_interval_seconds: 300,
								poll_jitter_percent: 15,
								assignments: {},
							});
							return;
						}

						if (url === '/api/v1/premium/state' || url === '/premium/state' || url === '/api/premium/state') {
							sendJson(res, createMockPremiumState());
							return;
						}

						if (url.includes('/premium/perks-disabled') || url.includes('/billing/premium')) {
							sendJson(res, createMockPremiumState());
							return;
						}

						if (url.includes('/connections') || url.includes('/themes') || url.includes('/entrance-sounds')) {
							sendJson(res, []);
							return;
						}

						if (req.url && (req.url.includes('%7B%7BSTATIC_CDN_ENDPOINT%7D%7D') || req.url.includes('{{STATIC_CDN_ENDPOINT}}'))) {
							const clean = req.url
								.replace('/%7B%7BSTATIC_CDN_ENDPOINT%7D%7D', '')
								.replace('/{{STATIC_CDN_ENDPOINT}}', '')
								.replace('%7B%7BSTATIC_CDN_ENDPOINT%7D%7D', '')
								.replace('{{STATIC_CDN_ENDPOINT}}', '');
							res.writeHead(302, {Location: clean.startsWith('/') ? clean : `/${clean}`});
							res.end();
							return;
						}

						next();
					},
				});

				// Attach Mock Gateway WebSocket Server
				let wssAttached = false;
				const attachWss = () => {
					if (wssAttached || !devServer.server) return;
					wssAttached = true;
					const wss = new WebSocketServer({noServer: true});

					devServer.server.on('upgrade', (request, socket, head) => {
						let pathname = '';
						try {
							pathname = new URL(request.url, 'http://localhost:3000').pathname;
						} catch (_) {
							pathname = (request.url || '').split('?')[0];
						}

						if (pathname === '/gateway') {
							wss.handleUpgrade(request, socket, head, (ws) => {
								wss.emit('connection', ws, request);
							});
						}
					});

					wss.on('connection', (ws) => {
const gatewayDecoder = createMockGatewayDecoder();
						activeSockets.add(ws);
						ws.on('close', () => {
gatewayDecoder.close();
							activeSockets.delete(ws);
						});

						const sendMemberListUpdate = (guildId, channelId, range = [0, 99]) => {
							const targetGuild = createdGuilds.find((g) => g.id === guildId);
							const activeUserId = ws._activeUserId || '100000000000000000';
							const rawMembers = (targetGuild?.members && targetGuild.members.length > 0)
								? targetGuild.members
								: [
									{
										user: getOrCreateUser(activeUserId),
										nick: null,
										avatar: null,
										roles: [],
										joined_at: new Date().toISOString(),
										deaf: false,
										mute: false,
										flags: 0,
										pending: false,
										permissions: '2147483647',
									}
								];

							const safeMembers = rawMembers.map((m) => ({
								...m,
								user: (m.user && m.user.id) ? m.user : getOrCreateUser(activeUserId),
							}));

							const items = [
								{
									group: {
										id: 'online',
										count: safeMembers.length,
									},
								},
								...safeMembers.map((m) => ({
									member: {
										...m,
										presence: {
											status: 'online',
											custom_status: null,
										},
									},
								})),
							];

							const memberListPayload = {
								op: 0,
								t: 'GUILD_MEMBER_LIST_UPDATE',
								d: {
									guild_id: guildId,
									id: 'everyone',
									channel_id: channelId,
									member_count: safeMembers.length,
									online_count: safeMembers.length,
									groups: [
										{
											id: 'online',
											count: safeMembers.length,
										},
									],
									ops: [
										{
											op: 'SYNC',
											range,
											items,
										},
									],
								},
							};
							try {
								ws.send(JSON.stringify(memberListPayload));
							} catch (_) {}
						};

						// 1. Send HELLO with heartbeat interval
						ws.send(JSON.stringify({
							op: 10,
							d: {heartbeat_interval: 41250},
						}));

ws.on('message', async (raw, isBinary) => {
							try {
const msg = await gatewayDecoder.decode(raw, isBinary);

								if (msg.op === 1) { // HEARTBEAT
									ws.send(JSON.stringify({op: 11})); // HEARTBEAT_ACK
									return;
								}

								if (msg.op === 2 || msg.op === 6) { // IDENTIFY or RESUME
									const activeUserId = extractUserIdFromAuth(msg.d?.token);
									const sessionId = 'mock_session_' + Date.now();
									ws._activeUserId = activeUserId;
									ws._sessionId = sessionId;
									const readyPayload = {
										op: 0,
										t: 'READY',
										s: 1,
										d: {
											v: 1,
											session_id: sessionId,
											user: createMockUser(activeUserId),
											guilds: createdGuilds.map(toGuildReadyData),
											private_channels: [],
											relationships: [],
											user_settings: mockUserSettings,
											user_guild_settings: [],
											read_states: [],
											notes: {},
											pinned_dms: [],
											favorite_memes: [],
											rtc_regions: [
												{
													id: 'cloud',
													name: 'LiveKit Cloud',
													emoji: '☁️',
												},
											],
											webauthn_credentials: [],
										},
									};
									ws.send(JSON.stringify(readyPayload));
									setTimeout(() => {
										for (const g of createdGuilds) {
											for (const c of (g.channels || [])) {
												sendMemberListUpdate(g.id, c.id);
											}
										}
									}, 100);
									return;
								}

								if (msg.op === 14) { // LAZY_REQUEST / updateGuildSubscriptions
									const subscriptions = msg.d?.subscriptions || msg.d || {};
									for (const [guildId, sub] of Object.entries(subscriptions)) {
										const memberListChannels = sub?.member_list_channels || {};
										for (const [channelId, ranges] of Object.entries(memberListChannels)) {
											const range = (Array.isArray(ranges) && ranges.length > 0 && Array.isArray(ranges[0])) ? ranges[0] : [0, 99];
											sendMemberListUpdate(guildId, channelId, range);
										}
									}
									return;
								}

								if (msg.op === 8) { // REQUEST_GUILD_MEMBERS
									const guildId = msg.d?.guild_id;
									const targetGuild = createdGuilds.find((g) => g.id === guildId);
									const activeUserId = ws._activeUserId || '100000000000000000';
									const raw = (targetGuild && targetGuild.members && targetGuild.members.length > 0) ? targetGuild.members : [];
									const safeMembers = raw.map((m) => ({
										...m,
										user: (m.user && m.user.id) ? m.user : getOrCreateUser(activeUserId),
									}));
									if (safeMembers.length === 0) {
										safeMembers.push({
											user: getOrCreateUser(activeUserId),
											nick: null,
											avatar: null,
											roles: [],
											joined_at: new Date().toISOString(),
											deaf: false,
											mute: false,
											flags: 0,
											pending: false,
											permissions: '2147483647',
										});
									}
									ws.send(JSON.stringify({
										op: 0,
										t: 'GUILD_MEMBERS_CHUNK',
										d: {
											guild_id: guildId,
											members: safeMembers,
											chunk_index: 0,
											chunk_count: 1,
											presences: safeMembers.map((m) => ({
												user: {id: m.user.id},
												status: 'online',
												client_status: {desktop: 'online'},
												activities: [],
											})),
											nonce: msg.d?.nonce,
										},
									}));
									return;
								}

								if (msg.op === 4) { // VOICE_STATE_UPDATE
									const d = msg.d || {};
									const guildId = d.guild_id || null;
									const channelId = d.channel_id || null;
									const activeUserId = ws._activeUserId || '100000000000000000';
									const sessionId = ws._sessionId || 'mock_session_1';

									if (!channelId) {
										ws._voiceChannelId = null;
										ws._voiceConnId = null;
										const voiceStateLeavePayload = {
											op: 0,
											t: 'VOICE_STATE_UPDATE',
											s: 2,
											d: {
												guild_id: guildId,
												channel_id: null,
												user_id: activeUserId,
												connection_id: null,
												session_id: sessionId,
												mute: false,
												deaf: false,
												self_mute: false,
												self_deaf: false,
												self_video: false,
												self_stream: false,
											},
										};
										broadcastGateway(voiceStateLeavePayload);
										return;
									}

									const isChannelChange = ws._voiceChannelId !== channelId;
									ws._voiceChannelId = channelId;
									if (!ws._voiceConnId || isChannelChange) {
										ws._voiceConnId = d.connection_id || `conn_${Date.now()}`;
									}
									const connId = ws._voiceConnId;

									const voiceStateJoinPayload = {
										op: 0,
										t: 'VOICE_STATE_UPDATE',
										s: 2,
										d: {
											guild_id: guildId,
											channel_id: channelId,
											user_id: activeUserId,
											connection_id: connId,
											session_id: sessionId,
											mute: false,
											deaf: false,
											self_mute: Boolean(d.self_mute),
											self_deaf: Boolean(d.self_deaf),
											self_video: Boolean(d.self_video),
											self_stream: false,
											member: {
												user: getOrCreateUser(activeUserId),
												nick: null,
												avatar: null,
												roles: [],
												joined_at: new Date().toISOString(),
												deaf: false,
												mute: false,
												flags: 0,
												pending: false,
												permissions: '2147483647',
											},
										},
									};
									broadcastGateway(voiceStateJoinPayload);

									// ONLY generate token and dispatch VOICE_SERVER_UPDATE when newly joining or switching channels.
									// Resending it on mute/unmute/device updates would force the client to tear down the WebRTC room and reconnect in a loop.
									if (isChannelChange) {
										(async () => {
											try {
												let AccessToken;
												try {
													AccessToken = require('livekit-server-sdk').AccessToken;
												} catch (_) {
													AccessToken = require('../nexus_api/node_modules/livekit-server-sdk').AccessToken;
												}

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const configuredLivekitUrl = process.env.LIVEKIT_URL;
if (!apiKey || !apiSecret || !configuredLivekitUrl) throw new Error('LiveKit development voice requires configured Replit Secrets.');
const livekitEndpoint = configuredLivekitUrl.replace(/^https:/u, 'wss:').replace(/^http:/u, 'ws:');

												const roomName = guildId ? `guild_${guildId}_channel_${channelId}` : `dm_channel_${channelId}`;
												const participantIdentity = `user_${activeUserId}_${connId}`;

												const userObj = getOrCreateUser(activeUserId);
												const metadata = {
													user_id: activeUserId,
													channel_id: channelId,
													connection_id: connId,
													region_id: 'cloud',
													server_id: 'cloud-server-1',
													token_nonce: String(Date.now()),
													issued_at: Math.floor(Date.now() / 1000).toString(),
													guild_id: guildId || undefined,
												};

												const at = new AccessToken(apiKey, apiSecret, {
													identity: participantIdentity,
													name: userObj.global_name || userObj.username || 'Developer',
													metadata: JSON.stringify(metadata),
													ttl: 36000,
												});

												at.addGrant({
													roomJoin: true,
													room: roomName,
													canPublish: true,
													canSubscribe: true,
													canPublishData: true,
												});

												const token = await at.toJwt();

												const voiceServerPayload = {
													op: 0,
													t: 'VOICE_SERVER_UPDATE',
													s: 3,
													d: {
														token,
														endpoint: livekitEndpoint,
														connection_id: connId,
														guild_id: guildId,
														channel_id: channelId,
													},
												};
												ws.send(JSON.stringify(voiceServerPayload));
											} catch (err) {
												console.error('[Mock Gateway] Failed to generate LiveKit token:', err);
											}
										})();
									}
									return;
								}
							} catch (e) {
console.error('[Mock Gateway] Message processing failed:', e instanceof Error ? e.name : 'UnknownError');
ws.close(4002, 'Invalid development Gateway payload');
							}
						});
					});
				};

				const pollTimer = setInterval(() => {
					if (devServer.server) {
						attachWss();
						clearInterval(pollTimer);
					}
				}, 100);

				return middlewares;
			},
		},
	};
};
