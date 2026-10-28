/* حصصي — التحصيل، مشروع التخرج، التقارير والطباعة */
'use strict';

function periodOf(mode, monthDate) {
  const st = App.st, t = E.today();
  const terms = st.settings.terms || [];
  if (mode === 'month') { const m = monthDate || t; return { from: E.monthStart(m), to: E.monthEnd(m), label: 'شهر ' + E.monthLabel(m) }; }
  if (mode === 'year') { const s = terms.map(x => x.start).sort()[0] || E.monthStart(t), e = terms.map(x => x.end).sort().pop() || E.monthEnd(t); return { from: s, to: e, label: 'السنة الدراسية' }; }
  const tm = terms.find(x => x.id === mode) || terms[0];
  return tm ? { from: tm.start, to: tm.end, label: tm.name } : { from: E.monthStart(t), to: E.monthEnd(t), label: 'الشهر' };
}

/* ---------- التحصيل ---------- */
Views.dues = () => {
  const st = App.st, C = App.C;
  const mode = App.ui.duesMode || 'month';
  const md = App.ui.duesMonth || E.today();
  const P = periodOf(mode, md);
  const sum = E.periodSummary(st, C, P.from, P.to);
  const gf = App.ui.duesGrade || 0;
  const open = App.ui.openGroup;
  const cards = st.groups
    .filter(g => !gf || E.SUBJ[g.subjectId].grade === gf)
    .map(g => ({ g, d: E.groupDues(st, C, g.id, P.from, P.to) }))
    .filter(x => x.d.due > 0 || x.d.owed > 0)
    .sort((a, b) => (b.g.id === open) - (a.g.id === open) || b.d.owed - a.d.owed);
  const terms = st.settings.terms || [];
  return `
  <header class="hero-head flat">
    <div class="topbar"><h1 style="font-size:22px">التحصيل</h1>
      <div class="head-actions">${eyeBtn()}<button class="icon-btn" data-act="report" data-r="collection" aria-label="طباعة تقرير التحصيل">${ic('print', 20)}</button></div></div>
    <div class="seg dark" role="tablist">
      <button class="${mode === 'month' ? 'on' : ''}" data-act="duesMode" data-m="month">الشهر</button>
      ${terms.map(tm => `<button class="${mode === tm.id ? 'on' : ''}" data-act="duesMode" data-m="${tm.id}">${esc(tm.name)}</button>`).join('')}
      <button class="${mode === 'year' ? 'on' : ''}" data-act="duesMode" data-m="year">السنة</button>
    </div>
    ${mode === 'month' ? `<div class="row between"><button class="icon-btn" data-act="duesMonth" data-d="-1" aria-label="الشهر اللي فات">${ic('back', 20)}</button><span class="b" style="font-size:16px">${E.monthLabel(md)}</span><button class="icon-btn" data-act="duesMonth" data-d="1" aria-label="الشهر الجاي">${ic('chev', 20)}</button></div>` : `<div class="sub" style="text-align:center">${E.fmtShort(P.from)} ← ${E.fmtShort(P.to)}</div>`}
    <div class="grid3">
      <div class="stack"><span class="small" style="color:var(--on-ink-muted)">المستحق</span><span class="num b" style="font-size:19px">${moneyN(sum.due)}</span></div>
      <div class="stack"><span class="small" style="color:var(--on-ink-muted)">اتحصّل</span><span class="num b" style="font-size:19px;color:#6EE7A8">${moneyN(sum.paid)}</span></div>
      <div class="stack"><span class="small" style="color:var(--on-ink-muted)">لسه</span><span class="num b" style="font-size:19px;color:#FFB86B">${moneyN(sum.remaining)}</span></div>
    </div>
    <div class="row between small" style="color:var(--on-ink-muted);border-top:1px solid rgba(255,255,255,.1);padding-top:10px"><span>متأخرات من قبل الفترة: <b style="color:#FFA3A3">${money(sum.prior)}</b></span><span>اتقبض: <b style="color:#fff">${money(sum.cash)}</b></span></div>
    ${sum.cash ? `<div class="row small" style="gap:12px;flex-wrap:wrap;color:var(--on-ink-muted);margin-top:-6px">${Object.entries(E.METHODS).filter(([k]) => sum.byMethod[k]).map(([k, l]) => `<span>${l}: <b style="color:#fff">${money(sum.byMethod[k])}</b></span>`).join('<span>·</span>')}</div>` : ''}
  </header>
  <main class="pad">
    ${dueAlertsHTML()}
    <div class="chips">${[[0, 'الكل'], [1, 'الصف الأول'], [2, 'الصف الثاني'], [3, 'الصف الثالث']].map(([k, l]) => `<button class="fchip ${gf === k ? 'on' : ''}" data-act="duesGrade" data-g="${k}">${l}</button>`).join('')}</div>
    ${cards.length ? cards.map(({ g, d }) => {
      const sub = E.SUBJ[g.subjectId];
      const isOpen = open === g.id;
      const row = (r, kind) => {
        const s = studentById(r.studentId);
        return `<div class="row" style="padding:10px 16px;gap:12px;${kind === 'late' ? 'background:#FFF8F7' : ''}">
          <a class="avatar ${kind === 'late' ? 'red' : 'amber'}" href="#/student/${s.id}" style="text-decoration:none;width:38px;height:38px">${esc(initial(s.name))}</a>
          <a class="grow stack" href="#/student/${s.id}" style="text-decoration:none;color:inherit"><span class="b ellipsis">${esc(s.name)}</span>
            <span class="small muted">${kind === 'late' ? `متأخر ${money(r.late)}${r.current ? ' + الحالي ' + money(r.current) : ''}` : `دورة ${E.fmtShort(r.items[r.items.length - 1].date)}${r.items.some(c => c.paid > 0) ? ' · دفع جزء' : ''}`}</span></a>
          <span class="num b" style="color:${kind === 'late' ? 'var(--red)' : 'var(--accent-text)'}">${money(r.total)}</span>
          ${s.phone ? `<button class="icon-btn light" style="width:38px;height:38px;background:var(--green-soft);color:var(--green-text)" data-act="waStudent" data-s="${s.id}" aria-label="تذكير ولي الأمر">${ic('chat', 18)}</button>` : ''}</div>`;
      };
      return `<section class="card flush" style="${isOpen ? 'box-shadow:var(--shadow)' : ''}">
        <button class="tap" data-act="toggleDues" data-g="${g.id}" style="all:unset;display:flex;flex-direction:column;gap:10px;padding:16px;cursor:pointer;width:100%;box-sizing:border-box" aria-expanded="${isOpen}">
          <span class="row between"><span class="row" style="gap:8px;min-width:0"><span class="dot g${sub.grade}"></span><span class="stack" style="min-width:0"><span class="b ellipsis">${esc(sub.name)} · ${esc(E.groupLabel(st, g))}</span><span class="small muted">${E.GRADES[sub.grade]} · ${d.late.length + d.current.length ? (d.late.length + d.current.length) + ' عليهم' : 'كله دفع'}${d.late.length ? ' · ' + d.late.length + ' متأخرين' : ''}</span></span></span>
            <span class="row" style="gap:6px"><span class="num b" style="color:${d.owed ? 'var(--red)' : 'var(--green)'}">${d.owed ? money(d.owed) : 'مكتملة'}</span>${ic(isOpen ? 'chevUp' : 'chevDown', 18)}</span></span>
          <span class="row between small"><span style="color:var(--green);font-weight:600">اتحصّل ${money(d.paid)}</span><span class="muted">من ${money(d.due)} في الفترة</span></span>
          <span class="bar thin green ${d.due ? 'redbg' : ''}"><span style="width:${d.due ? pct(d.paid, d.due) : 100}%"></span></span>
        </button>
        ${isOpen ? `
          ${d.late.length ? `<div class="row" style="padding:10px 16px 4px;gap:8px"><span class="dot" style="background:var(--red);width:8px;height:8px"></span><span class="sm b" style="color:var(--red)">عليهم شهر وبدأوا التاني</span></div>${d.late.map(r => row(r, 'late')).join('')}` : ''}
          ${d.current.length ? `<div class="row" style="padding:12px 16px 4px;gap:8px"><span class="dot" style="background:var(--accent);width:8px;height:8px"></span><span class="sm b" style="color:var(--accent-text)">عليهم الشهر الحالي</span></div>${d.current.map(r => row(r, 'cur')).join('')}` : ''}
          ${!d.late.length && !d.current.length ? `<div class="sm" style="padding:12px 16px;color:var(--green);font-weight:600">${ic('check', 16)} كل طلاب المجموعة دافعين</div>` : ''}
          <div class="grid2" style="padding:12px 16px 16px"><a class="btn sm ghost" href="#/session/${encodeURIComponent((E.occurrences(st, g.id, E.addDays(E.today(), -6), E.today()).pop() || {}).key || '')}" ${E.occurrences(st, g.id, E.addDays(E.today(), -6), E.today()).length ? '' : 'hidden'}>آخر حصة</a>
            <button class="btn sm" data-act="report" data-r="group" data-g="${g.id}">${ic('print', 16)} كشف المجموعة</button></div>` : ''}
      </section>`;
    }).join('') : `<div class="card"><div class="empty"><span class="ic">${ic('wallet', 28)}</span><h3>مفيش مستحقات في الفترة دي</h3><span class="sm">أول ما تضيف طلاب في مجموعات، الحسابات هتظهر هنا لوحدها.</span></div></div>`}
  </main>`;
};
ACT.duesMode = el => { App.ui.duesMode = el.dataset.m; render(); };
ACT.duesMonth = el => { App.ui.duesMonth = E.addMonths(App.ui.duesMonth || E.today(), +el.dataset.d); render(); };
ACT.duesGrade = el => { App.ui.duesGrade = +el.dataset.g; render(); };
ACT.toggleDues = el => { App.ui.openGroup = App.ui.openGroup === el.dataset.g ? null : el.dataset.g; render(); };

