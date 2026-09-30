"""Stable reward call sites and plain-language labels from the local 1.02 source.

The executable expressions stay in the original table, never in profile JSON.
"""
import re, json

POOL_NAMES = dict(a='随机弹药', e='随机爆炸物', weapon='随机普通武器', uniq='随机进阶武器',
    med='随机医疗物品', book='随机技能书', him='随机药物', pot='随机药剂', food='随机食物',
    eda='随机食物', scheme='随机设计图', co='随机配方', paint='随机涂装', compa='随机通用材料',
    compw='随机武器材料', compe='随机爆炸物材料', compm='随机机械材料', compp='随机魔法材料',
    spec='随机特殊物品', instr='随机工具', stuff='随机杂物', art='随机饰品', impl='随机植入物')

def arguments(text):
    start=text.index('newLoot(')+8; depth=0; quote=False; parts=[]; at=start
    for i in range(start,len(text)):
        c=text[i]
        if c=='"': quote=not quote
        if quote: continue
        if c in '([': depth+=1
        elif c in ')]':
            if c==')' and depth==0:
                parts.append(text[at:i].strip()); return parts,start,i
            depth-=1
        elif c==',' and depth==0: parts.append(text[at:i].strip()); at=i+1
    raise ValueError(text)

def annotate(body,kind,constants,items):
    rows={}; output=[]; tables=[]; count=0; contexts={}; previous={}; repeats=''; bykey={i['key']:i for i in items}
    def title(args):
        typ=constants.get(args[1].replace('Item.',''),args[1].strip('"')); ident=args[2] if len(args)>2 else 'null'
        value=ident[1:-1] if re.fullmatch(r'"[^"+]*"',ident) else None
        ikind='weapon' if typ in ('weapon','uniq') else 'armor' if typ=='armor' else 'item'
        key=ikind+':'+value if value else None
        if key in bykey: return bykey[key]['name'],key,typ
        if '"gem" +' in ident: return '随机宝石',None,'gems'
        if '_loc10_[' in ident: return '尚未拥有的进阶武器',None,'unowned'
        label=POOL_NAMES.get(typ)
        if label is None: raise ValueError('Unknown pool '+typ)
        if typ=='weapon' and value and value.isdigit(): label+='（档次 '+value+'）'
        return label,None,typ
    def condition(expr):
        if expr.startswith('!newLoot('): return '未获得「'+title(arguments(expr)[0])[0]+'」时'
        names={'World.w.pers.freel':'有额外弹药能力时','World.w.pers.barahlo':'有额外材料能力时',
            'param5 > 0':'仅精英敌人','loc.land.act.biom == 0':'原版普通地区环境',
            'param1.itemsTip == "bibl"':'在图书馆时','param1.land.act.id == "minst"':'在印象部场景时',
            'is_loot == 0':'前面所有奖励都未获得时',
            'Math.random() < Math.min(_loc7_ / 5,0.7)':'随机分支（随地区难度变化，最高 70%）',
            'Math.random() < 0.5':'随机分支（50%）',
            'Math.random() < 0.25':'搜出小动物时（25%）','Math.random() < 0.2':'搜出小动物时（20%）',
            '_loc10_.length':'还有未拥有的进阶武器时',
            'World.w.land.rnd && param1.prob == null && Math.random() < 0.05':'随机地区的非挑战房间触发生怪时（5%）'}
        if expr in names: return names[expr]
        if expr.startswith('_loc9_'): return repeats
        raise ValueError('Unlabelled reward condition: '+expr)
    for line in body.splitlines():
        indent=len(line)-len(line.lstrip()); stripped=line.strip()
        if not stripped or stripped in ('{','}'): output.append(line); continue
        for n in list(contexts):
            if n>=indent: contexts.pop(n)
        match=re.search(r'(?:else )?if\((.*)\)$',stripped)
        if match:
            expr=match[1]
            if 'param4 ==' in expr:
                tables=re.findall(r'param4 == "([^"]+)"',expr); count=0
                for t in tables: rows[kind+':'+t]=[]
            elif tables:
                # A call in the condition belongs to the parent, not its own fallback.
                if not expr.startswith('!newLoot('): contexts[indent]=expr
                previous[indent]=expr
        elif stripped=='else' and tables:
            contexts[indent]='ELSE:'+previous.get(indent,'')
        if stripped.startswith('_loc8_ ='):
            expr=stripped.split('=',1)[1].strip(' ;')
            repeats={'3':'每次尝试 3 次','Math.floor(Math.random() * 4 - 1)':'每次随机尝试 0～3 次',
                'Math.floor(Math.random() * 4 + 2)':'每次随机尝试 3～6 次',
                'Math.floor(Math.random() * 2)':'每次随机尝试 1～2 次'+('；额外材料能力再增加 2 次' if tables==['trash'] else ''),
                'Math.floor(Math.random() * 3 - 1)':'每次随机尝试 0～2 次',
                'Math.floor(Math.random() * 3)':'每次随机尝试 1～3 次'}.get(expr,'')
        if stripped.startswith('while(') and tables: contexts[indent]=stripped[6:-1]
        if 'newLoot(' in line:
            args,start,end=arguments(line); count+=1; slot=kind+':'+tables[0]+':'+str(count)
            label,key,pool=title(args); notes=[]
            for dep,expr in sorted(contexts.items()):
                if dep>=indent: continue
                if expr.startswith('ELSE:'):
                    prior=expr[5:]
                    if prior.startswith('Math.random() < 0.2'): note='没有搜出小动物时'
                    elif prior.startswith('World.w.land.rnd'): note='没有触发生怪时'
                    elif prior=='_loc10_.length': note='已拥有全部指定进阶武器时'
                    else: note='其他情况下'
                else: note=condition(expr)
                if note: notes.append(note)
            if 'term' in tables and count in (2,3): notes.insert(0,'在印象部以外的场景')
            chance=round(float(args[0])*100,10) if re.fullmatch(r'[\d.]+',args[0]) else None
            amount=args[3] if len(args)>3 else '-1'; equipment=pool in ('weapon','uniq','unowned')
            fixed=1 if equipment else (int(amount) if re.fullmatch(r'\d+',amount) else bykey[key]['count'] if amount=='-1' and key else None)
            quantity='1 件' if equipment else '按物品常规份量' if amount=='-1' else '随地区难度和随机结果变化' if '_loc7_' in amount else '随开锁奖励和随机结果变化' if 'param6' in amount else '随机数量'
            row=dict(slot=slot,name=label,key=key,pool=pool,chance=chance,quantity=fixed,quantityText=quantity,conditions=notes,
                     chanceText='随开锁奖励变化' if chance is None else '',equipment=equipment,worth=int(args[2].strip('"')) if pool=='weapon' and len(args)>2 and re.fullmatch(r'"[0-9]+"',args[2]) else None)
            for t in tables: rows[kind+':'+t].append(row)
            output.append(line[:start]+json.dumps(slot)+','+line[start:])
            if match and match[1].startswith('!newLoot('): contexts[indent]=match[1]
        else: output.append(line)
    return '\n'.join(output),rows
