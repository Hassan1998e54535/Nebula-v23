import {createZstdDecompress} from 'node:zlib';

// The real client flushes one JSON payload at a time into a persistent Zstd stream.
// Later WebSocket messages are continuation chunks, not independent Zstd frames.
export function createMockGatewayDecoder() {
 const stream = createZstdDecompress();
 let chunks = [];
 let decodedBytes = 0;
 let started = false;
 let streamError;
 let queue = Promise.resolve();
 stream.on('data', (chunk) => {
  decodedBytes += chunk.length;
  if (decodedBytes > 8 * 1024 * 1024) {
   stream.destroy(new Error('Development Gateway payload exceeds its decoded limit.'));
   return;
  }
  chunks.push(chunk);
 });
 stream.on('error', (error) => { streamError = error; });
 return {
  decode(raw, binary = false) {
   const pending = queue.then(async () => {
    const input = Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(raw);
    if (!binary || (!started && (input[0] === 0x7b || input[0] === 0x5b))) {
     return JSON.parse(input.toString('utf8'));
    }
    if (streamError) throw streamError;
    if (!started && (input.length < 4 || input.readUInt32LE(0) !== 0xfd2fb528)) {
     throw new Error('Invalid development Gateway Zstd frame.');
    }
    started = true;
    chunks = [];
    decodedBytes = 0;
    await new Promise((resolve, reject) => {
     const timer = setTimeout(() => {
      stream.destroy();
      reject(new Error('Development Gateway decompression timed out.'));
     }, 5000);
     stream.write(input, (error) => {
      clearTimeout(timer);
      if (error || streamError) reject(error || streamError);
      else resolve();
     });
    });
    if (!decodedBytes) throw new Error('Incomplete development Gateway payload.');
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
   });
   queue = pending.catch(() => {});
   return pending;
  },
  close() { stream.destroy(); },
 };
}
