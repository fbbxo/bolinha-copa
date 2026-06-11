import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ═══════════════════════════════════════════════════
//  ⚙️  CONFIGURE SEU FIREBASE AQUI
//  1. Acesse https://console.firebase.google.com
//  2. Crie um projeto novo
//  3. Ative o Firestore (modo produção)
//  4. Cole suas credenciais abaixo
// ═══════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyDME_mfSrPHot67db1Vayjh8GDC1CRdJh4",
  authDomain:        "bolinha-world-cup.firebaseapp.com",
  projectId:         "bolinha-world-cup",
  storageBucket:     "bolinha-world-cup.firebasestorage.app",
  messagingSenderId: "988321335232",
  appId:             "1:988321335232:web:fc4abab47b114c0c14aa25"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

// ── BANDEIRAS via flag-icons (cdnjs, gratuito) ──
// CSS carregado no index.html: flag-icons.min.css
// Uso: <span class="fi fi-br"></span>  →  bandeira do Brasil
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

// Retorna <span> com a bandeira SVG via flag-icons
function flag(name, size) {
  size = size || 28;
  const code = FLAG_CODES[name] || '';
  if (!code) return '<span style="font-size:16px">🏳️</span>';
  const w = Math.round(size * 1.33); // flags são 4:3
  return `<span class="fi fi-${code}" style="width:${w}px;height:${size}px;background-size:cover;border-radius:3px;display:inline-block;flex-shrink:0;"></span>`;
}

// ── GRUPOS PADRÃO (sorteio oficial 05/12/2025) ──
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

// Todos os times (para selects do pré-torneio)
const ALL_TEAMS = Object.values(DEFAULT_GROUPS).flat();

// ── DATAS DOS JOGOS (Oficiais) ──
const MATCH_DATES = {
  A: { m0: '11/06 - 16:00', m1: '11/06 - 23:00', m2: '18/06 - 22:00', m3: '18/06 - 13:00', m4: '24/06 - 22:00', m5: '24/06 - 22:00' },
  B: { m0: '12/06 - 16:00', m1: '13/06 - 16:00', m2: '18/06 - 19:00', m3: '18/06 - 16:00', m4: '24/06 - 16:00', m5: '24/06 - 16:00' },
  C: { m0: '13/06 - 19:00', m1: '13/06 - 22:00', m2: '19/06 - 21:30', m3: '19/06 - 19:00', m4: '24/06 - 19:00', m5: '24/06 - 19:00' },
  D: { m0: '12/06 - 22:00', m1: '14/06 - 01:00', m2: '19/06 - 16:00', m3: '20/06 - 01:00', m4: '25/06 - 23:00', m5: '25/06 - 23:00' },
  E: { m0: '14/06 - 14:00', m1: '14/06 - 20:00', m2: '20/06 - 17:00', m3: '20/06 - 21:00', m4: '25/06 - 17:00', m5: '25/06 - 17:00' },
  F: { m0: '14/06 - 17:00', m1: '14/06 - 23:00', m2: '20/06 - 14:00', m3: '21/06 - 01:00', m4: '25/06 - 20:00', m5: '25/06 - 20:00' },
  G: { m0: '15/06 - 16:00', m1: '15/06 - 22:00', m2: '21/06 - 16:00', m3: '21/06 - 22:00', m4: '27/06 - 00:00', m5: '27/06 - 00:00' },
  H: { m0: '15/06 - 13:00', m1: '15/06 - 19:00', m2: '21/06 - 13:00', m3: '21/06 - 19:00', m4: '26/06 - 21:00', m5: '26/06 - 21:00' },
  I: { m0: '16/06 - 16:00', m1: '16/06 - 19:00', m2: '22/06 - 18:00', m3: '22/06 - 21:00', m4: '26/06 - 16:00', m5: '26/06 - 16:00' },
  J: { m0: '16/06 - 22:00', m1: '17/06 - 01:00', m2: '22/06 - 14:00', m3: '23/06 - 00:00', m4: '27/06 - 23:00', m5: '27/06 - 23:00' },
  K: { m0: '17/06 - 14:00', m1: '17/06 - 23:00', m2: '23/06 - 14:00', m3: '23/06 - 23:00', m4: '27/06 - 20:30', m5: '27/06 - 20:30' },
  L: { m0: '17/06 - 17:00', m1: '17/06 - 20:00', m2: '23/06 - 17:00', m3: '23/06 - 20:00', m4: '27/06 - 18:00', m5: '27/06 - 18:00' }
};

