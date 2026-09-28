# RModifier 角色台词接入接口

日期：2026-09-28。责任：本会话仅维护 `desktop/barks/**`、`desktop/ui/barks/**`、台词专用测试及本文；共用宿主、地图、迁移与打包由另外两个会话维护。用户已明确授权三方直接协调。

## 主进程组件

`desktop/barks/service.cjs` 导出 `BarksService`，构造参数：

```js
new BarksService({ gameRoot, dataRoot, testRoot, dialog, getWindow: () => window })
```

- gameRoot：选中的游戏根；dataRoot：持久工程根（RModifier）。
- testRoot 可选；提供时，所有写入必须位于其内部。因此正式游戏根与测试工程分离时，直接应用与恢复会被拒绝；隔离假游戏根放在 testRoot 内可实测这些操作。
- dialog 为 Electron 原生对话框；getWindow 为获取当前窗口的函数。
- 模块只处理语言、台词草稿和自身恢复文件，不处理游戏 SWF、掉落或地图。

宿主验证 IPC 来源后，将下面六个具名方法暴露为 `parent.workshop`；不暴露文件路径参数或通用磁盘写入。

| preload 方法 | 主进程转发 | 参数与返回 |
|---|---|---|
| barksBoot() | service.boot() | `{raw,filename,recovery,recoveryState,previous,error}`；raw 为当前简中，recovery/previous 为 v1 草稿或 null。error 非空时保留损坏留存，界面停止自动覆盖直到用户处理 |
| barksOpen() | service.open() | 原生文件选择；返回 `{raw,filename}` 或 null。主进程先验证 XML/v1 草稿 |
| barksRecover(project, meta) | service.recover(project, meta) | 返回 boolean；meta 为 `{documentId,revision,savedRevision,dirty}`，默认兼容无 meta 的旧调用。自动留存不把页面标为已保存或已应用 |
| barksSave(project, revision) | service.save(project, revision) | 原生另存草稿；返回 `{revision,file}` 或 null。旧 v1 格式不变；页面只确认捕获的 revision |
| barksExport(project, apply) | service.export(project, apply) | apply=true 写游戏；false 原生导出；返回 `{file,applied,sha256}` 或 null。另存选中根游戏语言文件时自动进入备份写回流程 |
| barksRestore() | service.restore() | 恢复最近一次语言写入前的文件；返回 true 或 null，失败抛中文错误 |

所有写入验证源 SHA-256、结构和大小；严格 UTF-8 解码保留 BOM。第一次写回核对草稿来源 hash，后续写回核对上次确认的目标 hash，因此连续第二次应用正常、外部修改会停止覆盖。源 hash 始终保留在草稿中。备份损坏、目标外部变化、错误语言、DLC 路径均不自动覆盖。写入记录失败时，在目标未被外部改动的前提下回退刚写入的文件。

## 页面与关闭协调

页面 `desktop/ui/barks/index.html` 是持久 iframe 内的中文编辑页。保持与其他页面的样式、快捷键、焦点和撤销栈隔离。

```js
parent.RMHost.register('barks', { saveDraft, recover, activate });
parent.RMHost.state('barks', { documentId, revision, savedRevision, dirty });
```

- saveDraft()：完成原生保存并确认同一文档同一修订后返回 true；取消、保存失败或期间继续编辑返回 false。
- recover()：完成持久留存后返回 true；失败抛错，宿主保持窗口打开。
- activate() 可选；当前无需重建页面。
- 普通切页隐藏 iframe，不能销毁。Ctrl+S 只到当前 iframe；组合输入中的键盘事件不拦截。

持久目录：`profiles/barks/*.barks.json`、`config/barks/recovery.json`（元数据包裹 v1）、`previous.json`（切换前）、`last-write.json`（写回目标基线）、`backups/barks/{drafts,exports,language}`。它们不进入掉落 profiles 顶层扫描。旧浏览器草稿需先导出再导入；不读取浏览器私有存储。

## 验收记录

台词组件独立验收完成，可由总整合方接入。本文不代表三个页面、迁移或 EXE 已全部验收。

| 本次实际执行 | 结果 | 证据 |
|---|---|---|
| `node tests/barks-core.cjs` | 44 项通过 | `build/out/barks-core/core-results.json`；8 种可解析语言无编辑导出逐字节相同，既有 Polish 文件错误明确拒绝 |
| `node --test tests/barks-service.test.mjs` | 25 项通过 | 边界补强后最后运行输出与 `build/out/barks-service-1790576455572/` 隔离输入/结果；不复用旧工坊计数 |
| `node tests/barks-ui.cjs` | 18 组通过，无 JS/CSP 错误 | `build/out/barks-ui-1790574548716/results.json`、`01-barks.png`、`02-barks-narrow.png`、`03-barks-150.png` |

桌面检查使用独立 Electron 宿主，以真实 iframe、六个 IPC 方法和服务完成实际磁盘读写；系统选择器由测试指定返回文件路径。验证包含取消保存、v1 草稿重开、备注撤销、停用和粗口预览、跨页不丢修改、保存等待期间继续编辑、Ctrl+S、未保存草稿重启恢复、连续应用和恢复、窄窗口与 150% 缩放。截图已查看。正常鼠标选择系统对话框、真实中文输入法组合过程、真人易用性、正式游戏气泡尚未实测；模拟 `isComposing` 的键盘事件已验证不触发保存。

