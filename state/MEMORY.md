# RModifier 外置记忆

## 1. 项目
中文独立编辑工坊，一个便携RModifier.exe、同窗口掉落/角色台词/地图三页。当前正式桌面0.3.2，游戏模块LootEditorMod 0.2.1，仅验证Remains 1.02单人。原Flash地图UI/预渲染、0.3.1界面精简和素材绘制修复完整保留。

## 2. 用户决定与协作
独立窗口、多方案；对应弹药为额外掉落，保留原随机弹药与拾枪赠弹。用户已授权游戏接入、RModifier整合和会话协调。目录已从mods/LootEditor迁为mods/RModifier；不重建旧目录、不改其他模组源码或原地图工具。
用户要求无需编程也能操作；最近要求掉落/台词删除各种说明文字，并报告进阶武器不能单独设概率。0.3.2由当前武器会话01a0e7c9-b887-7a03-8abd-89dd56eb70b5完成；0.3.1协调会话01a0e7b9-180b-7751-bc1e-94bcde0b2119在142e7a5后交还全局记录与入口。
地图会话01a0e7b5-2486-73a1-bc63-dbae14140f10完成自动适配；旧台词会话01a0e2d6-d192-7232-81d0-7a9017db9ba9修复深色墙面，均已交付。不要改写其固定0.3.1包与证据。
用户选择正式游戏稍后自行重启；本轮保留游戏。0.3.1替换遇占用后，用户明确回复“已保存并关闭旧编辑器，继续更新”；随后0.3.1与0.3.2顺序原子替换成功，没有启动新窗口。该答复不是未来关闭新窗口的长期授权。

## 3. 当前状态
正式入口RModifier.exe与固定dist/weapon-variants-0.3.2/RModifier.exe一致：131588512字节，SHA256 c8082af502594e347eb4db4272605cb441731049ba315faa9fe623cefb370fdb。
release/LootEditorMod.swf为0.2.1，SHA256 502730145a8750011f41722b6f568aa102059a200598beeee5d2b60a8109e764。安装记录已更新；ModLoader唯一登记RModifier|LootEditorMod|1|0|0、主pfe c631cbf3511b6ee303f533d08d51511fe0eb702f43e5db17f5241d8576c64867不变。
新增62个进阶武器独立可选键（如weapon:rail^1），总目录692；原630条物品与193来源逐项不变。搜索真实进阶名或基础名，类别可筛进阶武器；普通/进阶可独立机会或同池权重混抽。预览和奖励显示真名。uniq=0也可显式掉落；无定义进阶不提供。旧schemaVersion=1与整条variant规则继续兼容，打开不改写，编辑时才转显式键。
JS与AIR生成计划都归一到基础键+variant，进阶条目不带原随机pool，因此原版池不增重、不重复。新模块安装只替换本模组运行文件并保存原安装恢复记录；主程序按core.VERSION判读取回执。
Node全套57项通过（专门规则/安装27归档）；源码进阶UI8、最终包进阶UI8/掉落14/台词宿主8/portable6通过。中文隔离AIR151全过（99组生成+16校验一致及真实容器/敌人掉落/名称/拾取），运行模块与部署字节相同。402构建输入、实际ASAR386文件和7原生组件均核对一致。
地图组件沿用0.3.1：manifest 06bf354b5dd13f617f21b4c00e5235955e3b8c91deac57b59cb646388b0da0cc，Editor.swf c0186beb5690dde70b5c12bd9f88d9c72a837ce689a29ed49f163c5ba1c24b4a。0.3.1原按钮9组/67素材和宿主11组是同字节已有证据；31图/4扩展与5控件为0.3.0历史，不冒称本轮重跑。

