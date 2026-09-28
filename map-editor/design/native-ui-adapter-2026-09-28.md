# 原 Flash 地图界面的最小接入方案

状态：初始设计已形成候选实现，实际接口与验证见 `../native-ui/README.md`。以下保留最初设计及限制说明；原 Editor、RModifier 0.2.0 发行包和历史冻结清单未修改。主窗口承载原生界面的试验由总整合方在 `build/out/native-ui-embed-probe` 进行；同窗口三页约束保留，不能把独立窗口或网页仿样式算作完成。

## 1. 决定与职责

采用 **原界面 + 完整原文保存 + 明确编辑操作合并**。原 Flash 负责现有控件、绘制操作、选择和预渲染；Node 侧保管完整地图原文、修改历史、保存及恢复。原 `encodeAll()` 的输出不得成为持久化真源，也不采用“先丢字段再补回”的保存方式。

这是一个 NativeMap Module：宿主跨越同一个 Interface 完成切页、查询未保存状态、保存、恢复和关闭。AS3 Adapter 放在原 `Editor` 的编辑操作与现有文件存储之间这一 Seam。Win32 窗口承载由宿主方提供，XML 合并、原生会话和草稿语义集中在地图方的 Implementation 中，避免各页面重复理解旧编辑器。

| 责任 | 所有者 |
|---|---|
| 原 UI 的 AS3 适配、完整原文合并、身份映射、dirty/草稿/预览桥 | 地图方，候选文件仅在 `map-editor/`、`desktop/map/` 内 |
| 原生窗口嵌入、可见性/焦点/尺寸、宿主关闭流程、单文件打包 | 总整合方 |
| 跨三页验收与用户取舍协调 | 发起会话 |
| RandomRoomsEditor 的自身代码与路径协议 | 其维护方；本方案不授权覆盖它 |

## 2. 已核对的旧行为及必须拦截之处

源码位置相对于游戏根目录。

| 已观察行为 | 证据 | 适配要求 |
|---|---|---|
| `MainEd.ed` 为 internal，构造时立即创建 Editor；Editor 构造中自动读上次文件 | `Editor/Localization/display-patch/original/scripts/MainEd.as`；`Editor/Enhancements/readback/scripts/Editor.as:163` | 候选 MainEd 延迟初始化，先接收配置再创建 Editor；托管模式不自动加载旧文件 |
| `encodeAll()` 新建 `<all>`，只加入 land 和房间；`encode()` 重建当前房间、排序对象 | 同文件 `:815`、`:849` | 绕过旧保存序列，不把这些归一化结果当用户改动 |
| `decodeAll()` 以房间 name 为字典键；`decode()` 只读已知节点 | `:1000`、`:1059` | 加载前检查重名/缺名；未识别内容保留在原文，不因未显示而删除 |
| `addObj()` 会给导入的无 code 对象补 code，且跳过未知对象或范围外坐标 | `:1750` 起 | 托管导入时抑制补 code；已有对象的身份使用旁路键，不使用 id/code |
| `mActive` 在选择、取样、打开房间属性时也置真 | `:1411`、`:1680` | 不能把 mActive 当 dirty；dirty 来自真实文档差异或待提交输入 |
| `showSelect()` 用 E4X 重新打印属性，`updSelObj()` 整段替换 XML | `:2054`、`:2073` | 属性框从保留的原文取值；记录用户实际输入，不用自动打印结果覆盖原文 |
| `saveClick()` 直接 FileReference.save，没有完整成功/取消回执；部分调用忽略属性校验失败 | `:578` | 原保存按钮转交 Node 文件对话框/保存事务；无有效回执不能关闭或清 dirty |
| `ToolsSnapshot()` 只给当前房间，内部调用 encode | `Editor/Enhancements/src/EditorBridge.as.inc` | 托管模式改为读取已合并的当前房间缓存；必须先完成输入同步 |

本轮只读扫描 31 份正式地图、662 房间：未发现重名/缺名房间，也未发现超出原 `addObj` 坐标/已知定义范围的对象。此结果只证明这几项静态前提，不是原 UI 无损往返或嵌入实测。

## 3. 完整地图与操作合并

### 3.1 两份数据的职责

