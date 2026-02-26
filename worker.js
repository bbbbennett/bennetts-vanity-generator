'use strict';
const { workerData, parentPort } = require('worker_threads');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const { prefix, suffix, caseSensitive } = workerData;
const BATCH = 1000;

let running = true;
parentPort.on('message', m => { if (m === 'stop') running = false; });

const pfx = caseSensitive ? prefix : prefix.toLowerCase();
const sfx = caseSensitive ? suffix : suffix.toLowerCase();
const hasPfx = prefix.length > 0;
const hasSfx = suffix.length > 0;

function matches(addr) {
  const a = caseSensitive ? addr : addr.toLowerCase();
  if (hasPfx && !a.startsWith(pfx)) return false;
  if (hasSfx && !a.endsWith(sfx)) return false;
  return true;
}

while (running) {
  for (let i = 0; i < BATCH && running; i++) {
    const kp = nacl.sign.keyPair();
    const addr = bs58.encode(Buffer.from(kp.publicKey));
    if (matches(addr)) {
      parentPort.postMessage({
        type: 'found',
        address: addr,
        secretKey: Array.from(kp.secretKey)
      });
      running = false;
    }
  }
  if (running) parentPort.postMessage({ type: 'progress', batch: BATCH });
}