受限环境曾无法创建 Electron 渲染进程（launch-failed 49），使用正常桌面权限后完成上述回归。所有游戏写回均发生在 `build/out/barks-ui-*` 或 `barks-service-*` 的游戏副本；没有写正式语言、SWF 或存档，也未关闭用户窗口。

总整合方仍须在最终宿主和便携 EXE 中确认：六方法完整转发、RMHost 关闭处理、三页互不清理状态、更换游戏前落盘，以及迁移后的持久根目录。台词开发方停止修改共用文件，提交与目录迁移统一由总整合方执行。

14:22 补充复核：按总整合方反馈，写入边界改为解析最近已存在父目录的真实路径，再连接未创建的路径段；Windows 大小写按同一路径比较。真实 junction 检查覆盖输出、恢复草稿、备份、写入记录和失败回退的越界保护。正常内部目录链接与正式模式下用户选择的外部输出目录仍可使用；经游戏目录链接另存仍进入备份确认流程。未改共享 `platform/files.cjs`。补强后 25 项服务检查与 18 组 Electron 流程通过；后者新证据为 `build/out/barks-ui-1790576503855/results.json`。正式简中与根 SWF 指纹仍与上一轮一致。

## 原 Flash 地图页接入后的台词回归

2026-09-28，使用 `RMODIFIER_NATIVE_MAP=1` 启动真实三页候选宿主，执行 `node tests/barks-host-regression.cjs`：8 组通过，无 JS/CSP 错误。证据为 `build/out/barks-host-1790584608911-5c813eba/results.json` 与已查看的 `barks-after-map.png`。

已验证：中文台词编辑、切至地图再返回后的标记撤销/重做、连续 5 轮快速切页最终停留在台词、取消原生保存仍保留修改、切页后的 Ctrl+S、关闭时继续编辑、保存恢复草稿后重新启动。正式 `text_zh.xml` 的 SHA-256 前后均为 `66da212793683b19e65e3973b726a94a2885d5032395af8a2e5a0fd20a17f895`。测试只写唯一的 `build/out/barks-host-*` 目录，仅结束自己创建的进程。

本记录认证源码候选中的台词与主窗口协作；文件选择器返回路径由测试指定，文字由网页输入接口写入。原生地图像素、系统输入法、窗口焦点与最终便携 EXE 由地图/总整合方另行验证；本记录不能代替这些验证。台词服务和页面运行代码未因本次地图需求修改，最终提交仍由总整合方统一完成。

0.3.0 打包候选补验：以 `dist/native-candidate-0.3.0/win-unpacked/RModifier.exe` 启动可见窗口，清除原地图开发开关后再次通过全部 8 组。证据为 `build/out/barks-host-1790586693621-94da5404/results.json`、`native-map-visible.json` 和已查看的 `barks-after-map.png`；该包 `resources/app.asar` 的 SHA-256 为 `1383f8ff768fd50297e3f12730a8b9e200a56a18093d2465fc4187c874b42d6f`。

新增断言确认：原界面默认启用，真实 AIR 地图已加载且窗口可见；窗口归属于 RModifier、没有置顶；切回台词后隐藏，快速切页仍为同一 AIR 进程。正式简中指纹不变，无页面错误。首次增强测试在地图加载时过早读取窗口状态而失败（`barks-host-1790586140747-ee9eb75d`）；改为明确等待 `nativeMapInspect()` 成功结果后，在完全未改动的候选程序上通过。此次认证打包目录中的实际应用；单文件自解包启动与顶层交付入口由总整合方另验。真实输入法候选组合过程仍不在本台词测试范围内。

后续发布状态更正：单文件候选 `61807e71565a5625884290d97822e5ed85f787584227aa906e2a69b44acaf1be` 在总整合方真实鼠标检查中发现 AIR `TypeError #1009`，已拒绝发布。最初在“打开预览 → 点击宿主保存”过程中察觉，原始记录为 `build/out/portable-1790586770645/manual-failure.json`；后续时间核对与独立复现定位为更早的随机房间“切换层”操作访问了不存在的楼层数据，无需打开预览也能触发。上述台词 8 组通过仅代表其覆盖范围，不能认证整个候选。正式 0.2.0 入口仍未替换，待地图修复、重新冻结与打包后，台词方再对新包复跑。

修复后 r2 补验：`dist/native-candidate-0.3.0-r2/win-unpacked/RModifier.exe` 上原样复跑 8 组，全部通过、无页面错误，测试实例已退出。最终台词证据为 `build/out/barks-host-1790591460061-578ee371/results.json`、`native-map-visible.json` 和已查看的 `barks-after-map.png`。正式简中指纹不变；默认原界面启用、表面归属/显示隐藏、同一 AIR 进程快速切页、台词撤销/保存/退出恢复均正常。

r2 单文件 SHA-256 为 `738dcec6e14aaad8dd3bcd32078d4ffa6a13ba1efe64c333e943caa1024dc9c7`；包内 `app.asar` 仍为上述 `1383f8ff…b42d6f`，地图组件清单为 `537704c3e74f3f6f279ad72a87a2d846fa1b8bc6ed831e361e410826f339523b`，均已独立核对。修复后的地图冻结清单为 `2b96847999ddde650405d452063c68f39ae10c75d2808126ef5016dbb564e2b4`。本轮台词范围已完成；真实鼠标“切换层 → 预渲染 → 另存副本”及正式入口更新仍由总整合方验收，不能用此 8 组结果代替。
