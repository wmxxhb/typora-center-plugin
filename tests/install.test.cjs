'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { read, patchLauncher } = require('../archive.cjs');
const { install } = require('../install.cjs');

const digest = data => crypto.createHash('sha256').update(data).digest('hex');

function fixtureArchive() {
  const launcher = Buffer.from("'use strict';\nmodule.exports = 'fixture';\n");
  const asset = Buffer.from([0, 1, 2, 255]);
  const header = Buffer.from(JSON.stringify({ files: {
    'launch.dist.js': {
      size: launcher.length,
      offset: '0',
      integrity: { algorithm: 'SHA256', hash: digest(launcher), blockSize: 8,
        blocks: Array.from({ length: Math.ceil(launcher.length / 8) }, (_, i) => digest(launcher.subarray(i * 8, i * 8 + 8))) },
    },
    assets: { files: { 'sample.bin': { size: asset.length, offset: String(launcher.length) } } },
  } }));
  const padding = (4 - header.length % 4) % 4;
  const size = Buffer.alloc(16);
  size.writeUInt32LE(4, 0);
  size.writeUInt32LE(header.length + padding + 8, 4);
  size.writeUInt32LE(header.length + padding + 4, 8);
  size.writeUInt32LE(header.length, 12);
  return Buffer.concat([size, header, Buffer.alloc(padding), launcher, asset]);
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typora-center-test-'));
  t.after(() => {
    assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const resources = path.join(directory, 'resources');
  fs.mkdirSync(resources);
  const archivePath = path.join(resources, 'app.asar');
  const original = fixtureArchive();
  fs.writeFileSync(archivePath, original);
  return { directory, resources, archivePath, original };
}

test('重建入口后保留嵌套文件并更新 SHA256 校验值', () => {
  const source = fixtureArchive();
  const replacement = "'use strict';\nconsole.log('new launcher');\n";
  const output = patchLauncher(source, () => replacement);
  const { header, start } = read(output);
  const launcher = header.files['launch.dist.js'];
  const payload = output.subarray(start + Number(launcher.offset), start + Number(launcher.offset) + launcher.size);
  assert.equal(payload.toString(), replacement);
  assert.equal(launcher.integrity.hash, digest(payload));
  assert.deepEqual(launcher.integrity.blocks, Array.from({ length: Math.ceil(payload.length / 8) }, (_, i) => digest(payload.subarray(i * 8, i * 8 + 8))));
  const asset = header.files.assets.files['sample.bin'];
  assert.deepEqual(output.subarray(start + Number(asset.offset), start + Number(asset.offset) + asset.size), Buffer.from([0, 1, 2, 255]));
  assert.equal(start + Number(asset.offset) + asset.size, output.length);
});

test('安装、重复安装和卸载完整还原原程序', t => {
  const { directory, resources, archivePath, original } = fixture(t);
  install(directory);
  const installed = fs.readFileSync(archivePath);
  assert.notDeepEqual(installed, original);
  assert.deepEqual(fs.readFileSync(path.join(resources, 'typora-center-original.asar')), original);
  assert.equal(fs.readFileSync(path.join(resources, 'typora-center', 'renderer.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'renderer.js'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'typora-center', 'installation.json'), 'utf8'));
  assert.equal(manifest.originalHash, digest(original));
  assert.equal(manifest.installedHash, digest(installed));
  install(directory);
  assert.deepEqual(fs.readFileSync(archivePath), installed);
  install(directory, true);
  assert.deepEqual(fs.readFileSync(archivePath), original);
});

test('程序文件更新后拒绝覆盖还原', t => {
  const { directory, archivePath } = fixture(t);
  install(directory);
  fs.appendFileSync(archivePath, 'changed');
  const changed = fs.readFileSync(archivePath);
  assert.throws(() => install(directory, true), /已变化/);
  assert.deepEqual(fs.readFileSync(archivePath), changed);
});

test('备份损坏时拒绝卸载', t => {
  const { directory, resources, archivePath } = fixture(t);
  install(directory);
  const installed = fs.readFileSync(archivePath);
  fs.appendFileSync(path.join(resources, 'typora-center-original.asar'), 'changed');
  assert.throws(() => install(directory, true), /备份校验未通过/);
  assert.deepEqual(fs.readFileSync(archivePath), installed);
});

test('运行中的程序留下安装临时文件后可以重试', t => {
  const { directory, archivePath, original } = fixture(t);
  install(directory);
  const installed = fs.readFileSync(archivePath);
  fs.writeFileSync(archivePath, original);
  fs.writeFileSync(archivePath + '.center-tmp', installed);
  install(directory);
  assert.deepEqual(fs.readFileSync(archivePath), installed);
  assert.equal(fs.existsSync(archivePath + '.center-tmp'), false);
});

test('未指定安装目录时给出使用方法', () => {
  assert.throws(() => install(), /请指定 Typora 安装目录/);
});
