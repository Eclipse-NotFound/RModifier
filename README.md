# RModifier — edit loot, dialogue lines and maps

**English** · [简体中文](README.zh-CN.md)

A desktop workshop for enemy and container rewards, character remarks, and custom map rooms. **No programming or developer tools required. The application interface is in Chinese.**

**[Download v0.4.0 — RModifier.exe](https://github.com/Eclipse-NotFound/RModifier/releases/download/v0.4.0/RModifier.exe)** · [Release notes / other versions](https://github.com/Eclipse-NotFound/RModifier/releases)

Use the download link above, or open the release page, expand **Assets**, and select that filename. **Source code** and the green **Code → Download ZIP** button are development files, not the installable package.

For **Windows / Remains 1.02 single-player**, with the game installed locally. The public download is **0.4.0**, containing the three pages below. The authoring/block editor under development is not included in this download.

| I want to… | Open this page |
|---|---|
| Change enemy loot, container rewards or extra ammo | Loot — `掉落编辑` |
| Edit short situational character remarks | Character lines — `角色台词` |
| Draw rooms, save map copies, mix rooms into exploration | Maps — `地图编辑` |

## First launch

1. Download **RModifier.exe** above and double-click it. Bundled components extract automatically; you do not need the source archive.
2. Select your game folder when prompted. Steam Library → right-click Remains → **Manage → Browse local files** opens the folder containing `application.xml` and `pfe.swf`.
3. Choose an editor page and start with a copy or draft.

The loot connection uses ModLoader. If it is not installed, complete [first-time setup](https://github.com/Eclipse-NotFound/ModLoader/blob/master/docs/INSTALL.md#first-install), then use **Connect game** (`连接游戏`). For an existing connection, choose **Update game connection** (`更新游戏连接`). Save and close the game first, keep the prompted backups, and restart afterwards.

## Try a small change: six extra rounds in an ammo box

1. Under Loot, select **Copy and edit** (`复制并编辑`) to preserve the vanilla profile.
2. Select the ammo box, then **Add reward → Change item → 10mm rounds** (`添加一条奖励 → 更换物品 → 10mm 圆弹`).
3. Set chance to **100**, and both minimum and maximum quantity to **6**.
4. Click **Try 100 times** (`试 100 次`). Simulation does not alter characters or saves.
5. **Save profile → Apply profile** (`保存方案 → 应用方案`). After connecting and restarting the game, use **Refresh status** (`刷新状态`) to confirm it read the profile.

**Saved** keeps your work; **Applied** writes the game configuration; **Read after restart** confirms the running game picked it up.

## Lines, maps and recovery

Save a draft on the lines page, then export it for the game. Save a copy on the map page; **Save and mix into game generation** makes custom ordinary rooms eligible for future random generation, without guaranteeing they appear every time. Fixed story scenes do not enter random pools.

To undo loot changes, use **Restore all vanilla defaults**, apply and restart. To remove the connection, use **My profiles → Restore game before connection**. Preserve profiles, installation records and backups; do not simply delete the whole RModifier folder.

**[Full guide: reward rules, ammo, lines, maps, backups and limitations](docs/PLAYER-GUIDE.md)**

## Need help?

“Saved but nothing changed”: check whether you applied the profile, updated the game connection, fully restarted, and checked the read status.

“Unsupported game build”: keep the exact message; do not force-install someone else’s game files. DLC 1.03/1.04 and multiplayer loot synchronization are not certified.

[Report a problem (include game/tool versions, steps and errors)](https://github.com/Eclipse-NotFound/RModifier/issues)

<details>
<summary>Development resources (not needed to use the app)</summary>

[Build and validation notes](docs/DEVELOPMENT.md) · [Source progress](state/MEMORY.md)

</details>

[Browse the mod collection](https://github.com/Eclipse-NotFound/ModLoader#choose-mods) · [First-time installation guide](https://github.com/Eclipse-NotFound/ModLoader/blob/master/docs/INSTALL.md)

An unofficial fan project. You need your own copy of the game.
