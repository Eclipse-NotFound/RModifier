# RModifier 外置记忆

## 1. 项目
中文独立编辑工坊，一个便携 RModifier.exe、同窗口掉落/角色台词/地图三页。已完成0.3.1精简界面与原Flash自动适配；该包掉落游戏模块为LootEditorMod 0.2.0，仅验证1.02单人。正式顶层EXE已原子替换为验收通过的0.3.1，固定副本保存在dist/compact-ui-0.3.1。其他会话正在接续0.3.2及运行模块0.2.1。

## 2. 用户决定与协作
独立窗口、多方案；对应弹药作为额外掉落，保留原随机弹药与拾枪赠弹。用户已授权主文件备份/接入、RModifier 总整合及与地图/台词两会话直接协调。目录已从 mods/LootEditor 迁移为 mods/RModifier，不重建旧目录，不改原地图/台词工具或其他模组源码。
用户选择正式游戏稍后自行重启；本轮保留正式游戏。历史0.3.0更新时用户曾授权关闭旧0.2.0窗口，已执行完毕。此次0.3.1替换遇占用后，用户重新明确回复“已保存并关闭旧编辑器，继续更新”；随后替换成功。没有代关用户窗口或启动新版窗口，不把历史关闭授权扩张到后续窗口。
用户最新要求：掉落/台词页去掉各种说明文字，保留清楚的控件、数值及必要状态；地图只用原Flash UI并自动适配。当前协调会话01a0e7b9-180b-7751-bc1e-94bcde0b2119负责掉落/台词精简与0.3.1包；地图01a0e7b5-2486-73a1-bc63-dbae14140f10负责外层条移除/适配；旧台词会话01a0e2d6-d192-7232-81d0-7a9017db9ba9负责深色墙面绘制修复，均已冻结交付。
武器进阶概率会话01a0e7c9-b887-7a03-8abd-89dd56eb70b5正在独立开发0.3.2，0.3.1输入封存后已解除其desktop源码冻结；不要把其变动混入0.3.1或提交。本轮记录提交后交还README/CHANGELOG/state维护权；该会话自行验收、记录和交付0.3.2，不复用0.3.1包检查冒称新包通过。

## 3. 当前状态
0.3.1固定包 dist/compact-ui-0.3.1/RModifier.exe，131585432字节，SHA256 b0325614eda55f28c1549f8e9b7bb5cec0c37cb6dc9b4ee9091e96660752bec9。
最终包宿主11、掉落14、台词8、portable6全通过；源码台词18及Node46通过。402构建输入前后一致，实际ASAR386文件+7原生组件核对通过。地图component manifest 06bf354b5dd13f617f21b4c00e5235955e3b8c91deac57b59cb646388b0da0cc；原按钮9组/67素材全过，Editor.swf c0186beb5690dde70b5c12bd9f88d9c72a837ce689a29ed49f163c5ba1c24b4a。原UI19组在最后按钮高度微调前通过，最终几何/操作由source与package宿主11组覆盖。31图/4扩展及5控件为0.3.0历史证据，未冒称本轮重跑。
精简页去除教程、场景说明、重复提示，收紧间距；按钮为“复制并编辑”“追加奖励”“替换普通奖励”，台词备注收为折叠项。地图自动完整fit，Flash内另存/撤销/重做。深色墙面故障为原素材的XMLList编号经JSON变成“XMLList”，已在桥接边界String转换。
源码提交46f7473、23613bc、b42a8bc。实际包检查后允许0.3.2源码继续修改，因此当前工作树不等同固定包；不要重新构建覆盖本0.3.1候选。0.3.1验收时release为0.2.0，根pfe c631cbf3...6c64867；本轮不重打游戏补丁。收尾时武器会话报告已单独部署运行模块0.2.1，备份backups/runtime-1790597138967-05302da2，由其记录新版本验收与后续顶层0.3.2交付。

