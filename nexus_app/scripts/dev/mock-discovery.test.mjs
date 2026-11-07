import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMockDiscovery} from './mock-discovery.mjs';

const template = {
 endpoints: {api: '/api', gateway: '/gateway', static_cdn: '/', upload_relay: null},
 sso: {enabled: false, redirect_uri: '/auth/sso'},
};

test('phone/proxied HTTPS discovery stays on the public origin', () => {
 const result = buildMockDiscovery(template, {
  headers: {host: 'internal:5000', 'x-forwarded-host': 'preview.example.test', 'x-forwarded-proto': 'https'},
 });
 assert.equal(result.endpoints.api, 'https://preview.example.test/api');
 assert.equal(result.endpoints.gateway, 'wss://preview.example.test/gateway');
 assert.equal(result.sso.redirect_uri, 'https://preview.example.test/auth/sso');
 assert.equal(result.endpoints.upload_relay, null);
});

test('local development retains its actual host and port', () => {
 const result = buildMockDiscovery(template, {headers: {host: '127.0.0.1:5000'}});
 assert.equal(result.endpoints.gateway, 'ws://127.0.0.1:5000/gateway');
 assert.equal(result.endpoints.api, 'http://127.0.0.1:5000/api');
});

test('forwarded header chains use the original visitor host', () => {
 const result = buildMockDiscovery(template, {
  headers: {host: 'internal', 'x-forwarded-host': 'preview.example.test, internal', 'x-forwarded-proto': 'https, http'},
 });
 assert.equal(result.endpoints.api, 'https://preview.example.test/api');
});

test('discovery does not mutate its shared template', () => {
 buildMockDiscovery(template, {headers: {host: 'preview.example.test', 'x-forwarded-proto': 'https'}});
 assert.equal(template.endpoints.api, '/api');
});

test('missing or malformed host is rejected', () => {
 assert.throws(() => buildMockDiscovery(template, {headers: {}}));
 assert.throws(() => buildMockDiscovery(template, {headers: {host: 'example.test/unexpected'}}));
});
