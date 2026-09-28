# RModifier 外置记忆

## 1. 项目
中文独立编辑工坊，单文件 RModifier.exe、同窗口掉落/角色台词/地图三页。掉落模块沿用 LootEditorMod 与现有 ModLoader，仅1.02单人；地图页面调用隐藏 AIR 绘制原生静态图；台词编辑现有语言文件与v1草稿。

## 2. 用户决定与授权
独立窗口、多方案；敌人对应弹药额外叠加，保留原随机弹药和拾枪赠弹。2026-09-28 用户授权并完成根游戏备份/桥接安装，随后选择“保留当前游戏，我稍后自行重启”。不关闭正式游戏，不用真实存档测试。
本轮用户授权本会话接管总整合、向地图与台词会话直接协调；明确文件夹改名为 RModifier。迁移已完成，后续只使用 mods/RModifier，不重建旧 LootEditor。原地图/台词工具保留，不改其他模组源码。

## 3. 当前状态
0.2.0 已实现、打包、验证并部署。用户入口为本目录顶层 RModifier.exe（131,390,882字节，SHA-256 4fa9a002eadc23d0f8fb05a628b2aced0757ffa2252d9c4914730e01a2cd3533）。
正式登记唯一为 RModifier|LootEditorMod|1|0|0；release模块 fe1049393541f2ffc88cc88d4a61f4a83e550d8f30e91bc3c44fc8761cbc0a31。根 pfe 未再修改，仍 c631cbf3...6c64867。安装器 connected/canRestore=true，原备份保留。
最终发行包通过8组宿主、14组掉落UI、6组实际单文件验证，无JS/CSP错误；Node46项、地图模型16组、台词核心44项/服务25项/UI18组、地图原生12组/UI18组均通过。新版掉落模块隔离AIR128断言通过，回执0.2.0与mods/RModifier确认；测试进程已结束。
构建前后386项运行输入一致，实际打包SceneHost/NativeScene与地图冻结清单匹配，三页截图已查看。地图32项交付文件迁移前后核对无差异。

## 4. 停点
工作已交付，实际返回报告 design/2026-09-28-rmodifier-integration-result.md；原 preparation 报告继续作为历史保留。双方组件冻结，主会话统一提交。
用户正式游戏未重启，新版本正式读取回执尚未核验；没有替用户应用自定义掉落示例或写正式台词/地图。迁移时只有旧安装记录，无用户方案/active.json。
地图会话 01a0e2df-f3a5-7661-8de6-4a396306e8d3；台词会话 01a0e2d6-d192-7232-81d0-7a9017db9ba9。用户授权的本轮直接协调有效，两边已收到新路径，禁止恢复旧目录。

## 5. 已知边界
游戏支持仍为1.02单人掉落，未认证DLC/联机/长期平衡/真人新手使用。地图预览静态，不运行剧情、AI或实战随机生成；保存工作副本不自动安装。旧浏览器台词草稿需导出后打开。
台词/地图编辑可直接用中文控件；高级原文/脚本保留给已有作品。真实系统文件选择器鼠标操作及真实中文输入法组合未实测，程序化返回路径与组合事件已验证。
不能用早期候选包的验证认证新源；package.mjs 已校验构建前后输入及实际进入包的组件。详见 knowledge/rmodifier-build-and-coordination.md。

## 6. 后续与恢复
现在无未完成的整合实现。用户自行重启游戏后，按需核对正式 Local Store/LootEditor.receipt.json 的0.2.0、configRoot、当前会话和配置指纹；没有设后台监控。
最初根备份：../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf，hash b7824465...03305ac。掉落页“我的方案 → 恢复连接前的游戏”恢复桥接前版本，先保存退出游戏。
本次迁移记录：../.rmodifier-migration/1790576794146-3f61d4d1-3cbd-4ab6-ad98-cc8a4d33f6a8/migration.json。维护者先关闭编辑器，使用 tools/migrate.cjs --rollback <记录> 撤回目录/旧模块/登记；保留后来方案，后续外部变更会阻止自动撤回。不要把两种恢复混用。
共享资源表已在游戏区与D:/RemainsMod对应来源更新本项目登记；没有覆盖双方原先其他模组的差异。

## 7. 深入与复现
- README.md、CHANGELOG.md、design/2026-09-28-rmodifier-integration-result.md；证据 knowledge/evidence-rmodifier-2026-09-28/。
- 台词 design/2026-09-28-barks-integration-api.md；地图 map-editor/README.md、integration-report-2026-09-28.md、delivery-manifest.json。
- 公共契约 parent.workshop / parent.RMHost；desktop/platform/documents.cjs 组合两方服务。旧 workspaceState/editorHost 原型已归档。
- npm run build:ui / npm run check / npm test；build/build.ps1；map-editor/tools/build.ps1；tools/prepare-packager.ps1；npm run package。
- tests/host-ui.cjs、tests/ui.cjs 可用RMODIFIER_EXE指向win-unpacked；tests/portable.cjs 实际单文件；地图专用tests、台词专用tests。
- 游戏隔离：tools/run-game-test.ps1 -Fallback -AllMods；只处置自己记录的测试PID。测试需唯一AIR id，正式pfe存储只读。
- 不安装build/out/pfe-loot.swf供体，只消费固定已验证的pfe-loot-safe.swf；主文件字节码保持证据在旧0.1.0验证报告。

## 8. 交付后的新需求转述（尚未实施）
台词会话转来用户新需求：“我想在地图编辑器功能中使用原flash版地图编辑器的UI和预渲染。”该会话与地图方正在只读核对原增强版 Editor.swf / EditorTools.swf；主会话已将宿主限制同步给两边。当前0.2.0是网页地图交互加隐藏AIR绘图，没有原Flash窗口嵌入通道。原有同窗口三页要求继续作为约束，独立地图窗口尚未获用户重新选择，不能默认恢复旧规划。
需要先验证原UI接入与完整地图保存/未保存状态协议，再明确改动分工；后续需涵盖切页、焦点、DPI、输入、关闭与portable资源路径。现有ToolsSnapshot只覆盖当前房间。此次仅只读核对与协调，未修改宿主、地图代码、发行包或运行中的游戏。当前交付提交56eee49仍是可用基线。

地图方补充：真实UI为根Editor.swf内的MainEd/visualEditor，PreviewPanel是同Flash视图内的Sprite覆盖层；EditorTools.init(editor)可接入，MainEd.ed为internal。原encodeAll重建all且只拼land/rooms，可能丢未知根字段；saveClick/FileReference.save缺少完成/取消回执，原工具也没有整图dirty/持久恢复桥。固定1800×950坐标、相对URL、File.applicationDirectory与SharedObject EditorConf都需适配并实测，以上是地图方只读源码结论，尚非嵌入成功证明。
主会话独立核对当前原工具指纹：Editor.swf=e99e231f83128ea24cd13b2ae36b0dd294e5180a16f54ba3c7b3cb8fa24d99fd；Editor/Enhancements/EditorTools.swf=d7ad493f19867c96b600599151275877349a7dbf2155794be42483656ae0f002；NativeScene.swf=fcb620b9f4dc25eb3b4b54d420dfdf2549894472e8d0a331f06cdc321fc7cba7。EditorTools源码第68行已加载mods/RandomRooms/release/RandomRoomsEditor.swf，文件存在且hash=fb1537f54b2c32af02aca771cb09366441fb74ca01ee3a6099e35c4d3a35dfd8。这是原工具的新基线，后续必须保留“随机房审查”扩展并协调其维护方，不能从旧EditorTools组件覆盖重打，也不能据此改写RModifier 0.2.0的历史冻结清单。