## 4. 当前停点
本轮实现、固定包验证和正式入口替换均完成。Windows先因旧编辑器占用拒绝替换；用户回复保存关闭后，以明确备份路径调用File.Replace成功，入口hash为b0325614...52bec9。首次空备份参数错误、其后文件占用与最终成功均已区分记录，不是沙箱审批拒绝。未打开新版编辑器窗口。
0.3.0备份 backups/editor/20260928T115330Z-before-0.3.1/RModifier-0.3.0.exe，完整hash738dcec6e14aaad8dd3bcd32078d4ffa6a13ba1efe64c333e943caa1024dc9c7。暂存文件已由原子替换消耗；额外原子备份及installed状态见knowledge/evidence-compact-ui-2026-09-28/editor-update.json。不要用PowerShell的null备份实参。
本轮报告design/2026-09-28-rmodifier-compact-ui-result.md，证据knowledge/evidence-compact-ui-2026-09-28/。ui-design/test-report实战台账已查重追加待吸收。0.3.1验收时6项正式游戏/工具hash未变；后续运行模块升级属于武器会话的0.3.2交付。

## 5. 已知边界
原预渲染是静态场景，不认证实战剧情/AI；保留rrPlan不等于路线重算。未知字段、脚本、换行和完整地图保留；无法可靠映射的复杂XML拒绝编辑。正常关闭保护待输入内容，断电前未送达按键/IME组合不承诺零丢失。
本机200%DPI实际显示、中文Unicode文本已测；真实原AIR中文输入法组合、跨不同DPI显示器未认证。本轮系统保存框中实际IME候选出现，但不扩大为原AIR输入认证。文件框在英文模式接受完整Windows反斜杠路径。
0.3.1强制整舞台自动fit，旧手动平移/缩放草稿不会导致工具栏出界；原预览内部场景缩放仍可用，Esc返回编辑。新包检查为程序化真实控件和截图，不宣称本轮做过真人鼠标/IME测试。
正式游戏尚未重启验证0.2.0读取回执。未替用户应用掉落示例或写正式台词/地图。没有真人新手试用、长期平衡或DLC/联机认证。

## 6. 后续与恢复
0.3.1已交付，无剩余实现或替换步骤。0.3.2进阶武器为另一会话的新工作，已同步本轮实际入口与窗口状态；不延长或重写固定0.3.1包。用户自行重启正式游戏后按需核对Local Store/LootEditor.receipt.json，未设置后台监控。
桌面回退：关闭编辑器后恢复上述0.3.0备份，保留方案/配置。更早0.2.0备份仍位于backups/editor/20260928T105106Z-before-0.3.0/。游戏桥接恢复为独立操作，最初备份 ../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf，hash b7824465...03305ac；掉落页“恢复连接前的游戏”先要求游戏退出。
目录迁移记录 ../.rmodifier-migration/1790576794146-3f61d4d1-3cbd-4ab6-ad98-cc8a4d33f6a8/migration.json，维护者关闭编辑器后可用tools/migrate.cjs --rollback；它与桌面/游戏回退不能混用。

## 7. 深入与复现
- README.md、CHANGELOG.md；design/2026-09-28-rmodifier-compact-ui-result.md；knowledge/evidence-compact-ui-2026-09-28/；knowledge/native-palette-json-bridge.md。0.3.0历史见design/2026-09-28-rmodifier-native-ui-result.md；first-candidate/pre-fix为历史拒收证据。
- 0.2.0历史交付 design/2026-09-28-rmodifier-integration-result.md；knowledge/rmodifier-build-and-coordination.md记录承载、DPI、控件事件、打包核对经验。
- 原地图协议 map-editor/native-ui/README.md、delivery-manifest.json；台词 design/2026-09-28-barks-integration-api.md。
- npm run build:ui / check / test；map-editor/tools/build-native-ui.ps1，tools/build-native-surface.ps1；冻结后运行tools/package.mjs，RMODIFIER_PACKAGE_OUT可选项目内候选目录；tools/verify-native-package.cjs核对实际包。
- tests/native-host.cjs、tests/ui.cjs、tests/barks-host-regression.cjs用RMODIFIER_EXE指向解包程序；tests/portable.cjs用RMODIFIER_PORTABLE_EXE指定单文件，--hold提供实屏验收停点。测试必须有明确游戏根和独立testRoot，只结束自己的PID。
- 窗口为owned popup而非WS_CHILD，BaseWindow+常驻WebContentsView；surface只绑定/布局，地图模块独占AIR进程生死。不要按窗口元数据误判实际像素成功。
- 安装载荷只消费验证过的build/out/pfe-loot-safe.swf，不安装pfe-loot.swf编译供体。本轮固定包桌面0.3.1与运行模块0.2.0分别记版本；源码正在另行推进0.3.2，旧包复验使用封存package-report的输入指纹。
