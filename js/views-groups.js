/* حصصي — صفحة المجموعة: ملخص كل شهر (٤ حصص) بالحضور والغياب، ونقل الطلاب بين المجموعات */
'use strict';

const GM = { p: ['p', '✓', 'حضر'], a: ['a', '✗', 'غاب'], none: ['o', '–', 'متسجلش'], future: ['f', '', 'لسه'], out: ['x', '·', 'مش في المجموعة'] };
const gmDots = items => `<span class="adots">${items.map(x => { const m = GM[x.mark]; return `<span class="ad ${m[0]}" title="${E.fmtShort(x.date)} · ${m[2]}">${m[1]}</span>`; }).join('')}${'<span class="ad f"></span>'.repeat(Math.max(0, 4 - items.length))}</span>`;
const otherGroups = (gid) => { const g = E.groupById(App.st, gid); return g ? App.st.groups.filter(x => x.subjectId === g.subjectId && x.id !== gid) : []; };
/* أعضاء المجموعة دلوقتي (أو من أول حصة جاية لو اتنقلوا ليها) */
const groupMembers = gid => App.st.students.flatMap(s => { const e = s.enrollments.find(x => !x.endDate && E.currentGroupId(x) === gid); return e ? [{ student: s, enrollment: e }] : []; }).sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
const cyclesOf = gid => E.groupCycles(App.st, gid, E.today(), nowHM());
/* آخر شهر خلص في آخر ٧ أيام (علشان التنبيه) */
function freshCycle(gid) {
  const cs = cyclesOf(gid).filter(c => c.complete);
  const c = cs[cs.length - 1];
  return c && E.diffDays(c.to, E.today()) <= 7 ? c : null;
}
window.freshCycle = freshCycle;
const moveText = m => {
  const o = E.groupById(App.st, m.other);
  const n = o ? (o.name || E.groupLabel(App.st, o)) : 'مجموعة محذوفة';
  return m.kind === 'in' ? 'اتنقل من ' + n + ' ' + E.fmtShort(m.date) : m.kind === 'out' ? 'اتنقل لـ ' + n + ' ' + E.fmtShort(m.date) : 'انسحب ' + E.fmtShort(m.date);
};

/* ---------- قائمة المجموعات ---------- */
Views.groups = () => {
  const st = App.st;
  const count = gid => st.students.filter(s => s.enrollments.some(e => E.currentGroupId(e) === gid && !e.endDate)).length;
  return `
  <header class="plain-head">${backBtn()}<h1>المجموعات والمواعيد</h1></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>المجموعة = مادة + يوم + ساعة. افتح أي مجموعة علشان تشوف كل طالب فين في شهره ومين دفع ومين لأ، والحضور والغياب، ونقل الطلاب.</span></div>
    ${[1, 2, 3].map(gr => {
      const gs = st.groups.filter(g => E.SUBJ[g.subjectId].grade === gr);
      return `<section style="display:flex;flex-direction:column;gap:8px"><div class="row" style="gap:8px">${gradeChip(gr)}<span class="small muted">${gs.length} مجموعة</span></div>
        ${gs.length ? `<div class="card tight">${gs.sort((a, b) => a.subjectId.localeCompare(b.subjectId)).map(g => {
          const rs = groupMonthRows(g.id);
          const nDone = rs.filter(r => r.stage === 'done').length, nOwe = rs.filter(r => r.due > 0).length, nLast = rs.filter(r => r.stage === 'left1').length;
          return `<a class="list-row tap" href="#/group/${g.id}">
            <span class="dot g${gr}"></span>
            <span class="grow stack" style="gap:3px"><span class="b">${esc(E.SUBJ[g.subjectId].name)}${g.name ? ' · ' + esc(g.name) : ''}</span>
              <span class="small muted">${E.DAY_NAMES[E.currentSchedule(g).day]} · ${E.fmtTime(E.currentSchedule(g).time)} · ${count(g.id)} طالب</span>
              ${rs.length ? `<span class="row" style="gap:5px;flex-wrap:wrap">${nDone ? `<span class="chip red">${nDone} خلصوا شهرهم</span>` : ''}${nLast ? `<span class="chip amber">${nLast} فاضلهم حصة</span>` : ''}${nOwe ? `<span class="chip red" style="background:#fff;border:1px solid #F3C4C0">${nOwe} عليهم فلوس</span>` : '<span class="chip green">كله دافع</span>'}</span>` : ''}</span>
            ${ic('chev', 18)}</a>`;
        }).join('')}</div>` : `<div class="card small muted">مفيش مجموعات للصف ده</div>`}</section>`;
    }).join('')}
    ${st.groups.length ? `<button class="btn ghost" data-act="report" data-r="attendance">${ic('print', 18)} تقرير الحضور والغياب لكل المجموعات</button>` : ''}
    <button class="btn accent lg" data-act="editGroup">${ic('plus', 20)} مجموعة جديدة</button>
  </main>`;
};

