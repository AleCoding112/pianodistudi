'use strict';
/* ---------------- quiz «dopo la triennale» ----------------
   Per chi ha una triennale (o la sta finendo) e cerca la magistrale. Parte dal piano vero della sua triennale: segna gli
   esami che gli sono piaciuti e quelli no (e, fra quelli a scelta, quali ha fatto), dice se vuole approfondire, allargare o
   cambiare strada, le sue condizioni pratiche, e assaggia alla cieca gli esami obbligatori di sei magistrali.
   Ogni curriculum di magistrale ha due punteggi:
   - affinità: quanto somiglia alla triennale fatta davvero, per settori scientifici degli esami. È il calcolo di
     raccolta/magistrali.py rifatto qui con gli esami segnati (verifica/quiz-magistrale.mjs controlla che diano lo stesso
     risultato);
   - gusto, da −1 a +1: quanta parte dei suoi crediti è in materie che ti sono piaciute o no, e nelle aree nuove che hai
     detto di voler studiare. Le materie che non hai mai fatto contano zero: il quiz non sa se ti piacerebbero.
   I due punteggi hanno scale diverse (il gusto si muove poco, perché quasi ogni magistrale ha anche materie mai fatte):
   fra le magistrali che rispettano le condizioni, l'affinità si divide per la più alta (e oltre la soglia della direzione
   conta piena, vedi DIREZIONI) e il gusto si porta fra 0 (il più
   basso) e 1 (il più alto); poi la direzione scelta decide quanto pesa ciascuno. Non la posizione in classifica: quella
   appiattisce la cima, dove le differenze contano (provato con verifica/quiz-magistrale.mjs). Non dice se puoi iscriverti: i requisiti li decide ogni ateneo.
   Usa le utilità di app.js e di quiz.js (AMBITI_BREVI, FAMIGLIE, corsoAdatto, vicino, KM_VICINO, elenco), caricati prima. */

const VERSIONE_MAG = 1, MIN_SEGNATI = 3, CFU_NUOVO = 6;
// per ciascuna direzione: quanto pesano affinità e gusto, e la «soglia» oltre cui l'affinità conta piena (in quota della
// più alta). Chi vuole approfondire resta nel suo campo, ma dentro il campo sceglie per gusto: una magistrale di storia
// per chi ha fatto Lettere e ama la storia è nel campo quanto una di letteratura. L'assaggio alla cieca sposta il resto
// (PESO_ASSAGGIO). Tarati con verifica/quiz-magistrale.mjs: chi li cambia la rilanci
const DIREZIONI = [
  { d: 'Approfondire', t: 'Una magistrale nel mio campo, per specializzarmi in quello che ho studiato', pesi: [.6, .4], soglia: .8 },
  { d: 'Allargare', t: 'Restare vicino a quello che ho studiato, ma aprirmi a qualcosa di nuovo', pesi: [.4, .6], soglia: .65 },
  { d: 'Cambiare strada', t: 'Studiare qualcosa di diverso, anche se dovrò recuperare qualche esame', pesi: [.15, .85], soglia: .5 },
];
const PESO_ASSAGGIO = .2, MAX_AREE = 3;
const PASSI_MAG = [['La tua triennale', 0, 1], ['Gli esami', 1, 2], ['Cosa cerchi', 2, 4], ['Alla cieca', 4, 6]];
const COND_MAG = { dove: 2, test: 1, inglese: 1, online: 0 };

/* ---------- dati ---------- */
let caricamentoMag = null;
const leggiQuote = t => Object.fromEntries((t ? t.split(',') : []).map(x => { const [k, v] = x.split(':').map(Number); return [k, v / 1000]; }));
function unitario(q) { const n = Math.sqrt(Object.values(q).reduce((t, v) => t + v * v, 0)); return n ? Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v / n])) : {}; }
function quoteDi(c) { const t = Object.values(c).reduce((a, b) => a + b, 0); return t ? Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / t])) : {}; }
const prodotto = (a, b) => { let s = 0; for (const k in a) if (b[k]) s += a[k] * b[k]; return s; };
function caricaMagistrali() {
  if (!caricamentoMag) caricamentoMag = json('dati/magistrali.json').then(m => {
    m.curr = m.curricula.map(([i, k, nome, f, l], j) => {
      const qf = leggiQuote(f), ql = leggiQuote(l);
      return { j, i, k, nome: nome || null, qf, ql, uf: unitario(qf), ul: unitario(ql) };
    });
    // di quali ambiti è fatto ogni gruppo di settori (per le aree nuove scelte: un gruppo conta per la sua parte nell'ambito)
    const ga = {};
    Object.values(m.settori).forEach(([g, amb]) => { if (g < 0) return; ga[g] = ga[g] || {}; amb.forEach(([a, q]) => { ga[g][a] = (ga[g][a] || 0) + q; }); });
    m.gruppoAmbiti = Object.fromEntries(Object.entries(ga).map(([g, x]) => [g, quoteDi(x)]));
    S.mag = m;
  });
  return caricamentoMag;
}
const assaggiCaricati = {};
async function assaggiDi(at) { if (!(at in assaggiCaricati)) { try { assaggiCaricati[at] = await json(`dati/assaggi/${at}.json`); } catch { assaggiCaricati[at] = {}; } } return assaggiCaricati[at]; }

