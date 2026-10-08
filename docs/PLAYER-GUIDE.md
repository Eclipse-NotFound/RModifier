[Back to download and quick start](../README.md)

# RModifier 0.4.0

English · [简体中文](../README.zh-CN.md)

A visual editing workshop for **Fallout Equestria: REMAINS 1.02**. Edit loot, character lines, and maps in one desktop window. No programming, command line, or development tools are needed to use the released application.

**[Download RModifier 0.4.0](https://github.com/Eclipse-NotFound/RModifier/releases/tag/v0.4.0)** and choose **RModifier.exe** under Assets. GitHub's “Source code” downloads are for developers.

The application interface is currently **Chinese**. This English guide includes Chinese button labels to help you find the controls. The loot module is intended for single-player games. The separate DLC workshop is still in development and is **not included** in this release.

## Features

| Editor | What you can do |
|---|---|
| Loot | Browse enemies by faction, edit existing rewards, add items, adjust chances and quantities, and simulate drops. |
| Character lines | Edit short situational remarks, preview text, save drafts, and export a game language file. |
| Maps | Use the original Flash editor and pre-rendered preview, browse scenes and rooms, save copies, and mix custom rooms into normal game generation. |

Version 0.4.0 groups 85 enemy models into 10 factions/categories and supports direct editing of ordinary vanilla reward entries. It retains support for 62 advanced weapons and existing profiles. The inspected game installation contains 31 scene files and 662 rooms; the scene library reads the resources in your own installation.

The project directory has moved from `LootEditor` to `RModifier`. Existing profiles, configuration, and installation backups remain in use. The runtime module is still named `LootEditorMod`.

## Getting started

1. Download `RModifier.exe` from the release page.
2. Double-click it. The portable executable extracts its bundled components automatically; no Node.js or separate desktop runtime installation is needed.
3. Select your installed game folder if prompted. It must contain `application.xml` and `pfe.swf`. RModifier still needs the game's local resources.
4. Choose **Loot** (`掉落编辑`), **Character lines** (`角色台词`), or **Maps** (`地图编辑`) at the top.

Each page tracks its own unsaved changes. Switching pages preserves edits and undo history. When closing, you can save individual pages or keep recovery drafts for the next session. Saving one page does not automatically apply the other two.

Replacing the EXE does not update a running game. Editing vanilla loot entries in 0.4.0 requires the bundled **0.3.0 loot module and v2 game connection**. Use **Update game connection** (`更新游戏连接`), follow the backup prompts, then save, exit, and restart the game.

## Editing loot

1. Click **Copy and edit** (`复制并编辑`). The vanilla profile remains read-only.
2. Search under **Container rewards** (`容器奖励`) or **Enemy loot** (`敌人战利品`). Filter enemies by faction, then select a shared reward category or a specific enemy model.
3. Change an entry's item, chance, and minimum/maximum quantity, or add and remove entries. Equal minimum and maximum values give a fixed quantity. Leaving vanilla dynamic fields blank preserves the game's calculation.
4. Use **Try 1 / 100 / 1,000 times** (`试 1 次 / 100 次 / 1000 次`) to simulate results. This does not change characters or saves.
5. Click **Save profile** (`保存方案`) to keep your work. **Apply profile** (`应用方案`) writes the configuration for the next game launch.
6. On a supported installation, use **Connect game** (`连接游戏`) for the first connection, or **Update game connection** (`更新游戏连接`) for an older connection. After restarting the game, click **Refresh status** (`刷新状态`) to check whether the module read your configuration.

For example, to add six 10mm rounds to an ammo box, choose the box, click **Add reward** (`添加一条奖励`) → **Change item** (`更换物品`) → `10mm 圆弹`, set the chance to 100, and set both quantities to 6.

Advanced weapons have independent chances. Filter the item picker by **Advanced weapons** (`进阶武器`), choose an item, and set its entry's chance. A value of 30 gives that entry a 30% chance. Add ordinary weapons as separate entries, or use weighted alternatives under **More settings** (`更多设置`).

### Reward rules

- Each entry rolls independently; percentages do not need to total 100%. An entry with several candidates chooses one candidate per draw. A higher preference weight makes a candidate more likely. Weapon quantity and durability are separate settings.
- Specific enemy-model rules override shared rewards. **Reset this item** (`恢复本项`) removes the override and uses the current shared table again.
- Raiders, slavers, Talon mercenaries, and zebras share a reward table. Faction filtering only changes what you see; it does not restrict the effect of that shared table.
- Existing append/replace profiles show their effective rewards without being rewritten just by browsing. Map-assigned items, quest rewards, death scripts, and native weapon drops remain under game control.
- Vanilla ordered branches, progression checks, quotas, and safe-spawn behavior remain in the original code. Explicit custom items bypass random-pool progression filtering while retaining quantity quotas, currency scaling, and damage loss. Use the earliest/latest game-stage fields to limit availability.

The catalog covers 29 container-content categories, 47 enemy reward categories, 193 shared-category/model entries, and 692 items, including 62 advanced weapons. There are 346 extracted item icons; other entries use category icons. Items added by other mods are not automatically included.

### Extra ammunition from enemies

Open **Matching ammunition** (`对应弹药`) and enable **Drop extra matching ammunition** (`额外掉落对应弹药`). Alternatively, open **My profiles** (`我的方案`) → `示例 · 敌人额外弹药`, review the quantities, apply, and restart the game. Installing the connection alone does not apply this example.

- The default is 50% of a normal ammo pack: six 10mm rounds, ten ordinary batteries, or 25 spark batteries. Choose a fixed amount, a random range, or another percentage if preferred.
- Ammo type comes from the enemy's actual primary weapon before death. Special ammo can be converted to its base type.
- Existing random ammo, weapon drops, and ammo gained from picking up weapons remain, so total supplies increase.
- Rockets, 40mm grenades, and balefire bombs have separate switches, chances, and quantities, disabled by default.
- Allies, melee weapons, thrown grenades, spells, self-charging weapons, and unrecognized ammo types are skipped. Revivable enemies do not award ammo on an ordinary knockdown; final resolution awards it only once. Whether the weapon itself drops does not affect matching ammo.

These defaults are adjustable starting points, not the result of long-term balance testing.

## Editing character lines

Choose a character and situation, edit the sentence, and check the preview. **Save draft** (`保存草稿`) keeps edits, disabled lines, and author notes. Notes are not exported to the game.

**Export for game** (`导出给游戏`) can save a complete language file elsewhere or back up and write it into the game. You can also restore the previous write. To reuse drafts from the older browser tool, export them there first, then open them in RModifier.

## Editing maps and room pools

The map page uses the original Flash editor and its original pre-rendered preview. Open, Save, Save As, Undo, and Redo are inside that interface. The view fits the window automatically; press **Esc** to return from the preview. The preview can export PNG images.

Click **Scenes and rooms · My room pools** (`场景与房间 · 我的房间池`) to browse, create, duplicate, or rename rooms. Saving edits to an original scene creates a working copy automatically, preserving the original game file. **Save As** lets you choose another location. Switching scenes retains unsaved drafts.

For a random region, click **Save and mix into game generation** (`保存并加入游戏混抽`) to add edited or newly created ordinary rooms to its original room pool. Existing characters can use them during normal play. Restart after the first installation; rooms become eligible when the region is generated again. Random selection does not guarantee a custom room on every visit.

To stop mixing rooms for a region, select its original scene and disable that region's custom pool. Already generated maps remain intact; future generation returns to the original pool. Fixed story scenes can be edited as copies but are not inserted into random pools.

The original editor still exposes advanced property fields. Beginners can start with the material palette and drawing canvas. Incomplete property text survives page switches and can be kept in a recovery draft. Layer switching applies to fixed maps. The random-room review entry requires the RandomRooms editor components in the selected game installation.

See the [native editor guide](../map-editor/native-ui/README.md) and [scene library and room-pool design](../design/2026-09-28-scene-library-and-room-pools.md) for details (Chinese).

## Profiles, backups, and recovery

**My profiles** (`我的方案`) lets you copy, rename, import, export, and locate profiles. Undo/redo applies to the current editing session; restarting restores saved profiles and editing position.

- **Open last applied profile** (`打开上次应用方案`) opens a copy for inspection. Apply it before it takes effect.
- **Restore all vanilla defaults** (`恢复全部原版`) clears ordinary custom rewards and disables extra ammo. Apply and restart to restore vanilla loot behavior.
- **My profiles → Restore game before connection** (`我的方案 → 恢复连接前的游戏`) removes this connection while preserving profiles and saves. Exit the game first. If another tool subsequently changed the main SWF, automatic restoration stops to avoid overwriting those changes.

Connection installation creates a unique `pfe_before_LootEditor_<timestamp-and-id>.swf` backup in the game root. Keep that file and the installation records in `mods/RModifier/backups`. The historical backup prefix is intentional.

The connection uses the existing ModLoader, registers the loot module for 1.02 only, and invokes its scanner. Initial installation needs a targeted game-interface patch; everyday loot editing subsequently changes configuration. The installer accepts only verified game fingerprints, so a game update or another patch may require adaptation.

**Saved**, **Applied**, and **Read by the game on its latest launch** are different states. The last requires matching configuration fingerprints and a read receipt from the correct installation. You can also temporarily pause the loot workshop from the in-game ModLoader settings page.

## Compatibility and limitations

- Verified for the tested **Remains 1.02 single-player** installation. DLC 1.03/1.04 and multiplayer loot synchronization are not certified.
- This release does not create new weapons or edit individual map containers' quest items, traps, spawns, or death scripts. It does not expose arbitrary scripts or a custom condition-tree editor.
- Robot weapons without a recognized ammunition field are skipped; there is no manual robot-ammo assignment UI.
- Drop previews estimate ground drops. They exclude ammo gained from picking up weapons, duplicate-weapon repairs, and map-assigned rewards. Batch results vary; continuous simulation accumulates quota usage.
- Map pre-rendering is static. Preserving room navigation information does not mean recalculating routes. Unsupported or complex XML structures are rejected to preserve their contents.
- Native scaling and Chinese text entry were tested locally at 200% display scaling. Actual Chinese IME composition and movement between monitors with different scaling have not been fully tested.
- Automated UI interaction and isolated game checks have been performed. First-time user studies, long-term balance play, and exhaustive coverage of every enemy and map remain outstanding.