/* ---------- صفحة المجموعة ---------- */
Views.group = gid => {
  const st = App.st, g = E.groupById(st, gid);
  if (!g) return `<header class="plain-head">${backBtn('#/groups')}<h1>المجموعة</h1></header><div class="pad"><div class="banner amber">${ic('info', 18)}<span>المجموعة دي مش موجودة.</span></div></div>`;
  const sub = E.SUBJ[g.subjectId];
  const cs = cyclesOf(gid);
  if (App.ui.grpId !== gid) { App.ui.grpId = gid; App.ui.grpCycle = null; App.ui.grpSel = null; }
  const cyc = cs.find(c => c.n === App.ui.grpCycle) || cs[cs.length - 1];
  const S = cyc ? E.groupCycleSummary(st, gid, cyc, E.today(), nowHM()) : null;
  const sel = App.ui.grpSel;               // null = مش في وضع الاختيار، Set = الطلاب المختارين
  const now = groupMembers(gid);
  const nowIds = new Set(now.map(x => x.student.id));
  const others = otherGroups(gid);
  const rows = S ? S.rows : [];
  // الطلاب الحاليين اللي مش في الشهر المعروض (اتنقلوا بعده مثلًا) يظهروا في وضع الاختيار
  const extra = sel ? now.filter(x => !rows.some(r => r.student.id === x.student.id)) : [];
  return `
  <header class="hero-head flat">
    <div class="row">
      <a class="icon-btn" href="#/groups" aria-label="رجوع">${ic('back')}</a>
      <div class="stack grow"><h1 style="font-size:20px">${esc(sub.name)}${g.name ? ' · ' + esc(g.name) : ''}</h1>
        <span class="sub">${E.GRADES[sub.grade]} · ${E.DAY_NAMES[E.currentSchedule(g).day]} ${E.fmtTime(E.currentSchedule(g).time)} · ${now.length} طالب</span></div>
      <button class="icon-btn" data-act="editGroup" data-g="${g.id}" aria-label="تعديل المجموعة">${ic('edit', 20)}</button>
    </div>
    ${S ? `<div class="grid3">
      <div class="stat glass"><span class="v" style="color:#6EE7A8">${S.pres}</span><span class="k">حضور</span></div>
      <div class="stat glass"><span class="v" style="color:#FFA3A3">${S.abs}</span><span class="k">غياب</span></div>
      <div class="stat glass"><span class="v">${S.rate == null ? '—' : S.rate + '٪'}</span><span class="k">نسبة الحضور</span></div></div>` : ''}
  </header>
  <main class="pad">
    ${!cs.length ? `<div class="card"><div class="empty"><span class="ic">${ic('users', 28)}</span><h3>لسه مفيش حصص اتعملت للمجموعة دي</h3><span class="sm">${now.length ? 'فيها ' + now.length + ' طالب. ' : ''}أول ما الحصص تبدأ هيظهر هنا ملخص كل شهر (كل ٤ حصص).</span></div></div>
    ${now.length ? `<div class="card tight">${now.map(({ student: s, enrollment: e }) => { const P = E.cyclePosition(st, e, E.today()); const h = (e.groupHist || []).slice().sort((a, b) => a.from.localeCompare(b.from)).pop(); return `<a class="list-row tap" href="#/student/${s.id}"><span class="avatar" style="width:38px;height:38px">${esc(initial(s.name))}</span><span class="grow stack" style="gap:3px"><span class="b ellipsis">${esc(s.name)}</span><span class="small muted">حصصه ${P.n} · الدورة ${P.cycle} حصة ${P.pos} من 4${h && h.from > E.today() ? ' · يبدأ هنا ' + E.fmtShort(h.from) : ''}</span></span>${ic('chev', 18)}</a>`; }).join('')}</div>` : ''}
    ${now.length && others.length ? `<button class="btn soft" data-act="moveAllHere" data-g="${g.id}">${ic('users', 18)} نقل طلاب لمجموعة تانية</button>` : ''}` : `
    <div class="chips">${cs.map(c => `<button class="fchip ${c.n === cyc.n ? 'on' : ''}" data-act="grpCycle" data-n="${c.n}">شهر المجموعة ${c.n}${c.complete ? ' ✓' : ''}</button>`).join('')}</div>
    <div class="small muted" style="padding:0 4px;line-height:1.7">${ic('info', 14)} "شهر المجموعة" = كل ٤ حصص من أول حصة في المجموعة. حساب كل طالب ماشي على <b>شهره هو</b> (من أول حصة ليه) — ظاهر تحت اسمه.</div>
    <div class="card row between" style="padding:12px 14px">
      <span class="stack" style="gap:2px"><span class="b">شهر المجموعة ${cyc.n} · ${E.fmtShort(cyc.from)} ← ${E.fmtShort(cyc.sessions[cyc.sessions.length - 1].date)}</span>
        <span class="small muted">${cyc.complete ? 'الـ٤ حصص خلصوا' : 'اتعمل ' + cyc.held + ' من 4 حصص'}${S.unrecorded ? ' · ' + S.unrecorded + ' غياب متسجلش' : ''}</span></span>
      <span class="chip ${cyc.complete ? 'green' : 'blue'}">${cyc.complete ? 'خلص' : 'شغال'}</span></div>
    ${cyc.complete ? `<div class="banner green">${ic('check', 18)}<span><b>ملخص الشهر جاهز.</b> كل طالب حضوره وغيابه في الـ٤ حصص — اطبعه أو احفظه صورة وابعته.</span></div>` : ''}
    ${sel ? '' : `<div class="grid2">
      <button class="btn" data-act="grpPrint" data-g="${g.id}" data-n="${cyc.n}">${ic('print', 18)} طباعة / صورة</button>
      <button class="btn ghost" data-act="grpWa" data-g="${g.id}" data-n="${cyc.n}">${ic('share', 18)} نسخ الملخص</button>
    </div>`}
    <button class="btn soft" data-act="report" data-r="attendance" data-g="${g.id}">${ic('cal', 18)} تقرير الحضور والغياب — شهر أو ترم</button>
    ${now.length && others.length ? `<button class="btn ${sel ? 'danger-ghost' : 'soft'}" data-act="grpSelMode">${ic(sel ? 'x' : 'users', 18)} ${sel ? 'إلغاء النقل' : 'نقل طلاب لمجموعة تانية'}</button>` : ''}
    <div class="legend" style="padding:0 4px"><span><span class="ad p">✓</span> حضر</span><span><span class="ad a">✗</span> غاب</span><span><span class="ad o">–</span> متسجلش</span><span><span class="ad x">·</span> مكانش في المجموعة</span><span><span class="ad f"></span> لسه</span></div>
    ${sel ? `<div class="banner blue">${ic('info', 18)}<span>اختار الطلاب اللي هتنقلهم، وبعدين "نقل". الحضور والغياب وعدد الحصص بيتنقلوا معاهم، وبيكمّلوا الدورة من مكانهم.</span></div>` : ''}
    <div class="card tight">${rows.concat(extra.map(x => ({ student: x.student, enrollment: x.enrollment, items: [], moves: [], pres: 0, abs: 0, none: 0, extra: true, pos: E.cyclePosition(st, x.enrollment, E.today()), allPres: 0, allAbs: 0 }))).map(r => {
      const s = r.student, can = sel && nowIds.has(s.id), on = can && sel.has(s.id);
      const inner = `
        ${sel ? `<span class="box-ck ${on ? 'on' : ''} ${can ? '' : 'dis'}">${ic('check', 14, 3)}</span>` : `<span class="avatar ${r.abs >= 2 ? 'red' : r.abs ? 'amber' : ''}" style="width:38px;height:38px">${esc(initial(s.name))}</span>`}
        <span class="grow stack" style="gap:4px;min-width:0"><span class="b ellipsis">${esc(s.name)}</span>
          <span class="small muted">${r.extra ? 'انضم بعد الشهر ده' : `حضر ${r.pres} · غاب ${r.abs}`} · <b style="color:var(--ink)">شهره ${r.pos.cycle}: حصة ${r.pos.pos || 0} من 4</b></span>
          ${r.moves.length ? `<span class="small" style="color:var(--blue-text,#1D4AA8);font-weight:600">${r.moves.map(moveText).join(' · ')}</span>` : ''}</span>
        ${r.extra ? '' : gmDots(r.items)}`;
      return sel
        ? `<button class="list-row tap" ${can ? `data-act="grpSel" data-s="${s.id}"` : 'disabled'} aria-pressed="${on}" style="${can ? '' : 'opacity:.55'}">${inner}</button>`
        : `<a class="list-row tap" href="#/student/${s.id}">${inner}</a>`;
    }).join('') || '<div class="sm muted" style="padding:14px 0">مفيش طلاب في الشهر ده</div>'}</div>`}
  </main>
  ${sel ? `<div class="bottom-bar"><div class="grid2">
    <button class="btn ghost" data-act="grpSelAll">${sel.size === now.length ? 'شيل الكل' : 'اختيار الكل (' + now.length + ')'}</button>
    <button class="btn" data-act="grpMove" data-g="${g.id}" ${sel.size ? '' : 'disabled'}>${ic('users', 18)} نقل ${sel.size ? '(' + sel.size + ')' : ''}</button></div></div>` : ''}`;
};
ACT.moveAllHere = el => openTransfer(groupMembers(el.dataset.g).map(x => ({ s: x.student, e: x.enrollment })), el.dataset.g);
ACT.grpCycle = el => { App.ui.grpCycle = +el.dataset.n; render(); };
ACT.grpSelMode = () => { App.ui.grpSel = App.ui.grpSel ? null : new Set(); render(); };
ACT.grpSel = el => { const s = App.ui.grpSel; if (!s) return; const id = el.dataset.s; if (s.has(id)) s.delete(id); else s.add(id); Sound.play('tap'); render(); };
ACT.grpSelAll = () => {
  const now = groupMembers(App.ui.grpId).map(x => x.student.id);
  App.ui.grpSel = App.ui.grpSel && App.ui.grpSel.size === now.length ? new Set() : new Set(now);
  render();
};
ACT.grpMove = el => {
  const gid = el.dataset.g, ids = [...(App.ui.grpSel || [])];
  const list = groupMembers(gid).filter(x => ids.includes(x.student.id)).map(x => ({ s: x.student, e: x.enrollment }));
  if (!list.length) return toast('اختار طالب واحد على الأقل', { type: 'warn' });
  openTransfer(list, gid);
};
/* من ملف الطالب: نقل مادة معينة */
ACT.moveEnr = el => {
  const s = studentById(el.dataset.s), e = s && s.enrollments.find(x => x.id === el.dataset.e);
  if (!e) return;
  openTransfer([{ s, e }], E.currentGroupId(e));
};