/* ---------- la triennale: di cosa è fatta, con gli esami che hai segnato ---------- */
// come codici e crediti_esame in raccolta/magistrali.py: «MAT/05:6;FIS/01:» → [[codice, crediti]], «A - B» diviso in due
function creditiDi(cfu, settori) {
  const cs = [];
  (settori || '').split(';').filter(Boolean).forEach(x => {
    const [s, n] = x.split(':'), parti = s.split(' - ').map(p => p.trim()).filter(Boolean), num = /^\d+(\.\d+)?$/.test(n || '') ? +n : null;
    parti.forEach(p => cs.push([p, num == null ? null : num / parti.length]));
  });
  if (!cs.length) return [];
  if (cs.every(([, n]) => n != null) && cs.reduce((t, [, n]) => t + n, 0) > 0) return cs;
  return cfu ? cs.map(([s]) => [s, cfu / cs.length]) : [];
}
// come peso_blocco: un gruppo a scelta conta per la parte dei suoi crediti che si sceglie, se non dici quali esami hai fatto
function pesoAtteso(b, tab) {
  if (b.x) return 0;
  if (!b.s) return 1;
  const tot = (b.i || []).reduce((t, k) => t + ((tab[k] || [])[1] || 0), 0);
  if (b.c && tot) return Math.min(1, b.c / tot);
  if (b.k && (b.i || []).length) return Math.min(1, b.k / b.i.length);
  return 0;
}
// gli esami di un curriculum da mostrare: solo quelli con un settore (la prova finale o il tirocinio non dicono niente), una
// volta sola, divisi per anno e per blocco
function esamiDaSegnare(anni, tab) {
  const visti = new Set();
  return anni.map(([anno, blocchi]) => ({ anno, blocchi: blocchi.filter(b => !b.x).map(b => ({ b, esami: (b.i || []).filter(k => {
    const e = tab[k]; if (!e || !e[2] || visti.has(k)) return false; visti.add(k); return true;
  }) })).filter(x => x.esami.length) })).filter(a => a.blocchi.length);
}
// voti: {esame: 1 piaciuto, -1 non piaciuto, 0 fatto senza giudizio}; per gli esami obbligatori l'assenza vale 0
function profiloTriennale(anni, tab, voti) {
  const M = S.mag, cf = {}, cl = {}, gNum = {}, gDen = {}, lNum = {}, lDen = {}, perGruppo = {};
  anni.forEach(([, blocchi]) => blocchi.forEach(b => {
    if (b.x) return;
    const segnati = b.s ? (b.i || []).filter(k => voti[k] != null) : [];
    const atteso = pesoAtteso(b, tab);
    (b.i || []).forEach(k => {
      const e = tab[k]; if (!e) return;
      const w = !b.s ? 1 : segnati.length ? (voti[k] != null ? 1 : 0) : atteso;
      if (!w) return;
      const giudicato = !b.s || voti[k] != null, v = voti[k] || 0;
      creditiDi(e[1] || 0, e[2]).forEach(([s, n]) => {
        const x = M.settori[s]; if (!x) return;
        const [g, amb] = x;
        if (g >= 0) {
          cf[g] = (cf[g] || 0) + w * n;
          if (giudicato) { gNum[g] = (gNum[g] || 0) + v * n; gDen[g] = (gDen[g] || 0) + n; (perGruppo[g] = perGruppo[g] || []).push([e[0], v]); }
        }
        amb.forEach(([a, q]) => {
          cl[a] = (cl[a] || 0) + w * n * q / 1000;
          if (giudicato) { lNum[a] = (lNum[a] || 0) + v * n * q / 1000; lDen[a] = (lDen[a] || 0) + n * q / 1000; }
        });
      });
    });
  }));
  const gf = Object.fromEntries(Object.keys(gDen).map(g => [g, gNum[g] / gDen[g]]));
  const gl = Object.fromEntries(Object.keys(lDen).map(a => [a, lNum[a] / lDen[a]]));
  return { cf, cl, uf: unitario(quoteDi(cf)), ul: unitario(quoteDi(cl)), gf, gl, perGruppo };
}
// le aree nuove che uno vuole studiare: il loro ambito vale +1, e i gruppi di settori per la loro parte nell'ambito
function conAree(T, aree) {
  const M = S.mag, gf = { ...T.gf }, gl = { ...T.gl };
  aree.map(a => M.ambiti.indexOf(a)).filter(a => a >= 0).forEach(a => {
    gl[a] = Math.max(gl[a] ?? 0, 1);
    Object.entries(M.gruppoAmbiti).forEach(([g, q]) => { if (q[a]) gf[g] = Math.max(gf[g] ?? 0, q[a]); });
  });
  return { gf, gl };
}