const MATA_DATES = {
  r32: { m0:'29/06 - 17:30', m1:'30/06 - 18:00', m2:'28/06 - 16:00', m3:'29/06 - 22:00', m4:'02/07 - 20:00', m5:'02/07 - 16:00', m6:'01/07 - 21:00', m7:'01/07 - 17:00', m8:'29/06 - 14:00', m9:'30/06 - 14:00', m10:'30/06 - 22:00', m11:'01/07 - 13:00', m12:'03/07 - 19:00', m13:'03/07 - 15:00', m14:'03/07 - 00:00', m15:'03/07 - 22:30' },
  r16: { m0:'04/07 - 18:00', m1:'04/07 - 14:00', m2:'06/07 - 16:00', m3:'06/07 - 21:00', m4:'05/07 - 17:00', m5:'05/07 - 21:00', m6:'07/07 - 13:00', m7:'07/07 - 17:00' },
  qf: { m0:'09/07 - 17:00', m1:'10/07 - 16:00', m2:'11/07 - 18:00', m3:'11/07 - 22:00' },
  sf: { m0:'14/07 - 16:00', m1:'15/07 - 16:00' },
  terceiro: { m0:'18/07 - 18:00' },
  final: { m0:'19/07 - 16:00' }
};

// ── RODADAS DO MATA-MATA ──
const ROUNDS = [
  { key:'r32',      label:'Rodada de 32',     pts:1, count:16 },
  { key:'r16',      label:'Oitavas de Final',  pts:1, count:8  },
  { key:'qf',       label:'Quartas de Final',  pts:2, count:4  },
  { key:'sf',       label:'Semifinais',        pts:2, count:2  },
  { key:'terceiro', label:'Disputa do 3º Lugar', pts:1, count:1 },
  { key:'final',    label:'Final',             pts:3, count:1  },
];

// ── ESTADO GLOBAL ──
let S = {
  groups: DEFAULT_GROUPS,
  results:  { grupos:{}, r32:{}, r16:{}, qf:{}, sf:{}, terceiro:{}, final:{} },
  matchups: { r32:{}, r16:{}, qf:{}, sf:{}, terceiro:{}, final:{} },
  locked:    {},
  deadlines: {},
};
let ME = null; // { id, name, pin, grupos:{}, mata:{} }

// ── FIREBASE REFS ──
const MAIN_DOC    = doc(db, 'bolinha-copa', 'state');
const PLAYERS_COL = collection(db, 'copa-players');

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
async function init() {
  showLoading(true);
  const timeout = setTimeout(() => {
    showLoading(false);
    showSync('⚠️ Falha ao conectar. Verifique o Firebase.');
  }, 12000);

  try {
    const snap = await getDoc(MAIN_DOC);
    if (snap.exists()) mergeState(snap.data());
    clearTimeout(timeout);
    showLoading(false);
    showLoginScreen();

    onSnapshot(MAIN_DOC, snap => {
      if (snap.exists()) { mergeState(snap.data()); if (ME) { renderAll(); showSync('🔄 Atualizado em tempo real'); } }
    });
    setConnStatus(true);
  } catch(e) {
    clearTimeout(timeout);
    showLoading(false);
    setConnStatus(false);
    showLoginScreen();
    console.error(e);
  }
}

function mergeState(data) {
  if (data.groups)   S.groups   = { ...DEFAULT_GROUPS, ...data.groups };
  if (data.results)  S.results  = { grupos:{}, r32:{}, r16:{}, qf:{}, sf:{}, terceiro:{}, final:{}, ...data.results };
  if (data.matchups) S.matchups = { r32:{}, r16:{}, qf:{}, sf:{}, terceiro:{}, final:{}, ...data.matchups };
  if (data.locked)   S.locked   = data.locked;
  if (data.deadlines) S.deadlines = data.deadlines;
}

