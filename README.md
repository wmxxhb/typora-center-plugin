# Typora Center Plugin

本分支为 **Typora 1.9.5 适配版**，插件版本 **1.0.1**。原先适配 Typora 1.13.4 的版本保留在 [main 分支](https://github.com/wmxxhb/typora-center-plugin/tree/main)。

- [下载 1.9.5 适配版插件安装包](https://github.com/wmxxhb/typora-center-plugin/raw/refs/heads/typora-1.9.5/dist/typora-center-plugin-1.0.1-typora-1.9.5.zip)
- [完整使用指南](docs/使用指南.md)
- [居中效果截图](docs/images/centering-preview.png)

安装包包含插件程序、安装/卸载脚本、源码和使用指南，需要 Node.js 18 或更高版本，不包含 Typora 本体。

## 功能

- Typora **1.9.5** 使用 **Ctrl + Alt + E** 或 **右键 → 居中 / 取消居中**；**1.13.4** 保留 **Ctrl + Shift + E** 和 **格式 → 居中**。
- 支持普通段落和一级至六级标题；选中多个段落可批量操作。
- 再次执行可取消居中，支持撤销和重做。
- 保留标题级别、大纲、粗体、链接等原有格式。
- 保存、重新打开文档后保留居中效果；本次已验证 HTML 导出，PDF 导出未单独实测。

## 使用指南

### 安装

适用于 Windows，已在本地 Typora **1.9.5** 实测。保留原版对 **1.13.4** 的支持。安装需要 **Node.js 18 或更高版本**，无须安装其他依赖。

1.9.5 会校验原生启动入口，因此此版本通过 `window.html` 加载插件，保持 `app.asar` 和 `main.node` 原样。它不向顶部“格式”菜单添加项目，使用右键菜单和快捷键操作。

1.9.5 的 **Ctrl + Shift + E** 已被“使用上一次设置导出”占用，适配版改用 **Ctrl + Alt + E**，避免覆盖原有导出快捷键。

1. 下载仓库代码并解压。
2. 保存文档并完全退出 Typora。
3. 在插件目录打开终端，执行以下命令，将路径替换为实际的 Typora 安装目录：

   ```powershell
   node install.cjs "C:\Program Files\Typora"
   ```

4. 重新打开 Typora。1.9.5 使用 **右键 → 居中 / 取消居中**，或按 **Ctrl + Alt + E**；1.13.4 使用 **格式 → 居中**。

如果 Typora 安装在需要管理员权限的目录，请以管理员身份打开终端后运行安装命令。

### 居中与取消居中

- **当前段落或标题**：将光标放入其中，按对应版本的居中快捷键，或通过菜单操作。
- **多个段落或标题**：选中需要处理的内容，再执行居中。
- **取消居中**：在已居中的内容中再次执行该操作。多段内容全部居中时，批量操作会一起取消居中。
- **撤销或重做**：使用 **Ctrl + Z** 或 **Ctrl + Y**。

居中按整段生效，请在普通编辑模式使用。表格、代码块和公式块不适用。文档源码会添加 HTML 样式标签，编辑界面自动隐藏这些标签；其他编辑器的显示效果取决于其 HTML 支持。

### 更新插件

保存文档并退出 Typora，下载新版插件后重新运行安装命令。Typora 更新后若居中功能消失，也可重新安装插件。

### 卸载

保存文档并退出 Typora，在插件目录执行：

```powershell
node install.cjs "C:\Program Files\Typora" --uninstall
```

重新打开 Typora 后生效。卸载会使用安装时的备份还原程序入口或页面，文档内容保持不变。若程序或页面在安装后发生变化，卸载会停止，避免覆盖 Typora 更新。

1.9.5 的页面备份位于 `resources/typora-center-original-window.html`，安装记录位于 `resources/typora-center/installation.json`。
