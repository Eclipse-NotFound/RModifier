# RModifier 开发与验证

以下保留公开 0.4.0 的开发说明；源码后续进度以 state/ 记录为准。



源码：`desktop` 为桌面端，`src` 为掉落游戏模块，`map-editor` 为原生绘图组件与构建资料。`src/tests` 及 LootProbe 只用于隔离验证，不进入正式模块。发行包包含独立桌面运行环境与已经验证的连接载荷；游戏资源读取选中的安装目录。

工具位置可通过构建脚本参数覆盖。开发顺序：安装 package-lock 中的依赖；运行 `npm run build:ui`、`npm run check`、`npm test`；掉落模块和旧绘图桥分别由 `build/build.ps1`、`map-editor/tools/build.ps1` 构建；原界面由 `map-editor/tools/build-native-ui.ps1` 构建，窗口适配器由 `tools/build-native-surface.ps1` 构建。隔离验证通过并冻结组件后，运行 `npm run package`。打包可先运行 `tools/prepare-packager.ps1` 准备带固定校验值的 NSIS 组件。默认输出 `dist/RModifier.exe`，可用 `RMODIFIER_PACKAGE_OUT` 指定项目内候选目录。

桌面打包消费已经验证的 `pfe-loot-safe.swf`，不要求恢复或改写正在使用的游戏主文件。确需重建桥接时，`build/bridge.ps1` 只能从已核验原始基线构建。

`tools/extract_catalog.py` 可重新提取本体目录。`tools/generate-fixtures.mjs` 生成两端一致性样本。游戏测试驱动需单独编译 `src/LootProbeDoc.as` 到 `build/out/LootProbeMod.swf`。`tests/ui.cjs`、`tests/native-host.cjs`、`tests/barks-host-regression.cjs` 控制真实 Electron 与隔离 AIR；用 `RMODIFIER_EXE` 指向解包候选。`tests/portable.cjs` 实际启动单文件 EXE，检查独立分发、重复启动与原界面加载，`RMODIFIER_PORTABLE_EXE` 可指定候选。旧 `tests/host-ui.cjs` 只对应 0.2.0 网页地图。测试必须同时提供独立测试根和明确游戏根，不能落入真实存档。

桌面版本为 0.4.0，随包提供掉落模块 0.3.0 与 v2 游戏连接。旧方案仍可读；包含原版词条修改的方案使用 schemaVersion 2，需升级连接后才能在游戏读取。已打开的旧编辑器需保存并关闭，再启动新版入口。

不要安装 `build/out/pfe-loot.swf`：它只是编译供体。唯一可安装候选是通过方法保持检查的 `pfe-loot-safe.swf`。完整证据见 `knowledge/verification-2026-09-28.md`。
