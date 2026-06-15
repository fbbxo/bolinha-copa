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
  'México':'mx','África do Sul':'za','Coreia do Sul':'kr','República Tcheca':'cz',
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
  A: ['México','África do Sul','Coreia do Sul','República Tcheca'],
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
  { key:'grupos_r1', label:'Fase de Grupos (Rodada 1)' },
  { key:'grupos_r2', label:'Fase de Grupos (Rodada 2)' },
  { key:'grupos_r3', label:'Fase de Grupos (Rodada 3)' },
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
  const rounds = [
    { label: 'RODADA 1', matches: [0, 1] },
    { label: 'RODADA 2', matches: [2, 3] },
    { label: 'RODADA 3', matches: [4, 5] },
  ];
  
  let html = '';
  for (const r of rounds) {
    html += `<div class="admin-round-section" style="margin-bottom: 2rem;">
      <h3 style="background:var(--surface); padding:0.5rem; border-radius:6px; margin-bottom:1rem;">${r.label}</h3>
      <div class="grupos-res-grid">`;
      
    for (const g of GROUP_KEYS) {
      const teams = DEFAULT_GROUPS[g];
      const res   = S.results.grupos?.[g] || {};
      const allMatches = [ [0,1], [2,3], [0,2], [1,3], [0,3], [1,2] ];
      
      let rows = r.matches.map(i => {
         const m = allMatches[i];
         const tH = teams[m[0]];
         const tA = teams[m[1]];
         const rData = res[`m${i}`] || { h: '', a: '' };
         return `<div class="grc-match">
           <div class="grcm-team grcm-home">${tH} ${flag(tH, 20)}</div>
           <input type="number" id="gres-${g}-m${i}-h" value="${rData.h}" min="0" max="20" class="grcm-input">
           <span class="grcm-x">x</span>
           <input type="number" id="gres-${g}-m${i}-a" value="${rData.a}" min="0" max="20" class="grcm-input">
           <div class="grcm-team grcm-away">${flag(tA, 20)} ${tA}</div>
         </div>`;
      }).join('');
      
      html += `<div class="grupo-res-card">
        <div class="grc-header">GRUPO ${g}</div>
        <div class="grc-body">${rows}</div>
      </div>`;
    }
    
    html += `</div>`;
    
    if (r.label !== 'RODADA 3') {
      html += `<div style="text-align:center; margin-top:1.5rem;">
        <button class="btn btn-gold" onclick="saveGruposResults()">💾 Salvar resultados da ${r.label}</button>
      </div>`;
    }

    html += `</div>`;
  }
  document.getElementById('grupos-res-grid').innerHTML = html;
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