function isLocked(key) {
  if (S.locked?.[key]) return true;
  const dl = S.deadlines?.[key];
  if (dl && new Date() >= new Date(dl)) return true;
  return false;
}

function getDeadlineStr(key) {
  const dl = S.deadlines?.[key];
  if (!dl) return '';
  const d = new Date(dl);
  if (isNaN(d)) return '';
  return `⏱️ FECHA ${d.toLocaleDateString('pt-BR')} ÀS ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
}

// ═══════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════
window.doLogin = async function() {
  const name = document.getElementById('login-name').value.trim();
  const pin  = document.getElementById('login-pin').value.trim();
  const err  = document.getElementById('login-error');
  if (!name) { err.textContent = 'Informe seu nome.'; return; }
  if (!/^\d{4}$/.test(pin)) { err.textContent = 'PIN deve ter 4 dígitos.'; return; }

  const id = name.toLowerCase().replace(/\s+/g,'_');
  try {
    const snap = await getDoc(doc(PLAYERS_COL, id));
    if (snap.exists()) {
      const p = snap.data();
      if (p.pin !== pin) { err.textContent = 'PIN incorreto.'; return; }
      ME = { id, name: p.name, pin, grupos: p.grupos||{}, mata: p.mata||{} };
    } else {
      ME = { id, name, pin, grupos:{}, mata:{} };
      await setDoc(doc(PLAYERS_COL, id), { name, pin, grupos:{}, mata:{} });
    }
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('hdr-name').textContent = ME.name.split(' ')[0].toUpperCase();
    document.getElementById('hdr-avatar').textContent = ME.name[0].toUpperCase();
    renderAll();
  } catch(e) {
    err.textContent = 'Erro ao conectar. Verifique o Firebase.';
    console.error(e);
  }
};

window.doLogout = function() {
  ME = null;
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-pin').value = '';
  document.getElementById('login-error').textContent = '';
};

// ═══════════════════════════════════════════════════
//  RENDER ALL
// ═══════════════════════════════════════════════════
function renderAll() {
  renderGrupos();
  renderMata();
  renderPlacar();
}

// ═══════════════════════════════════════════════════
//  GRUPOS
// ═══════════════════════════════════════════════════
function renderGrupos() {
  const lockedR1 = isLocked('grupos_r1');
  const lockedR2 = isLocked('grupos_r2');
  const lockedR3 = isLocked('grupos_r3');
  const allLocked = lockedR1 && lockedR2 && lockedR3;

  document.getElementById('grupos-locked-banner').classList.toggle('hidden', !allLocked);
  document.getElementById('grupos-save-btn').style.display = allLocked ? 'none' : 'inline-block';
  document.getElementById('grupos-deadline').textContent = '';

  const rounds = [
    { label: 'RODADA 1', matches: [0, 1], locked: lockedR1, dl: getDeadlineStr('grupos_r1') },
    { label: 'RODADA 2', matches: [2, 3], locked: lockedR2, dl: getDeadlineStr('grupos_r2') },
    { label: 'RODADA 3', matches: [4, 5], locked: lockedR3, dl: getDeadlineStr('grupos_r3') },
  ];

  const el = document.getElementById('grupos-render');
  let html = '';
  for (const r of rounds) {
    html += `<div class="rodada-section" style="margin-bottom: 2rem;">
      <div style="background: var(--surface); padding: 1rem; border-radius: 8px; text-align: center; margin-bottom: 1rem; border: 1px solid var(--border);">
        <h3 style="margin:0; color:var(--gold);">${r.label} ${r.locked ? '🔒' : ''}</h3>
        ${r.dl ? `<div style="font-size:0.85rem; font-weight:700; color:var(--red); margin-top:0.5rem; background:#fff5f5; border:1px solid #fca5a5; border-radius:6px; display:inline-block; padding:0.3rem 0.6rem;">${r.dl}</div>` : ''}
      </div>
      <div class="grupos-grid">`;
      
    // Ordena os grupos cronologicamente pelo primeiro jogo do grupo nesta rodada
    const sortedGroups = [...GROUP_KEYS].sort((a, b) => {
      const getTime = (g) => {
        let minT = Infinity;
        r.matches.forEach(mIdx => {
          const dateStr = MATCH_DATES[g]?.[`m${mIdx}`];
          if (dateStr) {
            const pts = dateStr.match(/(\d{2})\/(\d{2}).*?(\d{2}):(\d{2})/);
            if (pts) {
              const t = new Date(2026, parseInt(pts[2])-1, parseInt(pts[1]), parseInt(pts[3]), parseInt(pts[4])).getTime();
              if (t < minT) minT = t;
            }
          }
        });
        return minT;
      };
      return getTime(a) - getTime(b);
    });

    for (const g of sortedGroups) {
       html += renderRodadaGrupo(g, r.matches, r.locked);
    }
    
    html += `</div>`;
    
    if (!r.locked && r.label !== 'RODADA 3') {
      html += `<div style="text-align:center; margin-top:1.5rem;">
        <button class="btn btn-gold" onclick="saveGrupos()">💾 Salvar apostas da ${r.label}</button>
      </div>`;
    }
    
    html += `</div>`;
  }
  
  el.innerHTML = html;
}

function renderRodadaGrupo(g, matchIndices, locked) {
  const teams = S.groups[g] || DEFAULT_GROUPS[g];
  const allMatchesDef = [ [0,1], [2,3], [0,2], [1,3], [0,3], [1,2] ];

  let matchesHTML = matchIndices.map(i => {
    const m = allMatchesDef[i];
    const tH = teams[m[0]];
    const tA = teams[m[1]];
    const pick = ME.grupos[g]?.[`m${i}`] || { h: '', a: '' };
    const res = S.results.grupos?.[g]?.[`m${i}`];
    
    let cls = 'grupo-match';
    let resHtml = '';
    if (res && res.h !== '' && res.a !== '') {
      let rH = parseInt(res.h), rA = parseInt(res.a);
      let pH = parseInt(pick.h), pA = parseInt(pick.a);
      let statusText = '';
      if (!isNaN(pH) && !isNaN(pA) && !isNaN(rH) && !isNaN(rA)) {
        if (rH === pH && rA === pA) {
          cls += ' gm-correct-exact';
          statusText = '🔥 Na mosca! (+3 pts)';
        } else {
          let resWin = rH > rA ? 1 : (rH < rA ? -1 : 0);
          let pickWin = pH > pA ? 1 : (pH < pA ? -1 : 0);
          if (resWin === pickWin) {
            cls += ' gm-correct-winner';
            statusText = '✔️ Acertou o vencedor (+1 pt)';
          } else {
            cls += ' gm-wrong';
            statusText = '❌ Errou (0 pts)';
          }
        }
      } else {
         cls += ' gm-wrong';
         statusText = '❌ Não palpitou (0 pts)';
      }
      resHtml = `<div class="gm-res" style="line-height:1.4;"><strong>${statusText}</strong><br>Resultado: ${rH} x ${rA}</div>`;
    }

    const dateStr = MATCH_DATES[g]?.[`m${i}`] || '';
    const dis = locked ? 'disabled' : '';
    return `<div class="${cls}">
      ${dateStr ? `<div class="gm-date">📅 ${dateStr}</div>` : ''}
      <div class="gm-row">
        <div class="gm-team gm-home">
          <span class="gm-name">${tH}</span>
          ${flag(tH, 24)}
        </div>
        <input type="number" class="gm-input" value="${pick.h}" ${dis} min="0" max="20" onchange="pickGrpScore('${g}', ${i}, 'h', this.value)">
        <span class="gm-x">X</span>
        <input type="number" class="gm-input" value="${pick.a}" ${dis} min="0" max="20" onchange="pickGrpScore('${g}', ${i}, 'a', this.value)">
        <div class="gm-team gm-away">
          ${flag(tA, 24)}
          <span class="gm-name">${tA}</span>
        </div>
      </div>
      ${resHtml}
    </div>`;
  }).join('');

  return `<div class="grupo-card" data-g="${g}">
    <div class="grupo-header">
      <span class="grupo-label">GRUPO ${g}</span>
    </div>
    <div class="grupo-matches">${matchesHTML}</div>
  </div>`;
}

window.pickGrpScore = function(g, mIdx, side, val) {
  let lockKey = 'grupos_r1';
  if (mIdx === 2 || mIdx === 3) lockKey = 'grupos_r2';
  if (mIdx === 4 || mIdx === 5) lockKey = 'grupos_r3';
  if (isLocked(lockKey)) return;

  if (!ME.grupos[g]) ME.grupos[g] = {};
  if (!ME.grupos[g][`m${mIdx}`]) ME.grupos[g][`m${mIdx}`] = { h: '', a: '' };
  ME.grupos[g][`m${mIdx}`][side] = val;
};

window.saveGrupos = async function() {
  const allLocked = isLocked('grupos_r1') && isLocked('grupos_r2') && isLocked('grupos_r3');
  if (allLocked) return;
  try {
    await setDoc(doc(PLAYERS_COL, ME.id), { grupos: ME.grupos }, { merge: true });
    toast('✅ Apostas dos grupos salvas!');
  } catch(e) { toast('❌ Erro ao salvar.'); }
};



// ═══════════════════════════════════════════════════
//  MATA-MATA
// ═══════════════════════════════════════════════════
function renderMata() {
  const allLocked = ROUNDS.every(rd => isLocked(`mata_${rd.key}`));
  document.getElementById('mata-locked-banner').classList.toggle('hidden', !allLocked);
  document.getElementById('mata-save-btn').style.display = allLocked ? 'none' : 'inline-block';

  let html = '';
  for (const rd of ROUNDS) {
    const matchupsInRound = S.matchups?.[rd.key] || {};
    const resultsInRound  = S.results?.[rd.key]  || {};
    const matchCount = Object.keys(matchupsInRound).length;
    const isRoundLocked = isLocked(`mata_${rd.key}`);

    const dlStr = getDeadlineStr(`mata_${rd.key}`);
    html += `<div class="mata-round">
      <div class="mata-round-header" style="flex-direction:column; align-items:flex-start; gap:6px;">
        <div class="mata-round-title">${rd.label} ${isRoundLocked ? '🔒' : ''}</div>
        ${dlStr ? `<div style="font-size:0.85rem; font-weight:700; color:var(--red); background:#fff5f5; border:1px solid #fca5a5; border-radius:6px; display:inline-block; padding:0.3rem 0.6rem;">${dlStr}</div>` : ''}
      </div>
      <div class="mata-matches">`;

    if (matchCount === 0) {
      html += `<div class="mata-empty">⏳ Aguardando definição das partidas pelo admin</div>`;
    } else {
      let matchIndices = [];
      for (let i = 0; i < rd.count; i++) {
        if (matchupsInRound[`m${i}`]) matchIndices.push(i);
      }
      
      matchIndices.sort((a, b) => {
        const getT = (idx) => {
          const ds = MATA_DATES[rd.key]?.[`m${idx}`];
          if (!ds) return Infinity;
          const pts = ds.match(/(\d{2})\/(\d{2}).*?(\d{2}):(\d{2})/);
          if (pts) return new Date(2026, parseInt(pts[2])-1, parseInt(pts[1]), parseInt(pts[3]), parseInt(pts[4])).getTime();
          return Infinity;
        };
        return getT(a) - getT(b);
      });

      for (let i of matchIndices) {
        const m = matchupsInRound[`m${i}`];
        html += renderMataMatch(rd.key, i, m, resultsInRound[`m${i}`], isRoundLocked);
      }
    }

    html += `</div></div>`;
  }

  document.getElementById('mata-render').innerHTML = html;
}

function renderMataMatch(roundKey, idx, matchup, result, locked) {
  const mKey = `${roundKey}_m${idx}`;
  let pick = ME.mata?.[mKey];
  if (!pick || typeof pick !== 'object') pick = { h: '', a: '' };
  const tH = matchup.a;
  const tA = matchup.b;
  const matchLabel = `JOGO ${idx+1}`;

  let cls = 'mata-match';
  let resHtml = '';
  
  if (result && result.h !== undefined && result.h !== '' && result.a !== '') {
      let rH = parseInt(result.h), rA = parseInt(result.a);
      let pH = parseInt(pick.h), pA = parseInt(pick.a);
      let statusText = '';
      if (!isNaN(pH) && !isNaN(pA) && !isNaN(rH) && !isNaN(rA)) {
        if (rH === pH && rA === pA) {
          cls += ' gm-correct-exact';
          statusText = '🔥 Na mosca! (+3 pts)';
        } else {
          let resWin = rH > rA ? 1 : (rH < rA ? -1 : 0);
          let pickWin = pH > pA ? 1 : (pH < pA ? -1 : 0);
          if (resWin === pickWin) {
            cls += ' gm-correct-winner';
            statusText = '✔️ Acertou o vencedor (+1 pt)';
          } else {
            cls += ' gm-wrong';
            statusText = '❌ Errou (0 pts)';
          }
        }
      } else {
         cls += ' gm-wrong';
         statusText = '❌ Não palpitou (0 pts)';
      }
      resHtml = `<div class="gm-res" style="line-height:1.4;"><strong>${statusText}</strong><br>Resultado: ${rH} x ${rA}</div>`;
  }

  const dis = locked ? 'disabled' : '';
  const mmDateStr = MATA_DATES[roundKey]?.[`m${idx}`] || 'A definir';
  return `<div class="${cls}" style="margin-bottom:6px;">
    <div class="mata-match-head" style="display:flex; justify-content:space-between;">
      <span>${matchLabel}</span>
      <span>📅 ${mmDateStr}</span>
    </div>
    <div class="gm-row" style="padding:8px 8px 4px 8px;">
      <div class="gm-team gm-home">
        <span class="gm-name">${tH}</span>
        ${flag(tH, 24)}
      </div>
      <input type="number" class="gm-input" value="${pick.h}" ${dis} min="0" max="20" onchange="pickMataScore('${mKey}', 'h', this.value)">
      <span class="gm-x">X</span>
      <input type="number" class="gm-input" value="${pick.a}" ${dis} min="0" max="20" onchange="pickMataScore('${mKey}', 'a', this.value)">
      <div class="gm-team gm-away">
        ${flag(tA, 24)}
        <span class="gm-name">${tA}</span>
      </div>
    </div>
    ${resHtml}
  </div>`;
}

window.pickMataScore = function(mKey, side, val) {
  const roundKey = mKey.split('_')[0];
  if (isLocked(`mata_${roundKey}`)) return;
  
  if (!ME.mata) ME.mata = {};
  if (!ME.mata[mKey] || typeof ME.mata[mKey] !== 'object') ME.mata[mKey] = { h: '', a: '' };
  ME.mata[mKey][side] = val;
};

window.saveMata = async function() {
  const allLocked = ROUNDS.every(rd => isLocked(`mata_${rd.key}`));
  if (allLocked) return;
  try {
    await setDoc(doc(PLAYERS_COL, ME.id), { mata: ME.mata }, { merge: true });
    toast('✅ Apostas do mata-mata salvas!');
  } catch(e) { toast('❌ Erro ao salvar.'); }
};

// ═══════════════════════════════════════════════════
//  PONTUAÇÃO
// ═══════════════════════════════════════════════════
function calcScore(player) {
  let pts = 0, details = { grupos: 0, mata: 0 };

  // Grupos
  for (const g of GROUP_KEYS) {
    const resGrp  = S.results.grupos?.[g];
    const pickGrp = player.grupos?.[g];
    if (!resGrp || !pickGrp) continue;
    for (let i = 0; i < 6; i++) {
      const res = resGrp[`m${i}`];
      const pick = pickGrp[`m${i}`];
      if (res && res.h !== '' && res.a !== '' && pick && pick.h !== '' && pick.a !== '') {
        const rH = parseInt(res.h), rA = parseInt(res.a);
        const pH = parseInt(pick.h), pA = parseInt(pick.a);
        if (!isNaN(pH) && !isNaN(pA) && !isNaN(rH) && !isNaN(rA)) {
          if (rH === pH && rA === pA) {
             pts += 3; details.grupos += 3;
          } else {
             const resWin = rH > rA ? 1 : (rH < rA ? -1 : 0);
             const pickWin = pH > pA ? 1 : (pH < pA ? -1 : 0);
             if (resWin === pickWin) {
               pts += 1; details.grupos += 1;
             }
          }
        }
      }
    }
  }

  // Mata-mata
  for (const rd of ROUNDS) {
    const resRound = S.results?.[rd.key] || {};
    const pickMata = player.mata || {};
    for (let i = 0; i < rd.count; i++) {
      const res = resRound[`m${i}`];
      const pick = pickMata[`${rd.key}_m${i}`];
      if (res && res.h !== undefined && res.h !== '' && res.a !== '' && pick && typeof pick === 'object' && pick.h !== '' && pick.a !== '') {
        const rH = parseInt(res.h), rA = parseInt(res.a);
        const pH = parseInt(pick.h), pA = parseInt(pick.a);
        if (!isNaN(pH) && !isNaN(pA) && !isNaN(rH) && !isNaN(rA)) {
          if (rH === pH && rA === pA) {
            pts += 3; details.mata += 3;
          } else {
            const resWin = rH > rA ? 1 : (rH < rA ? -1 : 0);
            const pickWin = pH > pA ? 1 : (pH < pA ? -1 : 0);
            if (resWin === pickWin) {
              pts += 1; details.mata += 1;
            }
          }
        }
      }
    }
  }

  return { pts, details };
}

// ═══════════════════════════════════════════════════
//  PLACAR
// ═══════════════════════════════════════════════════
window.renderPlacar = async function() {
  const el = document.getElementById('placar-render');
  el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Carregando...</div>';
  try {
    const snaps = await getDocs(PLAYERS_COL);
    const players = [];
    snaps.forEach(s => players.push({ id: s.id, ...s.data() }));

    const ranked = players
      .map(p => ({ ...p, score: calcScore(p) }))
      .sort((a,b) => b.score.pts - a.score.pts || b.score.details.mata - a.score.details.mata);

    if (ranked.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Nenhum apostador ainda.</div>';
      return;
    }

    el.innerHTML = ranked.map((p, i) => {
      const pos = i + 1;
      const posClass = pos===1?'top1':pos===2?'top2':pos===3?'top3':'';
      const isMe = p.id === ME?.id;
      const { pts, details } = p.score;
      return `<div class="rank-item ${isMe?'me':''}">
        <div class="rank-pos ${posClass}">${pos}°</div>
        <div class="rank-avatar">${p.name?.[0]?.toUpperCase()||'?'}</div>
        <div class="rank-info">
          <div class="rank-name">${p.name}${isMe?' (você)':''}</div>
          <div class="rank-detail">Grupos: ${details.grupos} · Mata-mata: ${details.mata}</div>
        </div>
        <div>
          <div class="rank-pts">${pts}</div>
          <div class="rank-pts-label">PONTOS</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="text-align:center;color:var(--red);">Erro ao carregar placar.</div>';
  }
};

// ═══════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════
window.showTab = function(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  if (id === 'placar') renderPlacar();
};

function showLoading(v) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !v);
}
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  showLoading(false);
}
function showSync(msg) {
  const bar = document.getElementById('sync-bar');
  bar.textContent = msg;
  bar.style.maxHeight = '30px';
  bar.style.padding = '.3rem';
  clearTimeout(showSync._t);
  showSync._t = setTimeout(() => { bar.style.maxHeight = '0'; bar.style.padding = '0'; }, 3000);
}
function setConnStatus(online) {
  document.getElementById('conn-dot').className = online ? 'online' : '';
  document.getElementById('conn-label').textContent = online ? 'ONLINE' : 'OFFLINE';
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

init();
