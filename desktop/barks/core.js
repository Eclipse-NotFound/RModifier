/* Lossless Remains bark-file adapter. No dependencies; shared by the browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BarkCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const escapeXml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
  function validCode(n) {
    return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 0xD7FF) || (n >= 0xE000 && n <= 0xFFFD) || (n >= 0x10000 && n <= 0x10FFFF);
  }
  function checkChars(s) {
    for (const c of s) if (!validCode(c.codePointAt(0))) throw new Error('文字里有游戏无法读取的隐藏字符，请删除后再试。');
  }
  function decodeXml(s) {
    checkChars(s);
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(s)) throw new Error('有一个 & 没有正确保存为文字。');
    return s.replace(/\r\n?/g, '\n').replace(/&(#x[\da-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, function (_, x) {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (has(named, x)) return named[x];
      const n = x[1] === 'x' ? parseInt(x.slice(2), 16) : parseInt(x.slice(1), 10);
      if (!validCode(n)) throw new Error('文件里有不受支持的文字编号。');
      return String.fromCodePoint(n);
    });
  }
  function fail(raw, pos, message) {
    const line = raw.slice(0, pos).split('\n').length;
    throw new Error('第 ' + line + ' 行：' + message);
  }
  // A position-aware XML scanner, including quoted attributes, comments, CDATA and processing instructions.
  // Retains all source offsets and rejects DTDs instead of resolving external definitions.
  function scanXml(raw) {
    if (typeof raw !== 'string' || raw.length > 5000000) throw new Error('文件太大或不是文字文件。请选择游戏的语言文本。');
    let p = raw.charCodeAt(0) === 0xFEFF ? 1 : 0;
    const stack = [], roots = [];
    function appendText(s, at, cdata) {
      if (s.includes(']]>') && !cdata) fail(raw, at, '文字含有不完整的结束标记。');
      try { if (!cdata) decodeXml(s); else checkChars(s); } catch (e) { fail(raw, at, e.message); }
      if (!stack.length && s.trim()) fail(raw, at, '文件开头或结尾有多余内容。');
      if (stack.length) stack[stack.length - 1].textParts.push({ text: s, cdata: !!cdata });
    }
    while (p < raw.length) {
      if (raw[p] !== '<') {
        let next = raw.indexOf('<', p); if (next < 0) next = raw.length;
        appendText(raw.slice(p, next), p, false); p = next; continue;
      }
      if (raw.startsWith('<!--', p)) {
        const end = raw.indexOf('-->', p + 4);
        if (end < 0 || raw.slice(p + 4, end).includes('--')) fail(raw, p, '注释没有正确结束。');
        p = end + 3; continue;
      }
      if (raw.startsWith('<![CDATA[', p)) {
        const end = raw.indexOf(']]>', p + 9);
        if (end < 0 || !stack.length) fail(raw, p, '一段文字没有正确结束。');
        appendText(raw.slice(p + 9, end), p, true); p = end + 3; continue;
      }
      if (raw.startsWith('<?', p)) {
        const end = raw.indexOf('?>', p + 2);
        if (end < 0) fail(raw, p, '文件说明没有正确结束。');
        p = end + 2; continue;
      }
      if (raw.startsWith('<!', p)) fail(raw, p, '这个文件使用了本编辑器不支持的外部定义。请选择原游戏语言文件。');
      let end = p + 1, quote = '';
      for (; end < raw.length; end++) {
        const c = raw[end];
        if (quote) { if (c === quote) quote = ''; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
      }
      if (end === raw.length) fail(raw, p, '文件在标记中间结束了。');
      const tag = raw.slice(p, end + 1);
      if (tag.startsWith('</')) {
        const m = /^<\/([A-Za-z_:][\w.:-]*)\s*>$/.exec(tag);
        const node = stack.pop();
        if (!m || !node || node.name !== m[1]) fail(raw, p, '前后标记不配对。');
        node.closeStart = p; node.end = end + 1;
      } else {
        const m = /^<([A-Za-z_:][\w.:-]*)/.exec(tag);
        if (!m) fail(raw, p, '有一个无法识别的标记。');
        const node = { name: m[1], start: p, openEnd: end + 1, closeStart: end + 1, end: end + 1,
          attrs: Object.create(null), attrSpans: [], children: [], textParts: [], selfClosing: /\/>$/.test(tag) };
        let a = m[0].length;
        const stop = tag.length - (node.selfClosing ? 2 : 1);
        while (a < stop) {
          const start = a;
          const ws = /^\s+/.exec(tag.slice(a));
          if (ws) a += ws[0].length;
          if (a >= stop) break;
          if (!ws) fail(raw, p + a, '属性之间缺少空格。');
          const am = /^([A-Za-z_:][\w.:-]*)\s*=\s*(["'])([\s\S]*?)\2/.exec(tag.slice(a));
          if (!am || am[3].includes('<')) fail(raw, p + a, '属性的引号或文字不完整。');
          if (has(node.attrs, am[1])) fail(raw, p + a, '同一个属性写了两次：' + am[1]);
          try { node.attrs[am[1]] = decodeXml(am[3]); } catch (e) { fail(raw, p + a, e.message); }
          node.attrSpans.push({ name: am[1], start: p + start, end: p + a + am[0].length });
          a += am[0].length;
        }
        if (stack.length) stack[stack.length - 1].children.push(node);
        else roots.push(node);
        if (!node.selfClosing) stack.push(node);
      }
      p = end + 1;
    }
    if (stack.length) fail(raw, raw.length, '文件没有完整结束。');
    if (roots.length !== 1) throw new Error('这不是一份完整的游戏语言文件。');
    return roots[0];
  }
  function plainText(node) {
    if (node.children.length) throw new Error('某句台词含有嵌套格式。本版只编辑普通文字，请先保留原文件。');
    return node.textParts.map(x => x.cdata ? x.text.replace(/\r\n?/g, '\n') : decodeXml(x.text)).join('');
  }
  function parseSource(raw, filename) {
    const root = scanXml(raw);
    if (typeof DOMParser !== 'undefined') {
      const document = new DOMParser().parseFromString(raw.replace(/^\uFEFF/, ''), 'application/xml');
      if (document.querySelector('parsererror')) throw new Error('文件格式不完整，浏览器无法把它读作游戏文本。原文件没有被修改。');
    }
    if (root.name !== 'all') throw new Error('选错文件了。请选择 text_zh.xml 等游戏语言文件。');
    const sections = root.children.filter(n => n.name === 'replic');
    if (sections.length !== 1) throw new Error('文件没有唯一的随机台词区域，暂时不能编辑。');
    const groups = [], seen = new Set();
    for (const node of sections[0].children.filter(n => n.name === 'rep')) {
      const id = node.attrs.id, act = node.attrs.act, key = id + '/' + act;
      if (!id || !act) throw new Error('有一组台词缺少角色或场景名称。');
      if (seen.has(key)) throw new Error('同一个角色场景出现了两次（' + key + '）。游戏只读第一组，请先核对源文件。');
      seen.add(key);
      const rows = node.children.filter(n => n.name === 'r').map(function (r, i) {
        return { uid: 'g' + groups.length + 'r' + i, origin: i, text: plainText(r), marked: has(r.attrs, 'm'), enabled: true, note: '', node: r };
      });
      groups.push({ key, id, act, node, rows });
    }
    if (!groups.length) throw new Error('文件里还没有可编辑的随机台词。');
    const langNode = root.children.find(n => n.name === 'lang');
    return { raw, filename: (filename || 'text_zh.xml').split(/[\\/]/).pop(), groups, section: sections[0],
      language: langNode ? plainText(langNode) : '导入的语言', languageId: langNode ? langNode.attrs.id : '', bom: raw.charCodeAt(0) === 0xFEFF, newline: raw.includes('\r\n') ? '\r\n' : '\n' };
  }
  function initialEntries(source) {
    const entries = Object.create(null);
    for (const g of source.groups) entries[g.key] = g.rows.map(({ uid, origin, text, marked, enabled, note }) => ({ uid, origin, text, marked, enabled, note }));
    return entries;
  }
  function applyPatches(raw, patches) {
    const sorted = patches.slice().sort((a, b) => b.start - a.start || b.end - a.end);
    let boundary = raw.length;
    for (const p of sorted) {
      if (p.start < 0 || p.end < p.start || p.end > boundary) throw new Error('修改范围有冲突，原文件没有被改动。');
      raw = raw.slice(0, p.start) + p.text + raw.slice(p.end);
      boundary = p.start;
    }
    return raw;
  }
  function renderRow(source, original, row) {
    if (original.text === row.text && original.marked === row.marked) return source.raw.slice(original.node.start, original.node.end);
    const n = original.node;
    let opening = source.raw.slice(n.start, n.openEnd);
    const marker = n.attrSpans.find(a => a.name === 'm');
    if (marker && !row.marked) opening = opening.slice(0, marker.start - n.start) + opening.slice(marker.end - n.start);
    if (!marker && row.marked) opening = opening.replace(/\/?>$/, function (ending) { return ' m="1"' + ending; });
    opening = opening.replace(/\/>$/, '>');
    return opening + escapeXml(row.text) + '</r>';
  }
  function lineIssues(text) {
    const result = [];
    try { checkChars(text); } catch (e) { result.push({ level: 'error', message: e.message }); }
    if (!text.trim()) result.push({ level: 'error', message: '这句还没写内容。写一句话，或把它设为“暂时不用”。' });
    const hashes = (text.match(/#/g) || []).length;
    if (hashes && (hashes !== 2 || !/^[^#]*#[^#|]*\|[^#|]*#[^#]*$/.test(text)))
      result.push({ level: 'error', message: '两种说法的格式不完整。请用“插入两种说法”重新填写。' });
    if ((text.match(/@lp/g) || []).length > 1) result.push({ level: 'warning', message: '同一句用了多次玩家名字，游戏只会替换第一次。' });
    if (/@(?!lp\b)[A-Za-z0-9_]+/.test(text)) result.push({ level: 'warning', message: '这里有一个游戏不认识的名字标记，可能会原样显示。' });
    if (text.length > 45) result.push({ level: 'warning', message: '这句较长，游戏里的停留时间不会变长，建议读一遍确认来得及。' });
    if (/【玩家名字(?!】)|【男：[^】]*$/.test(text)) result.push({ level: 'error', message: '插入的名字或两种说法还没有填写完整。' });
    return result;
  }
  function validate(source, entries) {
    const issues = [];
    for (const g of source.groups) {
      const rows = entries[g.key], active = rows.filter(r => r.enabled);
      for (const row of active) for (const issue of lineIssues(row.text)) issues.push(Object.assign({ key: g.key, uid: row.uid }, issue));
      if (!active.length) issues.push({ key: g.key, level: 'warning', message: '这个场景没有可用台词，角色会保持安静。' });
      if (active.length && active.every(r => r.marked)) issues.push({ key: g.key, level: 'warning', message: '这些句子都含粗口；游戏开启粗口过滤后，这个场景会保持安静。' });
      if (g.id === 'pip' && active.length === 1) issues.push({ key: g.key, level: 'warning', message: '玩家只剩一句可用台词。连续触发时，游戏可能为了避免重复而不说话。' });
      const seen = new Set();
      for (const row of active) {
        if (seen.has(row.text)) issues.push({ key: g.key, uid: row.uid, level: 'warning', message: '这句话重复了，抽到它的机会会增加。' });
        seen.add(row.text);
      }
    }
    return issues;
  }
  function exportXml(source, entries) {
    const issues = validate(source, entries), errors = issues.filter(x => x.level === 'error');
    if (errors.length) throw new Error(errors[0].message);
    const patches = [];
    for (const g of source.groups) {
      const rows = entries[g.key], added = rows.filter(r => r.origin === null && r.enabled);
      for (let i = 0; i < g.rows.length; i++) {
        const original = g.rows[i], current = rows.find(r => r.origin === i);
        if (!current || !current.enabled) patches.push({ start: original.node.start, end: original.node.end, text: '' });
        else if (current.text !== original.text || current.marked !== original.marked)
          patches.push({ start: original.node.start, end: original.node.end, text: renderRow(source, original, current) });
      }
      if (added.length) {
        const nl = source.newline;
        const rawRows = added.map(r => '\t<r' + (r.marked ? ' m="1"' : '') + '>' + escapeXml(r.text) + '</r>').join(nl);
        if (g.node.selfClosing) {
          patches.push({ start: g.node.start, end: g.node.end,
            text: source.raw.slice(g.node.start, g.node.openEnd).replace(/\/>$/, '>') + nl + rawRows + nl + '</rep>' });
        } else patches.push({ start: g.node.closeStart, end: g.node.closeStart, text: rawRows + nl });
      }
    }
    const result = applyPatches(source.raw, patches);
    parseSource(result, source.filename);
    return result;
  }
  function toFriendly(text) {
    return text.replace(/@lp/g, '【玩家名字】').replace(/#([^#|]*)\|([^#|]*)#/g, '【男：$1｜女：$2】');
  }
  function fromFriendly(text) {
    return text.replace(/【玩家名字】/g, '@lp').replace(/【男：([^】]*)｜女：([^】]*)】/g, '#$1|$2#');
  }
  function displayText(text, name, male) {
    const first = text.indexOf('#'), last = text.lastIndexOf('#');
    if (first >= 0 && last > first) {
      const options = text.slice(first + 1, last).split('|');
      text = text.slice(0, first) + (options[male ? 0 : 1] === undefined ? 'undefined' : options[male ? 0 : 1]) + text.slice(last + 1);
    }
    return text.replace('@lp', () => name || 'Littlepip');
  }
  function sample(rows, options) {
    const active = rows.filter(r => r.enabled), random = options.random || Math.random;
    if (!active.length) return { text: '', reason: '这个场景没有启用的句子。', previous: options.previous };
    function draw() {
      const row = active[Math.min(active.length - 1, Math.floor(random() * active.length))];
      return { row, text: options.filter && row.marked ? '' : displayText(row.text, options.name, options.player ? false : options.male),
        reason: options.filter && row.marked ? '这句含粗口，模拟的过滤开关已开启。' : '' };
    }
    let result = draw();
    if (options.player && result.text === options.previous) result = draw();
    if (options.player && result.text === options.previous)
      return { text: '', reason: '连续抽到上次说过的话，游戏会略过这次。', previous: options.previous };
    return Object.assign(result, { previous: result.text });
  }
  function changeSummary(source, entries) {
    const changes = [];
    for (const g of source.groups) {
      const current = entries[g.key];
      for (const old of g.rows) {
        const row = current.find(r => r.origin === old.origin);
        if (!row) changes.push({ key: g.key, uid: old.uid, kind: '删除', before: old.text, after: '' });
        else if (!row.enabled) changes.push({ key: g.key, uid: row.uid, kind: '停用', before: old.text, after: row.text });
        else if (row.text !== old.text || row.marked !== old.marked)
          changes.push({ key: g.key, uid: row.uid, kind: '修改', before: old.text, after: row.text, beforeMarked: old.marked, afterMarked: row.marked });
      }
      for (const row of current.filter(r => r.origin === null))
        changes.push({ key: g.key, uid: row.uid, kind: row.enabled ? '新增' : '新增 · 停用', before: '', after: row.text });
    }
    return changes;
  }
  async function digest(text) {
    if (!globalThis.crypto || !globalThis.crypto.subtle) throw new Error('浏览器暂不支持完整文件校验，请用新版 Edge 或 Chrome 打开。');
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
  }
  function makeProject(source, entries, hash, selected, title) {
    return { format: 'remains-barks-project', version: 1, title: title || '我的角色台词',
      savedAt: new Date().toISOString(), source: { filename: source.filename, raw: source.raw, sha256: hash },
      entries: clone(entries), selected: selected || source.groups[0].key };
  }
  async function readProject(data) {
    if (!data || data.format !== 'remains-barks-project' || data.version !== 1) throw new Error('这不是本编辑器保存的草稿。请选择 .barks.json 文件。');
    if (!data.source || typeof data.source.raw !== 'string') throw new Error('草稿缺少原始游戏文本，无法恢复。');
    const hash = await digest(data.source.raw);
    if (hash !== data.source.sha256) throw new Error('草稿里的原始文件校验不一致。请保留这份文件，改用另一份备份。');
    const source = parseSource(data.source.raw, data.source.filename), result = initialEntries(source), allUids = new Set();
    if (!data.entries || Object.keys(data.entries).length !== source.groups.length) throw new Error('草稿的场景记录不完整。');
    for (const g of source.groups) {
      const rows = data.entries[g.key], origins = new Set();
      if (!Array.isArray(rows) || rows.length > 10000) throw new Error('草稿里的句子记录不正确。');
      result[g.key] = rows.map(row => {
        if (!row || typeof row.uid !== 'string' || allUids.has(row.uid) || typeof row.text !== 'string' || row.text.length > 20000 ||
          typeof row.marked !== 'boolean' || typeof row.enabled !== 'boolean' ||
          !(row.origin === null || (Number.isInteger(row.origin) && row.origin >= 0 && row.origin < g.rows.length && !origins.has(row.origin))))
          throw new Error('草稿中有重复或不完整的句子记录，请保留文件并改用备份。');
        allUids.add(row.uid); if (row.origin !== null) origins.add(row.origin);
        return { uid: row.uid, origin: row.origin, text: row.text, marked: row.marked, enabled: row.enabled, note: typeof row.note === 'string' ? row.note.slice(0, 4000) : '' };
      });
    }
    return { source, entries: result, hash, selected: has(result, data.selected) ? data.selected : source.groups[0].key,
      title: typeof data.title === 'string' ? data.title.slice(0, 100) : '我的角色台词', savedAt: data.savedAt };
  }
  class History {
    constructor(entries) { this.entries = entries; this.undoStack = []; this.redoStack = []; this.serial = 0; }
    replace(key, next, mergeKey) {
      const previous = clone(this.entries[key]);
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      const last = this.undoStack[this.undoStack.length - 1];
      if (mergeKey && last && last.mergeKey === mergeKey) last.after = clone(next);
      else this.undoStack.push({ key, before: previous, after: clone(next), mergeKey: mergeKey || null });
      if (this.undoStack.length > 100) this.undoStack.shift();
      this.entries[key] = clone(next); this.redoStack = [];
    }
    boundary() { const last = this.undoStack[this.undoStack.length - 1]; if (last) last.mergeKey = null; }
    undo() { this.boundary(); const item = this.undoStack.pop(); if (!item) return null; this.entries[item.key] = clone(item.before); this.redoStack.push(item); return item.key; }
    redo() { const item = this.redoStack.pop(); if (!item) return null; this.entries[item.key] = clone(item.after); this.undoStack.push(item); return item.key; }
  }
  return { clone, escapeXml, scanXml, parseSource, initialEntries, exportXml, validate, lineIssues, toFriendly, fromFriendly,
    displayText, sample, changeSummary, digest, makeProject, readProject, History };
});
