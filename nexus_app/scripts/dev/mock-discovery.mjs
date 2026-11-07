// Resolve development endpoints from the visitor's origin, not the server's localhost.
export function buildMockDiscovery(template, request) {
 const firstHeader = (name) => String(request.headers[name] ?? '').split(',')[0].trim();
 const host = firstHeader('x-forwarded-host') || firstHeader('host');
 const forwardedProtocol = firstHeader('x-forwarded-proto');
 const protocol = ['http', 'https'].includes(forwardedProtocol)
  ? forwardedProtocol : request.socket?.encrypted ? 'https' : 'http';
 if (!host) throw new Error('A host is required for development discovery.');
 const origin = new URL(`${protocol}://${host}`);
 if (origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) {
  throw new Error('Invalid development request host.');
 }
 const endpoints = Object.fromEntries(Object.entries(template.endpoints).map(([name, value]) => {
  if (value == null) return [name, value];
  const endpoint = new URL(value, origin);
  if (name === 'gateway') endpoint.protocol = protocol === 'https' ? 'wss:' : 'ws:';
  return [name, endpoint.href];
 }));
 return {
  ...template,
  endpoints,
  sso: {...template.sso, redirect_uri: new URL(template.sso.redirect_uri, origin).href},
 };
}
