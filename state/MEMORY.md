# LootEditor 外置记忆

## 1. 项目
掉落工坊：零代码用户的中文独立窗口，编辑本体容器/敌人奖励与额外对应弹药。Electron 桌面端 + AS3 `LootEditorMod.init(main:*)`，接入现有清单 ModLoader；首版 1.02 单人。

## 2. 用户决定
独立窗口、多方案；对应弹药额外叠加，保留原随机弹药和拾枪赠弹。2026-09-27 开始实现，用户建议走已有 ModLoader。真实游戏部署需要明确授权；不改其他模组源码，不使用真实存档测试。

## 3. 当前状态
2026-09-28，0.1.0 首版已实现并打包：`dist/LootWorkshop/掉落工坊.exe`。16 个 Node 测试、14 组打包 UI 检查、128 个隔离 AIR 断言通过。六个旧模组发布组合加载 + 坏配置回退通过。正式游戏尚未安装，根 SWF 仍为 b7824465…03305ac；尚无正式游戏读取回执。

## 4. 当前停点
交付待连接的程序和说明，等待明确批准实际桥接部署。正式候选含小范围 LootGen/Interact.loot/Unit.die 修改；MainFE 与现有 ModLoader 保留。`desktop/install.cjs` 负责版本核对、唯一备份、安装、原扫描器登记和恢复。不能将“已应用配置”当作“游戏已读取”。

## 5. 已知边界
不认证 DLC/联机；机器人无弹种字段默认跳过。自定义奖励为独立机会/候选权重/数量耐久/阶段精英，原版复杂条件整体保留；没有任意脚本树。预览不计拾取额外收益。缺少真人新手试用与长期平衡测试。

FFDec 整类 Unit 重编译会破坏无关 E4X；只能安装 `pfe-loot-safe.swf`，`pfe-loot.swf` 只是不可部署的供体。重建检查 4,602 个无关方法/初始化字节码不变。FFDec 需要自己的 APPDATA/LOCALAPPDATA。自动开档须等 mm.loaded + allLandsLoaded + textLoaded。

## 6. 下一步
用户批准连接后：核对输入指纹，执行已测试安装器，重启正式游戏确认回执与功能入口。回滚只在游戏仍匹配本次已安装指纹时进行，保留用户方案。未获批准不放文件进正式 release、不改正式登记表。

## 7. 深入与复现
- [使用说明](../README.md)、[版本记录](../CHANGELOG.md)、[验证报告](../knowledge/verification-2026-09-28.md)。
- `build/build.ps1` 编译 AIR；`build/bridge.ps1` 从当前已核验根 SWF 重建桥接（无线上写入）；`npm run build:ui`、`npm run check`、`npm test`、`npm run package`。
- `tools/run-game-test.ps1 -Fallback -AllMods` 只操作记录的测试进程；停止用 `-StopOnly`。`LootProbe` 仅测试，未进入生产模块。
- [原计划](../../../讨论档案/2026-09-27-loot-editor-plan.md)、[本体审计](../../../shared-knowledge/world-objects/discoveries/container-enemy-loot-source-audit-2026-09-27.md)。
