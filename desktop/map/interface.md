# 地图模块接口

地图方负责 `desktop/map/`、`desktop/ui/map/`、`map-editor/`；总整合方负责宿主、共享平台、台词与掉落，最后统一提交和目录迁移。2026-09-28 用户已明确此分工并允许直接协调。

主进程导出：`require('./map/workspace.cjs').MapWorkspace`。

构造参数为 `{gameRoot, dataRoot, componentRoot, sessionRoot?, dialog, getWindow, testRoot?}`。全部根目录采用绝对路径。`componentRoot` 内必须有配套 `SceneHost.swf` 与 `NativeScene.swf`；`getWindow` 为返回 BrowserWindow 的函数。测试时 `testRoot` 必须显式提供且包含 dataRoot、sessionRoot 和所有输出。gameRoot 只读取素材；其正式 Rooms 不能直接保存。

宿主可将以下函数转发到同一个 MapWorkspace 实例；前端使用 `parent.workshop`。

| 方法 | 参数 | 返回 |
|---|---|---|
| mapBoot | 无 | `{id,raw,filename,dirty,recovered?,roomIndex?}`；有恢复草稿时优先，否则最近文件/工厂图 |
| mapOpen | 无 | 系统选择器；取消为 null，成功同上 |
| mapNew | 可选 `{fixed:boolean}` | 新建随机或固定地图，返回同上，dirty=true |
| mapRecover | `{id,raw,revision,dirty,roomIndex?}` | true；旧文档/旧修订返回 false；完整地图自动留存，未应用 |
| mapSave | `{id,raw,revision,as:boolean}` | `{id,filename,revision,sha256}`，取消为 null；正式原图自动要求另存工作副本 |
| rendererReady | 无 | `{protocol:1,version,sessionId,regions:[{id,label}],capabilities:[...]}` |
| mapPreview | `{id,raw,index,revision,options:{region,mirror,objects,entities,examples,difficulty}}` | `{requestId,revision,documentRevision,inputHash,pngHash,image,report,...}`；image 是 data PNG，1920×1000；不返回可写文件路径 |
| mapPNG | `requestId` 字符串 | 保存后的完整文件路径；取消为 null；只导出仍对应当前文档的已生成图 |
| dispose | 无 | Promise<void>；关闭本实例自己创建的隐藏 AIR 进程 |

所有错误 reject Error，前端展示 message；取消文件对话框不是成功保存。`mapSave` 只确认请求中的 revision，前端不能用旧响应清除之后的编辑。外部修改源文件会阻止覆盖。恢复草稿损坏时保留原件并报错，仍可新建/打开。

子页面向宿主 `parent.RMHost.register('map',{saveDraft,recover,activate})` 登记；`saveDraft()` 返回是否已保存全部当前修改，`recover()` 等待留存落盘后返回 Promise<boolean>，`activate()` 重绘。状态用 `parent.RMHost.state('map',{dirty,revision})`。页面隐藏时保持文档与撤销历史。宿主应提供 `parent.loot.confirm({message,detail})` 供打开/删除确认；地图页不自行关闭程序或切换游戏根。

底层 NativeSession：`new NativeSession({gameRoot,componentRoot,sessionRoot})`，`start()`，`render({xml,roomIndex,documentRevision,filename,options})`，`cancel()`（让在途结果过期），`dispose()`。会话拥有唯一 AIR app ID 与私有目录，进程 ready 和请求/回执校验独立于启动 PID；不用 `-cmd`。

文档模型正式入口为 `document.js`（Node/browser 共用），方法 `parse/patch/attribute/insert/nodeXML/cells/paint/snapshot/blankRoom/create/doorValues`，XML 扫描器为地图自有 `xml.js`，不依赖台词模块。保留原 XML 字节，只局部修改。正式绘图入口仅 `native-session.cjs` / `SceneHost.as`；并发识别前的替代草稿已归档。

接入和验证说明见 `map-editor/README.md` 与 `map-editor/integration-report-2026-09-28.md`；组件和源码指纹见 `map-editor/build-manifest.json` 与 `delivery-manifest.json`。
