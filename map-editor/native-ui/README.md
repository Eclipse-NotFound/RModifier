# 原 Flash 地图界面候选模块

2026-09-28 0.4.0：Flash 内新增“场景与房间 · 我的房间池”，动态浏览 31 份已安装地图/662 间房间；管理独立副本、房间新建/复制/改名、按文档恢复草稿。用户点击发布时安装 MapPoolMod 0.1.0，在正常游戏随机地区混抽变化房间。详见 `../../design/2026-09-28-scene-library-and-room-pools.md`；最终包由总整合会话验收。

2026-09-28：原界面已在 RModifier 0.3.0 接入，0.3.1 改为自动完整适配窗口，文档操作集中在 Flash 内，并修复原材质按钮的 XMLList 编号传输。原 Editor.swf 和原增强组件不替换。历史 `map-editor/delivery-manifest.json` 不包含本组件；本次以本目录 delivery-manifest.json、component/manifest.json 和最终 package-report 为准。

## 入口与职责

`desktop/map/native-ui-module.cjs` 导出 `NativeMapModule`。原 MainEd/visualEditor 的界面、选择/绘制控件、PreviewPanel 与随机房审查入口保留；Node 负责完整 XML 原文、旁路节点身份、撤销、恢复和文件事务。候选源以当前含“随机房审查”的原 EditorTools 为基线，不修改 RandomRooms 自身代码。

```js
const map = new NativeMapModule();
await map.mount({
  gameRoot, componentRoot, dataRoot, sessionRoot, testRoot: null, epoch,
  surface, dialog, getWindow, onState, onError, onCloseRequested
});
```

- `componentRoot` 指向本目录的 `component/`，包含 `manifest.json`、5 个 SWF（含 MapPoolMod）和中/英/俄编辑器词典。
- `dataRoot` 位于 `gameRoot` 内，本项目使用 `gameRoot/mods/RModifier`。会话互相隔离；缓存按组件指纹分目录，启动核对全部组件。
- AIR 应用根是 `gameRoot`，候选 UI/Tools/NativeScene 以明确的 `app:/` 地址装入。普通 `file:` 地址会导致原面板访问舞台时报 #2070，不能将两者互换。
- 地图自动恢复在 `dataRoot/config/native-maps/recovery.json`，语言偏好在同目录 `preferences.json`；不访问旧 `EditorConf`。自动草稿约 600ms 合并一次；正常恢复/关闭会等待原生同步并核对落盘。
- 默认简体中文。仅当所选游戏具有对应游戏词典时提供英语/俄语切换；名词来自所选游戏的词典及原编辑器中文词典。

## 宿主接口

| 接口 | 回执与约束 |
|---|---|
| `state` / `onState(state)` | documentId、revision、contentHash、pendingInputHash、dirty、canSave、canUndo、canRedo、invalidInputs、composing、loaded、persistedRevision |
| `flush(reason)` | `ready / invalid / composing / offline` + state。包含属性框、房间名和文件名待输入，不用旧 mActive 判断 |
| `activate(visible)` | 隐藏前同步；composing/offline 不隐藏。AIR NativeWindow.visible 与宿主表面一起更新；切页不重启实例、不关闭原 PreviewPanel |
| `saveDraft({as?})` | `saved`（含 documentId/revision/contentHash/filename/receipt）、`cancelled`、`invalid/composing/offline/conflict`。等待文件框期间的新编辑保持 dirty；旧保存结果不产生当前状态的关闭凭据 |
| `recover()` | `recovered` + 精确状态 receipt，或 `composing/offline/failed`。允许保留非法 XML 原文与选择、预览位置及撤销历史 |
| `suspend(reason)` | 原生同步并锁输入，返回 FlushResult；只有 `locked:true` 才需要配对 resume。invalid 可锁并恢复草稿，composing/offline 不取得锁 |
| `resume()` | 锁计数归零才释放输入。宿主文件框/关闭提示与地图内部换文档共享计数 |
| `action('open'/'save'/'saveAs'/'undo'/'redo')` | 操作串行；打开文件框期间的新输入在最终切换前再次同步并归档；旧 documentId 的异步操作拒绝。Flash 内显示成功、取消和错误回执 |
| `setViewport({deviceScale,clientWidth})` | 返回自动适配的缩放、范围、uiScale 和舞台尺寸。旧 zoom/pan/fit 请求不恢复裁切视口；deviceScale=dpi/96，clientWidth 是 Win32 客户区物理宽 |
| `dispose(receipt?)` | 未保存文档需要匹配当前 documentId/revision/两个 hash 的保存或恢复凭据；干净文档及未加载分支不需要不存在的凭据。只结束本模块创建的 AIR |

