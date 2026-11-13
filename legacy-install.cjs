'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const marker = 'TYPORA_CENTER_PAGE_V1';

function installPage(resources, uninstall) {
  const target = path.join(resources, 'window.html');
  const backup = path.join(resources, 'typora-center-original-window.html');
  const plugin = path.join(resources, 'typora-center');
  const manifestPath = path.join(plugin, 'installation.json');
  const current = fs.readFileSync(target);
  const record = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  const manifest = record?.mode === 'window-html' ? record : null;
  if (uninstall) {
    if (!manifest) throw new Error('未找到页面插件的安装记录。');
    if (hash(current) === manifest.originalHash) return console.log('插件已经停用。');
    if (hash(current) !== manifest.installedHash) throw new Error('Typora 页面在安装后已变化，已停止还原以免覆盖更新。');
    const original = fs.readFileSync(backup);
    if (hash(original) !== manifest.originalHash) throw new Error('备份校验未通过，已停止还原。');
    fs.writeFileSync(target, original);
    return console.log('已停用居中插件并还原原页面，文档不受影响。');
  }
  const installed = manifest && hash(current) === manifest.installedHash;
  if (!installed && current.includes(Buffer.from(marker))) throw new Error('存在未登记的页面插件，请先检查备份。');
  const original = installed ? fs.readFileSync(backup) : current;
  if (installed && hash(original) !== manifest.originalHash) throw new Error('原页面备份校验未通过。');
  const html = original.toString('utf8');
  if (!/<\/body\s*>/i.test(html)) throw new Error('找不到 Typora 页面结束标签。');
  const scripts = `<!-- ${marker} --><script src="./typora-center/renderer.js" defer></script><script src="./typora-center/legacy.js" defer></script>`;
  const patched = Buffer.from(html.replace(/<\/body\s*>/i, scripts + '$&'));
  if (!installed && fs.existsSync(backup) && hash(fs.readFileSync(backup)) !== hash(original)) {
    fs.copyFileSync(backup, backup + '.' + Date.now() + '.bak', fs.constants.COPYFILE_EXCL);
  }
  fs.mkdirSync(plugin, { recursive: true });
  for (const file of ['renderer.js', 'legacy.js']) fs.copyFileSync(path.join(__dirname, file), path.join(plugin, file));
  if (installed) return console.log('已更新 1.9.5 居中插件，重新启动 Typora 生效。');
  fs.writeFileSync(backup, original);
  fs.writeFileSync(manifestPath, JSON.stringify({ version: '1.0.1', mode: 'window-html', installedAt: new Date().toISOString(), originalHash: hash(original), installedHash: hash(patched) }, null, 2));
  fs.writeFileSync(target, patched);
  console.log('已安装 1.9.5 居中插件：Ctrl+Alt+E，或右键 → 居中 / 取消居中。');
}

module.exports = { installPage };