/* ---------- مشروع التخرج ---------- */
const ITEM_ICONS = ['print', 'monitor', 'wrench', 'image', 'pen', 'box', 'cpu', 'book'];
Views.project = () => {
  const st = App.st;
  const g3 = st.groups.filter(g => g.subjectId === 'g3a');
  const items = st.projectItems.map(it => ({ it, list: E.projectStudents(st, it) }));
  let need = 0, got = 0;
  items.forEach(({ it, list }) => list.forEach(x => { need += it.price; got += Math.min(it.price, x.paid); }));
  const n3 = st.students.filter(s => s.grade === 3 && s.status !== 'withdrawn').length;
  const open = App.ui.openItem;
  return `
  <header class="hero-head flat green">
    <div class="topbar"><div class="stack"><h1 style="font-size:22px">مستلزمات مشروع التخرج</h1><span class="sub" style="color:#BFE3CF">الصف الثالث · ${n3} طالب في ${g3.length} ${g3.length === 1 ? 'مجموعة' : 'مجموعات'}</span></div>
      <div class="head-actions">${eyeBtn()}<button class="icon-btn" data-act="report" data-r="project" aria-label="طباعة">${ic('print', 20)}</button></div></div>
    <div class="grid3">
      <div class="stat glass" style="text-align:right"><span class="k" style="color:#BFE3CF">المطلوب</span><span class="v">${moneyN(need)}</span></div>
      <div class="stat glass" style="text-align:right"><span class="k" style="color:#BFE3CF">اتحصّل</span><span class="v" style="color:#8EF0BC">${moneyN(got)}</span></div>
      <div class="stat glass" style="text-align:right"><span class="k" style="color:#BFE3CF">لسه</span><span class="v" style="color:#FFC98A">${moneyN(need - got)}</span></div>
    </div>
  </header>
  <main class="pad fab-space">
    ${!g3.length ? `<div class="card"><div class="empty"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('box', 28)}</span><h3>مفيش مجموعات مشروع تخرج</h3><span class="sm">أضف مجموعة لمادة "مشروع التخرج" وطلاب الصف الثالث، وبعدين ضيف البنود هنا.</span><a class="btn accent" href="#/groups">أضف مجموعة</a></div></div>` :
      !items.length ? `<div class="card"><div class="empty"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('box', 28)}</span><h3>مفيش بنود لسه</h3><span class="sm">بند = حاجة بسعر ثابت على كل طالب: طباعة، كتابة على الكمبيوتر، خامات…</span></div></div>` :
      items.map(({ it, list }) => {
        const paidN = list.filter(x => x.done).length;
        const sumPaid = list.reduce((a, x) => a + Math.min(it.price, x.paid), 0);
        const isOpen = open === it.id;
        const gids = [...new Set(list.map(x => x.groupId))];
        const tab = App.ui.itemGroup && gids.includes(App.ui.itemGroup) ? App.ui.itemGroup : gids[0];
        return `<section class="card flush" style="${isOpen ? 'border:2px solid var(--green);box-shadow:var(--shadow)' : ''}">
          <button data-act="toggleItem" data-i="${it.id}" class="tap" style="all:unset;box-sizing:border-box;width:100%;padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer" aria-expanded="${isOpen}">
            <span class="row"><span class="avatar" style="border-radius:14px;width:44px;height:44px;background:var(--green-soft);color:var(--green)">${ic(it.icon || 'box', 22)}</span>
              <span class="grow stack"><span class="b">${esc(it.name)}</span><span class="small muted">${money(it.price)} للطالب${it.due ? ' · آخر ميعاد ' + E.fmtShort(it.due) : ''}${it.due && it.due < E.today() && paidN < list.length ? ' · <b style="color:var(--red)">فات الميعاد</b>' : ''}</span></span>
              <span class="sm b" style="color:${paidN === list.length ? 'var(--green)' : 'var(--accent-text)'}">${paidN} / ${list.length}</span></span>
            <span class="row between small"><span style="color:var(--green);font-weight:600">${money(sumPaid)}</span><span class="muted">من ${money(it.price * list.length)}</span></span>
            <span class="bar thin green"><span style="width:${pct(paidN, list.length)}%"></span></span>
          </button>
          ${isOpen ? `
            ${gids.length > 1 ? `<div role="tablist" style="display:grid;grid-template-columns:repeat(${gids.length},minmax(0,1fr));border-top:1px solid var(--line-2)">${gids.map(gid => {
              const gl = list.filter(x => x.groupId === gid);
              const g = E.groupById(st, gid);
              return `<button role="tab" aria-selected="${gid === tab}" data-act="itemTab" data-g="${gid}" style="min-height:46px;border:0;background:#fff;border-bottom:3px solid ${gid === tab ? 'var(--green)' : 'transparent'};color:${gid === tab ? 'var(--green-text)' : 'var(--muted)'};font-weight:700;font-size:13px">${esc(g.name || E.DAY_NAMES[E.currentSchedule(g).day])} (${gl.filter(x => x.done).length}/${gl.length})</button>`;
            }).join('')}</div>` : ''}
            ${list.filter(x => x.groupId === tab).map(x => `<div class="row" style="padding:10px 16px;gap:12px;border-top:1px solid #F1F3F6">
              <span class="avatar ${x.done ? 'green' : 'red'}" style="width:32px;height:32px;${x.done ? 'background:var(--green);color:#fff' : ''}">${ic(x.done ? 'check' : 'x', 16, 3)}</span>
              <a class="grow stack" href="#/student/${x.student.id}" style="text-decoration:none;color:inherit"><span class="b ellipsis">${esc(x.student.name)}</span>${x.paid && !x.done ? `<span class="small" style="color:var(--accent-text)">دفع ${money(x.paid)}</span>` : ''}</a>
              ${x.done ? `<button class="btn sm soft" data-act="projUnpay" data-i="${it.id}" data-s="${x.student.id}">${x.date ? E.fmtShort(x.date) : 'دفع'} ${ic('x', 14)}</button>` : `<button class="btn sm" data-act="projPay" data-i="${it.id}" data-s="${x.student.id}">دفع ${moneyN(it.price - x.paid)}</button>`}
            </div>`).join('') || '<div class="sm muted" style="padding:14px 16px">مفيش طلاب في المجموعة دي</div>'}
            <div class="grid2" style="padding:12px 16px 16px;border-top:1px solid var(--line-2)"><button class="btn sm ghost" data-act="editItem" data-i="${it.id}">${ic('edit', 16)} تعديل البند</button><button class="btn sm" data-act="report" data-r="project" data-i="${it.id}">${ic('print', 16)} طباعة</button></div>` : ''}
        </section>`;
      }).join('')}
  </main>
  ${g3.length ? `<button class="fab tap" data-act="editItem">${ic('plus', 20, 2.4)} بند جديد</button>` : ''}`;
};
ACT.toggleItem = el => { App.ui.openItem = App.ui.openItem === el.dataset.i ? null : el.dataset.i; App.ui.itemGroup = null; render(); };
ACT.itemTab = el => { App.ui.itemGroup = el.dataset.g; render(); };
ACT.projPay = el => {
  const it = App.st.projectItems.find(x => x.id === el.dataset.i);
  commit(st => { st.projectPays[it.id + '|' + el.dataset.s] = { amount: it.price, date: E.today() }; }, 'اتسجل الدفع');
};
ACT.projUnpay = async el => {
  if (!(await confirmBox({ title: 'إلغاء الدفع؟', text: 'الطالب هيرجع في قائمة اللي مدفعوش.', ok: 'إلغاء الدفع', danger: true, icon: 'undo' }))) return;
  commit(st => { delete st.projectPays[el.dataset.i + '|' + el.dataset.s]; }, 'اتلغى الدفع', { type: 'warn' });
};
ACT.editItem = el => {
  const st = App.st;
  const it = el.dataset.i ? st.projectItems.find(x => x.id === el.dataset.i) : null;
  const g3 = st.groups.filter(g => g.subjectId === 'g3a');
  let icon = it ? it.icon : 'print';
  const s = sheet(`<h2>${it ? 'تعديل البند' : 'بند جديد'}</h2>
    <label class="field">اسم البند<input class="input" id="it-n" value="${esc(it ? it.name : '')}" placeholder="مثلاً: طباعة وتجليد كتيب المشروع" autofocus></label>
    <div class="grid2"><label class="field">السعر للطالب<input class="input num" type="number" inputmode="numeric" id="it-p" value="${it ? it.price : ''}" placeholder="0"></label>
      <label class="field">آخر ميعاد<input class="input" type="date" id="it-d" value="${it ? it.due || '' : ''}"></label></div>
    <div class="field">على مين؟<div style="display:flex;flex-direction:column;gap:6px">${g3.map(g => `<label class="row check-card" style="flex-direction:row;padding:10px 12px;cursor:pointer"><input type="checkbox" value="${g.id}" ${!it || !it.groupIds.length || it.groupIds.includes(g.id) ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--green)"><span class="grow">${esc(E.groupLabel(st, g))}</span></label>`).join('')}</div></div>
    <div class="field">الأيقونة<div class="icon-grid" id="it-ic" style="grid-template-columns:repeat(8,minmax(0,1fr))">${ITEM_ICONS.map(n => `<button type="button" data-n="${n}" class="${n === icon ? 'on' : ''}" aria-label="${n}">${ic(n, 20)}</button>`).join('')}</div></div>
    <div class="grid2">${it ? `<button class="btn danger-ghost" id="it-del">${ic('trash', 18)} حذف</button>` : '<button class="btn ghost" data-close>رجوع</button>'}<button class="btn" id="it-ok">حفظ</button></div>`);
  $('#it-ic', s.el).onclick = e => { const b = e.target.closest('button'); if (!b) return; icon = b.dataset.n; $$('#it-ic button', s.el).forEach(x => x.classList.toggle('on', x === b)); };
  $('#it-ok', s.el).onclick = () => {
    const name = $('#it-n', s.el).value.trim(), price = Math.round(+$('#it-p', s.el).value);
    if (!name || !(price > 0)) return toast('اكتب اسم البند وسعره', { type: 'err', sound: 'err' });
    const ids = $$('input[type=checkbox]:checked', s.el).map(x => x.value);
    if (!ids.length) return toast('اختار مجموعة واحدة على الأقل', { type: 'err', sound: 'err' });
    const groupIds = ids.length === g3.length ? [] : ids;
    s.close();
    commit(st => {
      if (it) Object.assign(st.projectItems.find(x => x.id === it.id), { name, price, due: $('#it-d', s.el).value, groupIds, icon });
      else { const id = E.uid(st); st.projectItems.push({ id, name, price, due: $('#it-d', s.el).value, groupIds, icon, created: E.today() }); App.ui.openItem = id; }
    }, it ? 'البند اتعدل' : 'البند اتضاف');
  };
  if (it) $('#it-del', s.el).onclick = async () => {
    s.close();
    if (!(await confirmBox({ title: 'حذف البند؟', text: 'كل مدفوعات البند ده هتتمسح.', ok: 'حذف', danger: true, icon: 'trash' }))) return;
    commit(st => { st.projectItems = st.projectItems.filter(x => x.id !== it.id); Object.keys(st.projectPays).forEach(k => { if (k.startsWith(it.id + '|')) delete st.projectPays[k]; }); }, 'البند اتحذف', { type: 'warn' });
  };
};

/* ---------- التقارير ---------- */
Views.reports = () => {
  const st = App.st, C = App.C;
  const terms = st.settings.terms || [];
  const mode = App.ui.repMode || (E.termOf(st, E.today()) || terms[0] || { id: 'year' }).id;
  const P = periodOf(mode);
  const months = [];
  for (let m = E.monthStart(P.from); m <= P.to; m = E.addMonths(m, 1)) months.push(m);
  const rows = months.map(m => ({ m, s: E.periodSummary(st, C, m < P.from ? P.from : m, E.monthEnd(m) > P.to ? P.to : E.monthEnd(m)), future: m > E.today() }));
  const tot = E.periodSummary(st, C, P.from, P.to);
  const max = Math.max(1, ...rows.map(r => r.s.due));
  const RS = [
    ['group', 'كشف حساب مجموعة', 'كل طالب: المستحق والمدفوع والمتبقي', 'users', 'blue'],
    ['collection', 'التحصيل الشهري', 'إجمالي كل مجموعة وكل صف في الشهر', 'wallet', 'green'],
    ['late', 'كشف المستحقات', 'كل اللي عليهم فلوس: متأخرين، خلصوا الشهر، الحصة التالتة', 'alert', 'red'],
    ['attendance', 'كشف الغياب', 'حضور وغياب كل حصة للمجموعة في الشهر', 'check', 'amber'],
    ['schedule', 'الجدول الأسبوعي', 'جدول الحصص جاهز للطباعة والتعليق', 'cal', 'blue'],
    ['term', 'تقرير الترم / السنة', 'المستحق والمحصل شهر بشهر', 'chart', 'green'],
    ['project', 'مستلزمات المشروع', 'كل بند: مين دفع ومين لأ', 'box', 'green'],
    ['student', 'تقرير طالب كامل', 'المدفوع والمستحق والمتبقي والحضور والغياب', 'user', 'gray'],
    ['projAtt', 'المشروع: الغياب والخصومات', 'خصم كل شهر لكل طالب والإجمالي', 'box', 'green'],
    ['projQ', 'المشروع: تقييم الأسئلة', 'درجات كل سؤال بعد خصم التأخير', 'pen', 'green'],
    ['students', 'قائمة الطلاب', 'كل الطلاب بمواد كل واحد وموبايله', 'layers', 'gray']
  ];
  return `
  <header class="plain-head">${backBtn()}<h1>التقارير والطباعة</h1>${eyeBtn(true)}</header>
  <main class="pad">
    <div class="seg">${terms.map(tm => `<button class="${mode === tm.id ? 'on' : ''}" data-act="repMode" data-m="${tm.id}">${esc(tm.name)}</button>`).join('')}<button class="${mode === 'year' ? 'on' : ''}" data-act="repMode" data-m="year">السنة كاملة</button></div>
    <section class="card big" style="display:flex;flex-direction:column;gap:14px">
      <div class="stack"><span class="sm muted">اتحصّل في ${esc(P.label)}</span><span class="money-big">${money(tot.paid)}</span>
        <span class="sm b" style="color:${tot.remaining ? 'var(--red)' : 'var(--green)'}">${tot.remaining ? 'لسه ' + money(tot.remaining) + ' من ' + money(tot.due) : 'كله اتحصّل'}</span></div>
      <div class="legend"><span><i style="background:#C9D3E3"></i>المستحق</span><span><i style="background:var(--ink)"></i>المحصّل</span></div>
      <div class="chart" role="img" aria-label="المستحق والمحصل لكل شهر" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr))">${rows.map(r => `
        <div class="col"><span class="lbl">${r.future && !r.s.due ? '' : r.s.due ? r.s.pct + '٪' : '–'}</span><div class="bars">
          <span style="height:${Math.round(r.s.due / max * 130)}px;background:#C9D3E3"></span><span style="height:${Math.round(r.s.paid / max * 130)}px;background:var(--ink)"></span></div></div>`).join('')}</div>
      <div class="chart-x" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr));margin-top:-8px">${rows.map(r => `<span>${E.monthName(r.m)}</span>`).join('')}</div>
      ${!shown() ? `<button class="btn soft sm" data-act="reveal">${ic('eye', 18)} اعرض الأرقام</button>` : ''}
    </section>
    <h2 class="sec-title" style="font-size:18px">اطبع تقرير</h2>
    <div class="card tight">${RS.map(([k, n, d, icn, c]) => `<button class="list-row tap" data-act="report" data-r="${k}" style="min-height:64px">
      <span class="avatar" style="border-radius:12px;background:var(--${c === 'gray' ? 'line-2' : c + '-soft'});color:var(--${c === 'gray' ? 'muted-2' : c === 'amber' ? 'accent-text' : c === 'red' ? 'red' : c + '-text'})">${ic(icn, 20)}</span>
      <span class="grow stack"><span class="b">${n}</span><span class="small muted">${d}</span></span>${ic('print', 20)}</button>`).join('')}</div>
  </main>`;
};
ACT.repMode = el => { App.ui.repMode = el.dataset.m; render(); };