/* ---------- شيت النقل (طالب أو أكتر) ---------- */
function openTransfer(list, fromGid) {
  const st = App.st, from = E.groupById(st, fromGid);
  const targets = otherGroups(fromGid);
  if (!targets.length) return toast('مفيش مجموعة تانية لنفس المادة — أضف مجموعة الأول من "المجموعات"', { type: 'warn', ms: 4500 });
  const sub = E.SUBJ[from.subjectId];
  const sh = sheet(`<h2>نقل ${list.length === 1 ? esc(list[0].s.name) : list.length + ' طلاب'}</h2>
    <div class="small muted" style="margin-top:-8px">${esc(sub.name)} · من ${esc(E.groupLabel(st, from))}</div>
    <label class="field">المجموعة الجديدة<select class="input select" id="tr-g">${targets.map(g => `<option value="${g.id}">${esc(E.groupLabel(st, g))}</option>`).join('')}</select></label>
    <label class="field">أول حصة في المجموعة الجديدة<select class="input select" id="tr-d"></select>
      <span class="hint">الحصص اللي قبلها بتفضل محسوبة في المجموعة القديمة، ومن الحصة دي يكمّل في الجديدة</span></label>
    <div id="tr-prev"></div>
    <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn" id="tr-ok">${ic('check', 18)} تأكيد النقل</button></div>`);
  const gEl = $('#tr-g', sh.el), dEl = $('#tr-d', sh.el);
  const fillDates = () => { dEl.innerHTML = firstSessionOptions(gEl.value, null); };
  const preview = () => {
    const to = gEl.value, d = dEl.value || E.today();
    let lost = 0;
    const rows = list.map(({ s, e }) => {
      const P = E.transferPreview(st, s, e, to, d);
      lost += P.lost.length;
      let pr = 0, ab = 0;
      E.enrollmentSessions(st, e, E.addDays(P.start, -1)).forEach(o => { const v = (st.attendance[o.key] || {})[s.id]; if (v === 'p') pr++; else if (v === 'a') ab++; });
      const nxt = P.pos === 4 || P.pos === 0 ? 'يبدأ دورة جديدة' : 'يكمّل حصة ' + (P.pos + 1) + ' من 4';
      return `<div class="list-row" style="padding:8px 0;align-items:flex-start"><span class="grow stack" style="gap:2px"><span class="b sm">${esc(s.name)}</span>
        <span class="small muted">اتحسبله ${P.counted} حصة · حضر ${pr} · غاب ${ab}</span></span><span class="chip blue" style="white-space:nowrap">${nxt}</span></div>`;
    }).join('');
    $('#tr-prev', sh.el).innerHTML = `<div class="card tight" style="background:var(--ground);box-shadow:none">${rows}</div>
      ${lost ? `<div class="banner amber">${ic('alert', 18)}<span>فيه <b>${lost}</b> ${lost === 1 ? 'حصة' : 'حصص'} في المجموعة القديمة من التاريخ ده متسجل فيها حضور أو غياب — مش هتتحسب بعد النقل. لو الطالب حضرها فعلًا، اختار حصة أبعد.</span></div>` : ''}`;
  };
  gEl.onchange = () => { fillDates(); preview(); };
  dEl.onchange = preview;
  fillDates(); preview();
  $('#tr-ok', sh.el).onclick = () => {
    const to = gEl.value, d = dEl.value || E.today();
    const tg = E.groupById(st, to);
    sh.close();
    commit(S => { list.forEach(({ s, e }) => E.transferEnrollment(S, s.id, e.id, to, d)); App.ui.grpSel = null; },
      (list.length === 1 ? 'اتنقل ' + esc(list[0].s.name) : 'اتنقل ' + list.length + ' طلاب') + ' لمجموعة ' + esc(E.groupLabel(st, tg)) + ' من ' + E.fmtShort(d), { ms: 4000 });
  };
}
window.openTransfer = openTransfer;

