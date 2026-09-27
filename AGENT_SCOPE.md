# LootEditor — 掉落工坊

- 项目：独立中文掉落编辑器 + Remains 1.02 单人掉落模块。
- 权限与流程：遵守根目录 `GOVERNANCE.md`；不修改其他模组源码。
- 运行入口：`LootEditorMod.init(main:*)`，最终路径 `release/LootEditorMod.swf`，通过现有 ModLoader 加载。
- 配置：`config/active.json`；方案：`profiles/`；日志与本次读取回执：AIR 应用自己的 Local Store。
- 构建与隔离验证只写 `build/out/`；未经安装授权不替换根游戏 SWF。
- 设计依据：`../../讨论档案/2026-09-27-loot-editor-plan.md`。
- 从 `state/MEMORY.md` 接续。正式模块不包含自动开档、传送、伤害等测试代码。
