// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Replacement System v2.0
//  ✅ একাধিক পণ্য  ✅ PDF/Print  ✅ দামের পার্থক্য settlement
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  function waitForApp(cb, t = 0) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    if (t > 120) return;
    setTimeout(() => waitForApp(cb, t + 1), 250);
  }

  const $    = id => document.getElementById(id);
  const toast = (m, e) => window.showToast && window.showToast(m, e);
  const today = () => new Date().toISOString().split('T')[0];
  const bn    = n => '৳' + Math.round(n || 0).toLocaleString('bn-BD');
  const bnN   = n => Math.round(n || 0).toLocaleString('bn-BD');
  const fbPush   = (path, data) => window._push(window._ref(window._db, path), data);
  const fbUpdate = (path, data) => window._update(window._ref(window._db, path), data);
  const fbOnVal  = (path, cb)   => window._onValue(window._ref(window._db, path), cb);

  let allReplacements = {};
  let _filter = 'all';

  // ── Dynamic product rows state ──
  let _retItems = []; // [{prodId, prodName, qty, price}]
  let _givItems = [];

  // ══════════════════════════════════════════════
  //  CSS
  // ══════════════════════════════════════════════
  function injectCSS() {
    if ($('rpl2-css')) return;
    const s = document.createElement('style');
    s.id = 'rpl2-css';
    s.textContent = `
#page-replace{padding:0}
.rpl-wrap{padding:12px;display:flex;flex-direction:column;gap:12px}

.rpl-card{background:var(--card,#1a2236);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:14px;padding:14px}
.rpl-card-title{font-size:13px;font-weight:700;color:var(--text,#f1f5f9);margin-bottom:12px;display:flex;align-items:center;gap:6px}

.rpl-lbl{font-size:10px;font-weight:600;color:var(--muted,#64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
.rpl-inp,.rpl-sel{width:100%;padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;color:var(--text,#f1f5f9);font-size:13px;font-family:'Hind Siliguri',sans-serif;outline:none;transition:border-color .2s}
.rpl-inp:focus,.rpl-sel:focus{border-color:rgba(59,130,246,.5)}
.rpl-g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.rpl-mb{margin-bottom:8px}

/* Product item rows */
.rpl-prod-row{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:6px;align-items:end;margin-bottom:6px}
.rpl-del-btn{width:30px;height:36px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#ef4444;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rpl-add-btn{width:100%;padding:8px;background:rgba(59,130,246,.1);border:1px dashed rgba(59,130,246,.3);border-radius:9px;color:#60a5fa;font-size:12px;font-weight:600;cursor:pointer;font-family:'Hind Siliguri',sans-serif;margin-top:4px;transition:all .15s}
.rpl-add-btn:hover{background:rgba(59,130,246,.18)}

/* Totals */
.rpl-total-row{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--surface,#111827);border-radius:8px;margin-top:6px}
.rpl-total-lbl{font-size:11px;color:var(--muted,#64748b);font-weight:600}
.rpl-total-val{font-size:14px;font-weight:800;font-family:'Syne',sans-serif}

/* Diff box */
.rpl-diff{padding:10px 12px;border-radius:10px;margin:8px 0;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
.rpl-diff.pos{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#ef4444}
.rpl-diff.neg{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10b981}
.rpl-diff.zer{background:rgba(99,179,237,.08);border:1px solid rgba(99,179,237,.15);color:var(--muted,#64748b)}

/* Settle options */
.rpl-settle-opt{display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;cursor:pointer;margin-bottom:6px}

/* Save btn */
.rpl-save{width:100%;padding:13px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:'Hind Siliguri',sans-serif;margin-top:4px;transition:opacity .15s}
.rpl-save:active{opacity:.85}

/* Filter */
.rpl-filters{display:flex;gap:4px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.1));padding:4px;border-radius:10px}
.rpl-ft{flex:1;padding:5px;text-align:center;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;color:var(--muted,#64748b);border:none;background:none;font-family:'Hind Siliguri',sans-serif;transition:all .15s}
.rpl-ft.on{background:rgba(59,130,246,.18);color:#60a5fa;box-shadow:inset 0 0 0 1px rgba(59,130,246,.3)}

/* List item */
.rpl-item{background:var(--card,#1a2236);border:1px solid var(--border,rgba(99,179,237,.1));border-radius:12px;padding:12px;margin-bottom:8px;animation:rplIn .3s ease both}
@keyframes rplIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.rpl-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
.rpl-item-shop{font-size:13px;font-weight:700;color:var(--text,#f1f5f9)}
.rpl-item-sub{font-size:10px;color:var(--muted,#64748b);margin-top:2px}
.rpl-prods-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
.rpl-pbox{background:var(--surface,#111827);border-radius:8px;padding:8px}
.rpl-pbox-lbl{font-size:9px;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.rpl-pline{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:2px 0;border-bottom:1px solid rgba(99,179,237,.05)}
.rpl-pline:last-child{border-bottom:none}
.rpl-item-foot{display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid rgba(99,179,237,.06);gap:6px;flex-wrap:wrap}
.rpl-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.rpl-badge.pending{background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25)}
.rpl-badge.verified{background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.25)}
.rpl-verify{font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;cursor:pointer;border:1px solid rgba(16,185,129,.3);background:rgba(16,185,129,.12);color:#10b981;font-family:'Hind Siliguri',sans-serif}
.rpl-print{font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;cursor:pointer;border:1px solid rgba(59,130,246,.3);background:rgba(59,130,246,.12);color:#60a5fa;font-family:'Hind Siliguri',sans-serif}
.rpl-empty{text-align:center;padding:30px;color:var(--muted,#64748b);font-size:13px}
    `;
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════
  //  PAGE INJECT
  // ══════════════════════════════════════════════
  function injectPage() {
    if ($('page-replace')) return;
    const app = document.getElementById('appScreen');
    if (!app) return;
    const pg = document.createElement('div');
    pg.className = 'page';
    pg.id = 'page-replace';
    pg.style.display = 'none';
    pg.innerHTML = `
<div class="rpl-wrap">

  <!-- FORM -->
  <div class="rpl-card">
    <div class="rpl-card-title">🔄 নতুন রিপ্লেসমেন্ট এন্ট্রি</div>

    <!-- দোকান + তারিখ -->
    <div class="rpl-g2">
      <div>
        <div class="rpl-lbl">দোকান</div>
        <select class="rpl-sel" id="rplShop"><option value="">-- কাস্টমার --</option></select>
      </div>
      <div>
        <div class="rpl-lbl">তারিখ</div>
        <input type="date" class="rpl-inp" id="rplDate">
      </div>
    </div>

    <!-- কর্মী — সবসময় login করা ব্যক্তির নাম -->
    <div class="rpl-mb" id="rplWorkerRow">
      <div class="rpl-lbl">কর্মী</div>
      <div style="padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;font-size:13px;color:var(--text,#f1f5f9);font-weight:600">
        👷 <span id="rplWorkerName"></span>
      </div>
    </div>

    <!-- ফেরত মাল -->
    <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#ef4444;margin-bottom:8px">📥 ফেরত মাল (কাস্টমার দিলো)</div>
      <div class="rpl-prod-row" style="margin-bottom:4px">
        <div class="rpl-lbl">পণ্য</div>
        <div class="rpl-lbl">পিস</div>
        <div class="rpl-lbl">দাম/পিস</div>
        <div></div>
      </div>
      <div id="rplRetRows"></div>
      <button class="rpl-add-btn" onclick="window.rplAddRow('ret')">+ পণ্য যোগ করুন</button>
      <div class="rpl-total-row">
        <span class="rpl-total-lbl">ফেরত মালের মোট</span>
        <span class="rpl-total-val" id="rplRetTotal" style="color:#ef4444">৳০</span>
      </div>
    </div>

    <!-- দেওয়া মাল -->
    <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#10b981;margin-bottom:8px">📤 দেওয়া মাল (কর্মী দিলো)</div>
      <div class="rpl-prod-row" style="margin-bottom:4px">
        <div class="rpl-lbl">পণ্য</div>
        <div class="rpl-lbl">পিস</div>
        <div class="rpl-lbl">দাম/পিস</div>
        <div></div>
      </div>
      <div id="rplGivRows"></div>
      <button class="rpl-add-btn" onclick="window.rplAddRow('giv')">+ পণ্য যোগ করুন</button>
      <div class="rpl-total-row">
        <span class="rpl-total-lbl">দেওয়া মালের মোট</span>
        <span class="rpl-total-val" id="rplGivTotal" style="color:#10b981">৳০</span>
      </div>
    </div>

    <!-- পার্থক্য -->
    <div id="rplDiffBox" class="rpl-diff zer" style="display:none">
      <span id="rplDiffLbl">পার্থক্য</span>
      <span id="rplDiffVal">৳০</span>
    </div>

    <!-- Settlement -->
    <div id="rplSettleBox" style="display:none;margin-bottom:8px">
      <div class="rpl-lbl" style="margin-bottom:6px">পার্থক্য কীভাবে মেটাবেন?</div>
      <label class="rpl-settle-opt">
        <input type="radio" name="rplSettle" value="due" checked onchange="window.rplSettleChg(this)">
        <span style="font-size:12px;font-weight:600;color:var(--text)">🏦 বাকি হিসেবে রাখো</span>
      </label>
      <label class="rpl-settle-opt">
        <input type="radio" name="rplSettle" value="cash" onchange="window.rplSettleChg(this)">
        <span style="font-size:12px;font-weight:600;color:var(--text)">💵 নগদে মিটিয়েছি</span>
      </label>
      <label class="rpl-settle-opt">
        <input type="radio" name="rplSettle" value="goods" onchange="window.rplSettleChg(this)">
        <span style="font-size:12px;font-weight:600;color:var(--text)">📦 অন্য মাল দিয়ে মিটিয়েছি</span>
      </label>
      <div id="rplGoodsBox" style="display:none;margin-top:6px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:9px;padding:10px">
        <div class="rpl-lbl" style="margin-bottom:6px">কোন মাল দিয়েছেন?</div>
        <div class="rpl-g2">
          <div>
            <div class="rpl-lbl">পণ্য</div>
            <select class="rpl-sel" id="rplExtraProd"><option value="">-- পণ্য --</option></select>
          </div>
          <div>
            <div class="rpl-lbl">পিস</div>
            <input type="number" class="rpl-inp" id="rplExtraQty" min="1" value="1">
          </div>
        </div>
      </div>
    </div>

    <!-- নোট -->
    <div class="rpl-mb">
      <div class="rpl-lbl">নোট (ঐচ্ছিক)</div>
      <input type="text" class="rpl-inp" id="rplNote" placeholder="কারণ বা বিবরণ...">
    </div>

    <button class="rpl-save" onclick="window.rplSave()">✅ রিপ্লেসমেন্ট সংরক্ষণ</button>
  </div>

  <!-- FILTERS -->
  <div class="rpl-filters">
    <button class="rpl-ft on" onclick="window.rplSetFilter('all',this)">সব</button>
    <button class="rpl-ft" onclick="window.rplSetFilter('pending',this)">অপেক্ষায়</button>
    <button class="rpl-ft" onclick="window.rplSetFilter('verified',this)">যাচাই হয়েছে</button>
  </div>

  <!-- LIST -->
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:700;color:var(--muted,#64748b);text-transform:uppercase;letter-spacing:.5px">📋 তালিকা</span>
      <span id="rplCount" style="font-size:11px;color:var(--muted)"></span>
    </div>
    <div id="rplList"></div>
  </div>

</div>`;
    app.appendChild(pg);
  }

  // ══════════════════════════════════════════════
  //  PRODUCT ROW MANAGEMENT
  // ══════════════════════════════════════════════
  function prodOpts() {
    const prods = window.allProducts || {};
    return '<option value="">-- পণ্য --</option>' +
      Object.entries(prods).map(([id, p]) =>
        `<option value="${id}" data-price="${p.sellPrice||p.price||0}">${p.name}</option>`
      ).join('');
  }

  function renderRows(type) {
    const items = type === 'ret' ? _retItems : _givItems;
    const container = $(type === 'ret' ? 'rplRetRows' : 'rplGivRows');
    if (!container) return;

    container.innerHTML = items.map((item, i) => `
      <div class="rpl-prod-row">
        <select class="rpl-sel" onchange="window.rplRowChange('${type}',${i},'prod',this)">
          ${Object.entries(window.allProducts||{}).map(([id,p])=>
            `<option value="${id}" ${item.prodId===id?'selected':''}>${p.name}</option>`
          ).join('')}
        </select>
        <input type="number" class="rpl-inp" min="1" value="${item.qty}"
          onchange="window.rplRowChange('${type}',${i},'qty',this)">
        <input type="number" class="rpl-inp" min="0" value="${item.price}" placeholder="দাম"
          onchange="window.rplRowChange('${type}',${i},'price',this)">
        <button class="rpl-del-btn" onclick="window.rplDelRow('${type}',${i})">✕</button>
      </div>`).join('');

    calcDiff();
  }

  window.rplAddRow = function(type) {
    const prods = window.allProducts || {};
    const firstProd = Object.entries(prods)[0];
    const newItem = {
      prodId:   firstProd ? firstProd[0] : '',
      prodName: firstProd ? firstProd[1].name : '',
      qty:      1,
      price:    firstProd ? (firstProd[1].sellPrice || firstProd[1].price || 0) : 0,
    };
    if (type === 'ret') _retItems.push(newItem);
    else _givItems.push(newItem);
    renderRows(type);
  };

  window.rplDelRow = function(type, i) {
    if (type === 'ret') _retItems.splice(i, 1);
    else _givItems.splice(i, 1);
    renderRows(type);
  };

  window.rplRowChange = function(type, i, field, el) {
    const items = type === 'ret' ? _retItems : _givItems;
    if (field === 'prod') {
      const prods = window.allProducts || {};
      items[i].prodId   = el.value;
      items[i].prodName = prods[el.value]?.name || '';
      items[i].price    = prods[el.value]?.sellPrice || prods[el.value]?.price || 0;
      renderRows(type); // re-render to update price
    } else if (field === 'qty') {
      items[i].qty = parseInt(el.value) || 1;
      calcDiff();
    } else if (field === 'price') {
      items[i].price = parseFloat(el.value) || 0;
      calcDiff();
    }
  };

  // ══════════════════════════════════════════════
  //  CALC DIFF
  // ══════════════════════════════════════════════
  function calcDiff() {
    const retTotal = _retItems.reduce((s, i) => s + (i.qty * i.price), 0);
    const givTotal = _givItems.reduce((s, i) => s + (i.qty * i.price), 0);
    const diff = givTotal - retTotal;

    const retEl = $('rplRetTotal'); if (retEl) retEl.textContent = bn(retTotal);
    const givEl = $('rplGivTotal'); if (givEl) givEl.textContent = bn(givTotal);

    const box = $('rplDiffBox');
    const lbl = $('rplDiffLbl');
    const val = $('rplDiffVal');
    const sb  = $('rplSettleBox');
    if (!box) return;

    if (_retItems.length === 0 && _givItems.length === 0) {
      box.style.display = 'none';
      if (sb) sb.style.display = 'none';
      return;
    }

    box.style.display = 'flex';
    if (diff > 0) {
      box.className = 'rpl-diff pos';
      lbl.textContent = `আমরা দোকানের কাছে পাবো`;
      val.textContent = `${bn(diff)}`;
      if (sb) sb.style.display = 'block';
    } else if (diff < 0) {
      box.className = 'rpl-diff neg';
      lbl.textContent = `দোকান আমাদের কাছে পাবে`;
      val.textContent = `${bn(Math.abs(diff))}`;
      if (sb) sb.style.display = 'block';
    } else {
      box.className = 'rpl-diff zer';
      lbl.textContent = 'সমান — কোনো পার্থক্য নেই';
      val.textContent = '৳০';
      if (sb) sb.style.display = 'none';
    }
  }

  window.rplSettleChg = function(radio) {
    const gb = $('rplGoodsBox');
    if (gb) gb.style.display = radio.value === 'goods' ? 'block' : 'none';
    if (radio.value === 'goods') {
      const sel = $('rplExtraProd');
      if (sel) sel.innerHTML = prodOpts();
    }
  };

  // ══════════════════════════════════════════════
  //  LOAD SELECTS
  // ══════════════════════════════════════════════
  function loadSelects() {
    const custs = window.allCustomers || {};
    const users = window.allUsers    || {};

    const shopSel = $('rplShop');
    if (shopSel) shopSel.innerHTML = '<option value="">-- কাস্টমার --</option>' +
      Object.entries(custs).map(([id, c]) =>
        `<option value="${id}">${c.shop || c.name}</option>`
      ).join('');

    // কর্মী — সবসময় login করা ব্যক্তির নাম
    const workerNameEl = $('rplWorkerName');
    const workerRow    = $('rplWorkerRow');
    if (workerNameEl) workerNameEl.textContent = window.CN;
    if (workerRow)    workerRow.style.display = 'block';

    const dateSel = $('rplDate');
    if (dateSel && !dateSel.value) dateSel.value = today();

    // default 1 row each
    if (_retItems.length === 0) window.rplAddRow('ret');
    if (_givItems.length === 0) window.rplAddRow('giv');
  }

  // ══════════════════════════════════════════════
  //  SAVE
  // ══════════════════════════════════════════════
  window.rplSave = async function() {
    const shopId = $('rplShop')?.value;
    const date   = $('rplDate')?.value;
    if (!shopId)            { toast('দোকান বেছে নিন!', true); return; }
    if (!date)              { toast('তারিখ দিন!', true); return; }
    if (_retItems.length === 0) { toast('ফেরত পণ্য যোগ করুন!', true); return; }
    if (_givItems.length === 0) { toast('দেওয়া পণ্য যোগ করুন!', true); return; }

    const hasInvalidRet = _retItems.some(i => !i.prodId || i.qty < 1);
    const hasInvalidGiv = _givItems.some(i => !i.prodId || i.qty < 1);
    if (hasInvalidRet) { toast('ফেরত পণ্যের তথ্য সম্পূর্ণ করুন!', true); return; }
    if (hasInvalidGiv) { toast('দেওয়া পণ্যের তথ্য সম্পূর্ণ করুন!', true); return; }

    const custs = window.allCustomers || {};
    const users = window.allUsers     || {};
    const prods = window.allProducts  || {};

    const shopName = custs[shopId]?.shop || custs[shopId]?.name || '—';

    const uid = window.CU?.uid;
    const workerName = window.CN;

    const retTotal = _retItems.reduce((s, i) => s + i.qty * i.price, 0);
    const givTotal = _givItems.reduce((s, i) => s + i.qty * i.price, 0);
    const diff = givTotal - retTotal;

    const settleMethod = diff !== 0
      ? (document.querySelector('input[name="rplSettle"]:checked')?.value || 'due')
      : 'equal';

    let extraProdId = '', extraProd = '', extraQty = 0;
    if (settleMethod === 'goods') {
      extraProdId = $('rplExtraProd')?.value || '';
      extraQty    = parseInt($('rplExtraQty')?.value || 0);
      extraProd   = extraProdId ? (prods[extraProdId]?.name || '') : '';
      if (!extraProdId || !extraQty) { toast('অতিরিক্ত মালের তথ্য দিন!', true); return; }
    }

    const data = {
      date, shopId, shopName, uid, workerName,
      retItems: _retItems.map(i => ({...i})),
      givItems: _givItems.map(i => ({...i})),
      retTotal, givTotal, diff,
      settleMethod,
      extraProdId, extraProd, extraQty,
      note: $('rplNote')?.value.trim() || '',
      status: 'pending',
      addedBy: window.CU?.uid,
      addedByName: window.CN,
      ts: Date.now(),
    };

    try {
      toast('সংরক্ষণ হচ্ছে...');
      await fbPush('replacements', data);

      // বাকি আপডেট
      if (settleMethod === 'due' && diff !== 0) {
        const sales = window.allSales || {};
        const shopSales = Object.entries(sales)
          .filter(([, s]) => s.shopId === shopId)
          .sort((a, b) => (b[1].ts||0) - (a[1].ts||0));
        if (shopSales.length > 0) {
          const [lid, ls] = shopSales[0];
          const newDue = (ls.due || 0) + diff; // negative = দোকান আমাদের কাছে পাওনা
          await fbUpdate(`sales/${lid}`, { due: newDue, hasCredit: newDue < 0 });
        }
        toast(diff > 0 ? `✅ সংরক্ষিত — ${bn(diff)} আমরা দোকানের কাছে পাবো` : `✅ সংরক্ষিত — ${bn(Math.abs(diff))} দোকান আমাদের কাছে পাবে`);
      } else if (settleMethod === 'cash') {
        toast('✅ সংরক্ষিত — নগদে মিটিয়েছেন');
      } else if (settleMethod === 'goods') {
        toast(`✅ সংরক্ষিত — ${extraProd} দিয়ে মিটিয়েছেন`);
      } else {
        toast('✅ রিপ্লেসমেন্ট সংরক্ষিত');
      }

      if (window.CR === 'worker' && window.sendNotificationToRole) {
        window.sendNotificationToRole('manager', '🔄 নতুন রিপ্লেসমেন্ট',
          `${window.CN} — ${shopName}`, 'replace');
      }

      // Reset
      _retItems = []; _givItems = [];
      ['rplShop'].forEach(id => { const el=$(id); if(el) el.value=''; });
      ['rplNote'].forEach(id => { const el=$(id); if(el) el.value=''; });
      const db=$('rplDiffBox'); if(db)db.style.display='none';
      const sb=$('rplSettleBox'); if(sb)sb.style.display='none';
      const r1=document.querySelector('input[name="rplSettle"]'); if(r1)r1.checked=true;
      window.rplAddRow('ret'); window.rplAddRow('giv');
      renderList(_filter);

    } catch(e) { toast('ব্যর্থ: ' + e.message, true); }
  };

  // ══════════════════════════════════════════════
  //  RENDER LIST
  // ══════════════════════════════════════════════
  window.rplSetFilter = function(f, btn) {
    _filter = f;
    document.querySelectorAll('.rpl-ft').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    renderList(f);
  };

  function renderList(filter) {
    const el = $('rplList'); if (!el) return;
    let items = Object.entries(allReplacements)
      .map(([id, r]) => ({...r, _id: id}))
      .sort((a, b) => (b.ts||0) - (a.ts||0));

    if (window.CR === 'worker') items = items.filter(r => r.uid === window.CU?.uid);
    if (filter === 'pending')   items = items.filter(r => r.status === 'pending');
    if (filter === 'verified')  items = items.filter(r => r.status === 'verified');

    const cnt = $('rplCount'); if(cnt) cnt.textContent = `মোট ${items.length}টি`;
    if (!items.length) { el.innerHTML = `<div class="rpl-empty">📭 কোনো রিপ্লেসমেন্ট নেই</div>`; return; }

    el.innerHTML = items.map(r => {
      const diff = r.diff || 0;
      const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : '#64748b';
      const diffText  = diff > 0 ? `${bn(diff)} আমরা দোকানের কাছে পাবো`
                      : diff < 0 ? `${bn(Math.abs(diff))} দোকান আমাদের কাছে পাবে`
                      : 'সমান মাল';
      const settleLabel = {
        'due':   '🏦 বাকিতে',
        'cash':  '💵 নগদে',
        'goods': `📦 মালে${r.extraProd?' ('+r.extraProd+')':''}`,
        'equal': '⚖️ সমান',
      }[r.settleMethod] || '';

      // পণ্য list
      const retItems = r.retItems || (r.retProd ? [{prodName:r.retProd,qty:r.retQty,price:r.retPrice}] : []);
      const givItems = r.givItems || (r.givProd ? [{prodName:r.givProd,qty:r.givQty,price:r.givPrice}] : []);

      const retLines = retItems.map(i =>
        `<div class="rpl-pline"><span style="color:var(--text)">${i.prodName}</span><span>${bnN(i.qty)}পিস · ${bn(i.qty*i.price)}</span></div>`
      ).join('');
      const givLines = givItems.map(i =>
        `<div class="rpl-pline"><span style="color:var(--text)">${i.prodName}</span><span>${bnN(i.qty)}পিস · ${bn(i.qty*i.price)}</span></div>`
      ).join('');

      const canVerify = (window.CR === 'admin' || window.CR === 'manager') && r.status === 'pending';

      return `<div class="rpl-item">
        <div class="rpl-item-top">
          <div>
            <div class="rpl-item-shop">🏪 ${r.shopName}</div>
            <div class="rpl-item-sub">👷 ${r.workerName} · ${r.date}</div>
          </div>
          <span class="rpl-badge ${r.status}">${r.status==='verified'?'✅ যাচাই':'⏳ অপেক্ষায়'}</span>
        </div>

        <div class="rpl-prods-grid">
          <div class="rpl-pbox" style="border:1px solid rgba(239,68,68,.2)">
            <div class="rpl-pbox-lbl" style="color:#ef4444">📥 ফেরত — ${bn(r.retTotal||0)}</div>
            ${retLines}
          </div>
          <div class="rpl-pbox" style="border:1px solid rgba(16,185,129,.2)">
            <div class="rpl-pbox-lbl" style="color:#10b981">📤 দিলাম — ${bn(r.givTotal||0)}</div>
            ${givLines}
          </div>
        </div>

        ${r.note ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-style:italic">📝 ${r.note}</div>` : ''}

        <div class="rpl-item-foot">
          <div>
            <div style="font-size:11px;font-weight:700;color:${diffColor}">${diffText}</div>
            ${settleLabel ? `<div style="font-size:10px;color:var(--muted);margin-top:1px">${settleLabel}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px">
            <button class="rpl-print" onclick="window.rplPrint('${r._id}')">🖨️ প্রিন্ট</button>
            ${canVerify ? `<button class="rpl-verify" onclick="window.rplVerify('${r._id}')">✓ যাচাই</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════
  //  VERIFY
  // ══════════════════════════════════════════════
  window.rplVerify = async function(id) {
    try {
      await fbUpdate(`replacements/${id}`, {
        status: 'verified', verifiedBy: window.CU?.uid,
        verifiedByName: window.CN, verifiedAt: Date.now(),
      });
      toast('✅ যাচাই সম্পন্ন');
      renderList(_filter);
    } catch(e) { toast('যাচাই ব্যর্থ', true); }
  };

  // ══════════════════════════════════════════════
  //  PRINT / PDF
  // ══════════════════════════════════════════════
  window.rplPrint = function(id) {
    const r = allReplacements[id];
    if (!r) return;

    const retItems = r.retItems || (r.retProd ? [{prodName:r.retProd,qty:r.retQty,price:r.retPrice}] : []);
    const givItems = r.givItems || (r.givProd ? [{prodName:r.givProd,qty:r.givQty,price:r.givPrice}] : []);

    const diff = r.diff || 0;
    const diffText = diff > 0 ? `${bn(diff)} (আমরা দোকানের কাছে পাবো)` : diff < 0 ? `${bn(Math.abs(diff))} (দোকান আমাদের কাছে পাবে)` : 'সমান';
    const settleLabel = {'due':'বাকিতে রাখা হয়েছে','cash':'নগদে মিটিয়েছেন','goods':`মালে মিটিয়েছেন (${r.extraProd})`, 'equal':'সমান'}[r.settleMethod]||'';

    const retRows = retItems.map(i =>
      `<tr><td>${i.prodName}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">৳${i.price}</td><td style="text-align:right">৳${i.qty*i.price}</td></tr>`
    ).join('');
    const givRows = givItems.map(i =>
      `<tr><td>${i.prodName}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">৳${i.price}</td><td style="text-align:right">৳${i.qty*i.price}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8">
<title>রিপ্লেসমেন্ট রশিদ</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Hind Siliguri',Arial,sans-serif;padding:20px;font-size:13px;color:#1e293b;max-width:400px;margin:0 auto}
  .logo{font-size:20px;font-weight:800;color:#3b82f6;margin-bottom:4px}
  .sub{font-size:11px;color:#64748b;margin-bottom:16px}
  .title{font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b}
  .info-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px}
  .info-lbl{color:#64748b}
  hr{border:none;border-top:1px dashed #e2e8f0;margin:12px 0}
  .sec-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding:4px 8px;border-radius:5px}
  .ret-title{background:#fef2f2;color:#dc2626}
  .giv-title{background:#f0fdf4;color:#16a34a}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th{font-size:10px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;padding:5px 6px;text-align:left}
  td{padding:6px 6px;border-bottom:1px solid #f1f5f9;font-size:12px}
  .total-row{display:flex;justify-content:space-between;font-weight:700;font-size:13px;padding:6px 0}
  .diff-box{padding:8px 10px;border-radius:8px;margin:10px 0;display:flex;justify-content:space-between;font-weight:700;font-size:13px}
  .diff-pos{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
  .diff-neg{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
  .diff-zer{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}
  .settle{font-size:11px;color:#64748b;text-align:center;margin-top:4px}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#94a3b8}
  .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
  .verified{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
  .pending{background:#fffbeb;color:#d97706;border:1px solid #fde68a}
  @media print{body{padding:10px}}
</style></head><body>
<div class="logo">📒 NovaTEch BD</div>
<div class="sub">গ্যারান্টি রিপ্লেসমেন্ট রশিদ</div>
<div class="title">🔄 রিপ্লেসমেন্ট বিবরণ</div>

<div class="info-row"><span class="info-lbl">তারিখ:</span><span>${r.date}</span></div>
<div class="info-row"><span class="info-lbl">দোকান:</span><span>${r.shopName}</span></div>
<div class="info-row"><span class="info-lbl">কর্মী:</span><span>${r.workerName}</span></div>
<div class="info-row"><span class="info-lbl">স্ট্যাটাস:</span><span class="status ${r.status}">${r.status==='verified'?'✅ যাচাই হয়েছে':'⏳ অপেক্ষায়'}</span></div>

<hr>
<div class="sec-title ret-title">📥 ফেরত মাল (কাস্টমার দিলো)</div>
<table><thead><tr><th>পণ্য</th><th>পিস</th><th>দর</th><th>মোট</th></tr></thead>
<tbody>${retRows}</tbody></table>
<div class="total-row"><span>ফেরতের মোট</span><span style="color:#dc2626">৳${r.retTotal||0}</span></div>

<hr>
<div class="sec-title giv-title">📤 দেওয়া মাল (কর্মী দিলো)</div>
<table><thead><tr><th>পণ্য</th><th>পিস</th><th>দর</th><th>মোট</th></tr></thead>
<tbody>${givRows}</tbody></table>
<div class="total-row"><span>দেওয়ার মোট</span><span style="color:#16a34a">৳${r.givTotal||0}</span></div>

<hr>
<div class="diff-box ${diff>0?'diff-pos':diff<0?'diff-neg':'diff-zer'}">
  <span>পার্থক্য</span><span>${diffText}</span>
</div>
${settleLabel ? `<div class="settle">${settleLabel}</div>` : ''}
${r.note ? `<div style="font-size:11px;color:#64748b;margin-top:8px;font-style:italic">📝 ${r.note}</div>` : ''}

<div class="footer">
  NovaTEch BD · রিপ্লেসমেন্ট রশিদ<br>
  ${new Date().toLocaleDateString('bn-BD')}
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=450,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ══════════════════════════════════════════════
  //  FIREBASE LISTENER
  // ══════════════════════════════════════════════
  function startListener() {
    fbOnVal('replacements', snap => {
      allReplacements = snap.val() || {};
      const pg = $('page-replace');
      if (pg && pg.style.display !== 'none') renderList(_filter);
      // বিক্রয় পেজেও আপডেট করো
      renderSalePageInline();
    });
  }

  // ══════════════════════════════════════════════
  //  SALE PAGE INLINE RENDER
  // ══════════════════════════════════════════════
  function renderSalePageInline() {
    const wrap = $('salePageReplace');
    if (!wrap) return;

    let items = Object.entries(allReplacements)
      .map(([id, r]) => ({...r, _id: id}))
      .sort((a, b) => (b.ts||0) - (a.ts||0));

    if (window.CR === 'worker') {
      items = items.filter(r => r.uid === window.CU?.uid);
    }

    const recentItems = items.slice(0, 5); // সর্বশেষ ৫টি

    wrap.innerHTML = `
      <!-- রিপ্লেসমেন্ট Form -->
      <div class="sec" style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <span>🔄 রিপ্লেসমেন্ট</span>
        ${items.length > 5 ? `<button onclick="window.navTo('replace')" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-family:inherit">সব দেখুন →</button>` : ''}
      </div>

      <!-- Mini Form -->
      <div class="form-card" style="margin-bottom:12px">
        <div class="rpl-g2">
          <div>
            <div class="rpl-lbl">দোকান</div>
            <select class="rpl-sel" id="srplShop" style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-size:13px;font-family:inherit;width:100%">
              <option value="">-- কাস্টমার --</option>
              ${Object.entries(window.allCustomers||{}).map(([id,c])=>`<option value="${id}">${c.shop||c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <div class="rpl-lbl">তারিখ</div>
            <input type="date" id="srplDate" value="${today()}" style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-size:13px;width:100%">
          </div>
        </div>

        ${window.CR !== 'worker' ? `
        <div style="margin-bottom:8px;padding:8px 11px;background:var(--surface);border:1px solid var(--border);border-radius:9px;font-size:12px;color:var(--muted)">
          👷 কর্মী: <strong style="color:var(--text)">${window.CN}</strong>
        </div>` : ''}

        <!-- ফেরত মাল -->
        <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;color:#ef4444;margin-bottom:6px">📥 ফেরত মাল</div>
          <div id="srplRetRows"></div>
          <button onclick="window.srplAddRow('ret')" style="width:100%;padding:7px;background:rgba(239,68,68,.08);border:1px dashed rgba(239,68,68,.3);border-radius:8px;color:#ef4444;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ পণ্য যোগ</button>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;font-size:12px;font-weight:700;color:#ef4444">মোট: <span id="srplRetTotal" style="margin-left:6px">৳০</span></div>
        </div>

        <!-- দেওয়া মাল -->
        <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;padding:10px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;color:#10b981;margin-bottom:6px">📤 দেওয়া মাল</div>
          <div id="srplGivRows"></div>
          <button onclick="window.srplAddRow('giv')" style="width:100%;padding:7px;background:rgba(16,185,129,.08);border:1px dashed rgba(16,185,129,.3);border-radius:8px;color:#10b981;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ পণ্য যোগ</button>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;font-size:12px;font-weight:700;color:#10b981">মোট: <span id="srplGivTotal" style="margin-left:6px">৳০</span></div>
        </div>

        <!-- পার্থক্য -->
        <div id="srplDiffBox" style="display:none;padding:9px 12px;border-radius:9px;margin-bottom:8px;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:space-between">
          <span id="srplDiffLbl"></span><span id="srplDiffVal"></span>
        </div>

        <!-- Settlement -->
        <div id="srplSettleBox" style="display:none;margin-bottom:8px">
          <div class="rpl-lbl" style="margin-bottom:5px">পার্থক্য মেটানোর উপায়</div>
          <select id="srplSettle" style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-size:13px;font-family:inherit;width:100%">
            <option value="due">🏦 বাকি হিসেবে রাখো</option>
            <option value="cash">💵 নগদে মিটিয়েছি</option>
            <option value="goods">📦 অন্য মাল দিয়ে মিটিয়েছি</option>
          </select>
        </div>

        <!-- নোট -->
        <div style="margin-bottom:8px">
          <div class="rpl-lbl">নোট (ঐচ্ছিক)</div>
          <input type="text" id="srplNote" placeholder="কারণ..." style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-size:13px;width:100%">
        </div>

        <button onclick="window.srplSave()" style="width:100%;padding:12px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
          ✅ রিপ্লেসমেন্ট সংরক্ষণ
        </button>
      </div>

      <!-- সর্বশেষ তালিকা -->
      ${recentItems.length ? recentItems.map(r => {
        const diff = r.diff || 0;
        const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : '#64748b';
        const retItems = r.retItems || (r.retProd ? [{prodName:r.retProd,qty:r.retQty,price:r.retPrice}] : []);
        const givItems = r.givItems || (r.givProd ? [{prodName:r.givProd,qty:r.givQty,price:r.givPrice}] : []);
        const canVerify = (window.CR==='admin'||window.CR==='manager') && r.status==='pending';
        return `<div class="rpl-item">
          <div class="rpl-item-top">
            <div>
              <div class="rpl-item-shop">🏪 ${r.shopName}</div>
              <div class="rpl-item-sub">👷 ${r.workerName} · ${r.date}</div>
            </div>
            <span class="rpl-badge ${r.status}">${r.status==='verified'?'✅ যাচাই':'⏳ অপেক্ষায়'}</span>
          </div>
          <div class="rpl-prods-grid">
            <div class="rpl-pbox" style="border:1px solid rgba(239,68,68,.2)">
              <div class="rpl-pbox-lbl" style="color:#ef4444">📥 ফেরত — ${bn(r.retTotal||0)}</div>
              ${retItems.map(i=>`<div class="rpl-pline"><span style="color:var(--text)">${i.prodName}</span><span>${i.qty}পিস</span></div>`).join('')}
            </div>
            <div class="rpl-pbox" style="border:1px solid rgba(16,185,129,.2)">
              <div class="rpl-pbox-lbl" style="color:#10b981">📤 দিলাম — ${bn(r.givTotal||0)}</div>
              ${givItems.map(i=>`<div class="rpl-pline"><span style="color:var(--text)">${i.prodName}</span><span>${i.qty}পিস</span></div>`).join('')}
            </div>
          </div>
          <div class="rpl-item-foot">
            <div style="font-size:11px;font-weight:700;color:${diffColor}">${diff>0?'+'+bn(diff)+' আমরা দোকানের কাছে পাবো':diff<0?bn(Math.abs(diff))+' দোকান আমাদের কাছে পাবে':'সমান'}</div>
            <div style="display:flex;gap:6px">
              <button class="rpl-print" onclick="window.rplPrint('${r._id}')">🖨️</button>
              ${canVerify?`<button class="rpl-verify" onclick="window.rplVerify('${r._id}');setTimeout(()=>window.renderSalePageReplace(),500)">✓ যাচাই</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('') : '<div class="rpl-empty">📭 কোনো রিপ্লেসমেন্ট নেই</div>'}
    `;

    // inline form state init
    window._srplRet = [];
    window._srplGiv = [];
    window.srplAddRow('ret');
    window.srplAddRow('giv');
  }

  // Inline form row management
  let _srplRet = [], _srplGiv = [];

  window.srplAddRow = function(type) {
    const prods = window.allProducts || {};
    const first = Object.entries(prods)[0];
    const item = { prodId: first?.[0]||'', prodName: first?.[1]?.name||'', qty:1, price: first?.[1]?.sellPrice||first?.[1]?.price||0 };
    if (type==='ret') _srplRet.push(item); else _srplGiv.push(item);
    srplRenderRows(type);
  };

  window.srplDelRow = function(type, i) {
    if (type==='ret') _srplRet.splice(i,1); else _srplGiv.splice(i,1);
    srplRenderRows(type);
  };

  window.srplRowChange = function(type, i, field, el) {
    const items = type==='ret' ? _srplRet : _srplGiv;
    const prods = window.allProducts || {};
    if (field==='prod') {
      items[i].prodId   = el.value;
      items[i].prodName = prods[el.value]?.name||'';
      items[i].price    = prods[el.value]?.sellPrice||prods[el.value]?.price||0;
      srplRenderRows(type);
    } else if (field==='qty')   { items[i].qty   = parseInt(el.value)||1; srplCalc(); }
    else if (field==='price')   { items[i].price = parseFloat(el.value)||0; srplCalc(); }
  };

  function srplRenderRows(type) {
    const items = type==='ret' ? _srplRet : _srplGiv;
    const el = $(type==='ret'?'srplRetRows':'srplGivRows');
    if (!el) return;
    const prods = window.allProducts || {};
    const opts = Object.entries(prods).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('');
    el.innerHTML = items.map((item,i)=>`
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:5px;margin-bottom:5px;align-items:center">
        <select onchange="window.srplRowChange('${type}',${i},'prod',this)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;font-family:inherit">
          ${Object.entries(prods).map(([id,p])=>`<option value="${id}" ${item.prodId===id?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <input type="number" value="${item.qty}" min="1" oninput="window.srplRowChange('${type}',${i},'qty',this)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;width:100%">
        <input type="number" value="${item.price}" min="0" oninput="window.srplRowChange('${type}',${i},'price',this)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;width:100%">
        <button onclick="window.srplDelRow('${type}',${i})" style="width:28px;height:34px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.2);border-radius:7px;color:#ef4444;cursor:pointer;font-size:12px">✕</button>
      </div>`).join('');
    srplCalc();
  }

  function srplCalc() {
    const retT = _srplRet.reduce((s,i)=>s+i.qty*i.price,0);
    const givT = _srplGiv.reduce((s,i)=>s+i.qty*i.price,0);
    const diff = givT - retT;
    const retEl=$('srplRetTotal'); if(retEl) retEl.textContent=bn(retT);
    const givEl=$('srplGivTotal'); if(givEl) givEl.textContent=bn(givT);
    const dbox=$('srplDiffBox'), dlbl=$('srplDiffLbl'), dval=$('srplDiffVal'), sb=$('srplSettleBox');
    if (!dbox) return;
    if (diff>0) {
      dbox.style.cssText='display:flex;padding:9px 12px;border-radius:9px;margin-bottom:8px;font-size:12px;font-weight:700;align-items:center;justify-content:space-between;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#ef4444';
      dlbl.textContent=`আমরা দোকানের কাছে পাবো`; dval.textContent=`${bn(diff)}`;
      if(sb)sb.style.display='block';
    } else if (diff<0) {
      dbox.style.cssText='display:flex;padding:9px 12px;border-radius:9px;margin-bottom:8px;font-size:12px;font-weight:700;align-items:center;justify-content:space-between;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10b981';
      dlbl.textContent=`দোকান আমাদের কাছে পাবে`; dval.textContent=`${bn(Math.abs(diff))}`;
      if(sb)sb.style.display='block';
    } else {
      dbox.style.display='none'; if(sb)sb.style.display='none';
    }
  }

  window.srplSave = async function() {
    const shopId = $('srplShop')?.value;
    const date   = $('srplDate')?.value;
    if (!shopId) { toast('দোকান বেছে নিন!',true); return; }
    if (!date)   { toast('তারিখ দিন!',true); return; }
    if (_srplRet.length===0) { toast('ফেরত পণ্য যোগ করুন!',true); return; }
    if (_srplGiv.length===0) { toast('দেওয়া পণ্য যোগ করুন!',true); return; }

    const custs = window.allCustomers||{}, users = window.allUsers||{};
    const shopName = custs[shopId]?.shop||custs[shopId]?.name||'—';
    const uid = window.CU?.uid;
    const workerName = window.CN;
    const retTotal=_srplRet.reduce((s,i)=>s+i.qty*i.price,0);
    const givTotal=_srplGiv.reduce((s,i)=>s+i.qty*i.price,0);
    const diff=givTotal-retTotal;
    const settleMethod=diff!==0?($('srplSettle')?.value||'due'):'equal';

    const data = {
      date, shopId, shopName, uid, workerName,
      retItems:[..._srplRet], givItems:[..._srplGiv],
      retTotal, givTotal, diff, settleMethod,
      extraProdId:'', extraProd:'', extraQty:0,
      note:$('srplNote')?.value.trim()||'',
      status:'pending', addedBy:window.CU?.uid, addedByName:window.CN, ts:Date.now(),
    };

    try {
      toast('সংরক্ষণ হচ্ছে...');
      await fbPush('replacements', data);
      if (settleMethod==='due' && diff!==0) {
        const sales=window.allSales||{};
        const shopSales=Object.entries(sales).filter(([,s])=>s.shopId===shopId).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
        if (shopSales.length>0) {
          const [lid,ls]=shopSales[0];
          await fbUpdate(`sales/${lid}`,{due:(ls.due||0)+diff, hasCredit:((ls.due||0)+diff)<0});
        }
      }
      toast(diff>0?`✅ সংরক্ষিত — ${bn(diff)} বাকি যোগ`:diff<0?`✅ সংরক্ষিত — ${bn(Math.abs(diff))} দোকান আমাদের কাছে পাবে`:'✅ রিপ্লেসমেন্ট সংরক্ষিত');
      _srplRet=[]; _srplGiv=[];
      renderSalePageInline();
    } catch(e) { toast('ব্যর্থ: '+e.message,true); }
  };

  window.renderSalePageReplace = renderSalePageInline;

  // ══════════════════════════════════════════════
  //  NAV + INIT
  // ══════════════════════════════════════════════
  waitForApp(() => {
    injectCSS();
    injectPage();
    startListener();

    const _oSP = window.showPage;
    window.showPage = function(id, isBack) {
      if (typeof _oSP === 'function') _oSP(id, isBack);
      if (id === 'replace') {
        const pg = $('page-replace');
        if (pg) { pg.style.display = 'block'; loadSelects(); renderList(_filter); }
      }
      if (id === 'sale') {
        setTimeout(renderSalePageInline, 300);
      }
    };

    const _oNav = window.navTo;
    window.navTo = function(page, sub) {
      if (page === 'replace') { window.showPage('replace'); return; }
      if (typeof _oNav === 'function') _oNav(page, sub);
    };

    // ── Invoice এ রিপ্লেসমেন্ট যোগ করার hook ──
    const _origInvoice = window.generateInvoice;
    window.generateInvoice = function(saleId) {
      if (typeof _origInvoice === 'function') _origInvoice(saleId);

      // এই sale এর সাথে linked replacement খুঁজি
      const sale = (window.allSales || {})[saleId];
      let rpl = Object.values(allReplacements).find(r => r.linkedSaleId === saleId);
      if (!rpl && sale) {
        const saleDate = sale.date;
        const shopId   = sale.shopId;
        rpl = Object.values(allReplacements)
          .filter(r => r.inlineSale && r.shopId === shopId && r.date === saleDate)
          .sort((a, b) => (b.ts||0) - (a.ts||0))[0];
      }
      if (!rpl) return;

      // Invoice modal খোলার পরে render করি
      setTimeout(() => {
        const modal = document.getElementById('invoiceModal') ||
                      document.querySelector('.invoice-modal') ||
                      document.querySelector('[id*="invoice"]');
        const ic = document.getElementById('invoiceContent');
        if (!ic) return;

        // আগের section থাকলে সরাও
        const old = ic.querySelector('#rpl-invoice-section');
        if (old) old.remove();

        const retItems = rpl.retItems || (rpl.retProd ? [{prodName:rpl.retProd,qty:rpl.retQty,price:rpl.retPrice}] : []);
        const givItems = rpl.givItems || (rpl.givProd ? [{prodName:rpl.givProd,qty:rpl.givQty,price:rpl.givPrice}] : []);
        const diff = rpl.diff || 0;

        // diff > 0 → আমরা বেশি দিলাম → আমরা দোকানের কাছে পাবো
        // diff < 0 → দোকান বেশি দিলো → দোকান আমাদের কাছে পাবে
        const diffLabel = diff > 0 ? 'আমরা দোকানের কাছে পাবো'
                        : diff < 0 ? 'দোকান আমাদের কাছে পাবে'
                        : 'সমান মাল';
        const diffColor  = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#64748b';
        const diffBg     = diff > 0 ? '#f0fdf4' : diff < 0 ? '#fef2f2' : '#f8fafc';
        const diffBorder = diff > 0 ? '#a7f3d0' : diff < 0 ? '#fecaca' : '#e2e8f0';

        const rplSection = document.createElement('div');
        rplSection.id = 'rpl-invoice-section';
        rplSection.style.cssText = 'margin-top:14px;padding-top:14px;border-top:2px dashed #e2e8f0';
        rplSection.innerHTML = `
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            🔄 <span>রিপ্লেসমেন্ট বিবরণ</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px">
              <div style="font-size:9px;font-weight:700;color:#dc2626;margin-bottom:6px;text-transform:uppercase">📥 ফেরত পেলাম</div>
              ${retItems.map(i=>`
                <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(220,38,38,.1)">
                  <span style="color:#1e293b">${i.prodName}</span>
                  <span style="color:#64748b">${i.qty}পিস</span>
                </div>`).join('')}
              <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#dc2626;margin-top:6px;padding-top:5px;border-top:1px solid #fecaca">
                <span>মোট</span><span>৳${Math.round(rpl.retTotal||0)}</span>
              </div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:9px">
              <div style="font-size:9px;font-weight:700;color:#059669;margin-bottom:6px;text-transform:uppercase">📤 দিলাম</div>
              ${givItems.map(i=>`
                <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(5,150,105,.1)">
                  <span style="color:#1e293b">${i.prodName}</span>
                  <span style="color:#64748b">${i.qty}পিস</span>
                </div>`).join('')}
              <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#059669;margin-top:6px;padding-top:5px;border-top:1px solid #a7f3d0">
                <span>মোট</span><span>৳${Math.round(rpl.givTotal||0)}</span>
              </div>
            </div>
          </div>

          <div style="padding:10px 12px;border-radius:8px;background:${diffBg};border:1px solid ${diffBorder};display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;font-weight:700;color:${diffColor}">${diffLabel}</span>
            <span style="font-size:14px;font-weight:800;color:${diffColor}">৳${Math.round(Math.abs(diff))}</span>
          </div>

          ${rpl.note ? `<div style="font-size:10px;color:#64748b;margin-top:7px;font-style:italic;padding:6px 8px;background:#f8fafc;border-radius:6px">📝 ${rpl.note}</div>` : ''}

          <!-- নেট হিসাব -->
          ${(() => {
            const saleTot = sale?.total || 0;
            // diff > 0 → আমরা বেশি দিলাম → দোকান আমাদের কাছে দেনা → বিক্রয় থেকে বাদ যাবে
            // diff < 0 → দোকান বেশি দিলো → দোকান আমাদের কাছে পাবে → বিক্রয়ের সাথে যোগ হবে
            const net = saleTot - diff; // diff > 0 হলে আমরা কম নেব, diff < 0 হলে বেশি নেব
            const netAbs = Math.abs(net);
            const netLabel = net > 0 ? `দোকান আমাদের ${bn(netAbs)} দেবে`
                           : net < 0 ? `আমরা দোকানকে ${bn(netAbs)} দেব`
                           : 'পরস্পর সমান — লেনদেন শূন্য';
            const netColor = net > 0 ? '#1d4ed8' : net < 0 ? '#dc2626' : '#059669';
            const netBg    = net > 0 ? '#eff6ff' : net < 0 ? '#fef2f2' : '#f0fdf4';
            return `<div style="margin-top:10px;padding:12px;border-radius:10px;background:${netBg};border:2px solid ${netColor}22">
              <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:6px">📊 সামগ্রিক নেট হিসাব</div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:3px">
                <span>বিক্রয়</span><span>৳${Math.round(saleTot)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:${diffColor};margin-bottom:6px">
                <span>${diffLabel}</span><span>${diff>0?'+':'-'}৳${Math.round(Math.abs(diff))}</span>
              </div>
              <div style="border-top:1px solid ${netColor}33;padding-top:7px;display:flex;justify-content:space-between;align-items:center;margin-bottom:${net<0?'8px':'0'}">
                <span style="font-size:12px;font-weight:700;color:${netColor}">${netLabel}</span>
                <span style="font-size:16px;font-weight:800;color:${netColor}">৳${netAbs}</span>
              </div>
              ${net < 0 ? `
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:7px">
                <span style="font-size:16px">📦</span>
                <div>
                  <div style="font-size:11px;font-weight:700;color:#d97706">কোম্পানি নীতি</div>
                  <div style="font-size:10px;color:#92400e;margin-top:1px">নগদ অর্থ প্রদান করা হয় না। পরবর্তী বিক্রয়ে <strong>৳${netAbs}</strong> এর মাল নেওয়া যাবে।</div>
                </div>
              </div>` : ''}
            </div>`;
          })()}
        `;

        // Invoice এর একদম শেষে append
        ic.appendChild(rplSection);
      }, 200);
    };
  });

  // ══════════════════════════════════════════════
  //  INLINE SALE FORM — রিপ্লেসমেন্ট
  // ══════════════════════════════════════════════
  let _inRet = [], _inGiv = [];

  function initInlineRpl() {
    // toggle
    window.toggleReplacement = function(cb) {
      const sec = $('replacementSection');
      if (!sec) return;
      if (cb.checked) {
        sec.style.display = 'block';
        if (_inRet.length === 0) window.rplInAddRow('ret');
        if (_inGiv.length === 0) window.rplInAddRow('giv');
      } else {
        sec.style.display = 'none';
        _inRet = []; _inGiv = [];
      }
    };

    // addSale এ hook — সেভের পরে replacement সেভ করব
    const _origAddSale = window.addSale;
    window.addSale = async function() {
      // আগে replacement data capture করি (save হওয়ার আগে)
      const hasRpl = $('hasReplacement')?.checked;
      const rplData = hasRpl ? captureInlineRpl() : null;
      if (hasRpl && !rplData) return; // validation failed

      // original addSale চালাই
      await _origAddSale.apply(this, arguments);

      // addSale সফল হলে replacement save করি
      if (rplData) {
        try {
          // সর্বশেষ sale ID পাওয়ার জন্য একটু অপেক্ষা
          setTimeout(async () => {
            const shopId = $('sShopSel')?.value;
            // সেই দোকানের সর্বশেষ sale খুঁজি
            const sales = window.allSales || {};
            const shopSales = Object.entries(sales)
              .filter(([, s]) => s.shopId === shopId)
              .sort((a, b) => (b[1].ts||0) - (a[1].ts||0));

            const latestSaleId = shopSales[0]?.[0] || null;

            await fbPush('replacements', {
              ...rplData,
              linkedSaleId: latestSaleId,
              ts: Date.now(),
            });

            // settlement অনুযায়ী বাকি আপডেট
            if (rplData.settleMethod === 'due' && rplData.diff !== 0 && latestSaleId) {
              const ls = shopSales[0]?.[1];
              if (ls) {
                await fbUpdate(`sales/${latestSaleId}`, {
                  due: Math.max(0, (ls.due||0) + rplData.diff),
                  hasReplacement: true,
                });
              }
            } else if (rplData.settleMethod === 'adjust' && latestSaleId) {
              // বিক্রয়ের total থেকে replacement diff বাদ
              const ls = shopSales[0]?.[1];
              if (ls) {
                const newTotal = Math.max(0, (ls.total||0) - rplData.diff);
                await fbUpdate(`sales/${latestSaleId}`, {
                  total: newTotal,
                  hasReplacement: true,
                  rplAdjust: rplData.diff,
                });
              }
            } else if (latestSaleId) {
              await fbUpdate(`sales/${latestSaleId}`, { hasReplacement: true });
            }

            // form reset
            resetInlineRpl();
            toast('🔄 রিপ্লেসমেন্টও সংরক্ষিত হয়েছে');
          }, 1500);
        } catch(e) {
          toast('রিপ্লেসমেন্ট সেভ ব্যর্থ: ' + e.message, true);
        }
      }
    };
  }

  function captureInlineRpl() {
    const shopId = $('sShopSel')?.value;
    const date   = $('sDate')?.value;
    const custs  = window.allCustomers || {};
    const users  = window.allUsers || {};

    if (_inRet.length === 0) { toast('ফেরত পণ্য যোগ করুন!', true); return null; }
    if (_inGiv.length === 0) { toast('দেওয়া পণ্য যোগ করুন!', true); return null; }
    if (_inRet.some(i => !i.prodId)) { toast('ফেরত পণ্য সম্পূর্ণ করুন!', true); return null; }
    if (_inGiv.some(i => !i.prodId)) { toast('দেওয়া পণ্য সম্পূর্ণ করুন!', true); return null; }

    const retTotal = _inRet.reduce((s, i) => s + i.qty * i.price, 0);
    const givTotal = _inGiv.reduce((s, i) => s + i.qty * i.price, 0);
    const diff = givTotal - retTotal;
    const settleMethod = diff !== 0 ? ($('rplInSettle')?.value || 'due') : 'equal';
    let uid = window.CU?.uid, workerName = window.CN;

    return {
      date: date || new Date().toISOString().split('T')[0],
      shopId, shopName: custs[shopId]?.shop || custs[shopId]?.name || '—',
      uid, workerName,
      retItems: [..._inRet],
      givItems: [..._inGiv],
      retTotal, givTotal, diff,
      settleMethod,
      extraProdId: '', extraProd: '', extraQty: 0,
      note: $('rplInNote')?.value.trim() || '',
      status: 'pending',
      addedBy: window.CU?.uid,
      addedByName: window.CN,
      inlineSale: true,
    };
  }

  function resetInlineRpl() {
    const cb = $('hasReplacement'); if (cb) cb.checked = false;
    const sec = $('replacementSection'); if (sec) sec.style.display = 'none';
    _inRet = []; _inGiv = [];
    const note = $('rplInNote'); if (note) note.value = '';
    const db = $('rplInDiffBox'); if (db) db.style.display = 'none';
    const sb = $('rplInSettleBox'); if (sb) sb.style.display = 'none';
    const rr = $('rplInRetRows'); if (rr) rr.innerHTML = '';
    const gr = $('rplInGivRows'); if (gr) gr.innerHTML = '';
  }

  // Row management — inline
  window.rplInAddRow = function(type) {
    const prods = window.allProducts || {};
    const first = Object.entries(prods)[0];
    const item = {
      prodId:   first?.[0] || '',
      prodName: first?.[1]?.name || '',
      qty: 1,
      price: first?.[1]?.sellPrice || first?.[1]?.price || 0,
    };
    if (type === 'ret') _inRet.push(item); else _inGiv.push(item);
    rplInRenderRows(type);
  };

  window.rplInDelRow = function(type, i) {
    if (type === 'ret') _inRet.splice(i, 1); else _inGiv.splice(i, 1);
    rplInRenderRows(type);
  };

  window.rplInRowChange = function(type, i, field, el) {
    const items = type === 'ret' ? _inRet : _inGiv;
    const prods = window.allProducts || {};
    if (field === 'prod') {
      items[i].prodId   = el.value;
      items[i].prodName = prods[el.value]?.name || '';
      items[i].price    = prods[el.value]?.sellPrice || prods[el.value]?.price || 0;
      rplInRenderRows(type);
    } else if (field === 'qty')   { items[i].qty   = parseInt(el.value) || 1; rplInCalc(); }
    else if  (field === 'price')  { items[i].price = parseFloat(el.value) || 0; rplInCalc(); }
  };

  function rplInRenderRows(type) {
    const items = type === 'ret' ? _inRet : _inGiv;
    const el = $(type === 'ret' ? 'rplInRetRows' : 'rplInGivRows');
    if (!el) return;
    const prods = window.allProducts || {};

    el.innerHTML = items.map((item, i) => `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:5px;margin-bottom:5px;align-items:center">
        <select onchange="window.rplInRowChange('${type}',${i},'prod',this)"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;font-family:inherit;width:100%">
          ${Object.entries(prods).map(([id, p]) =>
            `<option value="${id}" ${item.prodId===id?'selected':''}>${p.name}</option>`
          ).join('')}
        </select>
        <input type="number" value="${item.qty}" min="1"
          oninput="window.rplInRowChange('${type}',${i},'qty',this)"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;width:100%">
        <input type="number" value="${item.price}" min="0" placeholder="দাম"
          oninput="window.rplInRowChange('${type}',${i},'price',this)"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--text);font-size:12px;width:100%">
        <button type="button" onclick="window.rplInDelRow('${type}',${i})"
          style="width:28px;height:34px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:7px;color:#ef4444;cursor:pointer;font-size:12px">✕</button>
      </div>`).join('');
    rplInCalc();
  }

  function rplInCalc() {
    const retT = _inRet.reduce((s, i) => s + i.qty * i.price, 0);
    const givT = _inGiv.reduce((s, i) => s + i.qty * i.price, 0);
    const diff = givT - retT;

    const retEl = $('rplInRetTotal'); if (retEl) retEl.textContent = bn(retT);
    const givEl = $('rplInGivTotal'); if (givEl) givEl.textContent = bn(givT);

    const dbox = $('rplInDiffBox');
    const dlbl = $('rplInDiffLbl');
    const dval = $('rplInDiffVal');
    const sb   = $('rplInSettleBox');
    if (!dbox) return;

    if (diff > 0) {
      dbox.style.cssText = 'display:flex;padding:9px 12px;border-radius:9px;margin-bottom:8px;font-size:12px;font-weight:700;align-items:center;justify-content:space-between;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#ef4444';
      dlbl.textContent = `আমরা দোকানের কাছে পাবো`;
      dval.textContent = `${bn(diff)}`;
      if (sb) sb.style.display = 'block';
    } else if (diff < 0) {
      dbox.style.cssText = 'display:flex;padding:9px 12px;border-radius:9px;margin-bottom:8px;font-size:12px;font-weight:700;align-items:center;justify-content:space-between;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10b981';
      dlbl.textContent = `দোকান আমাদের কাছে পাবে`;
      dval.textContent = `${bn(Math.abs(diff))}`;
      if (sb) sb.style.display = 'block';
    } else {
      dbox.style.display = 'none';
      if (sb) sb.style.display = 'none';
    }
  }

  // ── initInlineRpl call ──
  waitForApp(() => { initInlineRpl(); });

})();

// ══════════════════════════════════════════════════════════════
//  NEGATIVE DUE — বাকি পেজে দোকানের ক্রেডিট দেখানো
// ══════════════════════════════════════════════════════════════
(function() {
  'use strict';

  function waitForApp(cb, t=0) {
    if(window._db && window.CU && window.CR){cb();return;}
    if(t>120)return;
    setTimeout(()=>waitForApp(cb,t+1),250);
  }

  const bn = n => '৳' + Math.round(Math.abs(n)||0).toLocaleString('bn-BD');

  function injectCreditStyles() {
    if(document.getElementById('credit-due-css')) return;
    const s = document.createElement('style');
    s.id = 'credit-due-css';
    s.textContent = `
.credit-card {
  background: linear-gradient(135deg, rgba(16,185,129,.1), rgba(59,130,246,.06));
  border: 1px solid rgba(16,185,129,.3);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: fadeUp .3s ease both;
}
.credit-shop { font-size: 13px; font-weight: 700; color: var(--text, #f1f5f9); }
.credit-sub  { font-size: 10px; color: var(--muted, #64748b); margin-top: 2px; }
.credit-amt  { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #10b981; }
.credit-lbl  { font-size: 9px; color: #10b981; text-align: right; margin-top: 1px; font-weight: 600; }
.credit-section-title {
  font-size: 11px; font-weight: 700; color: #10b981;
  text-transform: uppercase; letter-spacing: .5px;
  display: flex; align-items: center; gap: 6px;
  margin: 14px 0 8px;
}
    `;
    document.head.appendChild(s);
  }

  // বাকি পেজ render hook
  function hookDuePage() {
    const _origRenderDue = window.renderDue;
    if(!_origRenderDue || _origRenderDue._creditHooked) return;

    window.renderDue = function() {
      if(typeof _origRenderDue === 'function') _origRenderDue.apply(this, arguments);
      setTimeout(injectCreditSection, 300);
    };
    window.renderDue._creditHooked = true;
  }

  function injectCreditSection() {
    const duePage = document.getElementById('page-due');
    if(!duePage) return;

    // negative due আছে এমন বিক্রয় খুঁজি
    const sales = window.allSales || {};
    const custs = window.allCustomers || {};

    // দোকান ভিত্তিক negative due সংকলন
    const creditMap = {};
    Object.values(sales).forEach(s => {
      if((s.due||0) < 0 && s.shopId) {
        if(!creditMap[s.shopId]) {
          creditMap[s.shopId] = {
            shopId: s.shopId,
            shopName: s.shop || custs[s.shopId]?.shop || '—',
            total: 0,
          };
        }
        creditMap[s.shopId].total += (s.due||0);
      }
    });

    const credits = Object.values(creditMap).filter(c => c.total < 0);

    // পুরনো section সরাও
    const old = duePage.querySelector('#creditDueSection');
    if(old) old.remove();

    if(!credits.length) return;

    // Section তৈরি করি
    const section = document.createElement('div');
    section.id = 'creditDueSection';

    section.innerHTML = `
      <div class="credit-section-title">
        🎁 দোকানের ক্রেডিট (পাওনা মাল নেওয়ার অধিকার)
      </div>
      ${credits.map(c => `
        <div class="credit-card">
          <div>
            <div class="credit-shop">🏪 ${c.shopName}</div>
            <div class="credit-sub">রিপ্লেসমেন্ট থেকে জমা</div>
          </div>
          <div>
            <div class="credit-amt">${bn(c.total)}</div>
            <div class="credit-lbl">পরবর্তী মালে পাবে</div>
          </div>
        </div>`).join('')}
      <div style="font-size:10px;color:var(--muted,#64748b);text-align:center;padding:6px;margin-bottom:8px">
        📦 নগদ প্রদান করা হয় না — পরবর্তী বিক্রয়ে মাল হিসেবে দেওয়া হবে
      </div>`;

    // বাকি পেজের শুরুতে insert করি
    const firstChild = duePage.firstElementChild;
    if(firstChild) duePage.insertBefore(section, firstChild);
    else duePage.appendChild(section);
  }

  // showPage hook
  const _oSP = window.showPage;
  window.showPage = function(id, isBack) {
    if(typeof _oSP === 'function') _oSP(id, isBack);
    if(id === 'due') setTimeout(injectCreditSection, 400);
  };

  // syncGlobals hook — data update হলে refresh
  const _oSync = window.syncGlobals;
  window.syncGlobals = function() {
    if(typeof _oSync === 'function') _oSync();
    const pg = document.getElementById('page-due');
    if(pg && pg.classList.contains('active')) {
      clearTimeout(window._creditDueTimer);
      window._creditDueTimer = setTimeout(injectCreditSection, 500);
    }
  };

  waitForApp(() => {
    injectCreditStyles();
    hookDuePage();
  });

})();
