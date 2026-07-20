/* ═══════════════════════════════════════════════════════
   REKAP OBAT — app.js
   Data lokal di localStorage, sync ke Google Sheets
   ═══════════════════════════════════════════════════════ */

// ─── Config (sudah ditanam langsung, sama untuk SEMUA orang) ───
// Semua yang buka website ini otomatis pakai Spreadsheet yang sama,
// tidak perlu isi Spreadsheet ID / API Key masing-masing lagi.
let CONFIG = {
  sheetId:  '1TrBi0XYgAOEAQNG-8wZnxSXNz4sixQ-6Mkc3zHQ0uAM',
  apiKey:   'AIzaSyCqVOTPqSNlCL1rsTzZQir3AOJWIqara1U',
  sheetName: 'Obat',   // nama tab di Google Sheets
  scriptUrl: 'https://script.google.com/macros/s/AKfycbwFzqw2RyXU_7e3ZXPLPAyRg-gEhwS_MsKKWpAuAvJOWfgKIP1_60cG0VxHigAGlRIx/exec'
};

// ─── State ──────────────────────────────────────────────
let data    = JSON.parse(localStorage.getItem('obat_data') || '[]');
let filter  = '';

// ─── Utils ──────────────────────────────────────────────
const EMOJI = {
  Umum: '💊', Antibiotik: '🦠', Vitamin: '🌿',
  'Obat Luar': '🧴', Sirup: '🍶', Lainnya: '📦'
};

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun',
               'Jul','Agu','Sep','Okt','Nov','Des'];

function formatBulan(ym) {
  // ym = "2025-09"
  const [y, m] = ym.split('-');
  return BULAN[parseInt(m) - 1] + ' ' + y;
}

function getStatus(expMonth) {
  const now = new Date();
  const nowYM = now.getFullYear() * 12 + now.getMonth();
  const [ey, em] = expMonth.split('-').map(Number);
  const expYM = ey * 12 + (em - 1);
  const diff = expYM - nowYM;
  if (diff < 0)  return 'expired';
  if (diff < 3)  return 'warn';
  return 'ok';
}

function getSisaLabel(expMonth) {
  const now = new Date();
  const nowYM = now.getFullYear() * 12 + now.getMonth();
  const [ey, em] = expMonth.split('-').map(Number);
  const diff = ey * 12 + (em - 1) - nowYM;
  if (diff < 0)  return 'Sudah kedaluwarsa';
  if (diff === 0) return 'Kedaluwarsa bulan ini';
  if (diff === 1) return 'Kedaluwarsa bulan depan';
  return `${diff} bulan lagi`;
}

function saveLocal() {
  localStorage.setItem('obat_data', JSON.stringify(data));
}

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 2800);
}

