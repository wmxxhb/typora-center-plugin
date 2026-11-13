/* Typora 1.9.5: keep the native app entry untouched. */
(function () {
  'use strict';
  if (window.TyporaCenterLegacy) return;
  window.TyporaCenterLegacy = true;
  function toggle() {
    if (window.TyporaCenter) window.TyporaCenter.toggle().catch(error => console.error('[Typora Center]', error));
  }
  window.addEventListener('keydown', event => {
    if (event.ctrlKey && event.altKey && !event.shiftKey && (event.code === 'KeyE' || event.key?.toLowerCase() === 'e')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    }
  }, true);
  const menu = document.querySelector('#context-menu');
  if (menu) {
    const item = document.createElement('li');
    item.id = 'typora-center-context-item';
    item.innerHTML = '<a role="menuitem"><span>居中 / 取消居中</span><span style="float:right;margin-left:24px;opacity:.65">Ctrl+Alt+E</span></a>';
    item.addEventListener('mousedown', event => event.preventDefault());
    item.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.File?.editor?.contextMenu) File.editor.contextMenu.hide();
      toggle();
    });
    menu.appendChild(item);
  }
})();
