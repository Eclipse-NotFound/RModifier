"""Player-facing affiliations, verified against AllData and the 1.02 bestiary.

Combat fraction and loot cont both merge several factions; neither is a faction
label. Keep source IDs and rule targets untouched. See the enemy-factions report.
"""

FACTIONS = [dict(id=k, name=n) for k, n in [
    ('raider', '掠夺者'), ('slaver', '奴隶贩子'), ('merc', '鹰爪雇佣兵'),
    ('zebra', '斑马军团'), ('ranger', '铁骑卫'), ('encl', '天马英克雷'),
    ('alicorn', '天角兽'), ('zombie', '尸鬼'), ('monster', '怪物'), ('robot', '机械单位')]]

ROOTS = {k: k for k in ('raider', 'slaver', 'merc', 'zebra', 'ranger', 'encl', 'alicorn', 'zombie')}
ROOTS['hellhound1'] = 'encl'  # The bestiary identifies this as an Enclave-controlled hound.
ROOTS.update(dict.fromkeys('bloat ebloat bloodwing bloodwing2 fish1 fish2 rat molerat scorp ant slime pinkslime necros'.split(), 'monster'))
ROOTS.update(dict.fromkeys('robobrain protect gutsy eqd sentinel spritebot vortex roller turret turret1'.split(), 'robot'))


def annotate_factions(sources, data):
    units = {x.get('id'): x for x in data.findall('unit')}

    def affiliation(id):
        original, seen = id, set()
        while id not in seen:
            if id in ROOTS:
                return ROOTS[id]
            seen.add(id)
            node = units.get(id)
            if node is None:
                break
            # parent wins: slaver/merc/zebra variants all have cont=raider.
            id = node.get('parent') or node.get('cont')
        raise ValueError('Enemy affiliation needs review: ' + original)

    models = [s for s in sources if s['kind'] == 'enemy' and s['scope'] == 'model']
    for model in models:
        model['factionIds'] = [affiliation(model['id'])]
    for source in sources:
        if source['kind'] != 'enemy' or source['scope'] != 'table':
            continue
        members = {f for m in models if m['table'] == source['table'] for f in m['factionIds']}
        if not members:
            raise ValueError('Enemy loot table has no classified models: ' + source['id'])
        source['factionIds'] = [f['id'] for f in FACTIONS if f['id'] in members]
    return FACTIONS