/* ---------- اختيار معايير التقرير ---------- */
ACT.report = async el => {
  const r = el.dataset.r, st = App.st;
  if (!['schedule', 'attendance', 'students', 'projAtt', 'projQ'].includes(r) && !(await needReveal())) return;
  const groupSel = (sel) => `<label class="field">المجموعة<select class="input select" id="rp-g">${st.groups.map(g => `<option value="${g.id}" ${g.id === sel ? 'selected' : ''}>${esc(E.SUBJ[g.subjectId].name + ' · ' + E.groupLabel(st, g))}</option>`).join('')}</select></label>`;
  const monthSel = `<label class="field">الشهر<input class="input" type="month" id="rp-m" value="${E.today().slice(0, 7)}"></label>`;
  const termOpts = [...(st.settings.terms || []).map(t => `<option value="${t.id}">${esc(t.name)}</option>`), '<option value="year">السنة كاملة</option>', '<option value="month">شهر</option>'].join('');
  let body = '', title = '';
  if (r === 'group') { title = 'كشف حساب مجموعة'; body = groupSel(el.dataset.g) + `<label class="field">الفترة<select class="input select" id="rp-p">${termOpts}</select></label>` + monthSel; }
  else if (r === 'collection') { title = 'التحصيل الشهري'; body = monthSel; }
  else if (r === 'attendance') { title = 'كشف الغياب'; body = groupSel() + monthSel; }
  else if (r === 'term') { title = 'تقرير الترم / السنة'; body = `<label class="field">الفترة<select class="input select" id="rp-p">${termOpts.replace('<option value="month">شهر</option>', '')}</select></label>`; }
  else if (r === 'project') { title = 'مستلزمات المشروع'; body = `<label class="field">البند<select class="input select" id="rp-i"><option value="">كل البنود</option>${st.projectItems.map(it => `<option value="${it.id}" ${it.id === el.dataset.i ? 'selected' : ''}>${esc(it.name)}</option>`).join('')}</select></label>`; }
  else if (r === 'student') { title = 'كشف حساب طالب'; body = `<label class="field">الطالب<select class="input select" id="rp-s">${st.students.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>`; }
  else if (r === 'projAtt' || r === 'projQ') {
    const gs = st.groups.filter(g => g.subjectId === 'g3a');
    if (!gs.length) return toast('مفيش مجموعات مشروع تخرج', { type: 'warn' });
    title = r === 'projAtt' ? 'الغياب والخصومات' : 'تقييم الأسئلة';
    body = `<label class="field">المجموعة<select class="input select" id="rp-g"><option value="">كل المجموعات</option>${gs.map(g => `<option value="${g.id}" ${g.id === App.ui.projGroup ? 'selected' : ''}>${esc(E.groupLabel(st, g))}</option>`).join('')}</select></label>`;
    if (r === 'projQ' && el.dataset.q) body += `<input type="hidden" id="rp-q" value="${el.dataset.q}">`;
  }
  else if (r === 'students') { title = 'قائمة الطلاب'; body = `<label class="field">الصف<select class="input select" id="rp-gr"><option value="0">كل الصفوف</option><option value="1">الصف الأول</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option></select></label>`; }
  if (['group', 'attendance'].includes(r) && !st.groups.length) return toast('مفيش مجموعات لسه', { type: 'warn' });
  if (r === 'student' && !st.students.length) return toast('مفيش طلاب لسه', { type: 'warn' });
  if (!body) return Print[r]({});
  const s = sheet(`<h2>${title}</h2>${body}<button class="btn lg" id="rp-ok">${ic('eye', 20)} عرض التقرير</button>`);
  const mEl = $('#rp-m', s.el), pEl = $('#rp-p', s.el);
  if (mEl && pEl) { const sync = () => { mEl.closest('label').hidden = pEl.value !== 'month'; }; pEl.onchange = sync; sync(); }
  $('#rp-ok', s.el).onclick = () => {
    const o = {}; [['g', 'rp-g'], ['m', 'rp-m'], ['p', 'rp-p'], ['i', 'rp-i'], ['s', 'rp-s'], ['gr', 'rp-gr'], ['q', 'rp-q']].forEach(([k, id]) => { const x = $('#' + id, s.el); if (x) o[k] = x.value; });
    s.close(); Print[r](o);
  };
};
ACT.printSchedule = () => Print.schedule({});
ACT.printStudent = async el => { if (await needReveal()) Print.student({ s: el.dataset.s }); };