/* ---------- طباعة / نسخ ملخص الشهر ---------- */
ACT.grpPrint = el => Print.groupMonth({ g: el.dataset.g, n: el.dataset.n });
ACT.grpWa = async el => {
  const st = App.st, g = E.groupById(st, el.dataset.g);
  const cyc = cyclesOf(g.id).find(c => c.n === +el.dataset.n);
  if (!cyc) return;
  const S = E.groupCycleSummary(st, g.id, cyc, E.today(), nowHM());
  const txt = `ملخص الشهر ${cyc.n} — ${E.SUBJ[g.subjectId].name} (${E.groupLabel(st, g)})\n${E.fmtShort(cyc.from)} ← ${E.fmtShort(cyc.to)}\n\n` +
    S.rows.map((r, i) => `${i + 1}. ${r.student.name}: حضر ${r.pres} · غاب ${r.abs}${r.none ? ' · متسجلش ' + r.none : ''}`).join('\n') +
    `\n\nنسبة الحضور: ${S.rate == null ? '—' : S.rate + '٪'}\n${st.settings.appName}`;
  try { await navigator.clipboard.writeText(txt); toast('الملخص اتنسخ — الصقه في واتساب'); } catch (e) { if (navigator.share) navigator.share({ text: txt }).catch(() => {}); }
};
Print.groupMonth = o => {
  const st = App.st, g = E.groupById(st, o.g);
  if (!g) return toast('اختار مجموعة', { type: 'warn' });
  const cs = cyclesOf(g.id);
  const cyc = cs.find(c => c.n === +o.n) || cs[cs.length - 1];
  if (!cyc) return toast('لسه مفيش حصص في المجموعة دي', { type: 'warn' });
  const S = E.groupCycleSummary(st, g.id, cyc, E.today(), nowHM());
  const sub = E.SUBJ[g.subjectId];
  const mk = { p: ['p', '✓'], a: ['a', '✗'], none: ['o', '–'], future: ['f', ''], out: ['o', '·'] };
  const heavy = S.rows.filter(r => r.abs >= 2).sort((a, b) => b.abs - a.abs);
  const moved = S.rows.filter(r => r.moves.length);
  doPrint('ملخص الشهر ' + cyc.n + ': ' + sub.name, E.GRADES[sub.grade] + ' · ' + E.groupLabel(st, g) + ' · ' + E.fmtShort(cyc.from) + ' ← ' + E.fmtShort(cyc.to) + (cyc.complete ? '' : ' · لسه شغال (' + cyc.held + ' من 4)'),
    `<div class="boxes"><div>عدد الطلاب<b>${S.rows.length}</b></div><div class="g">حضور<b class="green">${S.pres}</b></div><div class="r">غياب<b class="red">${S.abs}</b></div><div class="a">نسبة الحضور<b>${S.rate == null ? '—' : S.rate + '٪'}</b></div></div>
    <table><thead><tr><th>#</th><th>الطالب</th>${cyc.sessions.map((x, i) => `<th class="c">حصة ${i + 1}<br><span style="font-weight:400;font-size:7.5pt">${E.fmtShort(x.date)}${x.type === 'makeup' ? ' · تعويضية' : ''}</span></th>`).join('')}<th class="c">حضر</th><th class="c">غاب</th><th class="c">إجمالي حصصه</th><th class="c">حضوره كله</th></tr></thead><tbody>
    ${S.rows.map((r, i) => `<tr>${td(i + 1, 'c')}${td(esc(r.student.name) + (r.moves.length ? `<br><span class="muted" style="font-size:8pt">${r.moves.map(moveText).join(' · ')}</span>` : ''))}${r.items.map(x => td(`<span class="mk ${mk[x.mark][0]}">${mk[x.mark][1]}</span>`, 'c')).join('')}${td(r.pres, 'c green')}${td(r.abs, 'c ' + (r.abs ? 'red' : ''))}${td(`${r.pos.n}<br><span class="muted" style="font-size:7.5pt">الدورة ${r.pos.cycle}</span>`, 'c n')}${td(r.allPres + r.allAbs ? Math.round(r.allPres / (r.allPres + r.allAbs) * 100) + '٪' : '—', 'c n')}</tr>`).join('') || '<tr><td colspan="9">مفيش طلاب</td></tr>'}</tbody>
    <tfoot><tr>${td('')}${td('الإجمالي')}${cyc.sessions.map(x => { const v = st.attendance[x.key] || {}; const n = S.rows.filter(r => v[r.student.id] === 'p').length; return td(n + ' حاضر', 'c'); }).join('')}${td(S.pres, 'c')}${td(S.abs, 'c')}${td('')}${td('')}</tr></tfoot></table>
    <div class="note">✓ حضر · ✗ غاب · – متسجلش · · مكانش في المجموعة في الحصة دي. "إجمالي حصصه" = كل الحصص المحسوبة على الطالب في المادة (حتى لو اتنقل بين مجموعات)، و"حضوره كله" = نسبة حضوره من أول اشتراكه.</div>
    ${heavy.length ? `<h2>الأكثر غيابًا في الشهر</h2><table><thead><tr><th>#</th><th>الطالب</th><th class="c">غاب</th><th>أيام الغياب</th><th>موبايل ولي الأمر</th></tr></thead><tbody>
      ${heavy.map((r, i) => `<tr>${td(i + 1, 'c')}${td(esc(r.student.name))}${td(r.abs, 'c red')}${td(r.items.filter(x => x.mark === 'a').map(x => E.fmtShort(x.date)).join('، '))}${td(esc(r.student.phone || ''), 'n')}</tr>`).join('')}</tbody></table>` : ''}
    ${moved.length ? `<h2>نقل خلال الشهر</h2><table><tbody>${moved.map(r => `<tr>${td(esc(r.student.name))}${td(r.moves.map(moveText).join(' · '))}</tr>`).join('')}</tbody></table>` : ''}`);
};