// ─── Render ─────────────────────────────────────────────
function render() {
  const q   = (document.getElementById('cari').value || '').toLowerCase();
  const list = data.filter(d => {
    const s = getStatus(d.exp);
    const match = !q ||
      d.nama.toLowerCase().includes(q) ||
      d.kat.toLowerCase().includes(q) ||
      (d.lok && d.lok.toLowerCase().includes(q));
    return match && (!filter || s === filter);
  }).sort((a, b) => a.exp.localeCompare(b.exp));

  // Stats
  const total   = data.length;
  const expired = data.filter(d => getStatus(d.exp) === 'expired').length;
  const warn    = data.filter(d => getStatus(d.exp) === 'warn').length;
  const ok      = data.filter(d => getStatus(d.exp) === 'ok').length;
  document.getElementById('s-total').textContent = total;
  document.getElementById('s-exp').textContent   = expired;
  document.getElementById('s-warn').textContent  = warn;
  document.getElementById('s-ok').textContent    = ok;

  const grid  = document.getElementById('obat-list');
  const empty = document.getElementById('empty-state');

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const statusLabel = { expired: 'Kedaluwarsa', warn: 'Hampir habis', ok: 'Aman' };

  grid.innerHTML = list.map(d => {
    const s = getStatus(d.exp);
    return `
    <div class="obat-card ${s}">
      <div class="card-header">
        <span class="card-emoji">${EMOJI[d.kat] || '📦'}</span>
        <span class="card-name">${escHtml(d.nama)}</span>
        <div class="card-actions">
          <button class="btn-icon" title="Edit" onclick="editObat(${d.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" title="Hapus" onclick="hapusObat(${d.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="card-meta">
        <div class="meta-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Exp: <strong>${formatBulan(d.exp)}</strong></span>
          <span class="badge ${s}">${statusLabel[s]}</span>
        </div>
        <div class="meta-row" style="color:#6b7280;font-size:11px">
          ${getSisaLabel(d.exp)}
        </div>
        ${d.qty ? `<div class="meta-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Sisa: ${escHtml(d.qty)}</div>` : ''}
        ${d.lok ? `<div class="meta-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escHtml(d.lok)}</div>` : ''}
      </div>
      ${d.note ? `<div class="card-note">${escHtml(d.note)}</div>` : ''}
    </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Filter ─────────────────────────────────────────────
function setFilter(el, val) {
  filter = val;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  render();
}

// ─── Modal ──────────────────────────────────────────────
function bukaModal(obat = null) {
  document.getElementById('modal-title').textContent = obat ? 'Edit Obat' : 'Tambah Obat';
  document.getElementById('f-id').value    = obat ? obat.id : '';
  document.getElementById('f-nama').value  = obat ? obat.nama : '';
  document.getElementById('f-kat').value   = obat ? obat.kat  : 'Umum';
  document.getElementById('f-exp').value   = obat ? obat.exp  : '';
  document.getElementById('f-qty').value   = obat ? obat.qty  : '';
  document.getElementById('f-lok').value   = obat ? obat.lok  : '';
  document.getElementById('f-note').value  = obat ? obat.note : '';
  document.getElementById('modal-bg').style.display = 'flex';
  setTimeout(() => document.getElementById('f-nama').focus(), 50);
}

function tutupModal(e) {
  if (e && e.target !== document.getElementById('modal-bg')) return;
  document.getElementById('modal-bg').style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('modal-bg').style.display = 'none';
});

// ─── CRUD (tulis ke Google Sheets lewat Apps Script, lalu sync) ──
async function simpanObat() {
  const nama = document.getElementById('f-nama').value.trim();
  const exp  = document.getElementById('f-exp').value;
  if (!nama) { toast('Nama obat wajib diisi', 'error'); return; }
  if (!exp)  { toast('Tanggal kedaluwarsa wajib diisi', 'error'); return; }

  const id = parseInt(document.getElementById('f-id').value) || 0;
  const obat = {
    id:   id || Date.now(),
    nama,
    kat:  document.getElementById('f-kat').value,
    exp,
    qty:  document.getElementById('f-qty').value.trim(),
    lok:  document.getElementById('f-lok').value.trim(),
    note: document.getElementById('f-note').value.trim()
  };

  if (!CONFIG.scriptUrl || CONFIG.scriptUrl.includes('PASTE_')) {
    toast('Apps Script belum disetel, data hanya tersimpan lokal', 'error');
    if (id) {
      const idx = data.findIndex(d => d.id === id);
      if (idx >= 0) data[idx] = obat;
    } else {
      data.push(obat);
    }
    saveLocal();
    render();
    document.getElementById('modal-bg').style.display = 'none';
    return;
  }

  const btnSave = document.querySelector('#modal-bg .btn-primary');
  if (btnSave) btnSave.disabled = true;
  toast('Menyimpan ke Sheets...', '');

  try {
    const res = await fetch(CONFIG.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: id ? 'update' : 'add', data: obat })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    document.getElementById('modal-bg').style.display = 'none';
    toast(id ? 'Obat diperbarui ✓' : 'Obat ditambahkan ✓', 'success');
    await syncSheets(); // ambil ulang data terbaru dari Sheets untuk semua orang
  } catch (err) {
    console.error(err);
    toast('Gagal simpan ke Sheets: ' + err.message, 'error');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

function editObat(id) {
  const obat = data.find(d => d.id === id);
  if (obat) bukaModal(obat);
}

async function hapusObat(id) {
  if (!confirm('Hapus obat ini?')) return;

  if (!CONFIG.scriptUrl || CONFIG.scriptUrl.includes('PASTE_')) {
    data = data.filter(d => d.id !== id);
    saveLocal();
    render();
    toast('Obat dihapus (lokal saja)');
    return;
  }

  toast('Menghapus di Sheets...', '');
  try {
    const res = await fetch(CONFIG.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    toast('Obat dihapus ✓', 'success');
    await syncSheets();
  } catch (err) {
    console.error(err);
    toast('Gagal hapus di Sheets: ' + err.message, 'error');
  }
}

// ─── Google Sheets Sync ─────────────────────────────────
/*
  STRUKTUR SHEET (nama tab: "Obat"):
  Kolom A: ID | B: Nama | C: Kategori | D: Expired (YYYY-MM)
           E: Jumlah  | F: Lokasi | G: Catatan | H: Tanggal Catat

  Script ini MEMBACA dari Sheets (GET) via Google Sheets API v4.
  Untuk MENULIS ke Sheets, dibutuhkan OAuth2 atau Google Apps Script
  sebagai proxy — lihat PANDUAN.md untuk setup lengkap.
*/

async function syncSheets() {
  if (!CONFIG.sheetId || !CONFIG.apiKey) {
    bukaConfig();
    toast('Isi dulu pengaturan Sheets ⚙️', 'error');
    return;
  }

  const btn = document.getElementById('btn-sync');
  btn.classList.add('syncing');
  btn.disabled = true;

  try {
    const range  = encodeURIComponent(`${CONFIG.sheetName}!A2:H`);
    const url    = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${range}?key=${CONFIG.apiKey}`;
    const res    = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json   = await res.json();
    const rows   = json.values || [];

    if (rows.length === 0) {
      toast('Sheet kosong atau belum ada data', '');
      return;
    }

    // Merge: data dari Sheets menimpa data lokal berdasarkan ID
    const fromSheets = rows.map(r => ({
      id:   parseInt(r[0]) || Date.now(),
      nama: r[1] || '',
      kat:  r[2] || 'Umum',
      exp:  r[3] || '',
      qty:  r[4] || '',
      lok:  r[5] || '',
      note: r[6] || ''
    })).filter(d => d.nama && d.exp);

    // Gabung: prioritaskan data dari Sheets untuk ID yang sama
    const sheetIds = new Set(fromSheets.map(d => d.id));
    const localOnly = data.filter(d => !sheetIds.has(d.id));
    data = [...fromSheets, ...localOnly];

    saveLocal();
    render();
    toast(`${fromSheets.length} data berhasil disinkron ✓`, 'success');

  } catch (err) {
    console.error(err);
    toast('Gagal sync: ' + err.message, 'error');
  } finally {
    btn.classList.remove('syncing');
    btn.disabled = false;
  }
}

// ─── Config Panel ───────────────────────────────────────
function bukaConfig() {
  document.getElementById('cfg-sheet-id').value = CONFIG.sheetId;
  document.getElementById('cfg-api-key').value  = CONFIG.apiKey;
  const p = document.getElementById('config-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function simpanConfig() {
  CONFIG.sheetId = document.getElementById('cfg-sheet-id').value.trim();
  CONFIG.apiKey  = document.getElementById('cfg-api-key').value.trim();
  localStorage.setItem('cfg_sheet_id', CONFIG.sheetId);
  localStorage.setItem('cfg_api_key',  CONFIG.apiKey);
  document.getElementById('config-panel').style.display = 'none';
  toast('Pengaturan disimpan ✓', 'success');
}

// ─── Init ───────────────────────────────────────────────
render();
syncSheets(); // otomatis sync begitu halaman dibuka, semua orang lihat data sama