- `canonicalRaw`：Node 持有完整 UTF-8 XML 字符串，含 BOM、换行、注释、未知根属性/节点、完整房间及脚本；首次载入就是源文件原文。未编辑再保存必须字节一致。
- `nativeProjection`：给原 UI 读取的副本，可以只呈现它支持的内容。投影排序、默认值、显示用格式和载入副作用不回写 canonicalRaw。
- `nodeKeys`：地图方维护的旁路身份表。房间、对象、背景、options 使用不写入 XML 的稳定键；不是游戏 id/code/name。重名对象、相同坐标和重复 code 不混同。
- `draftInputs`：尚未提交的属性/房间名/文件名等输入，按字段键记录原始字符串、选中对象、基准修订与校验错误。不是合法 XML 也必须留存。

重载恢复时同时恢复 canonicalRaw、身份表及校验指纹；只有完整原文指纹和节点定位都匹配才重新绑定。不用启发式 id/坐标匹配去猜丢失的身份。加载和程序性回填处于 `hydrating` 模式，不产生编辑事件。

### 3.2 AS3 发送语义操作，不发送“完整导出后整体替换”

| 操作 | 合并规则 |
|---|---|
| 修改地形层/高度 | 提交坐标和实际改动层，只修补对应格子的对应部分；其余格子、后层和未知原文保留。不能用原 UI 重新编码整房替代 |
| 新增对象/背景 | 新旁路键；按原工具生成新对象必要字段。导入旧对象不新增/重写 code |
| 移动或调整已知属性 | 按对象键修补指定属性，其余属性、子节点、脚本、排列不变 |
| 属性框“检查/提交” | 原始字段内容先校验，再对该明确选中的节点应用用户文本。字段没改则不替换节点；用户明确删除的内容才删除。禁止更换 obj/back/options 节点种类 |
| 擦除对象/背景 | 仅提交本次明确命中的对象键；不能把投影中看不到的节点当作删除 |
| 复制/新增/删除房间 | 显式记录操作与源房间键；复制从完整原文克隆，分配新旁路键。删除移除完整目标房间，其余房间字节不变 |
| 房间坐标/已存在属性变化 | 修补指定属性，未知房间属性不删除；固定地图原 doors 保留 |
| 随机房间连接口 | 仅地形改动涉及连接口时按原 22 槽规则更新受影响值；保持节点其余属性。连接串无法理解时阻止该处地形提交并报错，不能截断/默补 |

原随机房间 UI 中“输入新名字→更新列表”具有复制房间语义，不能静默改成删除旧房间的重命名。点击固定地图空位置本身不应立即写新房间；实际编辑后才创建。复制整房沿用原工具的游戏字段；不会把旁路键写成 code。

用于传输的内部事务示例（不是宿主日常调用面）：

```ts
type EditBatch = {
  protocol: 1;
  sessionId: string;
  epoch: string;             // 每次切换游戏位置/重新挂载都会改变
  documentId: string;
  transactionId: string;     // 重发幂等
  sequence: number;          // 按顺序处理，不可覆盖上一条请求
  expectedRevision: number;
  operations: EditOperation[];
  inputs: DraftInput[];      // 可包含非法 XML；与合法文档修改分别记录
  view: NativeViewState;
};
type EditOperation =
  | {kind: 'paint'; roomKey: string; cells: CellLayerChange[]}
  | {kind: 'setAttributes'; nodeKey: string; values: Record<string,string|null>}
  | {kind: 'replaceInput'; nodeKey: string; draftId: string; raw: string}
  | {kind: 'insertObject'; roomKey: string; key: string; raw: string}
  | {kind: 'removeNode'; nodeKey: string}
  | {kind: 'createRoom'; key: string; name: string; copyOf?: string; coordinates?: object};
```

操作按稳定键重新定位，校验 expectedRevision、节点种类和改动范围后一次性合并。随后重新解析整图，确认无未知区域的非预期改动，再更新 canonicalRaw/修订号并返回回执。Node 拒绝的事务不能被原 UI当成已提交；保留原输入并显示冲突项。协议使用有序队列和原子完成文件/可靠本地通道，不能沿用只有一个 request.json、可能覆盖未处理编辑的方式。

不让 `encodeCurrent`、房间切换、`decodeAll`、保存和预览绕开这条操作链。首次解码、切房前后要有旁路身份的可核对映射。修改 `objs` 的实际操作处建立/删除键；尤其 `addObj` 对背景也可能返回 null，不能仅凭它的返回值判断是否成功创建背景。

