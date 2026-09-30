# RModifier 外置记忆

## 1. 项目
中文独立编辑工坊，一个便携 RModifier.exe、同窗口掉落/角色台词/地图三页，无需编程。正式桌面 0.4.0（2026-09-30 交付），适配 Remains 1.02 单人。地图沿用原 Flash UI、预渲染和 67 种素材绘制。

## 2. 用户决定与协作
用户授权游戏接入、三页整合及地图/总整合会话直接协调。项目已从 mods/LootEditor 迁到 mods/RModifier，不重建旧目录，不改其他模组源码或原地图工具。界面用简洁中文，掉落/台词删除重复教程说明，保留状态、字段与错误。
地图最终方案：全部场景可浏览、修改、新建和保存副本；保留游戏原图；自建普通房间加入对应原版池混抽，让现有角色正常进入。固定剧情场景可编辑副本，不用随机混抽覆盖剧情地图。每份源文件同时启用一个自建池，只追加改过/新建的房间，未改原房不重复增重。
不代用户关闭编辑器或重启正式游戏。过去保存关闭旧窗口的答复不是长期授权；本次更新前没有用户编辑器在运行。没有应用示例方案或替用户启用地图混抽。
总整合会话 01a0e2e4-51b3-7463-ae9d-00ae0befbc73 于9月30日明确交由地图会话 01a0e2d6-d192-7232-81d0-7a9017db9ba9 完成0.4.0验收、入口更新及统一提交d528762，随后交还全局记录与提交窗口。DLC调研另行提交，不属于0.4.0功能。
用户新要求：制作新场景、生物与分支剧情的图形DLC编辑器；从一开始支持全新身体结构、动画和AI，与RModifier已有地图窗口分开，按可单独启动的独立窗口、自有项目/场景/草稿规划。具体生物尚未想好，六足生物/试验站只是概念示例。本轮只授权调查探索，不据此修改正式游戏或宣布完整编辑器已实现。

## 3. 当前状态
正式入口与固定 dist/rmodifier-0.4.0-r2/RModifier.exe 相同：131628757字节，SHA256 186deab0edef93d6b9abc2db70eeac6dbcb7a59e571aeb94f3e9aa1d21e5b7af。原子替换成功，498个受保护游戏/原图/模块/配置/作品文件哈希不变，没有自动打开新版窗口。
地图：31份已安装场景、662个房间，搜索/缩略图、新建/复制/改名、跨场景草稿恢复；原图“保存”自动建立房间池副本。“保存并加入游戏混抽”保存待改内容并安装 MapPoolMod 0.1.0，原版仍参与生成；停用不改已生成地图，下次生成恢复原版。
副本在 projects/maps/library，发布副本在 projects/maps/published，选择配置为 config/map-pools.json。首次发布安装 release/MapPoolMod.swf，并备份后向 supported-mods 与 loader-manifest 持久登记 RModifier|MapPoolMod|1|0|0，无需新改主SWF。此次桌面交付未替用户安装/启用MapPool。
掉落：85型号分为10阵营/种类，47张共享表保持原目标身份；四势力共用表影响范围不随筛选缩小。692物品含62进阶武器。打开对象即编辑原版与自定义普通奖励，保留旧方案、动态条件、后备分支和进阶独立概率。
包内提供 LootEditorMod 0.3.0（8dc689ee8dbe8b0ca1f5903372d8a6d452198961004a2bf99d0a0df3bb8762ec）及v2游戏桥（d6dda36c32ecf55fb82f798621fb1e30f093478f4bda9e1df7d6d1acef89e68c）；用户点击“更新游戏连接”确认备份后才安装，逐条改原版奖励需此升级。
正式 release/LootEditorMod.swf 仍0.2.1（502730145a8750011f41722b6f568aa102059a200598beeee5d2b60a8109e764），正式pfe仍 c631cbf3511b6ee303f533d08d51511fe0eb702f43e5db17f5241d8576c64867。本次只更新桌面入口。两种模块的安装器分别维护入口，互不删除注册。

## 4. 完成情况与验证
0.4.0实现、包核对、入口更新已完成；统一提交覆盖三项已冻结功能和交付记录。最终包407输入无漂移、实际ASAR390文件和8个原生组件一致。9月30日Node89、类型检查通过；最后仅修改场景库打开误提示，最终r2包地图宿主13、真实单文件6组通过并实看截图。
首个0.4.0包已通过阵营8、奖励词条8、掉落14、进阶武器8、台词宿主8；r2与它仅有地图打开提示和安装载荷时间戳不同，相关页面/其余宿主代码及全部SWF逐字节一致，保留原报告，不冒称这些检查在r2全部重跑。
地图同字节组件已有场景流程9、原UI19、材质9组/67种验证；MapPool实战71项含普通存档读回、同角色旅行、真实混合生成、进入自建房间站稳地板、停用保留当前地图、返回再生成恢复原版。掉落同字节新模块已有中文隔离游戏182项通过。尚无这些新功能的正式游戏用户运行回执，未设置后台监控。
交付证据 knowledge/evidence-rmodifier-0.4.0-2026-09-30/；editor-update.json为正式入口回执，package-comparison.json区分r1/r2，baseline-*为先前证据。地图交付清单revision5，组件manifest 604e34007136336c158c5cd43b513e13d893812c70984bed95597a3555a9c96b，MapPool SWF 23ae6b1e71e492ccda20a6f008cf4ea9714c01d011b673998d9781ed8eff3b49。
DLC调查已完成源码审计与独立窗口概念稿：Unit工厂写死、新生物需通用类/创建衔接；原生对白为线性播放，新选择分支需执行器；新地区还需入口与存档注册。路径有源码依据但新运行模块尚未实现。HTML仅静态检查通过，浏览器file: URL被安全策略拒绝，未绕过；视觉/真实交互及DLC游戏运行均未验。

