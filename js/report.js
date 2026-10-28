/* حصصي — معاينة التقارير بمقاس A4: طباعة / حفظ PDF، وحفظ صورة PNG، ومشاركة */
'use strict';
const Report = window.Report = {
  W: 794, H: 1123,           // A4 عند 96 نقطة في البوصة
  PR: 2.5,                   // جودة الصورة ≈ 240 نقطة في البوصة
  TOP: 38, BOTTOM: 52,       // هوامش الصفحة في الصورة
  fontCSS: null,
  cur: null,

  /* هيكل التقرير الموحّد */
  build(title, sub, html) {
    const st = App.st;
    const logo = st.settings.iconData || 'icons/logo-192.png';
    const now = new Date();
    return `<div class="rpt">
      <div class="r-head">
        <img class="r-logo" src="${logo}" alt="">
        <div class="r-title"><h1>${esc(title)}</h1>${sub ? `<div class="r-sub">${esc(sub)}</div>` : ''}</div>
        <div class="r-meta"><b>${esc(st.settings.appName)}</b>${E.fmtDate(E.today())} ${now.getFullYear()}<br>${E.fmtTime(nowHM())}</div>
      </div>
      ${html}
      <div class="foot"><span>${esc(st.settings.appName)} · ${esc(title)}</span><span>اتطبع ${E.fmtShort(E.today())} ${now.getFullYear()}</span></div>
    </div>`;
  },

  open(title, sub, html) {
    const doc = Report.build(title, sub, html);
    Report.cur = { title, doc };
    const el = document.createElement('div');
    el.className = 'rv';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `
      <div class="rv-bar">
        <div class="row"><button class="icon-btn" data-rv="close" aria-label="رجوع">${ic('back')}</button><h2>${esc(title)}</h2></div>
        <div class="rv-actions">
          <button class="btn accent" data-rv="print">${ic('print', 18)} طباعة / PDF</button>
          <button class="btn" data-rv="png" style="background:rgba(255,255,255,.12)">${ic('image', 18)} حفظ صورة</button>
          <button class="btn" data-rv="share" style="background:rgba(255,255,255,.12)">${ic('share', 18)} مشاركة</button>
        </div>
      </div>
      <div class="rv-scroll"><div class="rv-page">${doc}</div><div class="rv-note">معاينة بمقاس A4 · "طباعة / PDF" تقدر منها تختار "حفظ كـ PDF"</div></div>`;
    document.body.appendChild(el);
    const fit = () => {
      const page = $('.rv-page', el);
      const z = Math.min(1, (el.clientWidth - 24) / Report.W);
      page.style.zoom = z;
    };
    fit();
    window.addEventListener('resize', fit);
    const close = () => { window.removeEventListener('resize', fit); el.remove(); window.removeEventListener('popstate', onPop); };
    // زرار الرجوع بتاع الموبايل يقفل المعاينة بس
    history.pushState({ rv: 1 }, '', location.hash);
    const onPop = () => close();
    window.addEventListener('popstate', onPop);
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-rv]'); if (!b) return;
      const a = b.dataset.rv;
      if (a === 'close') { history.back(); return; }
      if (a === 'print') return Report.print(doc);
      if (b.disabled) return;
      const label = b.innerHTML; b.disabled = true; b.innerHTML = 'بيجهّز…';
      try {
        const pages = await Report.toPages(doc);
        if (a === 'png') await Report.save(pages, title);
        else await Report.share(pages, title);
      } catch (err) { console.error(err); toast('مقدرناش نعمل الصورة: ' + esc(err.message || err), { type: 'err', sound: 'err', ms: 5000 }); }
      b.disabled = false; b.innerHTML = label;
    });
  },

  print(doc) {
    const root = $('#print-root');
    root.innerHTML = doc;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 1500); }, 80);
  },

  /* التقرير → صفحات A4 (canvas)، والقطع بيكون بين الصفوف مش في نصها */
  async toPages(doc) {
    if (!window.htmlToImage) throw new Error('مكتبة الصور مش محمّلة');
    const wrap = document.createElement('div');
    wrap.className = 'rv-shot';
    wrap.innerHTML = doc;
    document.body.appendChild(wrap);
    try {
      const node = wrap.firstElementChild;
      await document.fonts.ready;
      await Promise.all([...node.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
      const top = node.getBoundingClientRect().top;
      const breaks = [...node.querySelectorAll('tbody tr, tfoot tr, table, .boxes, .note, .r-head, .foot, .sign, p, .it')]
        // بنقطع بعد صف أو جدول بس — عمره ما يقطع بعد عنوان أو رأس جدول ويسيبه لوحده
      .map(x => Math.round(x.getBoundingClientRect().bottom - top)).concat([0]).sort((a, b) => a - b);
      const total = Math.ceil(node.getBoundingClientRect().height);
      if (!Report.fontCSS) { try { Report.fontCSS = await htmlToImage.getFontEmbedCSS(node); } catch (e) { Report.fontCSS = ''; } }
      const opt = { pixelRatio: Report.PR, backgroundColor: '#ffffff', width: Report.W, height: total, cacheBust: false, fontEmbedCSS: Report.fontCSS };
      const full = await htmlToImage.toCanvas(node, opt);
      const usable = Report.H - Report.TOP - Report.BOTTOM;
      const cuts = [];
      let y = 0;
      while (y < total - 2) {
        let cut = 0;
        for (const b of breaks) if (b > y && b - y <= usable) cut = b;
        if (!cut || cut <= y + 40) cut = Math.min(total, y + usable);
        cuts.push([y, cut]); y = cut;
      }
      const PR = Report.PR, W = Report.W * PR, H = Report.H * PR;
      return cuts.map(([a, b], i) => {
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        x.drawImage(full, 0, a * PR, W, (b - a) * PR, 0, Report.TOP * PR, W, (b - a) * PR);
        if (cuts.length > 1) {
          x.fillStyle = '#6B7385';
          x.font = `${11 * PR}px "IBM Plex Sans Arabic", sans-serif`;
          x.textAlign = 'center'; x.direction = 'rtl';
          x.fillText(`صفحة ${i + 1} من ${cuts.length}`, W / 2, H - 22 * PR);
        }
        return c;
      });
    } finally { wrap.remove(); }
  },

  fileName(title, i, n) {
    const clean = String(title).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    return `${clean} - ${E.today()}${n > 1 ? ' - صفحة ' + (i + 1) : ''}.png`;
  },
  blobs(pages) { return Promise.all(pages.map(c => new Promise(r => c.toBlob(r, 'image/png')))); },
  async save(pages, title) {
    const bl = await Report.blobs(pages);
    bl.forEach((b, i) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = Report.fileName(title, i, bl.length);
      document.body.appendChild(a); setTimeout(() => { a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, i * 400);
    });
    toast(bl.length > 1 ? `اتحفظت ${bl.length} صور في Downloads` : 'الصورة اتحفظت في Downloads', { sound: 'ok' });
  },
  async share(pages, title) {
    const bl = await Report.blobs(pages);
    const files = bl.map((b, i) => new File([b], Report.fileName(title, i, bl.length), { type: 'image/png' }));
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title }); } catch (e) { if (e.name !== 'AbortError') throw e; }
    } else { await Report.save(pages, title); }
  }
};