### 3.3 不支持内容的处理

未知节点/属性始终留在 canonicalRaw。未知或原 UI 无法表现的对象保留且不可由普通擦除隐式删除，界面提示保留数量。未知材质格在原 UI 投影中安全显示为不可编辑占位，该格的修改明确拒绝；不能清空未知字符后继续保存。重名/缺名房间导致旧字典无法可靠对应时，原文保留，原 UI 编辑能力拒绝启动并说明原因。

地形行只修改实际格子范围；当前 `document.js.paint()` 会重写被修改的整行，不能原样用它宣称能保留该行内部的注释/CDATA。新合并器需要精确文本片段映射；若暂不支持复杂行，则该行禁止编辑，未编辑保存依旧原样。

含 `rrPlan` 等生成器数据时，保留完整原文；地形/对象变化在旁路记录 `requiresReview`，提示规划未重算。保存只能作为工作副本，不能宣称旧路线/布防数据已重新验证。“随机房审查”的已有草稿对照说明继续保留。

## 4. dirty、待输入内容与恢复

```ts
type NativeMapState = {
  sessionId: string; epoch: string; documentId: string;
  revision: number;                // 文档或待提交输入变化即递增
  contentHash: string; savedContentHash: string;
  pendingInputHash: string;
  dirty: boolean;                  // 原文有差异，或存在实际改过的待提交输入
  canSave: boolean; composing: boolean;
  invalidInputs: {fieldKey: string; message: string}[];
  recovered: boolean; persistedRevision: number;
};
```

- 选择对象、浏览房间、切页、改变预览镜像/缩放不是地图内容修改；视图偏好单独保存。
- TextField 的 CHANGE 立即标记待输入并上报；不能只监听鼠标松开/原 `mActive`。跨页或关闭前还要主动读取原生输入框，弥补尚未送达的事件。
- 属性框由原节点原文回填。非法 XML 保留原始输入、错误信息和目标键；合法文档仍是上次成功版本。错误输入不被覆盖为空、不被旧快照当作干净状态。
- 中文 IME 合成未结束时，不猜测未提交组合串；关闭/切换游戏根/保存应返回 `composing` 并保持窗口，待实际组合完成后重试。是否能无损恢复 IME 组合中间态尚未验证，不作承诺。
- 自动留存可短暂合并频繁输入，但“保留恢复草稿”的成功回执必须等待全部当前编辑和输入原文落盘、读回核对。不把排队写入当成功。

恢复文件新增版本，至少包含：完整 canonicalRaw、上次保存源的路径与 SHA-256、documentId/revision、nodeKeys、待提交输入与错误、当前房间/对象键、预览是否打开及地区/镜像/强度/缩放/平移、历史检查点。正文、身份表与草稿指纹一起原子写入；旧恢复文件备份保留。原 0.2.0 的完整 raw 恢复可迁入；若旧记录缺少保存基线，保守维持 dirty，不能通过再次读已变化的磁盘文件自动清除。

单次有效编辑/一次矩形绘制为一个撤销事务，切页不丢历史。文本输入原生局部撤销由当前输入框处理；画布撤销通过合并层的检查点与反向操作完成。不能把原 Flash 缺少通用撤销当成无提示退化。

## 5. 提供给宿主的 Interface 草案

地图方提供 `NativeMapModule`；宿主提供 `NativeSurfacePort`，负责匹配本次启动的窗口并嵌入/隐藏/调整大小。地图方管理自己创建的 AIR 会话，禁止接管用户已打开的原编辑器。

```ts
type FlushReason = 'inspect'|'hide'|'save'|'recover'|'preview'|'game-change'|'close';
type FlushResult = {
  status: 'ready'|'invalid'|'composing'|'offline';
  state: NativeMapState;
  focusTarget?: {roomKey: string; nodeKey?: string; fieldKey?: string};
};
type SaveResult =
  | {status:'saved'; documentId:string; revision:number; contentHash:string; filename:string; receipt:string|null}
  | {status:'cancelled'}
  | {status:'invalid'|'conflict'|'offline'|'composing'; message:string; state:NativeMapState};
type RecoveryResult =
  | {status:'recovered'; receipt:string; documentId:string; revision:number;
     contentHash:string; pendingInputHash:string}
  | {status:'composing'|'failed'; message:string};

interface NativeMapModule {
  mount(options: {gameRoot:string; componentRoot:string; dataRoot:string;
                  sessionRoot:string; testRoot:string|null; epoch:string;
                  surface:NativeSurfacePort; onState:(s:NativeMapState)=>void}): Promise<void>;
  activate(visible:boolean): Promise<void>;
  flush(reason:FlushReason): Promise<FlushResult>;
  saveDraft(options?:{as?:boolean}): Promise<SaveResult>;
  recover(): Promise<RecoveryResult>;
  dispose(receipt:string): Promise<void>;
}
```

