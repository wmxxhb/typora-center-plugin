'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { patchLauncher } = require('./archive.cjs');
const marker = 'TYPORA_CENTER_BOOTSTRAP_V1';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function replaceArchive(archivePath, data) {
  const temporary = archivePath + '.center-tmp';
  if (fs.existsSync(temporary)) {
    if (hash(fs.readFileSync(temporary)) !== hash(data)) throw new Error('发现不同内容的临时文件，请先检查 app.asar.center-tmp。');
  } else fs.writeFileSync(temporary, data, { flag:'wx' });
  try { fs.renameSync(temporary, archivePath); }
  catch (error) {
    if (error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'EACCES') {
      throw new Error('Typora 正在占用程序文件。请保存文档、完全退出 Typora 后再运行安装程序；原程序尚未被替换。');
    }
    throw error;
  }
}

function install(directory, uninstall = false) {
  if (!directory) throw new Error('请指定 Typora 安装目录，例如：node install.cjs "C:\\Program Files\\Typora"');
  const resources = path.join(path.resolve(directory), 'resources');
  const archivePath = path.join(resources, 'app.asar');
  const backupPath = path.join(resources, 'typora-center-original.asar');
  const plugin = path.join(resources, 'typora-center');
  const manifestPath = path.join(plugin, 'installation.json');
  if (!fs.existsSync(archivePath)) throw new Error('找不到 Typora/resources/app.asar，请检查安装路径。');
  const current = fs.readFileSync(archivePath);
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;

  if (uninstall) {
    if (!manifest) throw new Error('未找到此插件的安装记录。');
    if (hash(current) === manifest.originalHash) return console.log('插件已经停用。');
    if (hash(current) !== manifest.installedHash) throw new Error('Typora 程序文件在安装后已变化，已停止还原以免覆盖更新。');
    const original = fs.readFileSync(backupPath);
    if (hash(original) !== manifest.originalHash) throw new Error('备份校验未通过，已停止还原。');
    replaceArchive(archivePath, original);
    console.log('已停用居中插件并还原原程序。下次启动 Typora 生效，文档不受影响。');
    return;
  }

  const alreadyInstalled = manifest && hash(current) === manifest.installedHash;
  const original = alreadyInstalled ? fs.readFileSync(backupPath) : current;
  if (alreadyInstalled && hash(original) !== manifest.originalHash) throw new Error('原程序备份校验未通过。');
  if (!alreadyInstalled && current.includes(Buffer.from(marker))) throw new Error('存在未登记的居中插件安装，请先检查备份。');
  if (!alreadyInstalled && fs.existsSync(backupPath) && hash(fs.readFileSync(backupPath)) !== hash(original)) {
    // Preserve older backups after a Typora update; never overwrite an unknown backup.
    fs.copyFileSync(backupPath, backupPath + '.' + Date.now() + '.bak', fs.constants.COPYFILE_EXCL);
  }
  fs.mkdirSync(plugin, { recursive: true });
  for (const file of ['main.cjs', 'renderer.js']) fs.copyFileSync(path.join(__dirname, file), path.join(plugin, file));
  if (alreadyInstalled) return console.log('已更新居中插件。保存文档后重新启动 Typora 生效。');

  const bootstrap = `/* ${marker} */\n'use strict';\nconst path = require('path');\nconst original = path.join(process.resourcesPath, 'typora-center-original.asar');\nrequire('./../typora-center/main.cjs');\nrequire('electron').app.setAppPath(original);\nrequire(path.join(original, 'launch.dist.js'));\n`;
  const patched = patchLauncher(original, () => bootstrap);
  fs.writeFileSync(backupPath, original);
  fs.writeFileSync(manifestPath, JSON.stringify({ version:'1.0.0', installedAt:new Date().toISOString(), originalHash:hash(original), installedHash:hash(patched) }, null, 2));
  // Prepare the complete replacement before replacing the entry point.
  replaceArchive(archivePath, patched);
  console.log('已安装“格式 → 居中”。快捷键 Ctrl+Shift+E。保存文档后重新启动 Typora 生效。');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  try { install(args.find(arg => !arg.startsWith('--')), args.includes('--uninstall')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { install };
