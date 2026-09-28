# RModifier 外置记忆

## 1. 项目
中文独立编辑工坊，一个便携 RModifier.exe、同窗口掉落/角色台词/地图三页。0.3.0 地图页承载原 Flash UI 与原 PreviewPanel；掉落游戏模块仍为 LootEditorMod 0.2.0，接入现有 ModLoader，仅验证1.02单人。

## 2. 用户决定与协作
独立窗口、多方案；对应弹药作为额外掉落，保留原随机弹药与拾枪赠弹。用户已授权主文件备份/接入、RModifier 总整合及与地图/台词两会话直接协调。目录已从 mods/LootEditor 迁移为 mods/RModifier，不重建旧目录，不改原地图/台词工具或其他模组源码。
用户选择正式游戏稍后自行重启；本轮保留正式游戏。已授权屏幕操作，并在旧编辑器占用EXE时明确确认“已保存，可以关闭旧编辑器并完成更新”。旧编辑器以Alt+F4正常退出，无强杀。正式新版已打开，用户开始自行操作后停止输入，不关闭这个新窗口。
地图会话 01a0e2df-f3a5-7661-8de6-4a396306e8d3；台词会话 01a0e2d6-d192-7232-81d0-7a9017db9ba9。宿主/打包/统一提交由本会话负责，两方已冻结。

## 3. 当前状态
0.3.0 原界面整合已实现并完成全部验收。最终单文件 dist/native-candidate-0.3.0-r2/RModifier.exe，131589362字节，SHA256 738dcec6e14aaad8dd3bcd32078d4ffa6a13ba1efe64c333e943caa1024dc9c7。
真实最终包：宿主10组、掉落14组、台词8组、实际portable6组全通过，无JS/CSP错误。真实鼠标验证随机集合原切换层→原预渲染→系统另存取消→成功保存；实际副本与原地图逐字节相同，保存后预览仍开。自己测试实例已退出。原组件19组交互、31图逐字节开存+4扩展夹具、5原控件回归均通过；Node46项、地图模型10组沿用同源有效证据。
构建402项输入前后一致，实际ASAR386源码+7原生组件+窗口适配器核对一致；地图冻结revision2，19文件+6只读依赖已核对。第一候选因真实点击原切换层触发#1009拒收；r2修复随机集合访问空/遗留mapArr，所有相关测试重跑。
正式顶层RModifier.exe已更新为上述0.3.0，hash与验收r2相同，并已从正式入口启动显示原地图UI（08-installed-original-map.png）。ModLoader唯一登记仍 RModifier|LootEditorMod|1|0|0，release模块 fe104939...cbc0a31；根pfe c631cbf3...6c64867。本轮没有重打游戏补丁。

## 4. 当前停点
原界面整合已交付，没有未完成实现。最后入口替换曾被旧进程锁住；用户确认保存并授权后正常退出，原子替换成功。不是沙箱审批拒绝。
旧备份 backups/editor/20260928T105106Z-before-0.3.0/RModifier-0.2.0.exe，hash 4fa9a002eadc23d0f8fb05a628b2aced0757ffa2252d9c4914730e01a2cd3533；更新记录同目录update.json及knowledge/evidence-native-ui-2026-09-28/editor-update.json。6项游戏/原工具文件前后hash不变，暂存入口已被原子替换消费。
报告 design/2026-09-28-rmodifier-native-ui-result.md 已记交付、使用、全部验收与回退。源码/证据/记忆由本会话统一提交。

## 5. 已知边界
原预渲染是静态场景，不认证实战剧情/AI；保留rrPlan不等于路线重算。未知字段、脚本、换行和完整地图保留；无法可靠映射的复杂XML拒绝编辑。正常关闭保护待输入内容，断电前未送达按键/IME组合不承诺零丢失。
本机200%DPI实际显示、中文Unicode文本已测；真实原AIR中文输入法组合、跨不同DPI显示器未认证。本轮系统保存框中实际IME候选出现，但不扩大为原AIR输入认证。文件框在英文模式接受完整Windows反斜杠路径。
预览继承原界面平移；顶部工具栏在视野外时点底部“原点”或“适应”，Esc返回编辑，README已说明。
正式游戏尚未重启验证0.2.0读取回执。未替用户应用掉落示例或写正式台词/地图。没有真人新手试用、长期平衡或DLC/联机认证。

## 6. 后续与恢复
目前无需继续整合或重复测试。用户自行重启正式游戏后，按需核对Local Store/LootEditor.receipt.json中的版本、configRoot与配置指纹；没有设置后台监控。
桌面回退：关闭编辑器后把上述0.2.0备份复制回顶层EXE，保留方案/配置。游戏桥接恢复为独立操作，最初备份 ../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf，hash b7824465...03305ac；掉落页“恢复连接前的游戏”先要求游戏退出。
目录迁移记录 ../.rmodifier-migration/1790576794146-3f61d4d1-3cbd-4ab6-ad98-cc8a4d33f6a8/migration.json，维护者关闭编辑器后可用tools/migrate.cjs --rollback；它与桌面/游戏回退不能混用。

## 7. 深入与复现
- README.md、CHANGELOG.md；design/2026-09-28-rmodifier-native-ui-result.md；knowledge/evidence-native-ui-2026-09-28/。带first-candidate/pre-fix前缀证据为历史拒收/修复前结果。
- 0.2.0历史交付 design/2026-09-28-rmodifier-integration-result.md；knowledge/rmodifier-build-and-coordination.md记录承载、DPI、控件事件、打包核对经验。
- 原地图协议 map-editor/native-ui/README.md、delivery-manifest.json；台词 design/2026-09-28-barks-integration-api.md。
- npm run build:ui / check / test；map-editor/tools/build-native-ui.ps1，tools/build-native-surface.ps1；冻结后运行tools/package.mjs，RMODIFIER_PACKAGE_OUT可选项目内候选目录；tools/verify-native-package.cjs核对实际包。
- tests/native-host.cjs、tests/ui.cjs、tests/barks-host-regression.cjs用RMODIFIER_EXE指向解包程序；tests/portable.cjs用RMODIFIER_PORTABLE_EXE指定单文件，--hold提供实屏验收停点。测试必须有明确游戏根和独立testRoot，只结束自己的PID。
- 窗口为owned popup而非WS_CHILD，BaseWindow+常驻WebContentsView；surface只绑定/布局，地图模块独占AIR进程生死。不要按窗口元数据误判实际像素成功。
- 安装载荷只消费验证过的build/out/pfe-loot-safe.swf，不安装pfe-loot.swf编译供体。本轮桌面0.3.0与运行模块0.2.0分别记版本。