宿主仍接 `RMHost.register('map', …)`，用很薄的包装把 saveDraft/recover 的有效回执转换为 Promise<boolean>。新增可等待的 `flush` 钩子；目前只让 iframe 输入框 blur 的 `flushInputs()` 不足以同步原 AIR 控件。接口不让宿主读取 AS3 内部数组、解析地图或自行猜测 dirty。

关闭/换游戏顺序：

1. await 原生 `flush('inspect')`，获取最新状态；非法属性保持 dirty，可继续选择“保留恢复草稿”。`composing/offline` 不走自动关闭。
2. “逐项保存”：有效 XML 才能保存；取消/冲突/错误返回 false，回到对应错误对象。原保存按钮和 Ctrl+S 也走同一保存事务。
3. “保留恢复草稿”：允许保存非法属性原文，await durable recovery；确认 documentId/revision/两个 hash 仍对应当前状态。
4. 所有页面通过且状态未变才关闭；若原生页在等其他页面对话框时又有编辑，旧回执失效。
5. `dispose(receipt)` 只接受当前文档状态匹配的保存/恢复凭据。先退出本次 AIR，再释放所属窗口；超时仅处置已确认保存/恢复的自有进程。无有效凭据不得以杀进程代替保存。

文件保存继续由 Node 使用已有路径限制、来源指纹、备份、原子替换和读回验证。保存回执只证明请求中的修订已写入；后续输入仍为 dirty。原生 FileReference 对话框不再负责地图存盘。PNG 导出可保留原按钮，但托管路径应交给主窗口选择位置、保存并核对，避免原子窗口焦点和成功回执不明。

## 6. 组件根、游戏根和随机房审查

| 根 | 用途/约束 |
|---|---|
| gameRoot | 读取游戏纹理、角色素材、语言、正式地图；普通保存禁止覆盖正式原图 |
| componentRoot | 候选原 UI SWF、配套 EditorTools/NativeScene 与编辑器语言资源的已校验副本；不是用户草稿位置 |
| dataRoot | `mods/RModifier` 的持久配置、地图工作副本、恢复、备份和私有运行缓存 |
| sessionRoot | 独立命令队列、回执、窗口/进程身份与临时预览；按会话隔离；不能作为唯一恢复位置 |

第一版建议保持 **AIR applicationDirectory = gameRoot**，以兼容当前 RandomRoomsEditor。仅将经过校验的候选 UI 组件放入 `dataRoot` 下私有缓存，以明确 URL 载入；候选描述符与唯一 app id 放在私有 sessionRoot。若 ADL 内容必须位于 application root 内，私有缓存满足这一约束；不得往根 Editor.swf、Editor/Enhancements 写文件来迎合加载。

这并不等于继续到处猜 applicationDirectory：新地图适配代码明确接收四个根。原 Editor 的纹理/地图载入改用 gameRoot 的 file URL，语言表和编辑器字典用 componentRoot，游戏词典用 gameRoot；日志用 dataRoot/sessionRoot。托管候选忽略旧 SharedObject 自动载入，偏好由 dataRoot 持久化；用户独立启动旧编辑器的 EditorConf 不变。未确认 GameRoot/组件指纹/只读素材前不初始化编辑文档。

当前原工具基线必须一起保留：

| 文件 | SHA-256 |
|---|---|
| 原 Editor.swf | `e99e231f83128ea24cd13b2ae36b0dd294e5180a16f54ba3c7b3cb8fa24d99fd` |
| 原 EditorTools.swf（含随机房审查） | `d7ad493f19867c96b600599151275877349a7dbf2155794be42483656ae0f002` |
| NativeScene.swf | `fcb620b9f4dc25eb3b4b54d420dfdf2549894472e8d0a331f06cdc321fc7cba7` |
| RandomRoomsEditor.swf | `fb1537f54b2c32af02aca771cb09366441fb74ca01ee3a6099e35c4d3a35dfd8` |

