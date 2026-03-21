// ════════════════════════════════════════════════════════════
// ✅ FEATURE 2: LIVE GPS TRACKING (কর্মীদের জন্য)
// ════════════════════════════════════════════════════════════
let _gpsWatchId = null;
let _gpsLastLog = 0;
const GPS_INTERVAL_MS = 2 * 60 * 1000; // প্রতি ২ মিনিট — আরো accurate

function initLiveGPS() {
  if (!navigator.geolocation) return;
  if (_gpsWatchId) return; // ইতিমধ্যে চালু

  _gpsWatchId = navigator.geolocation.watchPosition(
    async pos => {
      const now = Date.now();
      if (now - _gpsLastLog < GPS_INTERVAL_MS) return; // ৫ মিনিটের আগে আবার লগ না
      _gpsLastLog = now;
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      try {
        // কর্মীর লাইভ লোকেশন আপডেট
        await window._set(window._ref(window._db, 'liveLocations/' + window.CU.uid), {
          lat, lng, accuracy: Math.round(accuracy),
          name: window.CN, role: window.CR,
          ts: now, date: window.today()
        });
        // ৫ মিনিটের গ্র্যানুলার লগ (ইতিহাসের জন্য)
        await window._push(window._ref(window._db, 'gpsTrail/' + window.CU.uid + '/' + window.today().replace(/-/g,'_')), {
          lat, lng, ts: now
        });
      } catch(e) { console.warn('GPS log error:', e.message); }
    },
    err => console.warn('GPS watch error:', err.message),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
  console.log('✅ Live GPS tracking started');
}

// GPS বন্ধ করার ফাংশন (চেক-আউটের পরে)
window.stopLiveGPS = function() {
  if (_gpsWatchId) { navigator.geolocation.clearWatch(_gpsWatchId); _gpsWatchId = null; }
  // অফলাইন মার্ক করি
  if (window.CU?.uid) window._set(window._ref(window._db, 'liveLocations/' + window.CU.uid + '/online'), false).catch(()=>{});
};

// Manager/Admin-এর জন্য লাইভ ম্যাপ
let _liveMapListener = null;
window.renderLiveMap = function() {
  const el = document.getElementById('liveMapContainer');
  if (!el) return;

  // পুরানো listener বন্ধ করি
  if (_liveMapListener) { _liveMapListener(); _liveMapListener = null; }

  // ✅ Real-time listener
  _liveMapListener = window._onValue(window._ref(window._db, 'liveLocations'), snap => {
    const locs = snap.val() || {};
    const now = Date.now();

    // Manager হলে শুধু তার টিমের কর্মী
    let entries = Object.entries(locs).filter(([uid]) => uid !== window.CU?.uid);
    if (window.CR === 'manager') {
      const myTeam = Object.values(window.allTeams||{}).find(t => t.leaderId === window.CU?.uid);
      const members = new Set(myTeam?.members || []);
      if (members.size) entries = entries.filter(([uid]) => members.has(uid));
    }

    if (!entries.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--muted);">
        <div style="font-size:32px;margin-bottom:8px;">📡</div>
        <div style="font-size:13px;">কোনো কর্মী এখন অনলাইন নেই</div>
        <div style="font-size:11px;margin-top:4px;opacity:.6;">কর্মীদের app চালু থাকলে এখানে দেখাবে</div>
      </div>`;
      return;
    }

    // ✅ Sort — সবচেয়ে সাম্প্রতিক আগে
    entries.sort((a,b) => (b[1].ts||0) - (a[1].ts||0));

    el.innerHTML = entries.map(([uid, d]) => {
      const minsAgo = Math.round((now - (d.ts||now)) / 60000);
      const isOnline = minsAgo < 10; // ১০ মিনিটের মধ্যে = অনলাইন
      const isRecent = minsAgo < 30;
      const mapUrl = `https://www.google.com/maps?q=${d.lat},${d.lng}&zoom=16`;
      const wazeUrl = `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes`;
      const statusColor = isOnline ? 'var(--green)' : isRecent ? 'var(--accent)' : 'var(--muted)';
      const statusText = isOnline ? '● অনলাইন' : minsAgo < 60 ? `${minsAgo} মিনিট আগে` : `${Math.round(minsAgo/60)} ঘণ্টা আগে`;

      return `<div style="background:var(--card);border:1px solid ${isOnline?'rgba(16,185,129,.3)':'var(--border-l)'};
          border-radius:12px;padding:12px;margin-bottom:8px;
          window.${isOnline?'box-shadow:0 0 0 1px rgba(16,185,129,.1);':''}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <!-- Avatar -->
          <div style="width:38px;height:38px;border-radius:50%;
            background:linear-gradient(135deg,var(--primary),var(--blue));
            display:flex;align-items:center;justify-content:center;
            font-size:16px;flex-shrink:0;position:relative;">
            👷
            <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;
              background:window.${statusColor};border-radius:50%;border:2px solid var(--card);"></div>
          </div>
          <!-- Info -->
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">window.${d.name||'–'}</div>
            <div style="font-size:10px;color:${statusColor};font-weight:600;">window.${statusText}</div>
          </div>
          <!-- Accuracy badge -->
          <div style="font-size:9px;color:var(--muted);background:var(--surface);
            padding:2px 7px;border-radius:6px;border:1px solid var(--border);">
            ±window.${d.accuracy||'?'}m
          </div>
        </div>

        <!-- Coordinates -->
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;
          background:var(--surface);border-radius:7px;padding:6px 8px;">
          📍 window.${d.lat?.toFixed(5)||'–'}, window.${d.lng?.toFixed(5)||'–'}
          window.${d.date ? `· ${d.date}` : ''}
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:6px;">
          <a href="${mapUrl}" target="_blank"
            style="flex:1;padding:7px;background:rgba(59,130,246,.12);border:1px solid var(--blue);
            border-radius:8px;color:var(--blue);font-size:11px;font-weight:700;
            text-decoration:none;text-align:center;">
            🗺️ Google Maps
          </a>
          <a href="${wazeUrl}" target="_blank"
            style="flex:1;padding:7px;background:rgba(139,92,246,.12);border:1px solid var(--purple);
            border-radius:8px;color:var(--purple);font-size:11px;font-weight:700;
            text-decoration:none;text-align:center;">
            🚗 Waze
          </a>
          <button onclick="showGPSTrail('${uid}','${d.name||''}')"
            style="flex:1;padding:7px;background:rgba(245,158,11,.12);border:1px solid var(--accent);
            border-radius:8px;color:var(--accent);font-size:11px;font-weight:700;
            cursor:pointer;font-family:inherit;">
            📈 Trail
          </button>
        </div>
      </div>`;
    }).join('');
  });
};

// ✅ কর্মীর আজকের GPS trail দেখানো
window.showGPSTrail = async function(uid, name) {
  const todayKey = window.today().replace(/-/g,'_');
  const snap = await window._get(window._ref(window._db, `gpsTrail/${uid}/${todayKey}`));
  if (!snap.exists()) { window.showToast('আজকের trail নেই',true); return; }
  const trail = Object.values(snap.val()).sort((a,b)=>a.ts-b.ts);

  // Google Maps directions URL বানাই
  if (trail.length === 1) {
    window.open(`https://www.google.com/maps?q=${trail[0].lat},${trail[0].lng}`,'_blank');
    return;
  }
  const origin = `${trail[0].lat},${trail[0].lng}`;
  const dest   = `${trail[trail.length-1].lat},${trail[trail.length-1].lng}`;
  const waypoints = trail.slice(1,-1).slice(0,8) // max 8 waypoints
    .map(p=>`${p.lat},${p.lng}`).join('|');
  const url = `https://www.google.com/maps/dir/${origin}/${waypoints?waypoints+'/':''}${dest}`;
  window.open(url,'_blank');
  window.showToast(`${name} — ${trail.length}টি location point`);
};

