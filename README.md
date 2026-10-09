# Publisher Export

一个桌面版 Obsidian 插件，用于把包含 Excalidraw Frame 的笔记导出到微信公众号和 Jekyll。

支持的 Excalidraw 嵌入格式：

```md
![[设备接入.excalidraw]]
![[设备接入.excalidraw|80%]]
![[设备接入.excalidraw#^frame=协议]]
![[设备接入.excalidraw#^frame=协议|50%]]
```

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

把 `manifest.json`、`main.js` 复制到 Vault 的
`.obsidian/plugins/publisher-export/`，然后在 Obsidian 中启用插件。

Frame 渲染依赖已安装并启用的 Obsidian Excalidraw 插件。

在插件设置中点击“选择文件夹”，可以把 Jekyll 文章和资源直接导出到电脑上的任意 Jekyll 项目目录。
