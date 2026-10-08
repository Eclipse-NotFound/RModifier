# RModifier — 掉落、台词与地图编辑工坊

[English](README.md) · **简体中文**

一个独立窗口，修改敌人和容器奖励、角色短台词，或绘制自己的地图房间。**中文界面，无需编程或安装开发工具。**

**[下载 v0.4.0 — RModifier.exe](https://github.com/Eclipse-NotFound/RModifier/releases/download/v0.4.0/RModifier.exe)** · [发布说明 / 其他版本](https://github.com/Eclipse-NotFound/RModifier/releases)

点击上方链接下载成品。也可以打开发布页，展开 **Assets（下载文件）**，选择同名文件；**Source code** 和绿色 **Code → Download ZIP** 是源码，不能直接安装。

适用 **Windows / Remains 1.02 单人游戏**，需要本机已安装游戏。当前公开下载为 **0.4.0**，包含以下三页；开发中的创作工坊/积木功能不在这个下载包内。

| 我想做什么 | 打开哪一页 |
|---|---|
| 改敌人掉落、箱子奖励或额外弹药 | 掉落编辑 |
| 修改角色在各种场景说的短句 | 角色台词 |
| 绘制房间、保存地图副本、加入随机探索 | 地图编辑 |

## 第一次打开

1. 点击上方链接，下载 **RModifier.exe**，双击运行。它会自动释放组件，不用再下载源码。
2. 按提示选择游戏文件夹：Steam 库右键 Remains → **管理 → 浏览本地文件**，找到含 `application.xml` 与 `pfe.swf` 的目录。
3. 选择要用的编辑页。先做一份副本或草稿，再尝试下面的小例子。

掉落接入使用 ModLoader。如果游戏尚未安装它，先按[首次安装指南](https://github.com/Eclipse-NotFound/ModLoader/blob/master/docs/INSTALL.zh-CN.md#first-install)准备，再使用编辑器中的“连接游戏”。更新已有连接时选择“更新游戏连接”，按提示保留备份；保存退出游戏后再操作，完成后重新启动。

## 试一个小改动：弹药箱多给 6 发子弹

1. 在“掉落编辑”点击 **复制并编辑**，保留原版方案。
2. 找到想改的弹药箱，点击 **添加一条奖励 → 更换物品 → 10mm 圆弹**。
3. 概率填 **100**，最少和最多数量都填 **6**。
4. 点击 **试 100 次** 检查结果；模拟不会改变游戏角色或存档。
5. **保存方案 → 应用方案**；完成游戏连接并重启后，点击 **刷新状态** 确认游戏已读取。

**保存**只是保留作品；**应用**才会写入游戏配置；**重启后已读取**才说明本次游戏正在使用它。

## 台词、地图与恢复

台词页先“保存草稿”，再“导出给游戏”。地图页先保存副本；随机地区用“保存并加入游戏混抽”让自己的普通房间参与之后的随机生成，不保证每次都抽到。固定剧情场景不会加入随机池。

想撤回掉落改动，使用“恢复全部原版”，再应用并重启；完整卸载连接使用“我的方案 → 恢复连接前的游戏”。保留方案、安装记录及备份，不要直接删整个 RModifier 目录。

**[完整使用说明：掉落规则、弹药、台词、地图、备份与限制](docs/PLAYER-GUIDE.zh-CN.md)**

## 遇到问题

“保存了但游戏没变化”：检查是否应用、是否更新游戏连接、是否完全重启，以及“刷新状态”的读取结果。

“游戏版本不支持”：保留提示原文，不要强行套用别人的游戏文件。DLC 1.03/1.04 与联机掉落同步未认证。

[反馈问题（附游戏/工具版本、操作步骤和报错）](https://github.com/Eclipse-NotFound/RModifier/issues)

<details>
<summary>开发资料（普通使用无需阅读）</summary>

[构建与验证说明](docs/DEVELOPMENT.zh-CN.md) · [源码进度](state/MEMORY.md)

</details>

[查看全部模组及玩法介绍](https://github.com/Eclipse-NotFound/ModLoader/blob/master/README.zh-CN.md#choose-mods) · [首次安装指南](https://github.com/Eclipse-NotFound/ModLoader/blob/master/docs/INSTALL.zh-CN.md)

这是玩家制作的非官方模组项目，需要自行拥有游戏。
