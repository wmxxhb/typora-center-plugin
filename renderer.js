/* Typora Center 1.0.0 — persistent paragraph/heading alignment. */
(function () {
  'use strict';
  if (window.TyporaCenter) return;
  const OPEN = '<span data-typora-center="1" class="typora-center" style="display:block;text-align:center;">';
  const CLOSE = '</span>';
  const BLOCKS = 'p[cid],h1[cid],h2[cid],h3[cid],h4[cid],h5[cid],h6[cid]';
  let bookmark = null;
  let busy = false;

  const style = document.createElement('style');
  style.textContent = '#write [data-typora-center-block] { text-align:center !important; }\n' +
    '#write [data-typora-center-block] > .md-html-inline > .md-meta { display:none !important; }';
  document.head.appendChild(style);

  function decorate() {
    const write = document.querySelector('#write');
    if (!write) return;
    for (const el of write.querySelectorAll(BLOCKS)) {
      const before = el.querySelector(':scope > .md-html-inline > .md-before');
      const active = before && before.textContent === OPEN;
      if (active && !el.hasAttribute('data-typora-center-block')) el.setAttribute('data-typora-center-block', '1');
      if (!active && el.hasAttribute('data-typora-center-block')) el.removeAttribute('data-typora-center-block');
    }
  }
  new MutationObserver(decorate).observe(document.body, { subtree:true, childList:true, characterData:true });
  decorate();

  function hookExport() {
    const exporter = window.File && File.editor && File.editor.export;
    if (!exporter || typeof exporter.exportCollection !== 'function') return false;
    const original = exporter.exportCollection;
    exporter.exportCollection = function() {
      const html = original.apply(this, arguments);
      if (typeof html !== 'string' || !html.includes('typora-center')) return html;
      const template = document.createElement('template');
      template.innerHTML = html;
      for (const marker of template.content.querySelectorAll('span[data-typora-center="1"],span.typora-center')) {
        const block = marker.closest('p,h1,h2,h3,h4,h5,h6');
        if (block) block.style.textAlign = 'center';
      }
      return template.innerHTML;
    };
    return true;
  }
  if (!hookExport()) {
    const timer = setInterval(() => { if (hookExport()) clearInterval(timer); }, 250);
    setTimeout(() => clearInterval(timer), 30000);
  }

  function remember() {
    const sel = window.getSelection();
    const write = document.querySelector('#write');
    if (sel && sel.rangeCount && write && write.contains(sel.anchorNode) && write.contains(sel.focusNode)) {
      bookmark = sel.getRangeAt(0).cloneRange();
    }
  }
  document.addEventListener('selectionchange', remember);

  function notice(message) {
    const helper = window.File && File.editor && File.editor.EditHelper;
    if (helper && helper.showNotification) helper.showNotification(message);
    else console.warn('[Typora Center]', message);
  }

  function centered(text) { return text.startsWith(OPEN) && text.endsWith(CLOSE); }
  function unwrap(text) { return centered(text) ? text.slice(OPEN.length, -CLOSE.length) : text; }

  function blocksForRange(range, write) {
    return [...write.querySelectorAll(BLOCKS)].filter(el => {
      if (el.closest('.md-rawblock,table,pre') || el.getAttribute('contenteditable') === 'false') return false;
      if (range.collapsed) return el.contains(range.startContainer);
      const candidate = document.createRange();
      candidate.selectNodeContents(el);
      // Exclude an adjacent paragraph when the selection ends at its start.
      return range.compareBoundaryPoints(Range.END_TO_START, candidate) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, candidate) > 0;
    });
  }

  async function toggle() {
    const file = window.File;
    const editor = file && file.editor;
    if (busy || !editor) return;
    if (file.isLocked || file.bundle.unsupported) return notice('当前文档不可编辑。');
    if (editor.sourceView.inSourceMode) return notice('请先退出源代码模式，再使用“居中”。');
    const write = document.querySelector('#write');
    remember();
    const range = bookmark;
    if (!range || !range.startContainer.isConnected || !write.contains(range.startContainer) || !write.contains(range.endContainer)) {
      return notice('请将光标放在正文或标题中，或选中需要居中的段落。');
    }
    const targets = blocksForRange(range, write);
    if (!targets.length) return notice('请将光标放在正文或标题中。');
    busy = true;
    try {
      editor.undo.endSnap(true);
      const ids = targets.map(el => el.getAttribute('cid'));
      const selection = editor.selection.buildUndo();
      await editor.store();
      const nodes = ids.map(id => editor.getNode(id)).filter(node => node && !node.get('children').length);
      if (!nodes.length) return notice('当前内容不支持段落居中。');
      const remove = nodes.every(node => centered(node.get('text') || ''));
      const manager = editor.undo.UndoManager;
      const command = manager.makeEmptyCommand(selection);
      for (const node of nodes) {
        const before = node.get('text') || '';
        const after = remove ? unwrap(before) : OPEN + unwrap(before) + CLOSE;
        if (before === after) continue;
        command.undo.push(manager.buildReplaceUndo(node));
        node.set('text', after);
        editor.findElemById(node.cid).replaceWith(node.toHTML());
        command.redo.push(manager.buildReplaceUndo(node));
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const cursor = { type: 'cursor', id: first.cid, start: remove ? 0 : OPEN.length };
      command.redo.push(cursor);
      editor.undo.register(command);
      editor.refresh();
      editor.undo.exeCommand(cursor);
      // Selection bookmarks referencing replaced DOM must never affect another document.
      bookmark = null;
      remember();
      return { centered: !remove, count: nodes.length, first: first.cid, last: last.cid };
    } catch (error) {
      console.error('[Typora Center]', error);
      notice('居中操作未完成，请先撤销并检查文档。');
      throw error;
    } finally { busy = false; }
  }

  window.TyporaCenter = { version: '1.0.0', toggle, centered, unwrap };
})();
