(function () {
  'use strict';
  const api=parent.workshop;
  const memory=new Map(),localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  let bootData,documentId=crypto.randomUUID(),saving=false;
  const C = window.BarkCore, K = window.BarkCatalog, $ = id => document.getElementById(id);
  const STORE = 'remains-barks-draft-v1', PREVIOUS = STORE + '-previous';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let source, history, sourceHash, selectedKey, selectedUid, title = '我的角色台词';
  let autosaveTimer, toastTimer, storageOkay = true, lastSaved = '', previewOverride = null, previousSample;
  let modalReturnFocus = null, searchLimit = 60, revision = 0, downloadedRevision = 0, recoveryBlocked = false;
  const languageNames = { zh: '简体中文', en: '英语', de: '德语', es: '西班牙语', jp: '日语', pl: '波兰语', ru: '俄语', tw: '繁体中文', ua: '乌克兰语' };
  const entries = () => history.entries;
  const group = () => source.groups.find(g => g.key === selectedKey);
  const selected = () => entries()[selectedKey].find(r => r.uid === selectedUid);
  function languageCode() {
    const named = (source.filename.match(/^text_([a-z]+)(?:\s*\(\d+\))?\.xml$/i) || [])[1];
    const id = ({ ch: 'zh', uk: 'ua', ja: 'jp' })[source.languageId] || source.languageId;
    return languageNames[named] ? named : (languageNames[id] ? id : '');
  }
  const language = () => languageNames[languageCode()] || source.language;
  const targetFilename = () => languageCode() ? 'text_' + languageCode() + '.xml' : source.filename;
  const changed = (g, row) => row.origin === null || !row.enabled || row.text !== g.rows[row.origin].text || row.marked !== g.rows[row.origin].marked;
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3800);
  }
  function showModal(heading, body, actions) {
    if (!$('modal').open) modalReturnFocus = document.activeElement;
    $('modal-title').textContent = heading; $('modal-body').innerHTML = body; $('modal-actions').replaceChildren();
    for (const action of actions || []) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'button ' + (action.style || '');
      b.textContent = action.label; b.disabled = !!action.disabled; b.addEventListener('click',()=>Promise.resolve().then(action.run).catch(e=>toast(e.message))); $('modal-actions').append(b);
    }
    if (!$('modal').open) $('modal').showModal();
    $('modal').scrollTop = 0;
  }
  function closeModal() { $('modal').close(); }
  function confirmLeave(run) {
    if (!history || revision === downloadedRevision) { run(); return; }
    showModal('当前草稿未保存', '<p>保存后再打开另一份文件？</p>', [
      { label: '返回继续编辑', run: closeModal },
      { label: '直接切换', run: () => { closeModal(); run(); } },
      { label: '保存草稿，再切换', style: 'primary', run: async () => { if(await saveProject()){closeModal();run();} } }
    ]);
  }
  function safeFilename(value) { return String(value).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 120) || '我的台词'; }
  function project() { return C.makeProject(source, entries(), sourceHash, selectedKey, title); }
  function pageState(){return {documentId,revision,savedRevision:downloadedRevision,dirty:revision!==downloadedRevision,saving};}
  async function persist() {
    clearTimeout(autosaveTimer); autosaveTimer=null;if(!source)return true;
    if(recoveryBlocked)throw Error('上次草稿尚未处理，原文件仍保留');
    const p=project(),state=pageState();
    try{await api.barksRecover(p,state);if(documentId===state.documentId){lastSaved=p.savedAt;storageOkay=true;updateSaveStatus();}return true;}
    catch(e){storageOkay=false;updateSaveStatus();throw e;}
  }
  async function archiveBeforeSwitch() {
    if (!source) return;
    if(!recoveryBlocked)await persist();
    localStorage.setItem(PREVIOUS,JSON.stringify(project()));recoveryBlocked=false;
  }
  function scheduleSave() {
    $('save-status').textContent = '自动留存中…'; clearTimeout(autosaveTimer); autosaveTimer = setTimeout(()=>persist().catch(e=>toast('自动留存失败：'+e.message)), 450);
  }
  function updateSaveStatus(){
    $('save-status').classList.toggle('error',!storageOkay);
    $('save-status').textContent=!storageOkay?'自动留存失败，请保存草稿':saving?'保存中…':autosaveTimer?'自动留存中…':revision!==downloadedRevision?'未保存草稿 · 已自动留存':revision?'草稿已保存':'未修改';
    parent.RMHost.state('barks',pageState());
  }
  async function saveProject(){
    if(!source||saving)return false;const r=revision,p=project(),thisDocument=documentId;saving=true;updateSaveStatus();
    try{const saved=await api.barksSave(p,r);if(!saved||documentId!==thisDocument)return false;downloadedRevision=saved.revision;updateSaveStatus();await persist();toast(revision===downloadedRevision?'草稿已保存':'草稿已保存 · 新修改未保存');return revision===downloadedRevision;}
    catch(e){toast('保存失败：'+e.message);throw e;}
    finally{saving=false;updateSaveStatus();}
  }
  function refreshStatus() {
    $('undo').disabled = !history.undoStack.length; $('redo').disabled = !history.redoStack.length;
    const all = Object.values(entries()).flat(), roles = new Set(source.groups.map(g => g.id));
    $('total-count').textContent = roles.size + ' 类角色 · ' + source.groups.length + ' 个场景 · ' + all.filter(r => r.enabled).length + ' 句已启用';
    const changes = C.changeSummary(source, entries());
    $('review-changes').textContent = changes.length ? '查看 ' + changes.length + ' 处修改' : '查看修改';
    const rows = entries()[selectedKey];
    if (!$('search').value.trim()) $('list-count').textContent = rows.filter(r => r.enabled).length + ' 句已启用';
    const row = selected();
    if (row) {
      const badge = document.querySelector('.line-card.selected .edit-badge');
      if (badge) { badge.hidden = !changed(group(), row); badge.textContent = row.origin === null ? '新写的' : '已修改'; }
      const length = document.querySelector('.line-card.selected .char-count');
      if (length) length.textContent = Array.from(C.displayText(row.text, $('preview-name').value, false)).length + ' 字';
      const warning = document.querySelector('.line-card.selected .inline-issues');
      if (warning) {
        const issues = row.enabled ? C.lineIssues(row.text) : [];
        warning.innerHTML = issues.map(i => '<p class="line-warning ' + i.level + '">' + esc(i.message) + '</p>').join('');
      }
    }
    for (const button of $('scene-list').querySelectorAll('[data-key]')) {
      const g = source.groups.find(g => g.key === button.dataset.key), rs = entries()[g.key];
      button.classList.toggle('changed', rs.length !== g.rows.length || rs.some(r => changed(g, r)));
      button.querySelector('.count').textContent = rs.filter(r => r.enabled).length;
    }
    updateSaveStatus();
  }
  function mutate(key, next, mergeKey) {
    history.replace(key, next, mergeKey); revision++; previewOverride = null; scheduleSave(); refreshStatus(); drawPreview();
  }
  function updateLine(uid, patch, mergeKey) {
    const next = C.clone(entries()[selectedKey]), row = next.find(r => r.uid === uid);
    if (!row) return; Object.assign(row, patch); mutate(selectedKey, next, mergeKey);
  }
  function selectGroup(key, uid, focus) {
    history.boundary(); selectedKey = key;
    const rows = entries()[key]; selectedUid = uid && rows.some(r => r.uid === uid) ? uid : (rows[0] && rows[0].uid);
    previewOverride = null; previousSample = undefined;
    $('search').value = ''; $('list-filter').value = 'all'; render();scheduleSave();
    if (focus) setTimeout(() => document.querySelector('.line-card.selected textarea')?.focus(), 0);
  }
  function renderSidebar() {
    const ids = [...new Set(source.groups.map(g => g.id))];
    $('speaker-select').innerHTML = ids.map(id => '<option value="' + esc(id) + '">' + esc(K.speaker(id)[0]) + '</option>').join('');
    $('speaker-select').value = group().id;
    $('speaker-select').title = K.speaker(group().id)[1];
    $('scene-list').innerHTML = source.groups.filter(g => g.id === group().id).map(g =>
      '<button class="scene-button ' + (g.key === selectedKey ? 'active' : '') + '" data-key="' + esc(g.key) + '" aria-current="' + (g.key === selectedKey ? 'true' : 'false') + '"><span>' +
      esc(K.scene(g.act, g.id)[0]) + '</span><span class="count">' + entries()[g.key].filter(r => r.enabled).length + '</span></button>').join('');
    $('language-label').textContent = language();
    $('source-label').textContent = source.filename;
  }
  function matchesFilter(g, row) {
    const filter = $('list-filter').value;
    return filter === 'all' || (filter === 'changed' && changed(g, row)) || (filter === 'disabled' && !row.enabled) || (filter === 'marked' && row.marked);
  }
  function rowHtml(g, row, index) {
    const isSelected = row.uid === selectedUid;
    let badges = '<span class="badge edited edit-badge"' + (changed(g, row) ? '' : ' hidden') + '>' + (row.origin === null ? '新写的' : '已修改') + '</span>';
    if (!row.enabled) badges += '<span class="badge muted">暂时不用</span>';
    if (row.marked) badges += '<span class="badge warning">含粗口</span>';
    const header = '<div class="line-heading"><span class="line-number">' + String(index + 1).padStart(2, '0') + '</span><span class="line-badges">' + badges + '</span></div>';
    let body;
    if (isSelected) body = '<div class="line-editor"><label class="sr-only" for="text-' + esc(row.uid) + '">编辑第 ' + (index + 1) + ' 句台词</label><textarea id="text-' + esc(row.uid) + '" data-edit="' + esc(row.uid) + '" rows="2" spellcheck="false" placeholder="输入台词">' +
      esc(C.toFriendly(row.text)) + '</textarea><div class="editor-tools"><button class="text-button" data-action="name" data-uid="' + esc(row.uid) + '">＋ 插入玩家名字</button>' +
      '<button class="text-button" data-action="variants" data-uid="' + esc(row.uid) + '">＋ 插入两种说法</button></div>' +
      '<div class="line-options"><label class="check-row"><input type="checkbox" data-mark="' + esc(row.uid) + '"' + (row.marked ? ' checked' : '') + '> 含粗口</label>' +
      '<label class="check-row"><input type="checkbox" data-disable="' + esc(row.uid) + '"' + (!row.enabled ? ' checked' : '') + '> 暂时不用</label>' +
      '<div class="row-buttons"><button class="text-button" data-action="copy" data-uid="' + esc(row.uid) + '">复制</button><button class="text-button delete-line" data-action="delete" data-uid="' + esc(row.uid) + '">删除</button></div></div>' +
      '<div class="line-status"><span class="char-count">' + Array.from(row.text).length + ' 字</span></div><div class="inline-issues"></div></div>';
    else body = '<button class="line-select" data-action="select" data-uid="' + esc(row.uid) + '" aria-label="编辑第 ' + (index + 1) + ' 句：' + esc(C.toFriendly(row.text) || '还没有内容') + '">' + esc(C.toFriendly(row.text) || '（还没有写内容）') + '</button>';
    return '<article class="line-card ' + (isSelected ? 'selected ' : '') + (!row.enabled ? 'disabled' : '') + '" data-row="' + esc(row.uid) + '">' + header + body + '</article>';
  }
  function renderList() {
    const query = $('search').value.trim().toLocaleLowerCase();
    if (query) {
      const results = [];
      for (const g of source.groups) for (const row of entries()[g.key]) {
        const searchText = C.toFriendly(row.text) + ' ' + K.speaker(g.id)[0] + ' ' + K.scene(g.act, g.id)[0];
        if (searchText.toLocaleLowerCase().includes(query) && matchesFilter(g, row)) results.push({ g, row });
      }
      $('list-count').textContent = '在所有角色中找到 ' + results.length + ' 句';
      $('line-list').innerHTML = results.slice(0, searchLimit).map(({ g, row }) =>
        '<article class="search-result"><div class="result-path"><span>' + esc(K.speaker(g.id)[0] + ' / ' + K.scene(g.act, g.id)[0]) +
        '</span><button class="text-button" data-action="go" data-key="' + esc(g.key) + '" data-uid="' + esc(row.uid) + '">去修改 →</button></div><p>' + esc(C.toFriendly(row.text)) + '</p></article>').join('') ||
        '<div class="empty-state"><strong>没有匹配的台词</strong><button class="button" data-action="clear">清除搜索与筛选</button></div>';
      if (results.length > searchLimit) $('line-list').insertAdjacentHTML('beforeend', '<button class="button" data-action="more">再显示一些（还有 ' + (results.length - searchLimit) + ' 句）</button>');
      return;
    }
    const g = group(), rows = entries()[selectedKey];
    $('line-list').innerHTML = rows.map((row, index) => matchesFilter(g, row) ? rowHtml(g, row, index) : '').join('') ||
      '<div class="empty-state"><strong>' + (rows.length ? '没有匹配的台词' : '暂无台词') + '</strong><button class="button" data-action="' + (rows.length ? 'clear' : 'add') + '">' + (rows.length ? '查看全部句子' : '＋ 添加第一句') + '</button></div>';
  }
  function drawPreview() {
    if (!source) return;
    const g = group(), row = selected(), player = g.id === 'pip';
    $('preview-speaker').textContent = K.speaker(g.id)[0]; $('preview-avatar').textContent = K.speaker(g.id)[2]; $('sex-control').hidden = player;
    let text = '', reason = '';
    if (previewOverride) { text = previewOverride.text; reason = previewOverride.reason || ''; }
    else if (!row) reason = '未选择台词';
    else if (!row.enabled) reason = '已停用';
    else if ($('preview-filter').checked && row.marked) reason = '已被粗口过滤';
    else text = C.displayText(row.text, $('preview-name').value, player ? false : $('preview-sex').value === 'male');
    $('speech-bubble').textContent = text || (row ? '保持安静' : '暂无台词');
    $('speech-bubble').classList.toggle('silent', !text); $('preview-reason').textContent = reason;
    if (document.activeElement !== $('line-note')) $('line-note').value = row ? row.note : '';
    $('line-note').disabled = !row;
  }
  function render() {
    const g = group(), info = K.scene(g.act, g.id);
    renderSidebar(); $('scene-title').textContent = info[0]; $('scene-title').title = info[1];
    renderList(); refreshStatus(); drawPreview();
  }
  function addLine(copy) {
    $('search').value = ''; $('list-filter').value = 'all'; history.boundary();
    const row = { uid: 'new-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
      origin: null, text: copy ? copy.text : '', marked: copy ? copy.marked : false, enabled: true, note: copy ? copy.note : '' };
    selectedUid = row.uid; mutate(selectedKey, [...entries()[selectedKey], row]); render();
    setTimeout(() => { const area = document.querySelector('.line-card.selected textarea'); area?.focus(); area?.scrollIntoView({ block: 'nearest' }); }, 0);
    if (copy) toast('已经复制到列表末尾。');
  }
  function insertAtCursor(value, range) {
    const area = document.querySelector('.line-card.selected textarea'); if (!area) return;
    const start = range ? range[0] : area.selectionStart, end = range ? range[1] : area.selectionEnd;
    area.focus(); area.setRangeText(value, start, end, 'end'); area.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function showVariants() {
    history.boundary();
    const area = document.querySelector('.line-card.selected textarea'), range = [area.selectionStart, area.selectionEnd];
    showModal('插入两种说法',
      (group().id === 'pip' ? '<div class="modal-note">玩家使用女性说法</div>' : '') +
      '<label class="field-label" for="male-words">男性角色时</label><input id="male-words" type="text" placeholder="例如：我是最棒的！">' +
      '<label class="field-label" for="female-words">女性角色时</label><input id="female-words" type="text" placeholder="例如：我是最棒的！">', [
        { label: '取消', run: closeModal }, { label: '插入这两种说法', style: 'primary', run: () => {
          const a = $('male-words').value, b = $('female-words').value;
          if ((!a && !b) || /[#|【】]/.test(a + b)) { toast('请写下说法，并避免使用 #、| 或方括号。'); return; }
          if ((selected().text.match(/#/g) || []).length) { toast('这句已经有两种说法，可以直接在文字框里修改。'); return; }
          closeModal(); insertAtCursor('【男：' + a + '｜女：' + b + '】', range);
        } }
      ]);
  }
  function showDelete(uid) {
    const row = entries()[selectedKey].find(r => r.uid === uid);
    showModal('删除这句台词？', '<div class="modal-note">' + esc(C.toFriendly(row.text) || '（还没写内容）') + '</div>', [
      { label: '保留这句', run: closeModal }, { label: '暂时不用', run: () => { closeModal(); updateLine(uid, { enabled: false }); render(); } },
      { label: '删除这句', style: 'danger', run: () => {
        closeModal(); const next = entries()[selectedKey].filter(r => r.uid !== uid);
        selectedUid = next[0] && next[0].uid; mutate(selectedKey, next); render(); toast('已删除');
      } }
    ]);
  }
  function changesHtml(changes) {
    if (!changes.length) return '<p>台词未修改</p>';
    return changes.map(c => {
      const g = source.groups.find(x => x.key === c.key);
      return '<div class="change-row"><div class="change-path"><span>' + esc(K.speaker(g.id)[0] + ' / ' + K.scene(g.act, g.id)[0]) +
        '</span><span class="badge edited">' + esc(c.kind) + '</span></div>' +
        (c.before ? '<div class="change-before">' + esc(C.toFriendly(c.before)) + '</div>' : '') +
        (c.after ? '<div class="change-after">' + esc(C.toFriendly(c.after)) + '</div>' : '') +
        (c.beforeMarked !== undefined && c.beforeMarked !== c.afterMarked ? '<div class="small-muted">粗口标记：' + (c.afterMarked ? '已开启' : '已关闭') + '</div>' : '') + '</div>';
    }).join('');
  }
  function showChanges() {
    history.boundary();
    showModal('修改记录', changesHtml(C.changeSummary(source, entries())), [
      { label: '返回编辑', run: closeModal }, { label: '保存草稿', style: 'primary', run: saveProject }
    ]);
  }
  function issuesHtml(issues) {
    return issues.map(i => {
      const g = source.groups.find(x => x.key === i.key);
      return '<div class="issue-item ' + i.level + '"><strong>' + esc(K.speaker(g.id)[0] + ' / ' + K.scene(g.act, g.id)[0]) +
        '</strong><p>' + esc(i.message) + '</p><button class="text-button" data-issue-key="' + esc(i.key) + '" data-issue-uid="' + esc(i.uid || '') + '">去看看这句 →</button></div>';
    }).join('');
  }
  function checkContent() {
    const issues = C.validate(source, entries());
    showModal(issues.length ? '检查结果' : '台词检查完成', issues.length ? issuesHtml(issues) :
      '<div class="modal-note">检查通过，可以导出。</div>', [
        { label: '继续编辑', style: 'primary', run: closeModal }
      ]);
  }
  function showExport(){
    history.boundary();const errors=C.validate(source,entries()).filter(x=>x.level==='error');
    if(errors.length){showModal('还有几句话需要补全',issuesHtml(errors),[{label:'返回修改',run:closeModal}]);return;}
    const changes=C.changeSummary(source,entries());
    const run=async apply=>{try{const result=await api.barksExport(project(),apply);if(result){closeModal();toast(result.applied?'已写入游戏文件，重启后使用。':'完整语言文件已导出。');}}catch(e){showError('暂时没有写入',e);}};
    showModal('导出台词','<p>本次有 <strong>'+changes.length+'</strong> 处修改</p>'+changesHtml(changes),[
      {label:'返回编辑',run:closeModal},{label:'另存游戏文本',run:()=>run(false)},
      {label:'恢复上次写入',run:async()=>{try{if(await api.barksRestore()){closeModal();toast('已恢复上次语言文件；当前草稿保留。');}}catch(e){showError('暂时无法恢复',e);}}},
      {label:'备份并写入游戏',style:'primary',run:()=>run(true)}]);
  }

  function showError(titleText, error) {
    showModal(titleText, '<div class="modal-note error">' + esc(error.message || error) + '</div>', [
      { label: '返回编辑', style: 'primary', run: closeModal }, { label: '保存草稿', run: saveProject }
    ]);
  }
  function showFileInfo() {
    let previous = null;
    try { previous = localStorage.getItem(PREVIOUS); } catch (_) {}
    const actions = [{ label: '返回', run: closeModal }];
    if (previous) actions.push({ label: '恢复切换前的草稿', run: async () => {
      try {
        const loaded = await C.readProject(JSON.parse(previous));
        await archiveBeforeSwitch();
        await installDocument(loaded.source, loaded.hash, loaded.entries, loaded.selected, loaded.title);
        downloadedRevision = 0; await persist(); closeModal(); toast('已恢复上一次切换前的草稿。');
      } catch (e) {
        showModal('这份备份暂时无法恢复', '<p>原文件仍保留在工程的 config/barks 文件夹中。</p><div class="modal-note warning">' + esc(e.message) + '</div>', [{ label: '返回编辑', run: closeModal }]);
      }
    } });
    actions.push({ label: '保存一份草稿', style: 'primary', run: saveProject });
    showModal('当前文件与保存状态',
      '<dl class="file-info"><dt>正在编辑</dt><dd>' + esc(source.filename) + '</dd><dt>语言</dt><dd>' + esc(language()) + '</dd><dt>自动留存</dt><dd>' +
      (storageOkay ? (lastSaved ? esc(new Date(lastSaved).toLocaleString('zh-CN')) : '尚无记录') : '不可用，请保存草稿') +
      '</dd><dt>源文件核对</dt><dd>原文件已保留</dd></dl>', actions);
  }
  async function installDocument(s, hash, rows, key, newTitle) {
    clearTimeout(autosaveTimer); autosaveTimer = null; documentId=crypto.randomUUID(); source = s; sourceHash = hash; history = new C.History(rows || C.initialEntries(s));
    selectedKey = key && history.entries[key] ? key : (history.entries['pip/hack'] ? 'pip/hack' : s.groups[0].key);
    selectedUid = history.entries[selectedKey][0]?.uid; title = newTitle || '我的角色台词';
    revision = rows ? 1 : 0; downloadedRevision = rows ? 1 : 0; previousSample = undefined; previewOverride = null;
    $('search').value = ''; $('list-filter').value = 'all'; render();
  }
  async function loadFile(file) {
    if (file.size > 8000000) throw new Error('文件超过 8 MB。请选择游戏语言文件或本编辑器的草稿。');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let raw;
    try { raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch (_) { throw new Error('这份文件不是游戏使用的 UTF-8 文字格式，未做任何修改。'); }
    if (/\.json$/i.test(file.name)) {
      let data; try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch (_) { throw new Error('草稿文件不完整，或选到了别的 JSON 文件。'); }
      const loaded = await C.readProject(data);
      await archiveBeforeSwitch();
      await installDocument(loaded.source, loaded.hash, loaded.entries, loaded.selected, loaded.title);
    } else {
      const parsed = C.parseSource(raw, file.name), hash = await C.digest(raw);
      await archiveBeforeSwitch();
      await installDocument(parsed, hash);
    }
    await persist(); closeModal(); toast('已经打开 ' + file.name + '。');
  }
  $('modal-close').onclick = closeModal;
  $('modal').addEventListener('close', () => {
    if (modalReturnFocus?.isConnected && (document.activeElement === document.body || $('modal').contains(document.activeElement))) modalReturnFocus.focus();
  });
  $('modal-body').addEventListener('click', e => {
    const issue = e.target.closest('[data-issue-key]');
    if (issue) { closeModal(); selectGroup(issue.dataset.issueKey, issue.dataset.issueUid, true); }
  });
  $('brand').onclick = e => { e.preventDefault(); if (source) selectGroup(entries()['pip/hack'] ? 'pip/hack' : source.groups[0].key); };
  $('speaker-select').onchange = e => {
    const groups = source.groups.filter(g => g.id === e.target.value), target = groups.find(g => g.act === 'neutral') || groups[0];
    selectGroup(target.key);
  };
  $('scene-list').onclick = e => { const b = e.target.closest('[data-key]'); if (b) selectGroup(b.dataset.key); };
  $('add-line').onclick = () => addLine();
  $('search').oninput = () => { history.boundary(); searchLimit = 60; renderList(); };
  $('list-filter').onchange = () => { history.boundary(); renderList(); refreshStatus(); };
  $('line-list').addEventListener('input', e => {
    if (!e.target.dataset.edit) return;
    updateLine(e.target.dataset.edit, { text: C.fromFriendly(e.target.value) }, 'text:' + e.target.dataset.edit);
  });
  $('line-list').addEventListener('focusout', e => { if (e.target.matches('textarea')) history.boundary(); });
  $('line-list').addEventListener('change', e => {
    if (e.target.dataset.mark) { updateLine(e.target.dataset.mark, { marked: e.target.checked }); render(); }
    if (e.target.dataset.disable) { updateLine(e.target.dataset.disable, { enabled: !e.target.checked }); render(); }
  });
  $('line-list').addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const a = b.dataset.action, uid = b.dataset.uid; history.boundary();
    if (a === 'select') { selectedUid = uid; previewOverride = null; renderList(); refreshStatus(); drawPreview(); document.querySelector('.line-card.selected textarea')?.focus(); }
    if (a === 'copy') addLine(entries()[selectedKey].find(r => r.uid === uid));
    if (a === 'delete') showDelete(uid);
    if (a === 'add') addLine();
    if (a === 'name') insertAtCursor('【玩家名字】');
    if (a === 'variants') showVariants();
    if (a === 'go') selectGroup(b.dataset.key, uid, true);
    if (a === 'clear') { $('search').value = ''; $('list-filter').value = 'all'; render(); }
    if (a === 'more') { searchLimit += 60; renderList(); }
  });
  $('line-note').oninput = e => { if (selected()) updateLine(selectedUid, { note: e.target.value }, 'note:' + selectedUid); };
  $('line-note').onblur = () => history?.boundary();
  for (const id of ['preview-name', 'preview-sex', 'preview-filter']) $(id).addEventListener('input', () => { previewOverride = null; drawPreview(); refreshStatus(); });
  $('sample-button').onclick = () => {
    const g = group(); previewOverride = C.sample(entries()[selectedKey], { player: g.id === 'pip', male: $('preview-sex').value === 'male', name: $('preview-name').value, filter: $('preview-filter').checked, previous: previousSample });
    previousSample = previewOverride.previous; drawPreview();
  };
  function travelHistory(direction) {
    const key = history[direction](); if (!key) return;
    selectedKey = key; if (!entries()[key].some(r => r.uid === selectedUid)) selectedUid = entries()[key][0]?.uid;
    revision++; previewOverride = null; $('search').value = ''; $('list-filter').value = 'all'; render(); scheduleSave();
    $('line-note').value = selected()?.note || '';
    toast(direction === 'undo' ? '已撤销刚才的修改。' : '已重做这次修改。');
  }
  $('undo').onclick = () => travelHistory('undo'); $('redo').onclick = () => travelHistory('redo');
  $('save-project').onclick = ()=>saveProject().catch(e=>showError('保存未完成',e)); $('export-button').onclick = showExport;
  $('review-changes').onclick = showChanges; $('check-button').onclick = checkContent;
  $('source-info').onclick = showFileInfo;
  $('open-button').onclick = () => confirmLeave(async()=>{try{const result=await api.barksOpen();if(result)await loadFile({size:new TextEncoder().encode(result.raw).length,name:result.filename,arrayBuffer:async()=>new TextEncoder().encode(result.raw).buffer});}catch(e){showError('这份文件暂时打不开',e);}});
  $('file-input').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { await loadFile(file); } catch (error) { showError('这份文件暂时打不开', error); }
  };
  document.addEventListener('keydown', e => {
    if(e.isComposing)return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && source) { e.preventDefault(); saveProject().catch(e=>showError('保存未完成',e)); }
    const inputFocused = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (!inputFocused && !$('modal').open && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && source) {
      e.preventDefault(); travelHistory(e.shiftKey ? 'redo' : 'undo');
    }
  });
  parent.RMHost.register('barks',{saveDraft:saveProject,recover:persist});
  async function start() {
    for (const id of ['open-button','save-project','export-button','add-line']) $(id).disabled = true;
    try {
      bootData=await api.barksBoot();window.REMAINS_SOURCE={raw:bootData.raw,filename:bootData.filename,sha256:await C.digest(bootData.raw)};if(bootData.recovery)localStorage.setItem(STORE,JSON.stringify(bootData.recovery));if(bootData.previous)localStorage.setItem(PREVIOUS,JSON.stringify(bootData.previous));
      let saved = null;
      try { saved = localStorage.getItem(STORE); } catch (_) { storageOkay = false; }
      let recoveryError;
      if (saved) {
        try {
          const data = await C.readProject(JSON.parse(saved));
          await installDocument(data.source, data.hash, data.entries, data.selected, data.title); lastSaved = data.savedAt; updateSaveStatus();
          downloadedRevision = bootData.recoveryState?.dirty===false?revision:0;
          toast('已恢复上次的草稿，可以接着写。');
        } catch (e) { recoveryError = e; recoveryBlocked = true; storageOkay = false; }
      }
      if (!source) {
        const data = window.REMAINS_SOURCE, parsed = C.parseSource(data.raw, data.filename), hash = await C.digest(data.raw);
        if (hash !== data.sha256) throw new Error('编辑器附带的文本不完整，请重新复制完整的编辑器文件。');
        await installDocument(parsed, hash);
      }
      for (const id of ['open-button','save-project','export-button','add-line']) $(id).disabled = false;
      if(bootData.error){recoveryBlocked=true;storageOkay=false;showModal('上次草稿需要检查','<p>'+esc(bootData.error)+'</p>',[{label:'保留旧文件，继续编辑新副本',run:()=>{recoveryBlocked=false;closeModal();}}]);}updateSaveStatus();
      if (recoveryError) showModal('上次的草稿没有成功恢复', '<p>已打开当前游戏文本，损坏的草稿仍保留在工程 config/barks 文件夹中。</p><div class="modal-note warning">' + esc(recoveryError.message) + '</div>', [{ label: '保留旧文件，继续编辑新副本', style: 'primary', run:async()=>{await archiveBeforeSwitch();await persist();closeModal();}}]);
    } catch (e) {
      $('fatal').hidden = false; $('fatal').innerHTML = '<h2>台词页暂时没有打开成功</h2><p>' + esc(e.message) + '</p><p>请检查所选游戏的 text_zh.xml 是否完整，再重新打开 RModifier。原文件没有修改。</p>';
    }
  }
  start();
})();
