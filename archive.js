// ═══════════════════════════════════════════════════════
//  ARCHIVE VIEWER — Admin only
// ═══════════════════════════════════════════════════════
window.loadArchiveList = async () => {
  if (window.CR !== 'admin') return;
  const sel = document.getElementById('archiveMonthSel');
  if (!sel) return;
  try {
    const snap = await window._get(window._ref(window._db, 'monthlyArchive'));
    if (!snap.exists()) {
      sel.innerHTML = '<option value="">কোনো Archive নেই</option>';
      return;
    }
    const months = Object.keys(snap.val()).sort().reverse();
    sel.innerHTML = '<option value="">-- মাস বেছে নিন --</option>' +
      months.map(m => {
        const d = new Date(m + '-01');
        const label = d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
  } catch(e) {
    window.showToast('Archive লোড ব্যর্থ: ' + e.message, true);
  }
};

window.loadArchiveMonth = async (month) => {
  const el = document.getElementById('archiveContent');
  if (!el || !month) return;
  el.innerHTML = '<div class="empty"><div class="ic" style="animation:spin .75s linear infinite">⏳</div></div>';
  try {
    const snap = await window._get(window._ref(window._db, 'monthlyArchive/' + month));
    if (!snap.exists()) { el.innerHTML = '<div class="empty"><p>ডেটা নেই</p></div>'; return; }
    const d = snap.val();
    const label = new Date(month + '-01').toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });

    const salesArr  = Object.values(d.sales      || {});
    const expArr    = Object.values(d.expenses    || {});
    const attArr    = Object.values(d.attendance  || {});
    const salArr    = Object.values(d.salaries    || {});
    const leavesArr = Object.values(d.leaves      || {});

    const totalSale   = salesArr.reduce((a,s) => a + (s.total||0), 0);
    const totalProfit = salesArr.reduce((a,s) => a + (s.profit||0), 0);
    const totalExp    = expArr.reduce((a,e) => a + (e.amount||0), 0);
    const totalDue    = salesArr.reduce((a,s) => a + (s.due||0), 0);

    el.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--primary),var(--blue));border-radius:var(--r);padding:16px;margin-bottom:12px;color:#fff">
        <div style="font-size:16px;font-weight:800;font-family:'Sora',sans-serif;margin-bottom:10px">📅 window.${label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট বিক্রয়</div>
            <div style="font-size:18px;font-weight:700">৳window.${Math.round(totalSale).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট লাভ</div>
            <div style="font-size:18px;font-weight:700">৳window.${Math.round(totalProfit).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট খরচ</div>
            <div style="font-size:18px;font-weight:700">৳window.${Math.round(totalExp).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট বাকি</div>
            <div style="font-size:18px;font-weight:700">৳window.${Math.round(totalDue).toLocaleString('bn-BD')}</div>
          </div>
        </div>
      </div>

      <!-- Export buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
        <button onclick="archiveExportPDF('${month}')" style="padding:10px 6px;background:rgba(239,68,68,.12);border:1.5px solid var(--red);color:var(--red);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">📄 PDF</button>
        <button onclick="archiveExportExcel('${month}')" style="padding:10px 6px;background:rgba(16,185,129,.12);border:1.5px solid var(--green);color:var(--green);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">📊 Excel</button>
        <button onclick="archiveDeleteMonth('${month}')" style="padding:10px 6px;background:rgba(100,116,139,.12);border:1.5px solid var(--muted);color:var(--muted);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">🗑️ মুছুন</button>
      </div>

      <!-- বিক্রয় তালিকা -->
      <div class="sec">🛍️ বিক্রয় (window.${salesArr.length}টি)</div>
      <div style="max-height:220px;overflow-y:auto">
        window.${salesArr.sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,50).map(s=>`
          <div class="ec">
            <div class="ei">
              <div class="shop">window.${s.shop||'-'}</div>
              <div class="prod">window.${s.product||''} × window.${s.qty||1}</div>
              <div class="dt">window.${s.date||''} · window.${s.workerName||''}</div>
            </div>
            <div class="ea">
              <div class="sale">৳window.${Math.round(s.total||0).toLocaleString('bn-BD')}</div>
              window.${s.due>0?`<div style="font-size:10px;color:var(--purple)">বাকি ৳${Math.round(s.due)}</div>`:''}
            </div>
          </div>`).join('')}
        window.${salesArr.length>50?`<div style="text-align:center;padding:8px;font-size:11px;color:var(--muted)">আরো ${salesArr.length-50}টি PDF/Excel এ দেখুন</div>`:''}
      </div>

      <!-- উপস্থিতি সারসংক্ষেপ -->
      <div class="sec">⏰ উপস্থিতি (window.${attArr.length}টি)</div>
      <div style="max-height:150px;overflow-y:auto">
        window.${attArr.slice(0,30).map(a=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>window.${a.name||'-'} — window.${a.date||''}</span>
            <span style="color:${a.late?'var(--red)':'var(--green)'}">
              window.${a.checkIn||''} window.${a.late?'⚠️দেরি':''}
            </span>
          </div>`).join('')}
      </div>

      <!-- বেতন সারসংক্ষেপ -->
      <div class="sec">💰 বেতন (window.${salArr.length} কর্মী)</div>
      <div style="max-height:150px;overflow-y:auto">
        window.${salArr.map(s=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>window.${s.name||'-'}</span>
            <span style="color:var(--green);font-weight:700">৳window.${Math.round(s.baseSalary||s.salary||0).toLocaleString('bn-BD')}</span>
          </div>`).join('')}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty"><p>লোড ব্যর্থ: ${e.message}</p></div>`;
  }
};

window.archiveDeleteMonth = async (month) => {
  if (!confirm('এই মাসের Archive মুছে ফেলবেন?')) return;
  await window._remove(window._ref(window._db, 'monthlyArchive/' + month));
  window.showToast('✅ Archive মুছে গেছে');
  window.loadArchiveList();
  document.getElementById('archiveContent').innerHTML = '<div class="empty"><div class="ic">🗄️</div><p>মাস বেছে নিন</p></div>';
};

window.archiveExportPDF = (month) => {
  const el = document.getElementById('archiveContent');
  if (!el) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Hind Siliguri', Arial, sans-serif; padding: 20px; color: #000; }
      h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
      th { background: #1e3a8a; color: #fff; padding: 8px; text-align: left; }
      td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
      .sum-box { background: #f1f5f9; border-radius: 8px; padding: 12px; }
      .sum-lbl { font-size: 11px; color: #64748b; }
      .sum-val { font-size: 20px; font-weight: 700; color: #1e3a8a; }
      @media print { button { display: none; } }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap" rel="stylesheet">
    </head><body>
    window.${el.innerHTML}
    <br><button onclick="window.print()" style="padding:10px 20px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Print / PDF সেভ করুন</button>
    </body></html>`);
  w.document.close();
};

window.archiveExportExcel = async (month) => {
  try {
    const snap = await window._get(window._ref(window._db, 'monthlyArchive/' + month));
    if (!snap.exists()) { window.showToast('ডেটা নেই', true); return; }
    const d = snap.val();
    const label = new Date(month + '-01').toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });

    // CSV format (Excel এ open হয়)
    let csv = '\uFEFF'; // BOM for Bengali

    // Sales sheet
    csv += `${label} - বিক্রয় তালিকা\n`;
    csv += 'তারিখ,দোকান,পণ্য,পরিমাণ,মোট,বাকি,কর্মী\n';
    Object.values(d.sales||{}).forEach(s => {
      csv += `${s.date||''},${s.shop||''},${s.product||''},${s.qty||1},${Math.round(s.total||0)},${Math.round(s.due||0)},${s.workerName||''}\n`;
    });

    csv += `\n${label} - উপস্থিতি\n`;
    csv += 'তারিখ,নাম,চেক-ইন,চেক-আউট,দেরি\n';
    Object.values(d.attendance||{}).forEach(a => {
      csv += `${a.date||''},${a.name||''},${a.checkIn||''},${a.checkOut||''},${a.late?'হ্যাঁ':'না'}\n`;
    });

    csv += `\n${label} - বেতন\n`;
    csv += 'নাম,মূল বেতন,কমিশন,মোট\n';
    Object.values(d.salaries||{}).forEach(s => {
      csv += `${s.name||''},${Math.round(s.baseSalary||0)},${Math.round(s.commission||0)},${Math.round((s.baseSalary||0)+(s.commission||0))}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NovaTEch_${month}_Archive.csv`;
    a.click();
    URL.revokeObjectURL(url);
    window.showToast('✅ Excel ফাইল download হচ্ছে');
  } catch(e) {
    window.showToast('❌ Export ব্যর্থ: ' + e.message, true);
  }
};