`surface` 提供 `attach({sessionId,epoch,pid,startedAt,titleToken})`、`setVisible({sessionId,epoch,visible})`、`focus({sessionId,epoch})`、`detach({sessionId,epoch})`。attach 返回完成布局后的 `{dpi,client:{width,height},...}`；不启动或杀 AIR。过期会话不得复用旧窗口。

本机实测 AIR 舞台使用逻辑坐标：Win32 客户区 2534 像素对应 stageWidth 1267、DPI 192；不能仅因 DPI=192 再放大两倍。整个 1800×950 原舞台始终按 `min(stageWidth/1800,stageHeight/950)` 适配，没有额外 34 px 底栏，平移归零。窗口调整、恢复和旧草稿恢复都会重新适配。原预渲染自己的场景缩放与滚轮保留。画布指针通过 globalToLocal 转为原界面坐标。

原保存、载入按钮下方新增“另存 / 撤销 / 重做”；Ctrl+S、Ctrl+Z、Ctrl+Y 和 Ctrl+Shift+S 分别执行保存、撤销、重做、另存。成功消息短暂显示，错误保留到用户关闭。

## 原文保护与已实现操作

完整地图原文始终由 Node 持有；不消费原 encodeAll() 重建结果。对象/背景/房间的身份独立于 id、code、名称和坐标。缺 code 的旧对象不自动补号；重复对象不会混同；未知根字段、房间扩展、脚本、固定 doors 保留。

原文本框会将换行变为 CR，直接回写会改动 CRLF 脚本。本候选保存显示基线，只把实际变化片段映射回原文；BOM 只在传给 E4X 的投影中跳过。地形按格和图层修改，连续矩形合为一次事务；随机连接口只更新受到影响的槽。原“更新列表”仍复制房间。固定地图空位置仅在第一次真实绘制/新增对象时建立房间，单纯查看不会创建。PNG 导出由原面板编码，再交宿主选择路径并核对输出。

“切换层”和坐标小地图仅用于固定地图；随机房间集合点击这两处会提示用途，不改变房间或未提交输入。原按钮在随机模式读取未创建的 `mapArr`，曾触发 #1009 并阻断后续保存；候选在进入固定地图逻辑前拦住该路径，也避免先开固定图再开随机集合时复用旧坐标表。

## 构建与验证

- `map-editor/tools/build-native-ui.ps1`：准备候选补丁，FFDec 导入原 Editor 的 MainEd/Editor/LangsList，编译 Bootstrap 和当前增强组件。只写候选与 `build/out/map-native-ui-build`。
- `map-editor/tests/native-document.test.cjs`：10 组模型验证，含31图/662房间、未知数据、编码点号、显示换行和一次1200格绘制/撤销。
- `map-editor/tests/native-ui.cjs`：19 组真实候选 AIR 交互，包括输入、保存、等待对话框时的新编辑、恢复、矩形绘制、房间复制、DPI、原预览/PNG、重启恢复。
- `map-editor/tests/native-ui-preservation.cjs`：31份原图经真实界面开存逐字节核对；扩展夹具含BOM、CRLF、CDATA、同位置同内容重复物体、缺code、未知对象/根节点、固定doors和rrPlan；另验固定新房间首次绘制。
- `map-editor/tests/native-ui-controls.cjs`：5组原控件事件回归；无选择时点击切换层、后续保存、固定上下层切换、固定转随机后的旧坐标入口、原预渲染按钮打开后另存取消/成功。修复前最小点击已复现同一 #1009；合成鼠标事件覆盖原监听器，真实指针跨窗口与系统文件框另由宿主实屏验收。
- `map-editor/tests/native-ui-wall-paint.cjs`：9组，走真实素材按钮的监听器和原绘制流程，检查全部67种材质、前后层、矩形、撤销重做、保存重开和原预渲染；避免直接注入字符串绕过 XMLList 故障。
- `tests/native-host.cjs`：0.3.1 的11组宿主回归，检查无外层条、自动适配、切页、Flash文档按钮、错误回执与重启恢复。31图完整保存和5组旧控件报告属于0.3.0历史验证，本轮未重复执行。
- 宿主实际窗口、真实中文输入、Alt+F4、三页焦点和最终便携包由总整合方验证。独立测试 surface 不能替代这部分。

## 当前限制

原预渲染仍是静态场景。保留 rrPlan 不表示路线已重算；修改地图只保存工作副本。

未知材质格保留且不允许直接绘制；含注释、CDATA 或实体编码分隔符的复杂地形行拒绝修改，防止重排/折叠。未知对象可以原样保存，原 UI 不能编辑不认识的类型。重名/缺名房间无法可靠映射，拒绝启动原界面编辑。自闭合/短地形行的补全目前受限，优先复制完整房间起稿。

恢复只保证已接收并落盘的数据；断电/崩溃前尚未送达的按键、IME 未提交组合串不承诺零丢失。正常关闭须 await 同步；offline/composing 不自动丢弃或强杀。真实 IME 与最终宿主表现以宿主方实测为准。
