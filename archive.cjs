'use strict';
const crypto = require('crypto');

function read(archive) {
  const header = JSON.parse(archive.subarray(16, 16 + archive.readUInt32LE(12)).toString('utf8'));
  const start = 8 + archive.readUInt32LE(4);
  const entries = [];
  function walk(dir) {
    for (const entry of Object.values(dir.files)) {
      if (entry.files) walk(entry);
      else if (!entry.unpacked && !entry.link) entries.push(entry);
    }
  }
  walk(header);
  return { header, start, entries };
}

function patchLauncher(archive, transform) {
  const { header, start, entries } = read(archive);
  const launch = header.files['launch.dist.js'];
  if (!launch || launch.unpacked) throw new Error('Unsupported Typora archive: launch.dist.js is missing.');
  const payloads = entries.map(entry => {
    let payload = archive.subarray(start + Number(entry.offset), start + Number(entry.offset) + entry.size);
    if (entry === launch) {
      payload = Buffer.from(transform(payload.toString('utf8')), 'utf8');
      entry.size = payload.length;
      if (entry.integrity) {
        const blockSize = entry.integrity.blockSize;
        const hash = data => crypto.createHash('sha256').update(data).digest('hex');
        entry.integrity.hash = hash(payload);
        entry.integrity.blocks = [];
        for (let i = 0; i < payload.length; i += blockSize) entry.integrity.blocks.push(hash(payload.subarray(i, i + blockSize)));
      }
    }
    return payload;
  });
  let offset = 0;
  entries.forEach((entry, i) => { entry.offset = String(offset); offset += payloads[i].length; });
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const padded = Math.ceil((4 + json.length) / 4) * 4;
  const headerBuffer = Buffer.alloc(16);
  headerBuffer.writeUInt32LE(4, 0);
  headerBuffer.writeUInt32LE(4 + padded, 4);
  headerBuffer.writeUInt32LE(padded, 8);
  headerBuffer.writeUInt32LE(json.length, 12);
  return Buffer.concat([headerBuffer, json, Buffer.alloc(padded - 4 - json.length), ...payloads]);
}

module.exports = { read, patchLauncher };