/* ---------- تقرير الحضور والغياب للمجموعة: شهر / ترم / سنة ---------- */
Print.attendance = o => {
  const st = App.st, t = E.today();
  App.ui.attG = o.g || ''; App.ui.attP = o.p || 'month'; if (o.m) App.ui.attM = o.m;
  let P;
  if (!o.p || o.p === 'month') { const m = (o.m || t.slice(0, 7)) + '-01'; P = { from: m, to: E.monthEnd(m), label: 'شهر ' + E.monthLabel(m), month: true }; }
  else if (o.p === 'year') { const ts = st.settings.terms || []; P = { from: ts.map(x => x.start).sort()[0], to: ts.map(x => x.end).sort().pop(), label: 'السنة الدراسية' }; }
  else { const tm = (st.settings.terms || []).find(x => x.id === o.p); P = { from: tm.start, to: tm.end, label: tm.name }; }
  if (P.from > t) return toast('الفترة دي لسه مبدأتش', { type: 'warn' });
  const to = P.to < t ? P.to : t;                 // لحد النهارده بس
  const gs = (o.g ? [E.groupById(st, o.g)] : st.groups.slice().sort((a, b) => a.subjectId.localeCompare(b.subjectId))).filter(Boolean);
  const reps = gs.map(g => E.groupAttendance(st, g.id, P.from, to, t, nowHM())).filter(r => o.g || r.rows.length);
  const mk = { p: ['p', '✓'], a: ['a', '✗'], none: ['o', '–'], future: ['f', ''], out: ['o', '·'] };
  const rateTag = r => r == null ? '<span class="muted">—</span>' : `<span class="tag ${r >= 85 ? 'g' : r >= 70 ? 'a' : 'r'}">${r}٪</span>`;
  const gName = g => E.SUBJ[g.subjectId].name + ' · ' + E.groupLabel(st, g);

  const one = R => {
    const g = R.group, grid = P.month && R.held <= 8;   // الشهر: كل حصة بتاريخها · الترم/السنة: عمود لكل شهر
    const held = R.sessions.filter(x => x.date <= t);
    const heavy = R.rows.filter(r => r.abs >= (P.month ? 2 : 3)).sort((a, b) => b.abs - a.abs);
    let h = `<h2>${esc(gName(g))}</h2>
      <div class="boxes"><div>الطلاب<b>${R.rows.length}</b></div><div>حصص اتعملت<b>${R.held}</b></div><div class="g">حضور<b class="green">${R.pres}</b></div><div class="r">غياب<b class="red">${R.abs}</b></div><div class="a">نسبة الحضور<b>${R.rate == null ? '—' : R.rate + '٪'}</b></div></div>`;
    const offNote = () => { const off = R.off.filter(x => x.date <= to); return off.length ? `<div class="note"><b>حصص مش محسوبة:</b> ${off.map(x => E.fmtShort(x.date) + ' ' + (x.status === 'cancelled' ? 'اتلغت' : 'اتأجلت')).join(' · ')}</div>` : ''; };
    if (!R.rows.length) return h + `<div class="note">${R.held ? 'مفيش طلاب في المجموعة دي في الفترة دي' : 'مفيش حصص اتعملت للمجموعة دي في الفترة دي لحد النهارده'}</div>` + offNote();
    if (grid) {
      h += `<table><thead><tr><th>#</th><th>الطالب</th>${held.map(x => `<th class="c">${E.fmtShort(x.date)}${x.type === 'makeup' ? '<br><span style="font-weight:400;font-size:7.5pt">تعويضية</span>' : ''}</th>`).join('')}<th class="c">حضر</th><th class="c">غاب</th><th class="c">النسبة</th></tr></thead><tbody>
        ${R.rows.map((r, i) => `<tr>${td(i + 1, 'c')}${td('<b>' + esc(r.student.name) + '</b>' + (r.here ? '' : ' <span class="muted" style="font-size:8pt">(مش في المجموعة دلوقتي)</span>'))}${r.items.filter(x => x.date <= t).map(x => td(`<span class="mk ${mk[x.mark][0]}">${mk[x.mark][1]}</span>`, 'c')).join('')}${td(r.pres, 'c green')}${td(r.abs, 'c ' + (r.abs ? 'red' : ''))}${td(rateTag(r.rate), 'c')}</tr>`).join('')}</tbody>
        <tfoot><tr>${td('')}${td('عدد الحاضرين')}${held.map(x => { const v = st.attendance[x.key] || {}; return td(R.rows.filter(r => v[r.student.id] === 'p').length, 'c n'); }).join('')}${td(R.pres, 'c n')}${td(R.abs, 'c n')}${td(R.rate == null ? '—' : R.rate + '٪', 'c n')}</tr></tfoot></table>`;
    } else {
      const ms = R.months.filter(m => m <= t);
      h += `<table><thead><tr><th>#</th><th>الطالب</th>${ms.map(m => `<th class="c">${E.monthName(m)}<br><span style="font-weight:400;font-size:7.5pt">حضر / غاب</span></th>`).join('')}<th class="c">حصصه</th><th class="c">حضر</th><th class="c">غاب</th><th class="c">متسجلش</th><th class="c">النسبة</th></tr></thead><tbody>
        ${R.rows.map((r, i) => `<tr>${td(i + 1, 'c')}${td('<b>' + esc(r.student.name) + '</b>' + (r.here ? '' : ' <span class="muted" style="font-size:8pt">(مش في المجموعة دلوقتي)</span>'))}${r.byMonth.filter(b => b.m <= t).map(b => td(b.inG ? `<span class="green">${b.pres}</span> / <span class="${b.abs ? 'red' : 'muted'}">${b.abs}</span>` : '<span class="muted">—</span>', 'c n')).join('')}${td(r.counted, 'c n')}${td(r.pres, 'c green')}${td(r.abs, 'c ' + (r.abs ? 'red' : ''))}${td(r.none || '', 'c muted')}${td(rateTag(r.rate), 'c')}</tr>`).join('')}</tbody>
        <tfoot><tr>${td('')}${td('الإجمالي')}${ms.map(m => { const b = R.rows.map(r => r.byMonth.find(x => x.m === m)); return td(`${b.reduce((a, x) => a + x.pres, 0)} / ${b.reduce((a, x) => a + x.abs, 0)}`, 'c n'); }).join('')}${td(R.rows.reduce((a, r) => a + r.counted, 0), 'c n')}${td(R.pres, 'c n')}${td(R.abs, 'c n')}${td(R.none, 'c n')}${td(R.rate == null ? '—' : R.rate + '٪', 'c n')}</tr></tfoot></table>`;
    }
    if (heavy.length) h += `<h3>الأكثر غيابًا</h3><table><thead><tr><th>#</th><th>الطالب</th><th class="c">غاب</th><th>أيام الغياب</th><th>موبايل ولي الأمر</th></tr></thead><tbody>
      ${heavy.map((r, i) => `<tr>${td(i + 1, 'c')}${td(esc(r.student.name))}${td(r.abs, 'c red')}${td(r.items.filter(x => x.mark === 'a').map(x => E.fmtShort(x.date)).join('، '))}${td(esc(r.student.phone || '—'), 'n')}</tr>`).join('')}</tbody></table>`;
    h += offNote();
    if (R.none) h += `<div class="note">فيه <b>${R.none}</b> حصة لطلاب متسجلش فيها حضور أو غياب (–). سجّلها من صفحة الحصة علشان التقرير يبقى دقيق.</div>`;
    return h;
  };

  const legend = `<div class="note">✓ حضر · ✗ غاب · – متسجلش · · مكانش في المجموعة · النسبة = الحضور من الحصص المتسجلة · من ${E.fmtDate(P.from)} لحد ${E.fmtDate(to)}${to < P.to ? ' (النهارده)' : ''}</div>`;
  let html = legend;
  if (!o.g) {
    const tp = reps.reduce((a, r) => a + r.pres, 0), ta = reps.reduce((a, r) => a + r.abs, 0);
    html += `<h2>ملخص كل المجموعات</h2><table><thead><tr><th>المجموعة</th><th>الصف</th><th class="c">طلاب</th><th class="c">حصص</th><th class="c">حضور</th><th class="c">غياب</th><th class="c">النسبة</th></tr></thead><tbody>
      ${reps.map(R => `<tr>${td('<b>' + esc(gName(R.group)) + '</b>')}${td(E.GRADES[E.SUBJ[R.group.subjectId].grade])}${td(R.rows.length, 'c n')}${td(R.held, 'c n')}${td(R.pres, 'c green')}${td(R.abs, 'c ' + (R.abs ? 'red' : ''))}${td(rateTag(R.rate), 'c')}</tr>`).join('') || '<tr><td colspan="7">مفيش حصص في الفترة دي</td></tr>'}</tbody>
      <tfoot><tr>${td('الإجمالي')}${td('')}${td('')}${td(reps.reduce((a, r) => a + r.held, 0), 'c n')}${td(tp, 'c n')}${td(ta, 'c n')}${td(tp + ta ? Math.round(tp / (tp + ta) * 100) + '٪' : '—', 'c n')}</tr></tfoot></table>`;
  }
  html += reps.map(one).join('');
  const g1 = o.g ? gs[0] : null;
  doPrint('الحضور والغياب' + (g1 ? ': ' + E.SUBJ[g1.subjectId].name : ' — كل المجموعات'), (g1 ? E.GRADES[E.SUBJ[g1.subjectId].grade] + ' · ' + E.groupLabel(st, g1) + ' · ' : '') + P.label, html);
};

