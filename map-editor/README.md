# RModifier 地图编辑模块

地图现在作为 RModifier 同一主窗口中的常驻页面运行。切换到掉落或台词页不会丢失地图、选择和撤销历史。旧 AIR 地图编辑器仍保留；新页面使用自己的文件模型和隐藏原生绘图进程。

## 使用

1. 打开“地图编辑”，选择现有地图，或新建“随机房间集合 / 固定地图”。左侧是整份 XML 内的房间。
2. 选择操作、编辑层和素材。地形可绘制实体、后墙、表面、细节、水五层，可选整格、3/4、半格、1/4 高度。物体可放置、选择、拖动、擦除；右侧可修改属性。撤销重做支持按钮与 Ctrl+Z / Ctrl+Y。
3. 在右侧调整房间名称、位置和楼层；折叠项中可编辑原有物体脚本、房间原文和地区参数。复制房间保留其内容；删除后可撤销。
4. 点“查看游戏画面”。默认识别地区，也可以指定地区、镜像、物体、固定角色、随机点示例与强度（−1 自动）。点“编辑画布”继续改图。按空格或中键拖动，使用缩放查看细节。
5. 点“保存地图 / 另存一份”保存**整份地图**。正式 `Rooms` 原图会要求另存工作副本。Ctrl+S 等同保存。关闭时可由主窗口逐项保存或保留恢复草稿。
6. “导出 PNG”输出当前房间的原生图，1920×1000 像素。导出的图片不带编辑用的中文标签和选择框。换房间、改地图或改预览参数后，要先重新生成才能导出。

中文名优先采用游戏 `text_zh.xml`，游戏没有显示名称的编辑器条目延用此前的编辑器汉化。技术编号与已有房间名保留原文，因为它们可能被脚本引用。显示名称不改写 XML 中的 id、code 等识别信息。

透明标签使用亮暗自适应文字和细描边，不铺底色；附近标签会错开放置并以引线指向物体。密集区域容纳不下的标签在右侧完整物体列表中查看。

## 预览范围

编辑画布使用简化方格和物体标记；点击“查看游戏画面”检查原生效果。画面使用 Remains 1.02 的原生素材与 `LandAct → Land → Location → Grafon.drawLoc` 绘制，保留当前实体预览实现，包括敌人、NPC、炮塔和地雷。随机点显示示例。预览为静态设计检查，不运行 AI、物理推进、剧情、刷怪或玩家存档；探索迷雾关闭。最终游玩时的随机组合、动画、光效时序及脚本结果需在游戏里验收。

保存工作副本不会自动应用地图到游戏。未知节点、属性、脚本和未修改房间保持原文；修改某行地形会重写该行的格子串。地形绘制同步随机房间的 22 个连接口，固定地图不重算连接口。

## 开发与接入

- 宿主接口：[interface.md](../desktop/map/interface.md)。主进程唯一服务入口为 `desktop/map/workspace.cjs`。
- 页面：`desktop/ui/map/`；文件模型：`desktop/map/document.js` + `xml.js`；标签：`labels.js`。
- 绘图：`desktop/map/native-session.cjs` → `native/SceneHost.as`。每次工作会话独立 AIR app id、目录和进程，只有 ready 回执才算启动成功；请求绑定文档指纹与修订号。
- 运行包只需 `component/SceneHost.swf`、`component/NativeScene.swf`。游戏纹理、角色素材和汉化读取显式 gameRoot；不能依赖 Electron portable 解包目录的位置推断游戏。
- 构建：`map-editor/tools/build.ps1 -Java <java.exe> -Sdk <Flex SDK>`。参数默认值适用于当前机器，构建配置在 `build/out/map-build/`；源码与产物指纹在 `build-manifest.json`。
- 词表生成：`python map-editor/tools/generate_catalog.py --game-root <Remains目录>`，使用 `localization/` 冻结中文文本；新游戏版本需先明确更新这些基线。最终为 67 种地形素材、376 项物体/背景定义，隐藏定义不进入放置列表。
- `NativeScene.swf` 是保留原始素材的已验证绘图库，不能用 FFDec 整体导出后重编译替代。它与上轮原生预览的组件指纹相同。

测试命令（项目目录内）：

```text
node --test map-editor/tests/document.test.cjs map-editor/tests/workspace.test.cjs
node map-editor/tests/native.cjs
node map-editor/tests/ui.cjs
```

测试均输出到 `build/out/` 的独立目录，游戏素材只读。Electron 界面测试需要正常桌面进程权限；本机受限沙箱会导致渲染进程启动失败，出现 `ERR_FAILED`，不能将它误判为页面功能失败。退出只处置测试自己创建的进程。

## 接续状态

2026-09-28：用户明确分工为地图方负责本模块，总整合方负责 RModifier 宿主、目录迁移、安装与打包，并允许直接协调。地图交付记录见 [integration-report-2026-09-28.md](integration-report-2026-09-28.md)。不要再次接入已归档的 `renderer.cjs / RenderHost.as / document.mjs` 替代草稿。