/* ---------- الطباعة ---------- */
function doPrint(title, sub, html) { Report.open(title, sub, html); }
const td = (v, cls) => `<td class="${cls || ''}">${v}</td>`;
window.td = td;
const f0 = n => fmt(n);
function periodFromOpt(o) { return o.p === 'month' || (!o.p && o.m) ? { from: o.m + '-01', to: E.monthEnd(o.m + '-01'), label: 'شهر ' + E.monthLabel(o.m + '-01') } : periodOf(o.p || 'year'); }
const Print = {
  group(o) {
    const st = App.st, C = App.C, g = E.groupById(st, o.g), P = periodFromOpt(o);
    const rows = new Map();
    C.charges.filter(c => c.groupId === g.id && c.date <= P.to).forEach(c => {
      const r = rows.get(c.studentId) || { due: 0, paid: 0, rem: 0, prior: 0 };
      if (c.date >= P.from) { r.due += c.amount; r.paid += c.paid; r.rem += c.due; } else r.prior += c.due;
      rows.set(c.studentId, r);
    });
    E.studentsInSession(st, { groupId: g.id, date: E.today() }).forEach(x => { if (!rows.has(x.student.id)) rows.set(x.student.id, { due: 0, paid: 0, rem: 0, prior: 0 }); });
    const list = [...rows.entries()].map(([id, r]) => ({ s: studentById(id), ...r })).filter(x => x.s).sort((a, b) => a.s.name.localeCompare(b.s.name, 'ar'));
    const T = list.reduce((a, x) => ({ due: a.due + x.due, paid: a.paid + x.paid, rem: a.rem + x.rem, prior: a.prior + x.prior }), { due: 0, paid: 0, rem: 0, prior: 0 });
    doPrint('كشف حساب مجموعة: ' + E.SUBJ[g.subjectId].name, E.GRADES[E.SUBJ[g.subjectId].grade] + ' · ' + E.groupLabel(st, g) + ' · ' + P.label,
      `<div class="boxes"><div>المستحق<b>${f0(T.due)} ج</b></div><div>اتحصّل<b class="green">${f0(T.paid)} ج</b></div><div>المتبقي<b class="red">${f0(T.rem)} ج</b></div><div>متأخرات سابقة<b class="red">${f0(T.prior)} ج</b></div></div>
      <table><thead><tr><th>#</th><th>الطالب</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th>متأخر سابق</th><th>موبايل</th></tr></thead><tbody>
      ${list.map((x, i) => `<tr>${td(i + 1, 'c')}${td(esc(x.s.name))}${td(f0(x.due))}${td(f0(x.paid), 'green')}${td(f0(x.rem), x.rem ? 'red' : '')}${td(f0(x.prior), x.prior ? 'red' : '')}${td(esc(x.s.phone || ''))}</tr>`).join('')}</tbody>
      <tfoot><tr>${td('')}${td('الإجمالي')}${td(f0(T.due))}${td(f0(T.paid))}${td(f0(T.rem))}${td(f0(T.prior))}${td('')}</tr></tfoot></table>`);
  },
  collection(o) {
    const st = App.st, C = App.C, m = (o.m || E.today().slice(0, 7)) + '-01';
    const from = m, to = E.monthEnd(m);
    const sum = E.periodSummary(st, C, from, to);
    const byGrade = [1, 2, 3].map(gr => {
      const gs = st.groups.filter(g => E.SUBJ[g.subjectId].grade === gr).map(g => ({ g, d: E.groupDues(st, C, g.id, from, to) })).filter(x => x.d.due || x.d.owed);
      if (!gs.length) return '';
      const T = gs.reduce((a, x) => ({ due: a.due + x.d.due, paid: a.paid + x.d.paid, rem: a.rem + x.d.remaining, owed: a.owed + x.d.owed }), { due: 0, paid: 0, rem: 0, owed: 0 });
      return `<h2>${E.GRADES[gr]}</h2><table><thead><tr><th>المجموعة</th><th>المستحق</th><th>اتحصّل</th><th>المتبقي</th><th>إجمالي المتأخر عليها</th><th>عدد اللي عليهم</th></tr></thead><tbody>
        ${gs.map(({ g, d }) => `<tr>${td(esc(E.SUBJ[g.subjectId].name + ' · ' + E.groupLabel(st, g)))}${td(f0(d.due))}${td(f0(d.paid), 'green')}${td(f0(d.remaining), d.remaining ? 'red' : '')}${td(f0(d.owed), d.owed ? 'red' : '')}${td(d.late.length + d.current.length, 'c')}</tr>`).join('')}</tbody>
        <tfoot><tr>${td('الإجمالي')}${td(f0(T.due))}${td(f0(T.paid))}${td(f0(T.rem))}${td(f0(T.owed))}${td('')}</tr></tfoot></table>`;
    }).join('');
    const pays = st.payments.filter(p => p.date >= from && p.date <= to).sort((a, b) => a.date.localeCompare(b.date));
    doPrint('تقرير التحصيل · ' + E.monthLabel(m), 'الحسابات حسب بداية دورة كل طالب في الشهر',
      `<div class="boxes"><div>المستحق<b>${f0(sum.due)} ج</b></div><div>اتحصّل منه<b class="green">${f0(sum.paid)} ج</b></div><div>المتبقي<b class="red">${f0(sum.remaining)} ج</b></div><div>اتقبض في الشهر<b>${f0(sum.cash)} ج</b></div></div>
      <div class="boxes">${Object.entries(E.METHODS).map(([k, l]) => `<div>${l}<b>${f0(sum.byMethod[k])} ج</b></div>`).join('')}<div>خصومات<b>${f0(sum.discount)} ج</b></div></div>
      ${byGrade || '<p>مفيش مستحقات في الشهر ده</p>'}
      ${pays.length ? `<h2>الدفعات اللي اتسجلت في الشهر</h2><table><thead><tr><th>التاريخ</th><th>الطالب</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>${pays.map(p => `<tr>${td(E.fmtShort(p.date))}${td(esc((studentById(p.studentId) || {}).name || '—'))}${td(E.payLabel(p))}${td(f0(p.amount))}</tr>`).join('')}</tbody>
        <tfoot><tr>${td('')}${td('الإجمالي')}${td('')}${td(f0(pays.reduce((a, p) => a + +p.amount, 0)))}</tr></tfoot></table>` : ''}`);
  },
  late() {
    const C = App.C;
    const list = [...C.ledgers.values()].filter(L => L.due > 0).sort((a, b) => b.late - a.late || b.due - a.due);
    const T = list.reduce((a, L) => ({ late: a.late + L.late, cur: a.cur + L.current, due: a.due + L.due }), { late: 0, cur: 0, due: 0 });
    doPrint('كشف المتأخرات', list.length + ' طالب عليهم فلوس',
      `<div class="boxes"><div>متأخر (شهر وبدأ التاني)<b class="red">${f0(T.late)} ج</b></div><div>الشهر الحالي<b>${f0(T.cur)} ج</b></div><div>الإجمالي<b class="red">${f0(T.due)} ج</b></div></div>
      <table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>المواد اللي عليها</th><th>متأخر</th><th>الحالي</th><th>الإجمالي</th><th>موبايل</th></tr></thead><tbody>
      ${list.map((L, i) => `<tr>${td(i + 1, 'c')}${td(esc(L.student.name))}${td(E.GRADES[L.student.grade])}${td(esc([...new Set(L.charges.filter(c => c.due > 0).map(c => E.SUBJ[c.subjectId].short))].join('، ')))}${td(f0(L.late), L.late ? 'red' : '')}${td(f0(L.current))}${td(f0(L.due), 'red')}${td(esc(L.student.phone || ''))}</tr>`).join('')}</tbody>
      <tfoot><tr>${td('')}${td('الإجمالي')}${td('')}${td('')}${td(f0(T.late))}${td(f0(T.cur))}${td(f0(T.due))}${td('')}</tr></tfoot></table>`);
  },
  attendance(o) {
    const st = App.st, g = E.groupById(st, o.g), m = (o.m || E.today().slice(0, 7)) + '-01';
    const occ = E.occurrences(st, g.id, m, E.monthEnd(m));
    const studs = new Map();
    occ.forEach(x => E.studentsInSession(st, x).forEach(y => studs.set(y.student.id, y.student)));
    E.studentsInSession(st, { groupId: g.id, date: E.monthEnd(m) }).forEach(y => studs.set(y.student.id, y.student));
    const list = [...studs.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const cell = (x, s) => {
      if (x.status === 'cancelled') return td('ملغية', 'c');
      if (x.status === 'postponed') return td('متأجلة', 'c');
      if (!E.studentsInSession(st, x).some(y => y.student.id === s.id)) return td('—', 'c');
      const v = (st.attendance[x.key] || {})[s.id];
      return td(v === 'p' ? '✓' : v === 'a' ? '✗' : '', 'c ' + (v === 'a' ? 'red' : v === 'p' ? 'green' : ''));
    };
    doPrint('كشف الغياب: ' + E.SUBJ[g.subjectId].name, E.GRADES[E.SUBJ[g.subjectId].grade] + ' · ' + E.groupLabel(st, g) + ' · ' + E.monthLabel(m),
      `<table><thead><tr><th>#</th><th>الطالب</th>${occ.map(x => `<th class="c">${E.fmtShort(x.date)}${x.type === 'makeup' ? '<br>تعويضية' : ''}</th>`).join('')}<th class="c">حضر</th><th class="c">غاب</th></tr></thead><tbody>
      ${list.map((s, i) => { const v = occ.map(x => (st.attendance[x.key] || {})[s.id]); return `<tr>${td(i + 1, 'c')}${td(esc(s.name))}${occ.map(x => cell(x, s)).join('')}${td(v.filter(z => z === 'p').length, 'c green')}${td(v.filter(z => z === 'a').length, 'c red')}</tr>`; }).join('')}</tbody></table>
      ${!occ.length ? '<p>مفيش حصص في الشهر ده</p>' : ''}`);
  },
  schedule() {
    const st = App.st;
    const rows = E.WEEK.map(d => ({ d, gs: st.groups.filter(g => E.currentSchedule(g).day === d).sort((a, b) => E.currentSchedule(a).time.localeCompare(E.currentSchedule(b).time)) })).filter(r => r.gs.length);
    const col = { 1: ['#E8EEFB', '#1D4AA8'], 2: ['#FFF1DC', '#8A4B05'], 3: ['#E6F4EC', '#125F3E'] };
    const ws = E.weekStart(E.today());
    const mk = st.makeups.filter(m => m.date >= E.today()).sort((a, b) => a.date.localeCompare(b.date));
    doPrint('جدول الحصص الأسبوعي', 'ساري من ' + E.fmtShort(ws),
      `<table class="sched"><thead><tr><th style="width:22%">اليوم</th><th>الحصص</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${E.DAY_NAMES[r.d]}</b></td><td>${r.gs.map(g => { const s = E.SUBJ[g.subjectId], sc = E.currentSchedule(g); const c = col[s.grade]; const n = st.students.filter(x => x.enrollments.some(e => !e.endDate && E.currentGroupId(e) === g.id)).length; return `<div class="it" style="background:${c[0]};color:${c[1]}"><b>${E.fmtTime(sc.time)}</b> — ${esc(s.name)} · ${E.GRADES[s.grade]}${g.name ? ' · ' + esc(g.name) : ''} · ${n} طالب</div>`; }).join('')}</td></tr>`).join('')}</tbody></table>
      ${mk.length ? `<h2>حصص تعويضية جاية</h2><table><thead><tr><th>التاريخ</th><th>الساعة</th><th>المادة</th><th>بدل حصة</th></tr></thead><tbody>${mk.map(m => { const g = E.groupById(st, m.groupId); return `<tr>${td(E.fmtDate(m.date))}${td(E.fmtTime(m.time))}${td(esc(g ? E.SUBJ[g.subjectId].name : ''))}${td(E.fmtShort(m.originDate))}</tr>`; }).join('')}</tbody></table>` : ''}
      ${!rows.length ? '<p>مفيش مجموعات</p>' : ''}`);
  },
  term(o) {
    const st = App.st, C = App.C, P = periodOf(o.p || 'year');
    const months = [];
    for (let m = E.monthStart(P.from); m <= P.to; m = E.addMonths(m, 1)) months.push(m);
    const rows = months.map(m => ({ m, s: E.periodSummary(st, C, m < P.from ? P.from : m, E.monthEnd(m) > P.to ? P.to : E.monthEnd(m)) }));
    const T = E.periodSummary(st, C, P.from, P.to);
    const grades = [1, 2, 3].map(gr => { const cs = C.charges.filter(c => c.date >= P.from && c.date <= P.to && E.SUBJ[c.subjectId].grade === gr); return { gr, due: cs.reduce((a, c) => a + c.amount, 0), paid: cs.reduce((a, c) => a + c.paid, 0) }; });
    doPrint('تقرير ' + P.label, E.fmtShort(P.from) + ' ← ' + E.fmtShort(P.to),
      `<div class="boxes"><div>المستحق<b>${f0(T.due)} ج</b></div><div>اتحصّل<b class="green">${f0(T.paid)} ج</b></div><div>المتبقي<b class="red">${f0(T.remaining)} ج</b></div><div>نسبة التحصيل<b>${T.pct}٪</b></div></div>
      <table><thead><tr><th>الشهر</th><th>المستحق</th><th>اتحصّل منه</th><th>المتبقي</th><th>النسبة</th><th>نقدي</th><th>إنستاباي</th><th>محفظة</th><th>خصومات</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${td(E.monthLabel(r.m))}${td(f0(r.s.due))}${td(f0(r.s.paid), 'green')}${td(f0(r.s.remaining), r.s.remaining ? 'red' : '')}${td(r.s.due ? r.s.pct + '٪' : '–', 'c')}${td(f0(r.s.byMethod.cash))}${td(f0(r.s.byMethod.instapay))}${td(f0(r.s.byMethod.wallet))}${td(f0(r.s.discount))}</tr>`).join('')}</tbody>
      <tfoot><tr>${td('الإجمالي')}${td(f0(T.due))}${td(f0(T.paid))}${td(f0(T.remaining))}${td(T.pct + '٪', 'c')}${td(f0(T.byMethod.cash))}${td(f0(T.byMethod.instapay))}${td(f0(T.byMethod.wallet))}${td(f0(T.discount))}</tr></tfoot></table>
      <h2>حسب الصف</h2><table><thead><tr><th>الصف</th><th>المستحق</th><th>اتحصّل</th><th>المتبقي</th></tr></thead><tbody>${grades.map(g => `<tr>${td(E.GRADES[g.gr])}${td(f0(g.due))}${td(f0(g.paid), 'green')}${td(f0(g.due - g.paid), g.due - g.paid ? 'red' : '')}</tr>`).join('')}</tbody></table>`);
  },
  project(o) {
    const st = App.st;
    const items = st.projectItems.filter(it => !o.i || it.id === o.i);
    doPrint('مستلزمات مشروع التخرج', 'الصف الثالث', items.map(it => {
      const list = E.projectStudents(st, it);
      const byG = [...new Set(list.map(x => x.groupId))];
      return `<h2>${esc(it.name)} — ${f0(it.price)} ج للطالب${it.due ? ' · آخر ميعاد ' + E.fmtShort(it.due) : ''} (${list.filter(x => x.done).length}/${list.length})</h2>
        ${byG.map(gid => `<table><thead><tr><th>#</th><th>الطالب · ${esc(E.groupLabel(st, E.groupById(st, gid)))}</th><th>الحالة</th><th>المدفوع</th><th>التاريخ</th></tr></thead><tbody>
        ${list.filter(x => x.groupId === gid).map((x, i) => `<tr>${td(i + 1, 'c')}${td(esc(x.student.name))}${td(x.done ? 'دفع ✓' : 'لم يدفع ✗', x.done ? 'green' : 'red')}${td(f0(x.paid))}${td(x.date ? E.fmtShort(x.date) : '')}</tr>`).join('')}</tbody></table>`).join('')}`;
    }).join('') || '<p>مفيش بنود</p>');
  },
  student(o) {
    const st = App.st, s = studentById(o.s), L = E.studentLedger(st, s);
    doPrint('كشف حساب: ' + s.name, E.GRADES[s.grade] + (s.phone ? ' · ' + s.phone : ''),
      `<div class="boxes"><div>إجمالي المستحق<b>${f0(L.total)} ج</b></div><div>إجمالي المدفوع<b class="green">${f0(L.paid)} ج</b></div><div>${L.due ? 'المطلوب' : L.credit ? 'رصيد له' : 'الحساب'}<b class="${L.due ? 'red' : 'green'}">${L.due ? f0(L.due) + ' ج' : L.credit ? f0(L.credit) + ' ج' : 'خالص'}</b></div></div>
      <h2>المواد</h2><table><thead><tr><th>المادة</th><th>المجموعة</th><th>من</th><th>الحالة</th></tr></thead><tbody>${s.enrollments.map(e => `<tr>${td(esc(E.SUBJ[e.subjectId].name))}${td(esc(E.groupLabel(st, E.groupById(st, E.currentGroupId(e)))))}${td(E.fmtShort(e.startDate))}${td(e.endDate ? 'انسحب ' + E.fmtShort(e.endDate) : 'مشترك')}</tr>`).join('')}</tbody></table>
      <h2>الدورات (كل ٤ حصص)</h2><table><thead><tr><th>بداية الدورة</th><th>المادة</th><th>الدورة</th><th>المبلغ</th><th>المدفوع</th><th>الباقي</th></tr></thead><tbody>${L.charges.map(c => `<tr>${td(E.fmtShort(c.date))}${td(esc(E.SUBJ[c.subjectId].name))}${td(c.partial ? 'ناقصة (' + c.held + ' حصص)' : c.cycle + (c.bundle ? ' · عرض' : ''))}${td(f0(c.amount))}${td(f0(c.paid), 'green')}${td(f0(c.due), c.due ? 'red' : '')}</tr>`).join('')}</tbody></table>
      <h2>الدفعات</h2><table><thead><tr><th>التاريخ</th><th>النوع</th><th>ملاحظة</th><th>المبلغ</th></tr></thead><tbody>${L.payments.map(p => `<tr>${td(E.fmtShort(p.date))}${td(E.payLabel(p))}${td(esc(p.note || ''))}${td(f0(p.amount))}</tr>`).join('') || '<tr><td colspan="4">مفيش دفعات</td></tr>'}</tbody></table>`);
  },
  students(o) {
    const st = App.st, gr = +o.gr || 0;
    const list = st.students.filter(s => s.status !== 'withdrawn' && (!gr || s.grade === gr)).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, 'ar'));
    doPrint('قائمة الطلاب', (gr ? E.GRADES[gr] : 'كل الصفوف') + ' · ' + list.length + ' طالب',
      `<table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>المواد</th><th>موبايل ولي الأمر</th></tr></thead><tbody>
      ${list.map((s, i) => `<tr>${td(i + 1, 'c')}${td(esc(s.name))}${td(E.GRADES[s.grade])}${td(esc(s.enrollments.filter(e => !e.endDate).map(e => E.SUBJ[e.subjectId].short).join('، ')))}${td(esc(s.phone || ''))}</tr>`).join('')}</tbody></table>`);
  }
};
window.Print = Print;