## 5. 已知边界
仅认证1.02单人；DLC、联机、长期并用及真人新手试用未认证。混抽不保证每次出现，仍遵守原阶段/分区/次数/邻接规则。固定剧情地图不借混抽覆盖，玩家任意房间的剧情、路线和可通行性不由编辑器保证。
预渲染是静态场景，保留rrPlan不等于路线重算。完整原文、未知字段和脚本保留；不能可靠映射的复杂XML拒绝编辑。舞台强制自动适配，预览内缩放仍可用，Esc返回。真实中文输入法组合、跨显示器混合DPI、断电前尚未送达的输入未全面验证。
新奖励列表管理普通随机奖励；地图指定道具、重要任务物品、死亡脚本和原生掉枪仍由游戏处理。目录不会自动包含其他模组新增物品。

## 6. 回退与恢复
本次0.3.2旧入口备份 backups/editor/20260930T074417Z-a163ebb6-before-0.4.0/RModifier-0.3.2.exe，hash c8082af502594e347eb4db4272605cb441731049ba315faa9fe623cefb370fdb。关闭编辑器后恢复该EXE，保留新作品/配置；旧版没有新房间池界面。File.Replace必须传明确备份路径。
地图撤回：在场景库选择对应原版场景，点击“停止本地区的自建房间混抽”，保留副本和当前已生成地图。
游戏连接恢复另走“恢复连接前的游戏”，先退出游戏。最初备份 ../../pfe_before_LootEditor_2026-09-28T00-13-05-389Z-2a4d4198.swf，hash b78244657ed407d03808c90e97325509db35f802122835f58933fff8003305ac；config/installation.json保留最初回退点。其他补丁改变游戏指纹时不能直接覆盖。
更早固定包 dist/weapon-variants-0.3.2、dist/compact-ui-0.3.1及备份保留；首个0.4.0候选 dist/rmodifier-0.4.0也保留，不冒充最终r2。目录迁移回退见 ../.rmodifier-migration/1790576794146-3f61d4d1-3cbd-4ab6-ad98-cc8a4d33f6a8/migration.json，与桌面版本回退不同。

## 7. 深入了解与接续
- 本轮无剩余实现；用户从“地图编辑 → 场景与房间 · 我的房间池”开始，创建/修改副本后明确发布混抽。首次发布后启动新游戏进程，正常地区下次生成生效。
- 设计/验收：design/2026-09-28-scene-library-and-room-pools.md、2026-09-28-enemy-factions.md、2026-09-28-unified-reward-editor.md；文末追加9月30日统一交付结果。README、CHANGELOG和journal顶部为索引。
- DLC接续：design/2026-09-30-dlc-editor-exploration.md为总规划，design/2026-09-30-dlc-editor-concept.html为独立窗口概念，knowledge/2026-09-30-dlc-story-source-audit.md有原剧情完整链与存档边界，knowledge/2026-09-30-dlc-editor-concept-review.md记录界面验证范围。建议下一步是两间房+真正全新身体/动作/AI+两条回复+保存读取的隔离原型，先验证运行接入；目前未实施，不自动开启新开发阶段。
- 检查：npm run check；node --test tests/*.test.mjs map-editor/tests/native-document.test.cjs map-editor/tests/scene-library.test.cjs map-editor/tests/pool-runtime.test.cjs。打包 tools/package.mjs，RMODIFIER_PACKAGE_OUT指向新候选目录，tools/verify-native-package.cjs核对实际包。
- 地图 map-editor/native-ui/README.md与delivery-manifest.json；build-native-ui.ps1编私有组件，tests/native-host.cjs测宿主，tests/portable.cjs测真实单文件，map-editor/tests/map-pool-game.cjs测独立游戏。不要无理由重编冻结SWF，构建时间会改变哈希。
- 自动验证使用独立数据根和唯一AIR appID，仅停止本测试PID。Electron在受限环境曾无法加载页面，提权隔离验证通过；不据此改产品启动参数。取消关闭检查要等待真实对话结果及输入锁释放，不能用固定350ms猜完成。
- 台词接口 design/2026-09-28-barks-integration-api.md；公共机制 shared-knowledge/world-objects/discoveries/runtime-room-pool-cache-lifecycle.md。只消费已验证build/out/pfe-loot-safe.swf，不能用整类重编供体替换游戏。
