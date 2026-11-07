import assert from 'node:assert/strict';
import {constants, createZstdCompress} from 'node:zlib';

// Development only: never point smoke checks at the published application.
const origin = process.env.REPLIT_DEV_DOMAIN
 ? `https://${process.env.REPLIT_DEV_DOMAIN}`
 : 'http://127.0.0.1:5000';
const request = async (path, options = {}) => {
 const response = await fetch(new URL(path, origin), {...options, signal: AbortSignal.timeout(20000)});
 assert.ok(response.ok, `${options.method || 'GET'} ${new URL(path, origin).pathname}: ${response.status}`);
 return response;
};
const json = async (path, options) => (await request(path, options)).json();
const discovery = await json('/.well-known/nexus');
assert.equal(new URL(discovery.endpoints.api).origin, origin);
assert.equal(new URL(discovery.endpoints.gateway).host, new URL(origin).host);
assert.equal(new URL(discovery.endpoints.gateway).protocol, origin.startsWith('https:') ? 'wss:' : 'ws:');
console.log('PASS public-origin API and Gateway discovery');

for (const [path, type] of [
 ['/login', /text\/html/u],
 ['/assets/app-bootstrap.css', /text\/css/u],
 ['/assets/app-bootstrap.js', /javascript/u],
]) {
 const response = await request(path, {method: 'HEAD'});
 assert.match(response.headers.get('content-type') || '', type, `${path} content type`);
}
console.log('PASS login document and bootstrap assets');

const api = `${discovery.endpoints.api}/v1`;
const session = await json(`${api}/auth/login`, {
 method: 'POST',
 headers: {'content-type': 'application/json'},
 body: JSON.stringify({login: 'developer@nexus.local', password: 'development-only'}),
});
assert.match(session.token, /\.mock_dev_token$/u, 'Refusing to modify a non-Mock account');
const headers = {authorization: session.token, 'content-type': 'application/json'};
const user = await json(`${api}/users/@me`, {headers});
assert.equal(user.id, session.user_id);
try {
 await request(`${api}/users/@me`, {method: 'PATCH', headers, body: JSON.stringify({bio: 'Development startup smoke check'})});
 const changed = await json(`${api}/users/@me`, {headers});
 assert.equal(changed.bio, 'Development startup smoke check');
} finally {
 await request(`${api}/users/@me`, {method: 'PATCH', headers, body: JSON.stringify({bio: user.bio})});
}
assert.ok(Array.isArray(await json(`${api}/users/@me/guilds`, {headers})));
console.log('PASS Mock sign-in, profile save/read and guild listing');

async function checkSocket(url, identify) {
 await new Promise((resolve, reject) => {
  const socket = new WebSocket(url);
  const encoder = identify ? createZstdCompress() : null;
  let encodedChunks = [];
  let ready = false;
  encoder?.on('data', (chunk) => encodedChunks.push(chunk));
  const sendCompressed = async (payload) => {
   encodedChunks = [];
   encoder.write(JSON.stringify(payload));
   await new Promise((done, fail) => encoder.flush(constants.ZSTD_e_flush, (error) => error ? fail(error) : done()));
   socket.send(Buffer.concat(encodedChunks));
  };
  const timer = setTimeout(() => { socket.close(); reject(new Error('Development WebSocket timed out')); }, 10000);
  const finish = (error) => {
   clearTimeout(timer);
   encoder?.destroy();
   socket.close();
   error ? reject(error) : resolve();
  };
  socket.addEventListener('error', () => finish(new Error('Development WebSocket failed')), {once: true});
  socket.addEventListener('open', () => {
   if (!identify) return finish();
   sendCompressed({op: 2, d: {token: session.token, properties: {os: 'linux', browser: 'dev-smoke', device: 'dev-smoke'}}}).catch(finish);
  });
  socket.addEventListener('message', (event) => {
   try {
    const message = JSON.parse(event.data);
    if (message.t === 'READY') {
     assert.equal(message.d.user.id, user.id);
     ready = true;
     sendCompressed({op: 1, d: message.s}).catch(finish);
    }
    if (message.op === 11 && ready) finish();
   } catch (error) { finish(error); }
  });
 });
}
await checkSocket(discovery.endpoints.gateway, true);
const hmr = new URL(discovery.endpoints.gateway);
hmr.pathname = '/ws';
await checkSocket(hmr.href, false);
console.log('PASS compressed Gateway identify/heartbeat and live-update WebSocket');
