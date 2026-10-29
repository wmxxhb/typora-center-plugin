'use strict';

// Loaded before Typora's launcher. No dependency on a third-party plugin system.
const { app, Menu, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const ID = 'typora-center-toggle';
const rendererSource = fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8');
const isEditor = wc => !wc.isDestroyed() && /[/\\]window\.html(?:[?#]|$)/i.test(wc.getURL());

function inject(wc) {
  if (isEditor(wc)) return wc.executeJavaScript(rendererSource).catch(err => console.warn('[Typora Center]', err.message));
}

function toggle(_item, targetWindow) {
  const win = targetWindow || BrowserWindow.getFocusedWindow();
  if (!win || !isEditor(win.webContents)) return;
  return win.webContents.executeJavaScript(`${rendererSource}\n;window.TyporaCenter && window.TyporaCenter.toggle();`)
    .catch(err => console.warn('[Typora Center]', err.message));
}

function findFormat(template) {
  return template.find(item => /^(?:format|格式)(?:\([a-z]\))?$/i.test(String(item.label || item.id || '').replace(/[&…\s\u200b-\u200d\ufeff]/g, '')));
}

const originalBuild = Menu.buildFromTemplate;
Menu.buildFromTemplate = function(template) {
  const format = findFormat(template);
  if (format && Array.isArray(format.submenu) && !format.submenu.some(item => item.id === ID)) {
    format.submenu.push({ type: 'separator' }, {
      id: ID,
      label: '居中',
      accelerator: 'CmdOrCtrl+Shift+E',
      click: toggle,
    });
  }
  return originalBuild.call(this, template);
};

app.on('web-contents-created', (_event, wc) => {
  wc.on('did-finish-load', () => inject(wc));
});

// Also support loading this module after the initial menu was constructed.
app.whenReady().then(() => {
  const menu = Menu.getApplicationMenu();
  const format = menu && findFormat(menu.items);
  if (format && format.submenu && !format.submenu.getMenuItemById(ID)) {
    const { MenuItem } = require('electron');
    format.submenu.append(new MenuItem({ type: 'separator' }));
    format.submenu.append(new MenuItem({ id: ID, label: '居中', accelerator: 'CmdOrCtrl+Shift+E', click: toggle }));
    Menu.setApplicationMenu(menu);
  }
  for (const win of BrowserWindow.getAllWindows()) inject(win.webContents);
});