/* ---------- calcolo ---------- */
const affinitaMag = (m, T) => S.mag.parametri.pesoFine * prodotto(m.uf, T.uf) + (1 - S.mag.parametri.pesoFine) * prodotto(m.ul, T.ul);
// il gusto per i crediti di ogni gruppo di settori: il tuo giudizio su quel gruppo se l'hai studiato, altrimenti quello
// sugli ambiti di cui il gruppo fa parte. Non una media dei due livelli: chi ama il marketing e non la finanza ha un
// giudizio neutro sull'ambito «aziende e management», che li contiene tutti e due, e la media lo cancellerebbe
function gustoMag(m, G) {
  const GA = S.mag.gruppoAmbiti;
  let v = 0;
  for (const g in m.qf) {
    let x = G.gf[g];
    if (x == null) { x = 0; const q = GA[g] || {}; for (const a in q) if (G.gl[a]) x += q[a] * G.gl[a]; }
    v += m.qf[g] * x;
  }
  return v;
}
// le magistrali delle professioni sanitarie (LM/SNT1-4) sono per chi ha la laurea abilitante della stessa area
const soloDa = classe => { const m = /^LM\/SNT(\d)$/.exec(classe || ''); return m ? `L/SNT${m[1]}` : null; };
function calcolaMag(q, conAssaggi = true) {
  const M = S.mag, t = S.corsi[q.i], dati = S.piani[t.ateneo], p = dati.corsi[t.piano].p[q.curr];
  const T = profiloTriennale(p[1], dati.esami, q.voti), G = conAree(T, q.aree), { pesi: [pa, pg], soglia } = DIREZIONI[q.dir ?? 0];
  const scelti = conAssaggi ? (q.assaggi || []).map((x, g) => x != null && q.cand && q.cand[g] ? q.cand[g][x] : null).filter(x => x != null).map(j => M.curr[j]) : [];
  const tutti = [];
  M.curr.forEach(m => {
    const c = S.corsi[m.i];
    if (!c || c.fuori || !corsoAdatto(c, q.cond) || !vicino(c, q.cond)) return;
    if (soloDa(c.classe) && soloDa(c.classe) !== t.classe) return;
    tutti.push({ m, c, a: affinitaMag(m, T), g: gustoMag(m, G), b: scelti.length ? Math.max(...scelti.map(s => affinitaMag(m, s))) : 0 });
  });
  const amax = Math.max(...tutti.map(x => x.a), 1e-9), bmax = Math.max(...tutti.map(x => x.b), 1e-9);
  const gmin = Math.min(...tutti.map(x => x.g)), gmax = Math.max(...tutti.map(x => x.g));
  tutti.forEach(x => { x.pa = Math.min(1, x.a / (soglia * amax)); x.pg = gmax > gmin ? (x.g - gmin) / (gmax - gmin) : .5; x.pb = x.b / bmax; });
  const migliori = new Map();
  tutti.forEach(x => {
    x.v = pa * x.pa + pg * x.pg;
    if (scelti.length) x.v = (1 - PESO_ASSAGGIO) * x.v + PESO_ASSAGGIO * x.pb;
    const y = migliori.get(x.m.i);
    if (!y || x.v > y.v) migliori.set(x.m.i, x);
  });
  return { T, G, lista: [...migliori.values()].sort((x, y) => y.v - x.v || y.a - x.a) };
}
// i sei curricula da assaggiare: i primi della classifica (senza assaggi), diversi fra loro e con abbastanza esami
// obbligatori da mostrare. Si scelgono una volta, quando si arriva agli assaggi, e restano quelli
async function scegliCandidati(q) {
  const { lista } = calcolaMag(q, false), presi = [];
  for (const x of lista) {
    if (presi.length >= 14) break;
    if (presi.some(y => affinitaMag(x.m, y.m) > .9)) continue;
    presi.push(x);
  }
  await Promise.all([...new Set(presi.map(x => x.c.ateneo))].map(assaggiDi));
  const buoni = presi.filter(x => { const a = (assaggiCaricati[x.c.ateneo][x.m.i] || {})[x.m.k]; return a && a[0].length >= 4; }).slice(0, 6).map(x => x.m.j);
  return buoni.length >= 4 ? [buoni.slice(0, 3), buoni.slice(3, 6)].filter(g => g.length >= 2) : [];
}

/* ---------- stato ---------- */
let QM = leggi('quizMag', null);
if (QM && QM.versione !== VERSIONE_MAG) QM = null;
function nuovoQuizMag(i = null) {
  QM = { versione: VERSIONE_MAG, passo: 0, i, curr: 0, voti: {}, dir: null, aree: [], cond: { ...COND_MAG }, cand: null, assaggi: [null, null], ordine: [mescola(3), mescola(3)], fatto: false, mostrati: 10 };
  salva('quizMag', QM);
}
const triennaleValida = i => { const c = S.corsi[i]; return c && c.tipo === 'triennale' && c.piano && !c.fuori; };
// prima di disegnare servono i profili delle magistrali e il piano della triennale scelta
function prontoMag() {
  if (!S.mag) return false;
  if (QM && QM.i != null && triennaleValida(QM.i) && !S.piani[S.corsi[QM.i].ateneo]) return false;
  return true;
}
function preparaMag(nuovaSchermata = false) {
  const attese = [caricaMagistrali()];
  if (QM && QM.i != null && triennaleValida(QM.i)) attese.push(pianiDi(S.corsi[QM.i].ateneo));
  return Promise.all(attese).then(() => mostraMag(nuovaSchermata));
}

