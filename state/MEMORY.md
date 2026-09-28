# LootEditor 外置记忆

## 1. 项目
掉落工坊：零代码用户的中文独立窗口，编辑本体容器/敌人奖励与额外对应弹药。Electron 桌面端 + AS3 `LootEditorMod.init(main:*)`，接入现有清单 ModLoader；首版 1.02 单人。

## 2. 用户决定
独立窗口、多方案；对应弹药额外叠加，保留原随机弹药和拾枪赠弹。2026-09-27 开始实现，用户建议走已有 ModLoader。2026-09-28 用户明确要求“现在备份并更新游戏主文件，完成现有 ModLoader 接入”，安装已执行；随后选择“保留当前游戏，我稍后自行重启”。不重复询问安装授权，不自行关闭现有游戏；不改其他模组源码，不使用真实存档测试。

## 3. 当前状态
2026-09-28，0.1.0 首版已实现并打包：`dist/LootWorkshop/掉落工坊.exe`。16 个 Node 测试、14 组打包 UI 检查、128 个隔离 AIR 断言通过。六个旧模组发布组合加载 + 坏配置回退通过。08:13 北京时间安装到正式游戏：根 SWF 为 c631cbf3…6c64867，release 模块为 f1a00788…a7bce49，扫描器登记 `LootEditor|LootEditorMod|1|0|0`；原有全部登记保留。安装器确认 connected/canRestore=true。

## 4. 当前停点
文件安装完成，正式重启冒烟依用户选择延期，尚无正式读取回执。安装时正式旧游戏 PID 15832，另有编辑器和 RConnect 测试进程，均未操作。没有 active.json，默认原版掉落；额外对应弹药需在编辑器打开示例、应用后重启。

根备份：`../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf`，已验证为原始 b7824465…03305ac。登记表/清单原件在 `backups/2026-09-28T00-13-05-389Z-2a4d4198/`，安装记录在 `config/installation.json`。通过编辑器“我的方案 → 恢复连接前的游戏”回滚，先退出游戏；只在当前指纹仍匹配时恢复，保留用户方案。MainFE 与原 ModLoader 实现保留。

## 5. 已知边界
不认证 DLC/联机；机器人无弹种字段默认跳过。自定义奖励为独立机会/候选权重/数量耐久/阶段精英，原版复杂条件整体保留；没有任意脚本树。预览不计拾取额外收益。缺少真人新手试用与长期平衡测试。

FFDec 整类 Unit 重编译会破坏无关 E4X；只能安装 `pfe-loot-safe.swf`，`pfe-loot.swf` 只是不可部署的供体。重建检查 4,602 个无关方法/初始化字节码不变。FFDec 需要自己的 APPDATA/LOCALAPPDATA。自动开档须等 mm.loaded + allLandsLoaded + textLoaded。

## 6. 下一步
用户自行重启后，按需核验 `%APPDATA%/pfe/Local Store/LootEditor.receipt.json` 的目录、版本、会话、状态与配置指纹，并检查 LootEditor.log 的 bridge ready / ModLoader settings registered。发布门禁第 8 项仍为待核验，不把隔离成功或文件 installed 当作正式加载成功。无后台监控或自动重启安排。

构建桥接仍要求原始 b7824465… 基线；现在根文件已安装，不能直接把当前根 SWF 当作原始输入重建。可从本次已校验备份准备隔离基线，不覆盖正式文件。

## 7. 深入与复现
- [使用说明](../README.md)、[版本记录](../CHANGELOG.md)、[验证报告](../knowledge/verification-2026-09-28.md)。
- `build/build.ps1` 编译 AIR；`build/bridge.ps1` 从当前已核验根 SWF 重建桥接（无线上写入）；`npm run build:ui`、`npm run check`、`npm test`、`npm run package`。
- `tools/run-game-test.ps1 -Fallback -AllMods` 只操作记录的测试进程；停止用 `-StopOnly`。`LootProbe` 仅测试，未进入生产模块。
- [原计划](../../../讨论档案/2026-09-27-loot-editor-plan.md)、[本体审计](../../../shared-knowledge/world-objects/discoveries/container-enemy-loot-source-audit-2026-09-27.md)。