重要：不仅 EditorTools 的加载地址，`mods/RandomRooms/src/editor/RRReviewRenderer.as` 与 `RRReviewPanel.as` 内部也依赖 applicationDirectory，读取 `Editor/Enhancements/NativeScene.swf`、游戏纹理/语言和 `mods/RandomRooms/exports/review/latest.xml`。保留 gameRoot 应用根可复用本机当前路径；预检缺失时明确说明审查入口不可用，不能默认为通过。若未来要求在完全未安装旧 Editor 的新游戏上也运行该审查功能，需要其维护方提供 roots Interface 或认可的兼容装配，不在本轮偷偷覆写。

候选 EditorTools 必须从当前含审查扩展的源构建，保留入口和行为；不拿之前的 `80c…` 实体版回退重编。预渲染仍为原 PreviewPanel，新增同步前置步骤后继续显示它；ToolsSnapshot 返回已确认的完整当前房间副本。审查的 `compareDraft()` 也同步依赖此快照，不能接收到旧修订。

切出地图页只隐藏/失焦其原生窗口，不移除 Flash 视图、不 close PreviewPanel、不重开进程；切回保留原预渲染位置。窗口承载方验证隐藏状态不会截获台词/掉落的按键和输入法。1800×950 固定坐标、NativeMenu 和系统文件框的 DPI/焦点需实测，不能依据静态源码承诺。

## 7. 最小实现次序与验收

1. 等真实原 UI 嵌入试验完成。未通过不改正式宿主，也不把独立窗口当默认替代。
2. 地图方在候选副本加延迟初始化、根路径和原按钮桥；保留最新 EditorTools 审查扩展。冻结精确源/资源指纹后再构建。
3. 实现原文合并与旁路键：先无操作往返和未知数据，再地形/物体/房间操作；每类操作都要测试原 UI 触发路径，不只调用合并器。
4. 接 pendingInputs、flush、有效保存/取消/冲突、恢复及撤销；非法属性和中文输入未结束不能被关闭流程绕过。
5. 接原 PreviewPanel 与随机房审查；嵌入窗口只改变承载，不改变原预览交互。
6. 总整合方接跨页、退出、更换游戏根和打包；对最终候选重跑窗口与完整地图验收。

必测用例：31 份原始图无操作保存字节一致；带根未知属性/节点、注释、CDATA、BOM/CRLF、重复对象、缺 code、房间扩展/固定 doors 的夹具；复制/删除/属性/矩形地形的定点差异；未知对象不会因未显示而删除；属性非法/IME合成时退出和切游戏；保存等待中新编辑；恢复到同一错误字段；三页来回保留原预览位置和历史；对话框取消；真实中文输入；不同 DPI；进程崩溃；仅关闭自有 AIR；中文空格路径与单文件释放；原工具/审查文件指纹不变。

## 8. 明确的限制与未验事项

- 原生嵌入、真实中文输入、原生对话框和高 DPI 的最终可用性由宿主方另行验证；地图方候选已按实际接口运行隔离测试。
- 旧 UI 没有可靠通用撤销/自动恢复；这些必须由本适配补齐。未补齐前不能称为与 0.2.0 完整等效，不能静默发布降级版。
- 部分扩展对象/材质无法由原 UI 表达，按上述保护方式保留/限制编辑；不保证能编辑任意扩展格式。
- 精确保留改动行内部注释/CDATA需要新合并实现；暂不支持时拒绝该行编辑，不静默格式化。
- 恢复成功只保证已收到并完成落盘核对的内容。突然断电前未送达的最后按键或 IME 未提交串不能承诺零损失；正常关闭必须等同步。
- 原预渲染仍是静态图，不变成游戏模拟；未知生成器规划也不会因保留原文自动变成有效新规划。

接续停点：发起方已确认职责并授权候选实现；NativeSurfacePort 已与宿主对齐，宿主采用 owned-surface。当前实现及精确接口见 native-ui/README.md，等待最终候选冻结与宿主整体验收；不改变 0.2.0 历史交付状态。
