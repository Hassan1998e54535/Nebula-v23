import http from "node:http";
import net from "node:net";

const upstream = { host: "127.0.0.1", port: 8088 };
const listenPort = 5000;
const readinessPaths = ["/login", "/assets/app-bootstrap.css", "/assets/app-bootstrap.js"];
const readyCacheMs = 250;
const notReadyCacheMs = 1000;
let readinessCache = { ready: false, expiresAt: 0 };
let readinessProbe = null;
let lastReportedReadiness = null;
let hasEverBeenReady = false;
const startupHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="5">
<title>جارٍ تشغيل NEXUS</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0715;color:#f5f2ff;font:16px system-ui,sans-serif}
main{max-width:28rem;padding:2rem;text-align:center}
p{color:#c4bcd4;line-height:1.7}
</style>
</head>
<body><main><h1>جارٍ تشغيل NEXUS…</h1><p>يستغرق تشغيل الخدمات لحظات. ستُعاد المحاولة تلقائيًا.</p></main></body>
</html>`;
const startupResponse = [
	"HTTP/1.1 503 Service Unavailable",
	"Content-Type: text/html; charset=utf-8",
	`Content-Length: ${Buffer.byteLength(startupHtml)}`,
	"Cache-Control: no-store, no-cache, must-revalidate",
	"Retry-After: 5",
	"Connection: close",
	"",
	startupHtml,
].join("\r\n");

function requestIsReady(path) {
	return new Promise((resolve) => {
		const request = http.request(
			{
				host: upstream.host,
				port: upstream.port,
				path,
				method: "HEAD",
				timeout: 2000,
			},
			(response) => {
				const statusIsReady = response.statusCode === 200;
				response.destroy();
				resolve(statusIsReady);
			},
		);
		request.setTimeout(2000, () => request.destroy());
		request.once("error", () => resolve(false));
		request.end();
	});
}

async function isPreviewReady() {
	// Keep the preview warm through transient asset delays during Rspack HMR.
	if (hasEverBeenReady) {
		return true;
	}
	if (Date.now() < readinessCache.expiresAt) {
		return readinessCache.ready;
	}
	if (readinessProbe) {
		return readinessProbe;
	}

	readinessProbe = Promise.all(readinessPaths.map(requestIsReady))
		.then((results) => {
			const ready = results.every(Boolean);
			if (ready) {
				hasEverBeenReady = true;
			}
			readinessCache = {
				ready,
				expiresAt: Date.now() + (ready ? readyCacheMs : notReadyCacheMs),
			};
			if (ready !== lastReportedReadiness) {
				console.log(
					ready
						? "NEXUS login page and bootstrap assets are ready."
						: "NEXUS is still starting; the preview will retry until the app shell is ready.",
				);
				lastReportedReadiness = ready;
			}
			return ready;
		})
		.catch(() => false)
		.finally(() => {
			readinessProbe = null;
		});
	return readinessProbe;
}

const server = net.createServer((client) => {
	let backend = null;
	client.pause();
	client.on("error", () => backend?.destroy());
	client.on("close", () => backend?.destroy());
	void isPreviewReady().then((ready) => {
		if (client.destroyed) {
			return;
		}
		if (!ready) {
			client.end(startupResponse);
			return;
		}

		backend = net.createConnection(upstream);
		let connected = false;
		let startupResponseSent = false;
		backend.once("connect", () => {
			connected = true;
			client.pipe(backend);
			backend.pipe(client);
			client.resume();
		});
		backend.on("error", () => {
			if (connected) {
				client.destroy();
				return;
			}
			if (!startupResponseSent && !client.destroyed) {
				startupResponseSent = true;
				client.end(startupResponse);
			}
		});
	});
});

server.on("error", (error) => {
  console.error(`NEXUS preview proxy failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(listenPort, "0.0.0.0", () => {
  console.log(`NEXUS preview proxy listening on port ${listenPort}.`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