// ── AUTO-GERAR MATA-MATA ──
window.generateMataFromStandings = async function() {
  if (!confirm("Isso vai substituir os confrontos da Rodada de 32 com base na classificação atual da Fase de Grupos. Deseja continuar?")) return;

  const standings = {};
  let allThirds = [];

  for (const g of GROUP_KEYS) {
    const teams = DEFAULT_GROUPS[g];
    const res = S.results.grupos?.[g] || {};
    
    let stats = teams.map(t => ({ team: t, group: g, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 }));
    const getStat = t => stats.find(s => s.team === t);
    
    const allMatchesDef = [ [0,1], [2,3], [0,2], [1,3], [0,3], [1,2] ];
    
    for (let i = 0; i < 6; i++) {
      const match = allMatchesDef[i];
      const tH = teams[match[0]];
      const tA = teams[match[1]];
      const r = res[`m${i}`];
      
      if (r && r.h !== '' && r.a !== '') {
        const hGoals = parseInt(r.h);
        const aGoals = parseInt(r.a);
        if (!isNaN(hGoals) && !isNaN(aGoals)) {
          const sH = getStat(tH);
          const sA = getStat(tA);
          
          sH.j++; sA.j++;
          sH.gp += hGoals; sH.gc += aGoals;
          sA.gp += aGoals; sA.gc += hGoals;
          
          if (hGoals > aGoals) {
            sH.v++; sA.d++; sH.p += 3;
          } else if (aGoals > hGoals) {
            sA.v++; sH.d++; sA.p += 3;
          } else {
            sH.e++; sA.e++; sH.p += 1; sA.p += 1;
          }
        }
      }
    }
    
    stats.forEach(s => s.sg = s.gp - s.gc);
    stats.sort((a, b) => {
      // 0. Pontos
      if (b.p !== a.p) return b.p - a.p;
      
      // 1. Saldo de Gols em todos os jogos
      if (b.sg !== a.sg) return b.sg - a.sg;
      
      // 2. Gols Pró em todos os jogos
      if (b.gp !== a.gp) return b.gp - a.gp;
      
      // Dados para o Confronto Direto
      let directP_A = 0, directP_B = 0;
      let directSG_A = 0, directSG_B = 0;
      let directGP_A = 0, directGP_B = 0;
      
      for (let i = 0; i < 6; i++) {
        const match = allMatchesDef[i];
        const tH = teams[match[0]];
        const tA = teams[match[1]];
        if ((tH === a.team && tA === b.team) || (tH === b.team && tA === a.team)) {
          const r = res[`m${i}`];
          if (r && r.h !== '' && r.a !== '') {
            const hG = parseInt(r.h), aG = parseInt(r.a);
            if (tH === a.team) {
               directGP_A = hG; directGP_B = aG;
               directSG_A = hG - aG; directSG_B = aG - hG;
               if (hG > aG) directP_A = 3; else if (aG > hG) directP_B = 3; else { directP_A = 1; directP_B = 1; }
            } else {
               directGP_A = aG; directGP_B = hG;
               directSG_A = aG - hG; directSG_B = hG - aG;
               if (aG > hG) directP_A = 3; else if (hG > aG) directP_B = 3; else { directP_A = 1; directP_B = 1; }
            }
          }
        }
      }
      
      // 3. Confronto Direto: Pontos
      if (directP_B !== directP_A) return directP_B - directP_A;
      
      // 4. Confronto Direto: Saldo de Gols
      if (directSG_B !== directSG_A) return directSG_B - directSG_A;
      
      // 5. Confronto Direto: Gols Pró
      if (directGP_B !== directGP_A) return directGP_B - directGP_A;

      // 6. Sorteio (Ordem Alfabética)
      return a.team.localeCompare(b.team);
    });
    
    standings[g] = stats;
    allThirds.push(stats[2]);
  }

  allThirds.sort((a, b) => {
    if (b.p !== a.p) return b.p - a.p;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.team.localeCompare(b.team);
  });
  
  const top8Thirds = allThirds.slice(0, 8);

  const newR32 = { ...(S.matchups.r32 || {}) };
  const getTeam = (g, pos) => standings[g]?.[pos - 1]?.team || '';

  newR32.m2 = { a: getTeam('A', 2), b: getTeam('B', 2) };
  newR32.m3 = { a: getTeam('F', 1), b: getTeam('C', 2) };
  newR32.m4 = { a: getTeam('K', 2), b: getTeam('L', 2) };
  newR32.m5 = { a: getTeam('H', 1), b: getTeam('J', 2) };
  newR32.m8 = { a: getTeam('C', 1), b: getTeam('F', 2) };
  newR32.m9 = { a: getTeam('E', 2), b: getTeam('I', 2) };
  newR32.m12 = { a: getTeam('J', 1), b: getTeam('H', 2) };
  newR32.m13 = { a: getTeam('D', 2), b: getTeam('G', 2) };

  const thirdSlots = [
    { m: 0, host: getTeam('E', 1) },
    { m: 1, host: getTeam('I', 1) },
    { m: 6, host: getTeam('D', 1) },
    { m: 7, host: getTeam('G', 1) },
    { m: 10, host: getTeam('A', 1) },
    { m: 11, host: getTeam('L', 1) },
    { m: 14, host: getTeam('B', 1) },
    { m: 15, host: getTeam('K', 1) }
  ];

  // Preenche apenas o mandante (1º lugar) das vagas que receberão os 3º colocados.
  // Deixa o adversário vazio (ou mantém o que já estava) para o admin preencher manualmente.
  for (let i = 0; i < 8; i++) {
    const slotInfo = thirdSlots[i];
    const currentOpponent = newR32[`m${slotInfo.m}`]?.b || '';
    newR32[`m${slotInfo.m}`] = { a: slotInfo.host, b: currentOpponent };
  }

  const matchups = { ...S.matchups, r32: newR32 };
  try {
    await setDoc(MAIN_DOC, { matchups }, { merge: true });
    S.matchups = matchups;
    renderMataMatches();
    toast('✅ Primeiros e Segundos lugares preenchidos! Escolha os 3º lugares manualmente.');
  } catch(e) {
    toast('❌ Erro: '+e.message);
  }
};
