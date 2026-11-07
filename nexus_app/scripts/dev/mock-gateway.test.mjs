import assert from 'node:assert/strict';
import test from 'node:test';
import {constants, createZstdCompress} from 'node:zlib';
import {createMockGatewayDecoder} from './mock-gateway.mjs';

test('plain text and uncompressed binary JSON remain supported', async () => {
 const decoder = createMockGatewayDecoder();
 try {
  assert.deepEqual(await decoder.decode(Buffer.from('{"op":1,"d":0}')), {op: 1, d: 0});
  assert.deepEqual(await decoder.decode(Buffer.from('{"op":2,"d":{}}'), true), {op: 2, d: {}});
 } finally { decoder.close(); }
});

test('identify and successive heartbeats decode using the same Zstd stream', async () => {
 const encoder = createZstdCompress();
 const decoder = createMockGatewayDecoder();
 let chunks = [];
 encoder.on('data', (chunk) => chunks.push(chunk));
 const payloads = [{op: 2, d: {token: 'development-test'}}, {op: 1, d: 0}, {op: 1, d: 1}];
 try {
  const encoded = [];
  for (const payload of payloads) {
   chunks = [];
   encoder.write(JSON.stringify(payload));
   await new Promise((resolve, reject) => encoder.flush(constants.ZSTD_e_flush, (error) => error ? reject(error) : resolve()));
   encoded.push(Buffer.concat(chunks));
  }
  assert.deepEqual(await Promise.all(encoded.map((chunk) => decoder.decode(chunk, true))), payloads);
 } finally { encoder.destroy(); decoder.close(); }
});

test('malformed compressed payload rejects rather than becoming fake JSON', {timeout: 3000}, async () => {
 const decoder = createMockGatewayDecoder();
 try {
  await assert.rejects(decoder.decode(Buffer.from('not a zstd stream'), true));
 } finally { decoder.close(); }
});
