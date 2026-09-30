// Display-only affiliations. Rule targets continue to use the original source keys.
export function sourceDisplayName(source) {
  if (source.kind === 'enemy' && source.scope === 'table' && source.factionIds?.length > 1)
    return source.name + '等 · 共用奖励';
  return source.name === source.id
    ? (source.kind === 'enemy' ? '敌人奖励' : '容器奖励') + ' · ' + source.id
    : source.name;
}

export function factionNames(catalog, source) {
  return catalog.enemyFactions.filter(f => source.factionIds?.includes(f.id)).map(f => f.name);
}

export function filterSources(catalog, {kind, scope, query = '', faction = 'all'}) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.sources.filter(source => {
    if (source.kind !== kind || source.scope !== scope) return false;
    if (kind === 'enemy' && faction !== 'all' && !source.factionIds.includes(faction)) return false;
    const labels = kind === 'enemy' ? factionNames(catalog, source).join(' ') : '';
    const haystack = `${source.name} ${source.id} ${labels}`.toLowerCase();
    return words.every(word => haystack.includes(word));
  });
}

export function groupEnemySources(catalog, sources) {
  // A shared table appears once, even when several factions use it.
  return [{id:'shared', name:'跨阵营共用'}, ...catalog.enemyFactions]
    .map(group => ({...group, sources:sources.filter(source =>
      (source.factionIds.length > 1 ? 'shared' : source.factionIds[0]) === group.id)}))
    .filter(group => group.sources.length);
}
