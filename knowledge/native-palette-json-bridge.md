---
domain: ui-systems
type: facts
game-version:
  - "1.02"
confidence: high
verified: true
discovered-by: RModifier
evidence:
  - kind: decompiled-game-code
    game-version: "1.02"
    symbol: "Editor.addMaterial / frontClick / drawTile"
  - kind: runtime-experiment
    summary: "隔离 AIR 真实材质按钮复现回滚，String 转换后 67 种材质及保存/原预览通过"
date-updated: 2026-09-28
---

# 原材质按钮的 XMLList 编号必须在 JSON 边界转为字符串

用户在 RModifier 0.3.0 的原 Flash 地图页选择“深色墙面”后，绘制完全没有变化。故障位于 RModifier 的原生界面桥接，不是素材缺失或背景墙不能独立绘制。

原 Editor.addMaterial 把 `param2.@id` 直接放入素材按钮的 `edTile.ids`；其运行时类型是 E4X XMLList。原 `frontClick → mdown → mmove → mup → drawTile` 保持这个值。整合适配器 RMPaint 将它直接传给 JSON 后，后台实际收到 `layers:{"2":"XMLList"}`，应有的材质编号是 `P`。NativeDocument 正确拒绝未知素材，整次绘制回滚，画布重新显示原内容。

修复只在 RMPaint 序列化边界使用 `String(tile.ids[i])`，不放宽素材检查，也不改变地图格式。空字符串擦除、原前景/背景/细节图层继续按原语义处理。

共享知识已有相同序列化陷阱的另一项实证：`shared-knowledge/entities/facts/unit-vulnerability-serialization.md` 记录抗性 XMLList 经 JSON 变成同名字面串。该条目要求数值边界显式 Number；本处是材质符号，必须使用 String。本报告保留在 RModifier，因为故障路径、修复和回归属于本编辑器的桥接实现。初次两层检索覆盖不完整且关键词未直接命中此本地条目，不能据此称为“没有既有经验”。

## 回归覆盖与原测试的缺口

旧 `RMTest(kind:"paint")` 直接注入 JavaScript 字符串，因此可以画出深色墙面，却绕过真实按钮的 XMLList 类型。新增 `palettePaint` 寻找原面板的 edTile，派发它原有的点击监听器，再走原画布按下、拖动、松开方法；`assertTile` 同时检查同步后的 Flash 格子编码与素材帧。测试入口仅在隔离 testRoot 启用。

`node map-editor/tests/native-ui-wall-paint.cjs` 覆盖 9 组：真实按钮深色墙面、撤销重做、前后层相互保留及擦除、全部 67 种原素材、矩形一次撤销、保存、重开、原预渲染与 PNG、所有提交编号和错误检查。素材共前景 20、背景 26、梯子 2、梁/台阶 18、水 1。

## 证据

- `knowledge/evidence-native-wall-2026-09-28/red-report.json`：原按钮绘制后 `_` 不等于预期 `_P`。
- 同目录 `red-commit.json`：实际提交中的 `"XMLList"`；对应测试会话第 2 份确认回执为“未知图层素材”。
- `private-green-report.json`：只重编译修复后的 Editor 测试副本，9 组通过。
- `editor.png`、`wall-preview.png`：原画布和原预渲染实际导出，已目视确认深色墙面及各类素材显示。
- 私有绿例：`build/out/map-native-wall-paint/a0fa6035-9fbe-4424-8a43-1f0cf1799167/`。

测试使用独立 AIR 应用身份、地图和配置，只结束自己创建的进程。未操作用户当前编辑器或正式游戏。真实 Windows 指针事件不是这份自动用例的覆盖范围；用例明确覆盖原按钮监听器和绘制方法，不能把直接指定字符串当成同等验证。

## 统一组件复核

地图会话合并自动适配和 Flash 内文档按钮后，对公共 `map-editor/native-ui/component` 重新执行同一 9 组，全部通过。记录位于 `knowledge/evidence-native-wall-2026-09-28/public-green-report.json`，实际会话为 `build/out/map-native-wall-paint/7cc6edd4-1fec-4804-ae4d-2593afdf8ca4/`。公共组件的画布/预渲染分别保存为 `public-editor.png` 和 `public-wall-preview.png`。

测试前后组件 manifest 指纹一致：`cdc60c355caef2f0bd4d9200b10948f2932335edc00824b80691d557b80dcf30`；副本为同证据目录 `public-component-manifest.json`。实际 Editor.swf 指纹：`c0186beb5690dde70b5c12bd9f88d9c72a837ce689a29ed49f163c5ba1c24b4a`。

地图会话随后微调新按钮高度以避开房间名输入框，并生成最终组件。该版本也重新通过全部 9 组：`build/out/map-native-wall-paint/f6ca4ce9-9b38-42c7-88f9-3b82c7da677d/report.json`，长期副本 `final-green-report.json`。最终 manifest 副本为 `final-component-manifest.json`，测试前后指纹均为 `06bf354b5dd13f617f21b4c00e5235955e3b8c91deac57b59cb646388b0da0cc`；Editor.swf 仍为上述同一指纹。

最终安装包仍由总整合会话核对实际打入组件后交付；公共组件验证本身不宣称用户当前打开的旧进程已经更新。
