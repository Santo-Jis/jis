// ══════════════════════════════════════════════════
//  NovaTEch BD — Utils v1.0
//  XSS Sanitizer · Phone Validator · File Validator
//  app.js, features.js, replacement.js এ ব্যবহার হয়
// ══════════════════════════════════════════════════

// ──────────────────────────────────────────────────
//  ১. XSS Sanitizer
//  Firebase থেকে আসা যেকোনো text innerHTML এ
//  বসানোর আগে এই function দিয়ে পাস করতে হবে
// ──────────────────────────────────────────────────
window.san = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// ──────────────────────────────────────────────────
//  ২. Phone Number Validator
//  বাংলাদেশি নম্বর: 01X-XXXXXXXX (11 সংখ্যা)
//  অনুমোদিত prefix: 013–019
// ──────────────────────────────────────────────────
window.validatePhone = (number) => {
  if (!number) return false;
  const clean = String(number).replace(/[\s\-\+]/g, ''); // space, dash, + বাদ
  return /^01[3-9]\d{8}$/.test(clean);
};

window.formatPhone = (number) => {
  // +8801X বা 8801X → 01X format এ নামাও
  if (!number) return '';
  return String(number).replace(/[\s\-]/g, '').replace(/^\+?880/, '0');
};

window.checkPhone = (number, fieldLabel = 'নম্বর') => {
  const formatted = window.formatPhone(number);
  if (!window.validatePhone(formatted)) {
    window.showToast && window.showToast(
      `❌ ${fieldLabel} সঠিক নয়! বাংলাদেশি নম্বর দিন (যেমন: 01712345678)`, true
    );
    return false;
  }
  return true;
};

// ──────────────────────────────────────────────────
//  ৩. File Validator
//  ছবি: সর্বোচ্চ 10MB
//  ডকুমেন্ট: সর্বোচ্চ 20MB
//  একসাথে একাধিক ডকুমেন্ট: মোট সর্বোচ্চ 50MB
// ──────────────────────────────────────────────────
window.FILE_LIMIT = {
  IMAGE_MB:     10,
  DOC_MB:       20,
  MULTI_DOC_MB: 50,
  ALLOWED_IMG:  ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOC:  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/jpg', 'image/png',
  ],
};

window.validateImage = (file) => {
  if (!window.FILE_LIMIT.ALLOWED_IMG.includes(file.type)) {
    window.showToast && window.showToast('❌ শুধু JPG, PNG, WEBP, GIF ছবি দেওয়া যাবে!', true);
    return false;
  }
  if (file.size > window.FILE_LIMIT.IMAGE_MB * 1024 * 1024) {
    window.showToast && window.showToast(
      `❌ ছবির সাইজ ${window.FILE_LIMIT.IMAGE_MB}MB এর বেশি হওয়া যাবে না!`, true
    );
    return false;
  }
  return true;
};

window.validateDoc = (file) => {
  if (!window.FILE_LIMIT.ALLOWED_DOC.includes(file.type)) {
    window.showToast && window.showToast(
      '❌ শুধু PDF, DOC, DOCX, XLS, XLSX, JPG, PNG ফাইল দেওয়া যাবে!', true
    );
    return false;
  }
  if (file.size > window.FILE_LIMIT.DOC_MB * 1024 * 1024) {
    window.showToast && window.showToast(
      `❌ ডকুমেন্টের সাইজ ${window.FILE_LIMIT.DOC_MB}MB এর বেশি হওয়া যাবে না!`, true
    );
    return false;
  }
  return true;
};

window.validateMultiDocs = (files) => {
  for (const f of files) {
    if (!window.validateDoc(f)) return false;
  }
  const totalMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
  if (totalMB > window.FILE_LIMIT.MULTI_DOC_MB) {
    window.showToast && window.showToast(
      `❌ মোট ফাইল সাইজ ${window.FILE_LIMIT.MULTI_DOC_MB}MB এর বেশি হওয়া যাবে না! (বর্তমান: ${totalMB.toFixed(1)}MB)`,
      true
    );
    return false;
  }
  return true;
};
