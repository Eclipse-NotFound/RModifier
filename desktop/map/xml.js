/* Position-preserving XML scanner, adapted from the project bark adapter.
   Map-owned copy: independent of bark UI/language-editing rules. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.MapXML=api;})(globalThis,function(){
  'use strict';
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
    if (typeof raw !== 'string' || raw.length > 8000000) throw new Error('文件太大或不是文字文件。请选择地图 XML。');
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
      if (raw.startsWith('<!', p)) fail(raw, p, '这个文件使用了本编辑器不支持的外部定义。请选择不含外部定义的地图文件。');
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
    if (roots.length !== 1) throw new Error('这不是一份完整的 XML 文件。');
    return roots[0];
  }
  function plainText(node) {
    if (node.children.length) throw new Error('地形文字含有嵌套标记，无法直接绘制。');
    return node.textParts.map(x => x.cdata ? x.text.replace(/\r\n?/g, '\n') : decodeXml(x.text)).join('');
  }
  return {escapeXml,scanXml,plainText};
});
