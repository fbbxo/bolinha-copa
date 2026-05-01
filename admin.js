import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { collection, doc, getDoc, getDocs, getFirestore, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ═══ MESMA CONFIG DO app.js ═══
const firebaseConfig = {
  apiKey:            "AIzaSyDME_mfSrPHot67db1Vayjh8GDC1CRdJh4",
  authDomain:        "bolinha-world-cup.firebaseapp.com",
  projectId:         "bolinha-world-cup",
  storageBucket:     "bolinha-world-cup.firebasestorage.app",
  messagingSenderId: "988321335232",
  appId:             "1:988321335232:web:fc4abab47b114c0c14aa25"
};

// ⚙️ Defina uma senha para o painel de admin
const ADMIN_PASSWORD = "copa2026admin";

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

const FLAG_CODES = {
  'México':'mx','África do Sul':'za','Coreia do Sul':'kr','Dinamarca':'dk',
  'Canadá':'ca','Bósnia':'ba','Catar':'qa','Suíça':'ch',
  'Brasil':'br','Marrocos':'ma','Haiti':'ht','Escócia':'gb-sct',
  'Estados Unidos':'us','Paraguai':'py','Austrália':'au','Turquia':'tr',
  'Alemanha':'de','Curaçao':'cw','Costa do Marfim':'ci','Equador':'ec',
  'Holanda':'nl','Japão':'jp','Suécia':'se','Tunísia':'tn',
  'Bélgica':'be','Egito':'eg','Irã':'ir','Nova Zelândia':'nz',
  'Espanha':'es','Cabo Verde':'cv','Arábia Saudita':'sa','Uruguai':'uy',
  'França':'fr','Senegal':'sn','Iraque':'iq','Noruega':'no',
  'Argentina':'ar','Argélia':'dz','Áustria':'at','Jordânia':'jo',
  'Portugal':'pt','RD Congo':'cd','Uzbequistão':'uz','Colômbia':'co',
  'Inglaterra':'gb-eng','Croácia':'hr','Gana':'gh','Panamá':'pa',
};
function flag(name, size) {
  size = size || 24;
  var code = FLAG_CODES[name] || '';
  if (!code) return '<span>🏳️</span>';
  var w = Math.round(size * 1.33);
  return '<span class="fi fi-' + code + '" style="width:' + w + 'px;height:' + size + 'px;background-size:cover;border-radius:3px;display:inline-block;flex-shrink:0;"></span>';
}

const DEFAULT_GROUPS = {
  A: ['México','África do Sul','Coreia do Sul','Dinamarca'],
  B: ['Canadá','Bósnia','Catar','Suíça'],
  C: ['Brasil','Marrocos','Haiti','Escócia'],
  D: ['Estados Unidos','Paraguai','Austrália','Turquia'],
  E: ['Alemanha','Curaçao','Costa do Marfim','Equador'],
  F: ['Holanda','Japão','Suécia','Tunísia'],
  G: ['Bélgica','Egito','Irã','Nova Zelândia'],
  H: ['Espanha','Cabo Verde','Arábia Saudita','Uruguai'],
  I: ['França','Senegal','Iraque','Noruega'],
  J: ['Argentina','Argélia','Áustria','Jordânia'],
  K: ['Portugal','RD Congo','Uzbequistão','Colômbia'],
  L: ['Inglaterra','Croácia','Gana','Panamá'],
};
const GROUP_KEYS = Object.keys(DEFAULT_GROUPS);
const ALL_TEAMS  = Object.values(DEFAULT_GROUPS).flat();

const ROUNDS = [
  { key:'r32',      label:'Rodada de 32',       count:16 },
  { key:'r16',      label:'Oitavas de Final',    count:8  },
  { key:'qf',       label:'Quartas de Final',    count:4  },
  { key:'sf',       label:'Semifinais',          count:2  },
  { key:'terceiro', label:'Disputa do 3º Lugar', count:1  },
  { key:'final',    label:'Final',               count:1  },
];

const LOCK_DEFS = [
  { key:'grupos', label:'Fase de Grupos' },
  { key:'mata_r32', label:'Mata-Mata (Rodada de 32)' },
  { key:'mata_r16', label:'Mata-Mata (Oitavas)' },
  { key:'mata_qf', label:'Mata-Mata (Quartas)' },
  { key:'mata_sf', label:'Mata-Mata (Semifinais)' },
  { key:'mata_terceiro', label:'Mata-Mata (3º Lugar)' },
  { key:'mata_final', label:'Mata-Mata (Final)' },
];

const MAIN_DOC    = doc(db, 'bolinha-copa', 'state');
const PLAYERS_COL = collection(db, 'copa-players');

let S = { results:{grupos:{},r32:{},r16:{},qf:{},sf:{},terceiro:{},final:{}}, matchups:{r32:{},r16:{},qf:{},sf:{},terceiro:{},final:{}}, locked:{}, deadlines:{} };

// ── AUTH ──
window.adminLogin = function() {
  const pass = document.getElementById('admin-pass').value;
  if (pass !== ADMIN_PASSWORD) {
    document.getElementById('admin-err').textContent = 'Senha incorreta.';
    return;
  }
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  loadState();
};

async function loadState() {
  try {
    const snap = await getDoc(MAIN_DOC);
    if (snap.exists()) {
      const d = snap.data();
      if (d.results)  S.results  = { ...S.results,  ...d.results  };
      if (d.matchups) S.matchups = { ...S.matchups, ...d.matchups };
      if (d.locked)   S.locked   = d.locked;
      if (d.deadlines) S.deadlines = d.deadlines;
    }
    renderAll();
    await loadPlayers();
  } catch(e) { toast('❌ Erro ao carregar: '+e.message); }
}

function renderAll() {
  renderLocks();
  renderGruposResults();
  renderMataMatches();
  renderMataResults();
  renderMataResults();
}

// ── LOCKS ──
function renderLocks() {
  document.getElementById('lock-grid').innerHTML = LOCK_DEFS.map(l => {
    const checked = S.locked[l.key] ? 'checked' : '';
    const dl = S.deadlines[l.key] || '';
    return `<div class="lock-card">
      <div class="lock-card-label">${l.label}</div>
      <div class="lock-row">
        <input type="checkbox" id="lock-${l.key}" ${checked}>
        <label for="lock-${l.key}">Bloquear apostas manualmente</label>
      </div>
      <div>
        <label style="font-size:.72rem;color:var(--muted);">PRAZO AUTOMÁTICO</label>
        <input type="datetime-local" id="dl-${l.key}" value="${dl}">
      </div>
    </div>`;
  }).join('');
}

window.saveLocks = async function() {
  const locked = {}, deadlines = {};
  LOCK_DEFS.forEach(l => {
    locked[l.key]    = document.getElementById('lock-'+l.key)?.checked || false;
    deadlines[l.key] = document.getElementById('dl-'+l.key)?.value || '';
  });
  try {
    await setDoc(MAIN_DOC, { locked, deadlines }, { merge: true });
    S.locked = locked; S.deadlines = deadlines;
    toast('✅ Bloqueios salvos!');
  } catch(e) { toast('❌ Erro: '+e.message); }
};

// ── RESULTADOS DOS GRUPOS ──
function renderGruposResults() {
  document.getElementById('grupos-res-grid').innerHTML = GROUP_KEYS.map(g => {
    const teams = DEFAULT_GROUPS[g];
    const res   = S.results.grupos?.[g] || {};
    const matches = [ [0,1], [2,3], [0,2], [1,3], [0,3], [1,2] ];
    
    let rows = matches.map((m, i) => {
      const tH = teams[m[0]];
      const tA = teams[m[1]];
      const r = res[`m${i}`] || { h: '', a: '' };
      return `<div class="grc-match">
        <div class="grcm-team grcm-home">${tH} ${flag(tH, 20)}</div>
        <input type="number" id="gres-${g}-m${i}-h" value="${r.h}" min="0" max="20" class="grcm-input">
        <span class="grcm-x">x</span>
        <input type="number" id="gres-${g}-m${i}-a" value="${r.a}" min="0" max="20" class="grcm-input">
        <div class="grcm-team grcm-away">${flag(tA, 20)} ${tA}</div>
      </div>`;
    }).join('');

    return `<div class="grupo-res-card">
      <div class="grc-header">GRUPO ${g}</div>
      <div class="grc-body">
        ${rows}
      </div>
    </div>`;
  }).join('');
}

window.saveGruposResults = async function() {
  const grupos = {};
  GROUP_KEYS.forEach(g => {
    grupos[g] = {};
    for (let i = 0; i < 6; i++) {
      const h = document.getElementById(`gres-${g}-m${i}-h`)?.value || '';
      const a = document.getElementById(`gres-${g}-m${i}-a`)?.value || '';
      grupos[g][`m${i}`] = { h, a };
    }
  });
  try {
    await setDoc(MAIN_DOC, { results: { grupos } }, { merge: true });
    S.results.grupos = grupos;
    toast('✅ Resultados dos grupos salvos!');
  } catch(e) { toast('❌ Erro: '+e.message); }
};

// ── CONFRONTOS DO MATA-MATA ──
function renderMataMatches() {
  const opts = (sel) => ['', ...ALL_TEAMS].map(t =>
    `<option value="${t}" ${sel===t?'selected':''}>${t ? flag(t)+' '+t : '— Selecione —'}</option>`
  ).join('');

  document.getElementById('admin-mata-matches').innerHTML = ROUNDS.map(rd => {
    const mu = S.matchups?.[rd.key] || {};
    let rows = '';
    for (let i = 0; i < rd.count; i++) {
      const m = mu[`m${i}`] || {};
      rows += `<div class="mata-match-admin">
        <div class="mma-row">
          <span class="mma-num">JOGO ${i+1}</span>
          <select id="mu-${rd.key}-${i}-a">${opts(m.a||'')}</select>
          <span class="mma-vs">VS</span>
          <select id="mu-${rd.key}-${i}-b">${opts(m.b||'')}</select>
        </div>
      </div>`;
    }
    return `<div class="mata-round-admin">
      <div class="mra-title">${rd.label} (${rd.count} jogos)</div>
      ${rows}
    </div>`;
  }).join('');
}

window.saveMatchups = async function() {
  const matchups = {};
  ROUNDS.forEach(rd => {
    matchups[rd.key] = {};
    for (let i = 0; i < rd.count; i++) {
      const a = document.getElementById(`mu-${rd.key}-${i}-a`)?.value || '';
      const b = document.getElementById(`mu-${rd.key}-${i}-b`)?.value || '';
      if (a || b) matchups[rd.key][`m${i}`] = { a, b };
    }
  });
  try {
    await setDoc(MAIN_DOC, { matchups }, { merge: true });
    S.matchups = matchups;
    renderMataResults();
    toast('✅ Confrontos salvos!');
  } catch(e) { toast('❌ Erro: '+e.message); }
};

// ── RESULTADOS DO MATA-MATA ──
function renderMataResults() {
  document.getElementById('admin-mata-results').innerHTML = ROUNDS.map(rd => {
    const mu  = S.matchups?.[rd.key] || {};
    const res = S.results?.[rd.key]  || {};
    let rows = '';
    for (let i = 0; i < rd.count; i++) {
      const m = mu[`m${i}`];
      if (!m?.a && !m?.b) continue;
      const r = res[`m${i}`] || { h: '', a: '', p: '' };
      const isTie = r.h !== '' && r.a !== '' && r.h === r.a;
      
      rows += `<div style="background:var(--white); border:1px solid var(--border); border-radius:6px; padding:6px; margin-bottom:6px;">
        <div class="grc-match" style="border:none; padding:0;">
          <span class="mrr-label" style="margin-right:10px;">JOGO ${i+1}</span>
          <div class="grcm-team grcm-home">${m.a||'?'} ${flag(m.a||'', 20)}</div>
          <input type="number" id="mres-${rd.key}-${i}-h" value="${r.h}" min="0" max="20" class="grcm-input" oninput="checkTie('${rd.key}', ${i})">
          <span class="grcm-x">x</span>
          <input type="number" id="mres-${rd.key}-${i}-a" value="${r.a}" min="0" max="20" class="grcm-input" oninput="checkTie('${rd.key}', ${i})">
          <div class="grcm-team grcm-away">${flag(m.b||'', 20)} ${m.b||'?'}</div>
        </div>
        <div id="pen-${rd.key}-${i}" style="margin-top:6px; display:${isTie ? 'block' : 'none'}; text-align:center;">
          <select id="mpen-${rd.key}-${i}" style="font-size:.8rem; padding:4px; border-radius:6px; border:1px solid var(--border);">
            <option value="">— Quem venceu nos pênaltis? —</option>
            <option value="A" ${r.p==='A'?'selected':''}>${m.a}</option>
            <option value="B" ${r.p==='B'?'selected':''}>${m.b}</option>
          </select>
        </div>
      </div>`;
    }
    if (!rows) rows = `<div style="font-size:.8rem;color:var(--muted);">Configure os confrontos primeiro.</div>`;
    return `<div class="mata-res-round">
      <div class="mrr-title">${rd.label}</div>
      ${rows}
    </div>`;
  }).join('');
}

window.checkTie = function(rdKey, i) {
  const h = document.getElementById(`mres-${rdKey}-${i}-h`).value;
  const a = document.getElementById(`mres-${rdKey}-${i}-a`).value;
  const penDiv = document.getElementById(`pen-${rdKey}-${i}`);
  if (h !== '' && a !== '' && h === a) {
    penDiv.style.display = 'block';
  } else {
    penDiv.style.display = 'none';
  }
};

window.saveMataResults = async function() {
  const results = {};
  ROUNDS.forEach(rd => {
    results[rd.key] = {};
    const mu = S.matchups?.[rd.key] || {};
    for (let i = 0; i < rd.count; i++) {
      if (!mu[`m${i}`]) continue;
      const h = document.getElementById(`mres-${rd.key}-${i}-h`)?.value || '';
      const a = document.getElementById(`mres-${rd.key}-${i}-a`)?.value || '';
      const p = document.getElementById(`mpen-${rd.key}-${i}`)?.value || '';
      results[rd.key][`m${i}`] = { h, a, p };
    }
  });

  const newMu = JSON.parse(JSON.stringify(S.matchups));

  function getWinner(rdKey, mIdx) {
    const res = results[rdKey]?.[`m${mIdx}`];
    const match = S.matchups[rdKey]?.[`m${mIdx}`];
    if (!res || !match || res.h === '' || res.a === '') return '';
    const h = parseInt(res.h), a = parseInt(res.a);
    if (h > a) return match.a;
    if (a > h) return match.b;
    if (h === a) {
      if (res.p === 'A') return match.a;
      if (res.p === 'B') return match.b;
    }
    return '';
  }
  function getLoser(rdKey, mIdx) {
    const res = results[rdKey]?.[`m${mIdx}`];
    const match = S.matchups[rdKey]?.[`m${mIdx}`];
    if (!res || !match || res.h === '' || res.a === '') return '';
    const h = parseInt(res.h), a = parseInt(res.a);
    if (h > a) return match.b;
    if (a > h) return match.a;
    if (h === a) {
      if (res.p === 'A') return match.b;
      if (res.p === 'B') return match.a;
    }
    return '';
  }

  // R32 -> R16
  for (let i = 0; i < 8; i++) {
    if (!newMu.r16) newMu.r16 = {};
    if (!newMu.r16[`m${i}`]) newMu.r16[`m${i}`] = {a:'', b:''};
    const w1 = getWinner('r32', i*2), w2 = getWinner('r32', i*2+1);
    if (w1) newMu.r16[`m${i}`].a = w1;
    if (w2) newMu.r16[`m${i}`].b = w2;
  }
  // R16 -> QF
  for (let i = 0; i < 4; i++) {
    if (!newMu.qf) newMu.qf = {};
    if (!newMu.qf[`m${i}`]) newMu.qf[`m${i}`] = {a:'', b:''};
    const w1 = getWinner('r16', i*2), w2 = getWinner('r16', i*2+1);
    if (w1) newMu.qf[`m${i}`].a = w1;
    if (w2) newMu.qf[`m${i}`].b = w2;
  }
  // QF -> SF
  for (let i = 0; i < 2; i++) {
    if (!newMu.sf) newMu.sf = {};
    if (!newMu.sf[`m${i}`]) newMu.sf[`m${i}`] = {a:'', b:''};
    const w1 = getWinner('qf', i*2), w2 = getWinner('qf', i*2+1);
    if (w1) newMu.sf[`m${i}`].a = w1;
    if (w2) newMu.sf[`m${i}`].b = w2;
  }
  // SF -> Final & Terceiro
  if (!newMu.final) newMu.final = {m0:{a:'', b:''}};
  if (!newMu.terceiro) newMu.terceiro = {m0:{a:'', b:''}};
  if (!newMu.final.m0) newMu.final.m0 = {a:'', b:''};
  if (!newMu.terceiro.m0) newMu.terceiro.m0 = {a:'', b:''};
  
  const sfw1 = getWinner('sf', 0), sfl1 = getLoser('sf', 0);
  const sfw2 = getWinner('sf', 1), sfl2 = getLoser('sf', 1);
  if (sfw1) newMu.final.m0.a = sfw1;
  if (sfw2) newMu.final.m0.b = sfw2;
  if (sfl1) newMu.terceiro.m0.a = sfl1;
  if (sfl2) newMu.terceiro.m0.b = sfl2;

  try {
    await setDoc(MAIN_DOC, { results, matchups: newMu }, { merge: true });
    Object.assign(S.results, results);
    S.matchups = newMu;
    renderMataMatches();
    renderMataResults();
    toast('✅ Resultados salvos e chaveamento atualizado!');
  } catch(e) { toast('❌ Erro: '+e.message); }
};



// ── LISTA DE APOSTADORES ──
window.loadPlayers = async function() {
  try {
    const snaps = await getDocs(PLAYERS_COL);
    const players = [];
    snaps.forEach(s => players.push({ id: s.id, ...s.data() }));
    const el = document.getElementById('players-list');
    if (players.length === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:.85rem;">Nenhum apostador ainda.</div>'; return; }
    el.innerHTML = players.map(p => `<div class="player-row">
      <div class="pr-avatar">${p.name?.[0]?.toUpperCase()||'?'}</div>
      <div class="pr-name">${p.name}</div>
      <button class="btn btn-outline btn-sm" style="padding: .3rem .6rem; border-color: var(--red); color: var(--red);" onclick="deletePlayer('${p.id}', '${p.name}')">🗑️ Excluir</button>
    </div>`).join('');
  } catch(e) { toast('❌ Erro: '+e.message); }
};

window.deletePlayer = async function(id, name) {
  if (!confirm(`Tem certeza que deseja excluir o apostador ${name}?`)) return;
  try {
    await deleteDoc(doc(PLAYERS_COL, id));
    toast('✅ Apostador excluído!');
    loadPlayers();
  } catch(e) { toast('❌ Erro: '+e.message); }
};

function toast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