/* ---------- schermate ---------- */
function vistaMagistrale(arg) {
  // #magistrale.<corso>: si parte da quella triennale (dal link nella pagina del corso). Si legge una volta sola e
  // l'indirizzo torna #magistrale: un ridisegno più avanti (per esempio dopo aver scelto il comune) non deve ricominciare
  if (arg != null && arg !== '') {
    if (triennaleValida(+arg) && (!QM || QM.i !== +arg)) { nuovoQuizMag(+arg); QM.passo = -1; salva('quizMag', QM); }
    history.replaceState(null, '', '#magistrale');
  }
  if (!prontoMag()) { preparaMag(); return '<div class="colonna caricamento">Preparo il quiz…</div>'; }
  if (!QM || QM.passo < 0) return introMag();
  if (QM.fatto) return risultatoMag();
  if (QM.passo === 0) return schermataTriennale();
  if (QM.passo === 1) return schermataEsami();
  if (QM.passo === 2) return schermataDirezione();
  if (QM.passo === 3) return schermataCondMag();
  return schermataAssaggioMag(QM.passo - 4);
}
function barraMag(p) {
  const k = PASSI_MAG.findIndex(([, a, b]) => p >= a && p < b);
  return `<div class="quiz-testa">
    <div class="quiz-parti" aria-hidden="true">${PASSI_MAG.map(([, a, b]) => `<span style="flex:${b - a}"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, (p - a + 1) / (b - a))))}%"></i></span>`).join('')}</div>
    <p class="quiz-dove"><b>Parte ${k + 1} di ${PASSI_MAG.length}</b> · ${PASSI_MAG[k][0]}</p>
  </div>`;
}
function navMag(avanti, testo = 'Avanti', nota = '') {
  return `<div class="quiz-nav"><button type="button" class="btn" data-m="indietro">← Indietro</button>${nota ? `<span class="tenue piccolo nota-nav">${nota}</span>` : ''}${avanti ? `<button type="button" class="btn primario" data-m="avanti">${testo} →</button>` : ''}</div>`;
}
function introMag() {
  const t = QM && QM.i != null && triennaleValida(QM.i) ? S.corsi[QM.i] : null;
  return `<div class="colonna quiz-intro">
    <span class="tessera grande">${ICONE.gradini}</span>
    <h1 tabindex="-1">Quale magistrale fa per te?</h1>
    <p class="sotto">Per chi ha già fatto una triennale, o la sta finendo. Il quiz parte dagli esami veri del tuo corso: quelli che ti sono piaciuti, quelli no, e cosa cerchi adesso.</p>
    <ol class="quiz-tappe">
      <li><b>La tua triennale.</b> Scegli il tuo corso: prendiamo il suo piano degli esami.</li>
      <li><b>Gli esami.</b> Segna quelli che ti sono piaciuti e quelli che non ti sono piaciuti. Fra quelli a scelta, quali hai fatto.</li>
      <li><b>Cosa cerchi.</b> Approfondire, allargare o cambiare strada; poi dove studieresti, in che lingua, se ti va bene una selezione.</li>
      <li><b>Alla cieca.</b> Gli esami obbligatori di sei magistrali, senza nome: scegli solo guardando cosa si studia.</li>
    </ol>
    ${t ? `<p class="nota-pari">Parti da <b>${esc(titoloCorso(t.nome))}</b>, ${esc(t.ateneoNome)}.</p>` : ''}
    <div class="quiz-azioni"><button type="button" class="btn primario grande" data-m="inizia">Inizia</button></div>
    <p class="tenue piccolo">Non ti chiediamo i voti né dati personali. Le risposte restano su questo dispositivo. Il risultato dice quanto ogni magistrale somiglia a quello che hai studiato e che ti è piaciuto, non se puoi iscriverti: i requisiti d’accesso li decide ogni ateneo.</p>
    <p class="tenue piccolo">Stai scegliendo la triennale? <a href="#quiz">C’è il quiz per la triennale</a>.</p>
  </div>`;
}
function cercaTriennali(q) {
  const parole = norma(q).split(' ').filter(w => w.length > 1 && !VUOTE.has(w));
  if (!parole.length) return [];
  return S.corsi.filter(c => c.tipo === 'triennale' && !c.fuori && parole.every(w => c.cerca.includes(' ' + w) || c.cerca.includes(w)))
    .sort((a, b) => (!!b.piano - !!a.piano) || a.nome.localeCompare(b.nome, 'it') || a.ateneoNome.localeCompare(b.ateneoNome, 'it')).slice(0, 12);
}
function risultatiTriennali(q) {
  const r = cercaTriennali(q);
  if (!norma(q)) return '';
  if (!r.length) return '<p class="tenue">Nessuna triennale con queste parole. Prova con il nome del corso e la città, per esempio «economia torino».</p>';
  return `<div class="elenco scelta-triennale">${r.map(c => `<button type="button" class="riga" data-m="triennale" data-i="${c.i}">
    <div style="min-width:0"><div class="titolo-riga">${esc(titoloCorso(c.nome))}</div><div class="sotto-riga">${esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}</div></div>
    <div class="lato-riga">${c.piano ? '' : '<span class="senza-piano">Piano non disponibile</span>'}</div></button>`).join('')}</div>`;
}
// un corso senza piano: si sceglie uno della stessa classe che il piano ce l'ha, il più vicino a quello vero
function simili(c) {
  return S.corsi.filter(x => x.classe === c.classe && x.tipo === 'triennale' && x.piano && !x.fuori && x.i !== c.i)
    .sort((a, b) => (km(c.comune, a.comune) ?? 1e9) - (km(c.comune, b.comune) ?? 1e9)).slice(0, 8);
}
function schermataTriennale() {
  const t = QM.i != null ? S.corsi[QM.i] : null;
  let corpo = '';
  if (t && !triennaleValida(QM.i)) {
    const sim = simili(t);
    corpo = `<p class="nota avviso">Di ${esc(titoloCorso(t.nome))} (${esc(t.ateneoNome)}) non abbiamo il piano degli esami. ${sim.length ? 'Scegli il corso della stessa classe che gli somiglia di più: gli esami saranno simili, anche se non uguali.' : 'E non c’è un altro corso della stessa classe con il piano: cerca un corso simile.'}</p>
      ${sim.length ? `<div class="elenco scelta-triennale">${sim.map(c => `<button type="button" class="riga" data-m="triennale" data-i="${c.i}"><div style="min-width:0"><div class="titolo-riga">${esc(titoloCorso(c.nome))}</div><div class="sotto-riga">${esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}</div></div></button>`).join('')}</div>` : ''}`;
  } else if (t) {
    const p = S.piani[t.ateneo].corsi[t.piano].p;
    corpo = `<div class="triennale-scelta"><div><div class="titolo-riga">${esc(titoloCorso(t.nome))}</div><div class="sotto-riga">${esc(t.ateneoNome)}${cittaDi(t) ? ` · ${esc(cittaDi(t))}` : ''}</div></div>
      <button type="button" class="btn" data-m="cambia-triennale">Cambia</button></div>
      ${p.length > 1 ? `<fieldset class="cond" style="margin-top:22px"><legend>Quale curriculum hai fatto?</legend><div class="scelte">${p.map(([nome], k) =>
        `<button type="button" class="scelta-btn" data-m="curr" data-i="${k}" aria-pressed="${QM.curr === k}">${esc(titoloCorso(nome))}</button>`).join('')}</div></fieldset>` : ''}`;
  }
  return `<div class="colonna quiz">${barraMag(0)}
    <h1 class="quiz-domanda" tabindex="-1">Qual è la tua triennale?</h1>
    <p class="quiz-istruzione">Prendiamo il piano degli esami del corso per l’anno ${ANNO_ACCADEMICO}. Se nel frattempo è cambiato un po’, nella prossima schermata segnerai solo gli esami che ricordi.</p>
    ${t && triennaleValida(QM.i) ? corpo : `<form class="cerca-triennale" role="search" onsubmit="return false"><label class="campo">${ICONA_CERCA}<input id="mag-cerca" type="search" placeholder="Nome del corso, ateneo o città" autocomplete="off" aria-label="Cerca la tua triennale"></label></form>
      <div id="mag-risultati" aria-live="polite"></div>${corpo}`}
    ${navMag(t && triennaleValida(QM.i))}
  </div>`;
}
// sul telefono i pulsanti mostrano solo la freccia: il nome per chi usa un lettore di schermo sta in aria-label
function bottoniVoto(k, scelta, nome) {
  const v = QM.voti[k];
  const b = (val, testo, cls, etichetta) => `<button type="button" class="voto-btn${cls ? ' ' + cls : ''}" data-m="voto" data-k="${k}" data-v="${val}" aria-pressed="${v === val}"${etichetta ? ` aria-label="${etichetta}"` : ''}>${testo}</button>`;
  return `<div class="voto" role="group" aria-label="${esc(nome)}">${scelta ? b(0, 'L’ho fatto') : ''}${b(1, `${SEGNO_PIU}<span>Mi è piaciuto</span>`, 'piu', 'Mi è piaciuto')}${b(-1, `${SEGNO_MENO}<span>Non mi è piaciuto</span>`, 'meno', 'Non mi è piaciuto')}</div>`;
}
function schermataEsami() {
  const t = S.corsi[QM.i], dati = S.piani[t.ateneo], p = dati.corsi[t.piano].p[QM.curr], tab = dati.esami;
  const anni = esamiDaSegnare(p[1], tab);
  const segnati = Object.values(QM.voti).filter(v => v !== 0).length;
  return `<div class="colonna quiz">${barraMag(1)}
    <h1 class="quiz-domanda" tabindex="-1">Quali esami ti sono piaciuti?</h1>
    <p class="quiz-istruzione">Segna quelli che ti sono piaciuti e quelli che non ti sono piaciuti; gli altri lasciali così. Conta la materia, non il voto né il professore. Fra gli esami a scelta, segna quelli che hai fatto.</p>
    ${anni.map(a => `<section class="anno-voti"><h2>${a.anno ? `${a.anno}° anno` : 'In qualsiasi anno'}</h2>${a.blocchi.map(({ b, esami }) => `
      ${b.s ? `<p class="gruppo-voti">A scelta · ${esc(regolaGruppo(b))}${b.e ? ` · ${esc(b.e)}` : ''}</p>` : ''}
      <ul class="voti${b.s ? ' a-scelta' : ''}">${esami.map(k => { const e = tab[k]; return `<li data-voto="${QM.voti[k] ?? ''}"><span class="nome-voto">${esc(titoloCorso(e[0]))}<span class="cfu num">${e[1] ? `${fmt(e[1])} CFU` : ''}</span></span>${bottoniVoto(k, b.s, titoloCorso(e[0]))}</li>`; }).join('')}</ul>`).join('')}</section>`).join('')}
    ${navMag(segnati >= MIN_SEGNATI, 'Avanti', segnati >= MIN_SEGNATI ? `${segnati} esami segnati` : `Segna almeno ${MIN_SEGNATI} esami (finora ${segnati})`)}
  </div>`;
}
function schermataDirezione() {
  const serveArea = QM.dir === 2 && !QM.aree.length;
  return `<div class="colonna quiz">${barraMag(2)}
    <h1 class="quiz-domanda" tabindex="-1">Cosa cerchi nella magistrale?</h1>
    <div class="opzioni direzioni">${DIREZIONI.map((x, i) => `<button type="button" class="opzione" data-m="dir" data-i="${i}"${QM.dir === i ? ' data-stato="scelta"' : ''}><span><b>${x.d}</b><br>${esc(x.t)}</span></button>`).join('')}</div>
    <fieldset class="cond aree-nuove"><legend>C’è qualcosa che nella triennale non hai studiato, o poco, e che ti attira? ${QM.dir === 2 ? '' : '<span class="tenue">(se vuoi)</span>'}</legend>
      <p class="tenue piccolo">Fino a ${MAX_AREE}. Il quiz sa cosa ti è piaciuto fra le materie che hai fatto, non fra quelle che non hai mai provato: questo glielo dici tu.</p>
      ${FAMIGLIE.map(f => `<div class="famiglia-aree"><span class="tenue piccolo">${esc(f.nome)}</span><div class="scelte">${f.ambiti.map(a =>
        `<button type="button" class="scelta-btn" data-m="area" data-a="${a}" aria-pressed="${QM.aree.includes(a)}"${!QM.aree.includes(a) && QM.aree.length >= MAX_AREE ? ' disabled' : ''}>${esc(AMBITI_NOMI[a])}</button>`).join('')}</div></div>`).join('')}
    </fieldset>
    ${navMag(QM.dir != null && !serveArea, 'Avanti', serveArea ? 'Per cambiare strada, dicci verso dove: scegli almeno un’area' : '')}
  </div>`;
}
function condMag(k, titolo, scelte, nota) {
  return `<fieldset class="cond"><legend>${titolo}</legend>${nota ? `<p class="tenue piccolo">${nota}</p>` : ''}<div class="scelte">${scelte.map(([v, t]) =>
    `<button type="button" class="scelta-btn" data-m="cond" data-k="${k}" data-v="${v}" aria-pressed="${QM.cond[k] === v}">${t}</button>`).join('')}</div></fieldset>`;
}
function schermataCondMag() {
  return `<div class="colonna quiz">${barraMag(3)}
    <h1 class="quiz-domanda" tabindex="-1">Qualche condizione pratica</h1>
    <p class="quiz-istruzione">Servono a scegliere quali magistrali mostrarti, non cambiano cosa ti piace.</p>
    <div class="condizioni">
      ${condMag('dove', 'Dove studieresti?', [[0, `Vicino a casa (entro ${KM_VICINO} km)`], [1, 'Nella mia regione'], [2, 'Ovunque in Italia']])}
      ${QM.cond.dove < 2 ? `<div class="cond-casa">${campoCasa()}</div>` : ''}
      ${condMag('test', 'Magistrali a numero programmato', [[1, 'Va bene, ci provo'], [0, 'Preferisco evitarle']], 'Hanno una selezione per entrare, con un numero di posti (molte di Psicologia e delle professioni sanitarie).')}
      ${condMag('inglese', 'Magistrali in inglese', [[1, 'Anche in inglese'], [0, 'Solo in italiano']], 'Sono circa una su quattro.')}
      ${condMag('online', 'Università telematiche (lezioni online)', [[0, 'No'], [1, 'Sì, anche online']])}
    </div>
    ${navMag(true, 'Continua')}
  </div>`;
}
function schermataAssaggioMag(g) {
  if (!QM.cand) return '<div class="colonna caricamento">Scelgo le magistrali da assaggiare…</div>';
  const giro = QM.cand[g] || [], lettere = 'ABC';
  return `<div class="colonna quiz">${barraMag(4 + g)}
    <h1 class="quiz-domanda" tabindex="-1">${g === 0 ? 'Alla cieca: quale magistrale ti attira di più?' : 'Ancora una volta, poi il risultato.'}</h1>
    <p class="quiz-istruzione">${g === 0 ? 'Sono gli esami obbligatori di magistrali vicine a quello che hai risposto, presi dai piani degli atenei. Non ti diciamo quali sono: scegli solo guardando cosa si studia. Lo scoprirai alla fine.' : 'Altre magistrali, stessa regola: scegli guardando solo gli esami.'}</p>
    <div class="assaggi">${QM.ordine[g].filter(n => giro[n] != null).map((n, pos) => {
      const m = S.mag.curr[giro[n]], c = S.corsi[m.i], a = (assaggiCaricati[c.ateneo][m.i] || {})[m.k] || [[], 0, 0], [esami, altri, gruppi] = a;
      const scelto = QM.assaggi[g] === n;
      return `<div class="assaggio${scelto ? ' scelto' : ''}">
        <p class="assaggio-testa"><span class="lettera">${lettere[pos]}</span>Esami obbligatori</p>
        <ul>${esami.map(([nome, cfu]) => `<li><span>${esc(titoloCorso(nome))}</span><span class="cfu num">${cfu ? fmt(cfu) : ''}</span></li>`).join('')}</ul>
        ${altri || gruppi ? `<p class="tenue piccolo">${[altri ? `e altri ${altri} esami` : '', gruppi ? `${gruppi === 1 ? 'un gruppo' : `${gruppi} gruppi`} di esami a scelta` : ''].filter(Boolean).join(', ')}</p>` : ''}
        <button type="button" class="btn${scelto ? ' primario' : ''}" data-m="assaggio" data-i="${n}">${scelto ? 'Scelto' : `Scelgo la ${lettere[pos]}`}</button>
      </div>`;
    }).join('')}</div>
    <div class="quiz-nav"><button type="button" class="btn" data-m="indietro">← Indietro</button><button type="button" class="btn" data-m="assaggio" data-i="9">Nessuna mi convince</button></div>
  </div>`;
}

/* ---------- risultato ---------- */
// perché una magistrale è in classifica: le materie che ti sono piaciute (con i nomi dei tuoi esami), quelle no, le nuove
function perche(x, R) {
  const M = S.mag, T = R.T, quota = .04;
  const gruppi = Object.entries(x.m.qf).filter(([, q]) => q >= quota).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const nomi = segno => [...new Set(gruppi.filter(g => (T.gf[g] || 0) * segno > 0).flatMap(g => (T.perGruppo[g] || []).filter(([, v]) => v === segno).map(([n]) => titoloCorso(n))))];
  const piaciuti = nomi(1).slice(0, 3), no = nomi(-1).slice(0, 2);
  const nuovi = Object.entries(x.m.ql).filter(([a, q]) => q >= .1 && (T.cl[a] || 0) < CFU_NUOVO).sort((a, b) => b[1] - a[1])
    .map(([a]) => M.ambiti[a]).map(a => AMBITI_BREVI[a] + (QM.aree.includes(a) ? ' (ti attira)' : ''));
  return (x.m.nome ? `<div class="sotto-riga">Curriculum più adatto: ${esc(titoloCorso(x.m.nome))}</div>` : '')
    + (piaciuti.length ? `<div class="sotto-riga perche piu">Riprende esami che ti sono piaciuti: ${esc(elenco(piaciuti))}</div>` : '')
    + (no.length ? `<div class="sotto-riga perche meno">E materie di esami che non ti sono piaciuti: ${esc(elenco(no))}</div>` : '')
    + (nuovi.length ? `<div class="sotto-riga">Materie nuove: ${esc(elenco(nuovi))}</div>` : '');
}
function risultatoMag() {
  const t = S.corsi[QM.i];
  if (!t || !triennaleValida(QM.i)) { QM.fatto = false; QM.passo = 0; return schermataTriennale(); }
  const R = calcolaMag(QM), lista = R.lista;
  const tab = S.piani[t.ateneo].esami, voti = Object.entries(QM.voti);
  const piaciuti = voti.filter(([, v]) => v === 1).map(([k]) => titoloCorso(tab[k][0])), no = voti.filter(([, v]) => v === -1).map(([k]) => titoloCorso(tab[k][0]));
  const svelati = (QM.cand || []).map((g, n) => QM.assaggi[n] != null && g[QM.assaggi[n]] != null ? S.mag.curr[g[QM.assaggi[n]]] : null).filter(Boolean);
  const senzaCasa = QM.cond.dove < 2 && !S.casa;
  const cond = [senzaCasa ? '' : QM.cond.dove === 0 ? `entro ${KM_VICINO} km da casa` : QM.cond.dove === 1 ? 'nella tua regione' : '', QM.cond.test ? '' : 'senza numero programmato',
    QM.cond.inglese ? '' : 'in italiano', QM.cond.online ? 'anche online' : 'non telematiche'].filter(Boolean);
  return `<div class="colonna risultato-mag">
    <p class="eyebrow-profilo">Il tuo risultato</p>
    <h1 tabindex="-1">Le magistrali per te</h1>
    <p class="sotto-titolo">Partendo da <a href="#corso.${t.i}">${esc(titoloCorso(t.nome))}</a> (${esc(t.ateneoNome)}), con la scelta di <b>${esc(DIREZIONI[QM.dir ?? 0].d.toLowerCase())}</b>${QM.aree.length ? ` verso ${esc(elenco(QM.aree.map(a => AMBITI_BREVI[a])))}` : ''}.</p>
    <div class="riassunto-mag">
      ${piaciuti.length ? `<p><span class="segno-piu">${SEGNO_PIU}</span>Ti sono piaciuti: ${esc(elenco(piaciuti.slice(0, 6)))}${piaciuti.length > 6 ? ` e altri ${piaciuti.length - 6}` : ''}.</p>` : ''}
      ${no.length ? `<p><span class="segno-meno">${SEGNO_MENO}</span>Non ti sono piaciuti: ${esc(elenco(no.slice(0, 6)))}${no.length > 6 ? ` e altri ${no.length - 6}` : ''}.</p>` : ''}
      ${svelati.length ? `<p>Alla cieca hai scelto: ${svelati.map(m => `<a href="#corso.${m.i}">${esc(titoloCorso(S.corsi[m.i].nome))}</a> (${esc(S.corsi[m.i].ateneoNome)})`).join(' e ')}.</p>` : ''}
      ${senzaCasa ? '<p class="nota avviso">Non hai detto da dove parti: le magistrali sono di tutta Italia. Puoi sceglierlo tornando alle condizioni.</p>' : ''}
      <p class="tenue piccolo">Mostriamo solo magistrali ${esc(elenco(cond))}. In cima ci sono quelle che uniscono meglio quello che hai studiato e quello che ti è piaciuto${QM.dir === 2 ? ': hai scelto di cambiare strada, quindi conta soprattutto cosa ti attira' : QM.dir === 0 ? ': hai scelto di approfondire, quindi conta soprattutto quanto somigliano alla tua triennale' : ''}. Non dicono se puoi iscriverti: i requisiti d’accesso li decide ogni ateneo, e li trovi nella pagina della magistrale.</p>
    </div>
    ${lista.length ? `<div class="elenco">${lista.slice(0, QM.mostrati).map(x => rigaCorso(x.c, perche(x, R))).join('')}</div>
      ${lista.length > QM.mostrati ? `<div class="altri"><button type="button" class="btn" data-m="altre">Mostra altre ${Math.min(10, lista.length - QM.mostrati)}</button></div>` : ''}`
      : '<div class="vuoto"><b>Nessuna magistrale con queste condizioni.</b><span>Prova ad allargare la zona o ad accettare le magistrali a numero programmato o in inglese.</span><button type="button" class="btn" data-m="vai" data-i="3">Cambia le condizioni</button></div>'}
    <div class="quiz-azioni" style="margin-top:28px">
      <button type="button" class="btn" data-m="vai" data-i="1">Cambia le risposte</button>
      ${lista.length >= 2 ? '<button type="button" class="btn" data-m="confronta">Confronta le prime tre</button>' : ''}
      <a class="btn" href="#dopo.${t.i}">Le magistrali più affini alla tua triennale</a>
      <button type="button" class="btn" data-m="inizia">Rifai da capo</button>
    </div>
  </div>`;
}

/* ---------- eventi ---------- */
function mostraMag(nuovaSchermata = true, fuoco = null) {
  if (rotta().nome !== 'magistrale') return;
  $('#app').innerHTML = vistaMagistrale();
  if (nuovaSchermata) { window.scrollTo(0, 0); const h = $('#app h1'); if (h) h.focus({ preventScroll: true }); }
  else if (fuoco) { const el = $(fuoco); if (el) el.focus({ preventScroll: true }); }
}
async function passaMag(n) {
  if (n === 4 && !QM.cand) {
    QM.passo = 4; mostraMag();
    QM.cand = await scegliCandidati(QM);
    QM.assaggi = [null, null];
  }
  while (n >= 4 && n < 6 && !(QM.cand && QM.cand[n - 4])) n++;
  if (n >= 6) { QM.fatto = true; QM.mostrati = 10; }
  else QM.passo = n;
  salva('quizMag', QM); mostraMag();
}
// le risposte che cambiano la classifica rendono vecchi gli assaggi scelti prima
const rifaiAssaggi = () => { QM.cand = null; QM.assaggi = [null, null]; };
let attesaMag = null;
document.addEventListener('input', ev => {
  if (ev.target.id !== 'mag-cerca') return;
  clearTimeout(attesaMag);
  attesaMag = setTimeout(() => { const box = $('#mag-risultati'); if (box) box.innerHTML = risultatiTriennali(ev.target.value); }, 200);
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-m]'); if (!b) return;
  const a = b.dataset.m, i = +b.dataset.i;
  if (!QM) nuovoQuizMag();
  // «Inizia» dall'introduzione: se si arriva dalla pagina di un corso, la triennale è già scelta
  if (a === 'inizia') { nuovoQuizMag(QM.passo < 0 && !QM.fatto ? QM.i : null); preparaMag(true); }
  else if (a === 'indietro') {
    let n = QM.fatto ? 5 : QM.passo - 1;
    while (n >= 4 && !(QM.cand && QM.cand[n - 4])) n--;
    QM.fatto = false; QM.passo = n; salva('quizMag', QM); mostraMag();
  }
  else if (a === 'avanti') passaMag(QM.passo + 1);
  else if (a === 'vai') { QM.fatto = false; QM.passo = i; salva('quizMag', QM); mostraMag(); }
  else if (a === 'triennale') { QM.i = i; QM.curr = 0; QM.voti = {}; rifaiAssaggi(); salva('quizMag', QM); triennaleValida(i) ? pianiDi(S.corsi[i].ateneo).then(() => mostraMag(false)) : mostraMag(false); }
  else if (a === 'cambia-triennale') { QM.i = null; QM.voti = {}; rifaiAssaggi(); salva('quizMag', QM); mostraMag(false); const c = $('#mag-cerca'); if (c) c.focus(); }
  else if (a === 'curr') { if (QM.curr !== i) { QM.curr = i; QM.voti = {}; rifaiAssaggi(); } salva('quizMag', QM); mostraMag(false, `[data-m="curr"][data-i="${i}"]`); }
  else if (a === 'voto') {
    const k = b.dataset.k, v = +b.dataset.v;
    if (QM.voti[k] === v) delete QM.voti[k]; else QM.voti[k] = v;
    rifaiAssaggi(); salva('quizMag', QM);
    // si aggiorna solo la riga e la barra in fondo: ridisegnare la lista lunga farebbe saltare chi scorre col telefono
    const li = b.closest('li'); li.dataset.voto = QM.voti[k] ?? '';
    li.querySelectorAll('[data-m="voto"]').forEach(x => x.setAttribute('aria-pressed', String(QM.voti[k] === +x.dataset.v)));
    const segnati = Object.values(QM.voti).filter(x => x !== 0).length, nav = $('#app .quiz-nav');
    if (nav) nav.outerHTML = navMag(segnati >= MIN_SEGNATI, 'Avanti', segnati >= MIN_SEGNATI ? `${segnati} esami segnati` : `Segna almeno ${MIN_SEGNATI} esami (finora ${segnati})`);
  }
  else if (a === 'dir') { QM.dir = i; rifaiAssaggi(); salva('quizMag', QM); mostraMag(false, `[data-m="dir"][data-i="${i}"]`); }
  else if (a === 'area') {
    const x = b.dataset.a;
    QM.aree = QM.aree.includes(x) ? QM.aree.filter(y => y !== x) : [...QM.aree, x].slice(0, MAX_AREE);
    rifaiAssaggi(); salva('quizMag', QM); mostraMag(false, `[data-m="area"][data-a="${x}"]`);
  }
  else if (a === 'cond') { QM.cond[b.dataset.k] = +b.dataset.v; rifaiAssaggi(); salva('quizMag', QM); mostraMag(false, `[data-m="cond"][data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`); }
  else if (a === 'assaggio') { QM.assaggi[QM.passo - 4] = i === 9 ? null : i; passaMag(QM.passo + 1); }
  else if (a === 'altre') { QM.mostrati += 10; salva('quizMag', QM); mostraMag(false); }
  else if (a === 'confronta') { S.confronto = calcolaMag(QM).lista.slice(0, 3).map(x => x.c.i); salva('confronto', S.confronto); vai('#confronta'); }
});