## 4. 当前停点
0.3.2实现、验证、模块部署、正式EXE替换全部完成。用户双击原入口即可使用；应用自定义方案后保存游戏并重启读取。尚未取得正式游戏0.2.1新会话回执，独立游戏已验证真实加载，不自动重启正式游戏或设置后台监控。
没有替用户应用示例方案、修改正式台词/地图/存档。测试实例已停止，临时描述符已移除。报告design/2026-09-28-advanced-weapon-drops.md；证据knowledge/evidence-weapon-variants-2026-09-28/，其中deployment.json为模块更新，editor-update.json为最终入口替换。

## 5. 已知边界
只验证1.02单人，未认证DLC、联机、长期平衡或真人新手试用。追加奖励保留原版普通奖励；替换仅作用普通奖励层，地图指定道具、任务回执和原生掉枪继续保留。
原预渲染是静态场景，不认证实战剧情/AI；保留rrPlan不等于路线重算。地图完整原文/未知字段/脚本保留，无法可靠映射的复杂XML拒绝编辑。200%DPI及Unicode文本已测，真实原AIR输入法组合、混合DPI拖动未认证；断电前未送达输入不承诺零丢失。
地图强制整舞台自动适配，旧手动平移缩放草稿不会裁掉工具栏；预览内场景缩放仍可用，Esc返回。窗口承载为owned popup，不是WS_CHILD。

## 6. 回退与恢复
桌面0.3.1备份backups/editor/20260928T201039-before-0.3.2/RModifier-0.3.1.exe，hash b0325614eda55f28c1549f8e9b7bb5cec0c37cb6dc9b4ee9091e96660752bec9；关闭编辑器后恢复该文件，保留所有方案。原子替换File.Replace必须传明确备份路径，PowerShell的null实参曾出错。
运行模块0.2.0及安装记录备份backups/runtime-1790597138967-05302da2/。一般回退桌面可继续用0.2.1模块；若也回退模块，先选择旧版可读方案，保留用户新增进阶方案文件。
0.3.0备份backups/editor/20260928T115330Z-before-0.3.1/；更早0.2.0备份backups/editor/20260928T105106Z-before-0.3.0/。固定0.3.1包仍在dist/compact-ui-0.3.1，不重建覆盖。
游戏桥接恢复另走掉落页“恢复连接前的游戏”，先退出游戏；最初备份../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf，hash b78244657ed407d03808c90e97325509db35f802122835f58933fff8003305ac。
目录迁移记录../.rmodifier-migration/1790576794146-3f61d4d1-3cbd-4ab6-ad98-cc8a4d33f6a8/migration.json；维护者关闭编辑器后可用tools/migrate.cjs --rollback，它与普通桌面回退不能混用。

## 7. 复现与深入
- README.md、CHANGELOG.md、design/2026-09-28-advanced-weapon-drops.md；此前交付见design/2026-09-28-rmodifier-compact-ui-result.md、rmodifier-native-ui-result.md、rmodifier-integration-result.md（后两项同日期前缀）。
- tools/extract_catalog.py；npm run check / build:ui / test；build/build.ps1编模块；tools/generate-fixtures.mjs；tools/run-game-test.ps1 -Fallback -AllMods -Language zh。独立appId必须pfe-loot-test-前缀，不能接触真实pfe存储。
- tests/weapon-variants-ui.cjs、ui.cjs、barks-host-regression.cjs的RMODIFIER_EXE指向win-unpacked主程序；不能用Playwright Electron直接附着NSIS外壳。tests/portable.cjs用RMODIFIER_PORTABLE_EXE测真实单文件。测试必须独立数据根，只停止本测试PID。
- 打包冻结后tools/package.mjs，RMODIFIER_PACKAGE_OUT限定项目内；tools/verify-native-package.cjs核对实际包。只消费已验证build/out/pfe-loot-safe.swf，不重编/安装pfe-loot.swf供体。
- 地图map-editor/native-ui/README.md及delivery-manifest.json；台词design/2026-09-28-barks-integration-api.md；共享机制优先shared-knowledge/world-objects/discoveries/container-enemy-loot-source-audit-2026-09-27.md。
