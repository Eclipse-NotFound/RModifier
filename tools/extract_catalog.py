"""Build a local catalogue and vanilla simulator from this installation's reference.
No game files are changed. Generated source contains no user-supplied expressions.
"""
import re, json, hashlib, sys
from pathlib import Path
import xml.etree.ElementTree as ET
from loot_entries import annotate
from enemy_factions import annotate_factions

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT.parents[1]
SRC = GAME / 'game-reference/decompiled/1.02/src102/scripts'
OUT = ROOT / 'desktop/data'
OUT.mkdir(parents=True, exist_ok=True)
source = (SRC/'fe/AllData.as').read_text(encoding='utf-8-sig')
data = ET.fromstring(source[source.index('<all>'):source.index('</all>')+6])
lang = ET.parse(GAME/'text_zh.xml').getroot()
english = ET.parse(GAME/'text_en.xml').getroot()

def names(tree):
    return {(x.tag, x.get('id')): ''.join(x.find('n').itertext()).strip() for x in tree if x.find('n') is not None}

zh, en = names(lang), names(english)
pip = {x.get('id'): ''.join(x.itertext()).strip() for x in lang.iter() if x.get('id') and x.tag in ('t','p','text')}
def name(tag, id):
    return zh.get((tag,id), en.get((tag,id),id))

items = []
weapons = {x.get('id'): x for x in data.findall('weapon')}
for x in data:
    if x.tag not in ('item','weapon','armor'): continue
    a = dict(x.attrib)
    id = a['id']
    if x.tag == 'weapon' and (int(a.get('tip','0')) not in (1,2,3) or not (('weapon',id) in zh or ('weapon',id) in en)): continue
    if x.tag == 'item' and a.get('tip') in ('key',): continue
    # Explosives are inventory items whose associated weapon defines behaviour.
    typ = a.get('tip','item') if x.tag == 'item' else x.tag
    ntag = 'weapon' if typ == 'e' else x.tag
    nm = name(ntag,id)
    if nm == id: nm = name('item',id)
    if x.tag == 'item' and a.get('base'):
        nm = name('item',a['base'])
        if a.get('mod'): nm += '（'+name('pip','am_'+a['mod'])+'）'
    if x.tag == 'item' and nm==id and id.startswith(('s_','r_')):
        target=name('item',id[2:])
        if target==id[2:]: target=name('weapon',id[2:])
        nm=target+('设计图' if a.get('work')=='work' else '配方')
    a.update(key=x.tag+':'+id,kind=x.tag,tip=typ,name=nm,
             count=int(a.get('kol','1')),stage=int(a.get('stage','0')),level=float(a.get('lvl','0')),
             description=''.join(next((z.find('d').itertext() for z in lang if z.tag == ntag and z.get('id') == id and z.find('d') is not None),[])))
    if x.tag == 'weapon':
        a['weaponTip']=int(x.get('tip','0'))
        a['ammo'] = x.findtext('a','').strip()
        a['recharg']=any(n.get('recharg','0')!='0' for n in x)
        if x.find('com') is not None: a['pool'] = dict(x.find('com').attrib)
    items.append(a)
    # uniq=0 means an existing upgrade excluded from the random pool, not an
    # absent upgrade. Keep explicit choices separate from the vanilla pools.
    if x.tag == 'weapon' and x.find('com') is not None and 'uniq' in x.find('com').attrib:
        variant_id = id+'^1'
        variant_name = name('weapon',variant_id)
        if variant_name == variant_id: variant_name = nm+' - II'
        advanced = dict(a, key='weapon:'+variant_id, variant=1, baseKey=a['key'], baseName=nm, name=variant_name)
        advanced.pop('pool',None)
        items.append(advanced)

cont_labels = dict(zip('ammo metal bomb expl bigexpl wbattle case wbig robocell instr instr2 trash fridge food med med2 table filecab cup bloat book term info cryo chest safe specweap specalc speclp'.split(),
 '弹药盒|金属残骸|炸弹拆解|爆炸物箱|大型爆炸物箱|战场武器箱|手提箱|大型武器箱|机器人电池|工具箱|高级工具箱|垃圾容器|冰箱|食物容器|医疗箱|高级医疗箱|桌子|文件柜|橱柜|血翼虫容器|书架|终端|资料容器|冷冻容器|宝箱|保险箱|特殊武器奖励|特殊药剂奖励|特殊任务奖励'.split('|')))