/* ---------- تاب "الشهور والفلوس" في صفحة المجموعة ----------
 * كل طالب في مكانه من شهره (هو)، ومين دفع شهره ومين لأ */
const _groupAtt = Views.group;
const STAGES = [
  ['done', 'خلصوا شهرهم — الحصة الجاية شهر جديد', 'red', 'check'],
  ['left1', 'فاضلهم حصة واحدة', 'amber', 'clock'],
  ['left2', 'فاضلهم حصتين', 'blue', 'clock'],
  ['left3', 'في أول الشهر — فاضلهم ٣ حصص', 'green', 'refresh'],
  ['new', 'لسه مبدأوش', 'gray', 'cal']
];
const PAYTAG = r => r.oldDue > 0 ? `<span class="chip red">عليه ${money(r.due)}${' · شهر قديم'}</span>`
  : r.pay === 'paid' ? '<span class="chip green">دفع الشهر</span>'
  : r.pay === 'partial' ? `<span class="chip amber">باقي ${money(r.curDue)}</span>`
  : r.pay === 'unpaid' ? `<span class="chip red">مدفعش ${money(r.curDue)}</span>` : '<span class="chip gray">لسه</span>';
function groupMonthRows(gid) {
  const st = App.st;
  return groupMembers(gid).map(({ student: s, enrollment: e }) => ({ student: s, enrollment: e, ...E.monthStatus(st, s, e, App.C.ledgers.get(s.id)) }));
}
const slots = r => `<span class="mslots">${r.cur.concat(r.coming).slice(0, 4).map(x => `<span class="ms ${x.mark}"><b>${x.mark === 'p' ? '✓' : x.mark === 'a' ? '✗' : x.mark === 'none' ? '–' : ''}</b><i>${E.parse(x.date).getDate()}/${E.parse(x.date).getMonth() + 1}</i></span>`).join('')}</span>`;
function monthsTab(g) {
  const st = App.st, sub = E.SUBJ[g.subjectId];
  const rows = groupMonthRows(g.id);
  const f = App.ui.grpFilter || 'all';
  const shown = rows.filter(r => f === 'all' || (f === 'owe' && r.due > 0) || (f === 'paid' && r.due <= 0 && r.pay !== 'none'));
  const paid = rows.filter(r => r.pay === 'paid' && r.oldDue <= 0).length;
  const owe = rows.filter(r => r.due > 0);
  const oweSum = owe.reduce((t, r) => t + r.due, 0);
  const cnt = k => rows.filter(r => r.stage === k).length;
  const head = `
  <header class="hero-head flat">
    <div class="row">
      <a class="icon-btn" href="#/groups" aria-label="رجوع">${ic('back')}</a>
      <div class="stack grow"><h1 style="font-size:20px">${esc(sub.name)}${g.name ? ' · ' + esc(g.name) : ''}</h1>
        <span class="sub">${E.GRADES[sub.grade]} · ${E.DAY_NAMES[E.currentSchedule(g).day]} ${E.fmtTime(E.currentSchedule(g).time)} · ${rows.length} طالب</span></div>
      ${eyeBtn()}
      <button class="icon-btn" data-act="editGroup" data-g="${g.id}" aria-label="تعديل المجموعة">${ic('edit', 20)}</button>
    </div>
    ${grpTabs()}
    <div class="grid3">
      <div class="stat glass"><span class="v" style="color:#6EE7A8">${paid}</span><span class="k">دافعين شهرهم</span></div>
      <div class="stat glass"><span class="v" style="color:#FFA3A3">${owe.length}</span><span class="k">عليهم فلوس</span></div>
      <div class="stat glass"><span class="v" style="color:#FFC98A;font-size:17px">${moneyN(oweSum)}</span><span class="k">إجمالي المطلوب</span></div></div>
  </header>`;
  if (!rows.length) return head + `<main class="pad"><div class="card"><div class="empty"><span class="ic">${ic('users', 28)}</span><h3>مفيش طلاب في المجموعة دي</h3><a class="btn accent" href="#/student-new">${ic('plus', 18)} أضف طالب</a></div></div></main>`;
  return head + `
  <main class="pad">
    <div class="mbar" role="img" aria-label="توزيع الطلاب على شهورهم">${STAGES.filter(([k]) => cnt(k)).map(([k, l, c]) => `<span class="${c}" style="flex:${cnt(k)}"><b>${cnt(k)}</b></span>`).join('')}</div>
    <div class="legend" style="padding:0 4px">${STAGES.filter(([k]) => cnt(k)).map(([k, l, c]) => `<span><i class="lg-${c}"></i>${l.split(' — ')[0]} (${cnt(k)})</span>`).join('')}</div>
    <div class="banner blue">${ic('info', 18)}<span>كل طالب شهره بيبدأ من أول حصة ليه، فطلاب المجموعة الواحدة ممكن يكونوا في أماكن مختلفة. المربعات = حصص شهره: ✓ حضر · ✗ غاب · المنقّط = جاية بتاريخها.</span></div>
    <div class="chips">${[['all', 'الكل (' + rows.length + ')'], ['owe', 'عليهم فلوس (' + owe.length + ')'], ['paid', 'دافعين (' + rows.filter(r => r.due <= 0 && r.pay !== 'none').length + ')']].map(([k, l]) => `<button class="fchip ${f === k ? 'on' : ''}" data-act="grpFilter" data-f="${k}">${l}</button>`).join('')}</div>
    ${STAGES.map(([k, label, c, icn]) => {
      const list = shown.filter(r => r.stage === k).sort((a, b) => b.due - a.due || a.student.name.localeCompare(b.student.name, 'ar'));
      if (!list.length) return '';
      return `<section style="display:flex;flex-direction:column;gap:8px">
        <h2 class="mhead ${c}">${ic(icn, 16)} ${label} <span>${list.length}</span></h2>
        <div class="card tight">${list.map(r => {
          const s = r.student;
          let line;
          if (r.stage === 'new') line = r.next ? 'أول حصة ليه ' + E.fmtDate(r.next) : 'مفيش حصص جاية';
          else if (r.stage === 'done') line = `خلص الشهر ${r.cycle}${r.next ? ` · الشهر ${r.cycle + 1} يبدأ ${E.fmtDate(r.next)}${r.price ? ' (+' + money(r.price) + ')' : ''}` : ''}`;
          else line = `الشهر ${r.cycle} · حصة ${r.pos} من 4${r.nextMonthAt ? ' · شهره الجديد ' + E.fmtShort(r.nextMonthAt) : ''}`;
          return `<div class="mrow">
            <a class="row tap" href="#/student/${s.id}" style="gap:10px;text-decoration:none;color:inherit;min-width:0;flex:1">
              <span class="avatar ${r.due > 0 ? 'red' : r.pay === 'paid' ? 'green' : ''}" style="width:38px;height:38px">${esc(initial(s.name))}</span>
              <span class="grow stack" style="gap:5px;min-width:0"><span class="row between" style="gap:6px"><span class="b ellipsis">${esc(s.name)}</span>${PAYTAG(r)}</span>
                <span class="small muted">${line}</span>${slots(r)}</span></a>
            ${r.due > 0 ? `<div class="row" style="gap:6px;margin-top:8px;padding-inline-start:48px"><button class="btn sm ghost" data-act="pay" data-s="${s.id}" style="min-height:34px">${ic('plus', 15, 2.4)} دفعة</button>${s.phone ? `<button class="btn sm green" data-act="waStudent" data-s="${s.id}" style="min-height:34px">${ic('chat', 15)} تذكير</button>` : ''}</div>` : ''}
          </div>`;
        }).join('')}</div></section>`;
    }).join('') || '<div class="card sm muted">مفيش طلاب بالفلتر ده</div>'}
    <button class="btn ghost" data-act="grpStatusPrint" data-g="${g.id}">${ic('print', 18)} طباعة / صورة لحالة المجموعة</button>
  </main>`;
}
function grpTabs() {
  const t = App.ui.grpTab || 'months';
  return `<div class="seg dark" role="tablist">${[['months', 'الشهور والفلوس'], ['att', 'الحضور والغياب']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? 'on' : ''}" data-act="grpTab" data-t="${k}">${l}</button>`).join('')}</div>`;
}
ACT.grpTab = el => { App.ui.grpTab = el.dataset.t; App.ui.grpSel = null; render(); };
ACT.grpFilter = el => { App.ui.grpFilter = el.dataset.f; render(); };
Views.group = gid => {
  const g = E.groupById(App.st, gid);
  if (App.ui.grpId !== gid) { App.ui.grpFilter = 'all'; App.ui.grpTab = 'months'; }
  if (!g || (App.ui.grpTab || 'months') === 'att') {
    const html = _groupAtt(gid);
    return g ? html.replace('</header>', grpTabs() + '</header>') : html;
  }
  if (App.ui.grpId !== gid) { App.ui.grpId = gid; App.ui.grpCycle = null; App.ui.grpSel = null; }
  return monthsTab(g);
};

/* ---------- طباعة حالة المجموعة ---------- */
ACT.grpStatusPrint = async el => { if (await needReveal()) Print.groupStatus({ g: el.dataset.g }); };
Print.groupStatus = o => {
  const st = App.st, g = E.groupById(st, o.g), sub = E.SUBJ[g.subjectId];
  const rows = groupMonthRows(g.id);
  const mk = { p: ['p', '✓'], a: ['a', '✗'], none: ['o', '–'], future: ['f', ''] };
  const owe = rows.filter(r => r.due > 0);
  const html = `<div class="boxes"><div>الطلاب<b>${rows.length}</b></div><div class="g">دافعين شهرهم<b class="green">${rows.filter(r => r.pay === 'paid' && r.oldDue <= 0).length}</b></div><div class="r">عليهم فلوس<b class="red">${owe.length}</b></div><div class="r">إجمالي المطلوب<b class="red">${f0(owe.reduce((t, r) => t + r.due, 0))} ج</b></div></div>
    <div class="note">كل طالب شهره بيبدأ من أول حصة ليه · ✓ حضر · ✗ غاب · – متسجلش · المربع الفاضي = حصة جاية بتاريخها</div>` +
    STAGES.map(([k, label]) => {
      const list = rows.filter(r => r.stage === k).sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
      if (!list.length) return '';
      return `<h2>${label} (${list.length})</h2><table><thead><tr><th>#</th><th>الطالب</th><th class="c">الشهر</th><th>حصص الشهر</th><th>الشهر الجديد</th><th>الدفع</th><th>المطلوب</th></tr></thead><tbody>
        ${list.map((r, i) => `<tr>${td(i + 1, 'c')}${td('<b>' + esc(r.student.name) + '</b>')}${td(r.cycle || '—', 'c n')}${td(r.cur.concat(r.coming).slice(0, 4).map(x => `<span class="mk ${mk[x.mark][0]}">${mk[x.mark][1]}</span><span class="muted n" style="font-size:7.5pt"> ${E.fmtShort(x.date)}</span>`).join(' &nbsp;'))}${td(r.stage === 'done' ? (r.next ? E.fmtShort(r.next) : '—') : r.nextMonthAt ? E.fmtShort(r.nextMonthAt) : '—', 'n')}${td(r.oldDue > 0 ? '<span class="tag r">شهر قديم</span>' : r.pay === 'paid' ? '<span class="tag g">دفع</span>' : r.pay === 'partial' ? '<span class="tag a">جزء</span>' : r.pay === 'unpaid' ? '<span class="tag r">مدفعش</span>' : '<span class="tag x">لسه</span>')}${td(r.due > 0 ? '<b class="red">' + f0(r.due) + ' ج</b>' : '—', 'n')}</tr>`).join('')}</tbody></table>`;
    }).join('');
  doPrint('حالة المجموعة: ' + sub.name, E.GRADES[sub.grade] + ' · ' + E.groupLabel(st, g) + ' · ' + E.fmtDate(E.today()), html);
};

/* ---------- المجموعات في الرئيسية: كل مجموعة وحالة شهور وفلوس طلابها ---------- */
window.homeGroupsHTML = () => {
  const st = App.st;
  const gs = st.groups.map(g => ({ g, rs: groupMonthRows(g.id) })).filter(x => x.rs.length)
    .sort((a, b) => E.SUBJ[a.g.subjectId].grade - E.SUBJ[b.g.subjectId].grade || a.g.subjectId.localeCompare(b.g.subjectId));
  if (!gs.length) return '';
  return `<section style="display:flex;flex-direction:column;gap:10px">
    <div class="sec-title"><h2>المجموعات — الشهور والفلوس</h2><a href="#/groups">الكل</a></div>
    <div class="card tight">${gs.map(({ g, rs }) => {
      const sub = E.SUBJ[g.subjectId];
      const n = k => rs.filter(r => r.stage === k).length;
      const owe = rs.filter(r => r.due > 0).length;
      const parts = [['done', 'red', 'خلصوا'], ['left1', 'amber', 'فاضلهم حصة'], ['left2', 'blue', 'حصتين'], ['left3', 'green', 'أول الشهر'], ['new', 'gray', 'لسه']].filter(([k]) => n(k));
      return `<a class="list-row tap" href="#/group/${g.id}" style="flex-direction:column;align-items:stretch;gap:7px">
        <span class="row between" style="gap:8px"><span class="row" style="gap:8px;min-width:0"><span class="dot g${sub.grade}"></span><span class="b ellipsis">${esc(sub.name)}${g.name ? ' · ' + esc(g.name) : ''}</span></span>
          <span class="small muted" style="white-space:nowrap">${E.DAY_NAMES[E.currentSchedule(g).day]} ${E.fmtTime(E.currentSchedule(g).time)} ${ic('chev', 14)}</span></span>
        <span class="mbar" style="height:8px;border-radius:5px">${parts.map(([k, c]) => `<span class="${c}" style="flex:${n(k)};min-width:6px"></span>`).join('')}</span>
        <span class="row" style="gap:5px;flex-wrap:wrap">${parts.map(([k, c, l]) => `<span class="chip ${c === 'gray' ? 'gray' : c}">${n(k)} ${l}</span>`).join('')}
          ${owe ? `<span class="chip red" style="background:#fff;border:1px solid #F3C4C0">${owe} عليهم فلوس</span>` : '<span class="chip green" style="background:#fff;border:1px solid #BFE3CF">كله دافع</span>'}</span>
      </a>`;
    }).join('')}</div></section>`;
};

/* ---------- تحويل طالب لمجموعة تانية من ملفه ---------- */
ACT.moveStudent = el => {
  const st = App.st, s = studentById(el.dataset.s);
  if (!s) return;
  const act = s.enrollments.filter(e => !e.endDate);
  if (!act.length) return toast('الطالب مش مشترك في مواد دلوقتي', { type: 'warn' });
  const rows = act.map(e => ({ e, g: E.groupById(st, E.currentGroupId(e)), others: st.groups.filter(x => x.subjectId === e.subjectId && x.id !== E.currentGroupId(e)) }));
  const can = rows.filter(r => r.others.length);
  if (can.length === 1 && rows.length === 1) return openTransfer([{ s, e: can[0].e }], E.currentGroupId(can[0].e));
  const sh = sheet(`<h2>تحويل ${esc(s.name)}</h2>
    <div class="banner blue">${ic('info', 18)}<span>كل مادة ليها مجموعاتها. اختار المادة اللي عايز تحوّلها — الحصص اللي حضرها وغيابه بيتنقلوا معاه، ويكمّل شهره من مكانه في المجموعة الجديدة.</span></div>
    <div class="card tight" style="box-shadow:none;border:1px solid var(--line)">${rows.map(r => {
      const P = E.cyclePosition(st, r.e, E.today());
      return `<div class="list-row" style="gap:10px">
        <span class="grow stack" style="gap:2px;min-width:0"><span class="b">${esc(E.SUBJ[r.e.subjectId].name)}</span>
          <span class="small muted ellipsis">دلوقتي: ${esc(r.g ? E.groupLabel(st, r.g) : '—')} · شهره ${P.cycle || 1}: حصة ${P.pos} من 4</span></span>
        ${r.others.length ? `<button class="btn sm" data-mv="${r.e.id}">${ic('users', 15)} تحويل</button>` : '<span class="small muted" style="max-width:110px;text-align:center">مفيش مجموعة تانية للمادة دي</span>'}
      </div>`;
    }).join('')}</div>
    ${can.length ? '' : `<a class="btn ghost" href="#/groups" data-close>${ic('plus', 18)} أضف مجموعة تانية</a>`}
    <button class="btn ghost" data-close>رجوع</button>`);
  sh.el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-mv]'); if (!b) return;
    const e = s.enrollments.find(x => x.id === b.dataset.mv);
    sh.close(); openTransfer([{ s, e }], E.currentGroupId(e));
  });
};