loot = (SRC/'fe/serv/LootGen.as').read_text(encoding='utf-8-sig')

def body(method):
    start = loot.index('public static function '+method)
    start = loot.index('{',start)
    level=1; end=start+1
    while level:
        if loot[end]=='{': level+=1
        elif loot[end]=='}': level-=1
        end+=1
    return loot[start+1:end-1]

keys = re.findall(r'param4 == "([^"]+)"',body('lootDrop'))
sources=[]
for k,n in cont_labels.items(): sources.append(dict(key='container:table:'+k,kind='container',scope='table',id=k,table=k,name=n))
for k in keys: sources.append(dict(key='enemy:table:'+k,kind='enemy',scope='table',id=k,table=k,name='巨蝎' if k=='scorp' else name('unit',k)))
for x in data.findall('unit'):
    if int(x.get('fraction','1')) not in range(1,100): continue
    k=x.get('cont',x.get('id'))
    if k not in keys: continue
    sources.append(dict(key='enemy:model:'+x.get('id'),kind='enemy',scope='model',id=x.get('id'),table=k,name=name('unit',x.get('id')),
                        weapons=[dict(w.attrib) for w in x.findall('w')]))
for x in data.findall('obj'):
    if x.get('cont') not in cont_labels: continue
    k=x.get('cont')
    sources.append(dict(key='container:model:'+x.get('id'),kind='container',scope='model',id=x.get('id'),table=k,name=name('obj',x.get('id'))))

enemy_factions=annotate_factions(sources,data)

constants=dict(re.findall(r'public static const (\w+):\* = "([^"]+)";', (SRC/'fe/serv/Item.as').read_text(encoding='utf-8-sig')))
generated=['// Generated from local Remains 1.02 LootGen. Never accepts user code.',
           'export function vanillaTable(kind, key, env, emit, random) {',
           'const Math = Object.create(globalThis.Math); Math.random = random;',
           'const Item = '+json.dumps(constants)+';',
           'const World = {w:env.world}, loc = env.loc, nx=0, ny=0;',
           'const param1=loc, param2=0, param3=0, param4=key, param5=env.hero||0, param6=env.bonus??50;',
           'let lootBroken=!!env.broken, is_loot=0;',
           'const replic=()=>{};',
           'const newLoot=(slot,chance,type,id=null,count=-1)=>{ const ok=emit(chance,type,id,count,slot); if(ok) is_loot++; return ok; };',
           'if(kind === "container") {']
native_tables={}
for idx,m in enumerate(('lootCont','lootDrop')):
    b, entries=annotate(body(m),'container' if idx==0 else 'enemy',constants,items)
    native_tables.update(entries)
    b=re.sub(r'var (\w+):(?:Number|int|Array|Boolean|\*)', r'var \1',b)
    b=re.sub(r'^\s*(lootBroken|loc|nx|ny) = .*?;\s*$', '', b,flags=re.M)
    # Counters and integer coercion match the original expression semantics.
    b=b.replace('new Array()','[]').replace('int(','Math.trunc(')
    generated.append(b)
    if idx==0: generated.append('} else {')
generated.extend(['}','}'])
(OUT/'vanilla.mjs').write_text('\n'.join(line.rstrip() for line in '\n'.join(generated).splitlines()).rstrip()+'\n',encoding='utf-8',newline='\n')
payload=dict(version='1.02',sourceHash=hashlib.sha256(source.encode()).hexdigest(),items=items,sources=sources,nativeTables=native_tables,enemyFactions=enemy_factions,
             containerKeys=list(cont_labels),enemyKeys=keys)
(OUT/'catalog.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
print(json.dumps(dict(items=len(items),sources=len(sources),containerKeys=len(cont_labels),enemyKeys=len(keys))))
