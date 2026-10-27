'use strict';
/* ---------------- stato e utilità ---------------- */
const S = { corsi: [], atenei: {}, diz: {}, macro: [], motivi: {}, comuni: {}, regioni: {}, piani: {}, testi: {}, esami: null,
  filtri: { q: '', tipo: '', gruppo: '', regione: '', accesso: '', inglese: false, distanza: false, piano: false, comune: '', classe: '' },
  ordine: 'pertinenza', mostrati: 60, casa: null, confronto: [], mappa: false };
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norma = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// il punto delle migliaia a mano: in italiano toLocaleString non lo mette sotto i 10.000
const fmt = n => { const [i, d] = String(Math.round(Number(n) * 10) / 10).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : ''); };
const leggi = (k, d) => { try { const v = localStorage.getItem('bivio.' + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const salva = (k, v) => { try { localStorage.setItem('bivio.' + k, JSON.stringify(v)); } catch {} };
const ICONA_CERCA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const icona = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICONE = {
  libro: icona('M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'),
  gradini: icona('M3 20h5v-5h5v-5h5V5h3M17 3h4v4'),
  materia: icona('M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM21 21l-5.2-5.2M7.5 9h6M7.5 12.5h4'),
  luogo: icona('M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'),
};
const ANNO_ACCADEMICO = '2026/27';
const NOME = 'Piano di Studi';
const TIPI_BREVI = { 'triennale': 'Triennale', 'magistrale': 'Magistrale', 'ciclo unico': 'Ciclo unico' };
const DURATA = { 'triennale': 3, 'magistrale': 2, 'ciclo unico': 5 };
const TAF = { A: 'base', B: 'caratterizzante', C: 'affine', D: 'a scelta', E: 'prova finale e lingua', F: 'altre attività', S: 'tirocinio' };

function titoloCorso(n) {
  // molti nomi arrivano tutti maiuscoli (o tutti minuscoli, nell'indice delle materie): iniziale maiuscola, resto minuscolo
  if (!n) return '';
  n = n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLowerCase() : n.charAt(0).toUpperCase() + n.slice(1);
  // i numeri romani in fondo al nome («Fisica I», «Analisi matematica II (modulo A)») tornano maiuscoli
  return n.replace(/\s(i{1,3}|iv|vi{0,3}|ix|x)(?=$|\s*[-–(:,]|\s+(anno|modulo|parte|semestre|livello)\b)/g, m => m.toUpperCase());
}
const maiuscola = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
function cittaDi(c) { const x = S.comuni[c.comune]; return x ? x[0] : ''; }
function regioneDi(c) { const x = S.comuni[c.comune]; return x ? S.regioni[x[4]] : ''; }
function km(a, b) {
  const A = S.comuni[a], B = S.comuni[b]; if (!A || !B) return null;
  const r = Math.PI / 180, dLa = (B[2] - A[2]) * r, dLo = (B[3] - A[3]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(A[2] * r) * Math.cos(B[2] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function distanzaDi(c) { return S.casa ? km(S.casa, c.comune) : null; }
function testoDistanza(d) { return d == null ? '' : d < 1 ? 'nel tuo comune' : `${fmt(Math.round(d))} km`; }
function colore(m) { return `var(--a-${m || 'alt'})`; }
function macroDi(settore) {
  const regole = [['eco', /^(ECON|SECS-P|STEC)/], ['mat', /^(STAT|SECS-S|MATH|MAT\/)/], ['giu', /^(GIUR|IUS)/],
    ['inf', /^(IINF|INFO|INF\/|ING-INF|IIND|ING-IND|IMAT|IEGE|IBIO)/], ['arc', /^(CEAR|ICAR)/], ['fis', /^(PHYS|FIS\/|CHEM|CHIM|GEOS|GEO\/)/],
    ['bio', /^(BIOS|BIO\/|MEDS|MED\/|MEDF|M-EDF)/], ['agr', /^(AGRI|AGR\/|MVET|VET\/)/],
    ['let', /^(ITAL|LATI|HELL|LICO|LIFI|ANGL|SPAN|FRAN|GERM|FLMR|FICP|SLAV|STAA|L-FIL|L-LIN|L-OR|L-ANT|LIRO|ARAB)/],
    ['sto', /^(HIST|M-STO|ARCH|STAN|PHIL|M-FIL|L-ART|ARTE|PEMM|ICHI|SAAR)/], ['psi', /^(PSIC|M-PSI|PAED|M-PED|EDUC)/], ['soc', /^(GSPS|SPS|GEOG|M-GGR|SDEA|M-DEA)/]];
  for (const [k, rx] of regole) if (rx.test(settore || '')) return k;
  return 'alt';
}
const nomeMacro = k => (S.macro.find(m => m[0] === k) || [k, 'Altro'])[1];
function barraComposizione(comp, largo) {
  if (!comp) return '';
  const parti = comp.split('.').map(p => [p.slice(0, 3), +p.slice(3)]);
  const titolo = parti.map(([k, v]) => `${nomeMacro(k)} ${v}%`).join(', ');
  return `<span class="composizione" title="${esc(titolo)}" role="img" aria-label="${esc('Composizione: ' + titolo)}"${largo ? ' style="width:100%"' : ''}>${parti.map(([k, v]) => `<i style="flex:${v};background:${colore(k)}"></i>`).join('')}</span>`;
}
// l'area con più crediti obbligatori, scritta sotto la barra: chi scorre l'elenco capisce di cosa è fatto il corso
function areaPrincipale(comp) {
  const [k, v] = comp.split('.').map(p => [p.slice(0, 3), +p.slice(3)]).sort((a, b) => b[1] - a[1])[0];
  return k === 'alt' ? '' : `<span class="area-top"><i style="background:${colore(k)}" aria-hidden="true"></i>${esc(nomeMacro(k))} ${v}%</span>`;
}

/* ---------------- dati ---------------- */
async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }
async function carica() {
  const [ind, com] = await Promise.all([json('dati/indice.json'), json('dati/comuni.json')]);
  S.diz = ind.diz; S.atenei = ind.atenei; S.macro = ind.macro; S.motivi = ind.motivi; S.comuni = com.comuni; S.regioni = com.regioni; S.aggiornato = ind.aggiornato;
  const d = $('#aggiornato'); if (d && S.aggiornato) d.textContent = dataLunga(S.aggiornato);
  const D = ind.diz;
  S.corsi = ind.corsi.map((v, i) => {
    const c = { i, nome: v[0], ateneo: D.ateneo[v[1]], classe: v[2], tipo: D.tipo[v[3]], area: D.area[v[4]], gruppo: D.gruppo[v[5]], comune: v[6],
      accesso: D.accesso[v[7]], didattica: D.didattica[v[8]], lingua: D.lingua[v[9]], sito: v[10], piano: v[11], fuori: !!v[12], nomeClasse: v[13], posti: v[14], comp: v[15], sitoAteneo: !!v[16] };
    c.ateneoNome = S.atenei[c.ateneo] || c.ateneo || '';
    const x = S.comuni[c.comune];
    // anche la lingua e la didattica a distanza: «medicina in inglese», «ingegneria gestionale online»
    c.cerca = ' ' + norma([c.nome, c.ateneoNome, (ind.alias || {})[c.ateneo], cittaDi(c), x ? x[1] : '', regioneDi(c), c.classe, c.nomeClasse,
      /Inglese/.test(c.lingua || '') ? 'inglese english' : '', /distanza/i.test(c.didattica || '') ? 'online telematica distanza' : ''].join(' '));
    return c;
  });
  S.parole = new Set(S.corsi.flatMap(c => c.cerca.split(' ')).filter(w => w.length >= 4));
  S.casa = leggi('casa', null); S.confronto = leggi('confronto', []).filter(i => S.corsi[i]);
}
async function pianiDi(ateneo) { if (!S.piani[ateneo]) S.piani[ateneo] = await json(`dati/piani/${ateneo}.json`); return S.piani[ateneo]; }
async function testiDi(ateneo) { if (!(ateneo in S.testi)) { try { S.testi[ateneo] = await json(`dati/testi/${ateneo}.json`); } catch { S.testi[ateneo] = {}; } } return S.testi[ateneo]; }

/* ---------------- ricerca e filtri ---------------- */
// parole che non distinguono un corso, tipi di laurea scritti nella ricerca, sinonimi e nomi inglesi dei corsi
const VUOTE = new Set(['di', 'e', 'ed', 'in', 'a', 'da', 'del', 'della', 'delle', 'dei', 'degli', 'dell', 'per', 'con', 'la', 'il', 'le', 'lo', 'gli', 'corso', 'corsi', 'laurea', 'lauree', 'universita', 'of', 'and', 'the']);
const TIPO_IN_RICERCA = { triennale: 'triennale', triennali: 'triennale', magistrale: 'magistrale', magistrali: 'magistrale', specialistica: 'magistrale', unico: 'ciclo unico' };
const SINONIMI = {
  informatica: ['computer', 'informatics', 'informatic'], computer: ['informatica'], economia: ['economics', 'economic', 'economy'], economics: ['economia'],
  giurisprudenza: ['law', 'giuridic'], legge: ['giurisprudenza', 'giuridic', 'law', 'diritto'], diritto: ['giurisprudenza', 'giuridic', 'law'], law: ['giurisprudenza', 'giuridic'],
  medicina: ['medicine', 'medical'], medicine: ['medicina'], psicologia: ['psychology', 'psicologic'], psychology: ['psicologia'],
  ingegneria: ['engineering'], engineering: ['ingegneria'], architettura: ['architecture'], architecture: ['architettura'],
  lingue: ['languages', 'linguistic', 'lingu'], lettere: ['lettere', 'letterature', 'humanities'], filosofia: ['philosophy'], storia: ['history', 'storic'],
  fisica: ['physics'], matematica: ['mathematics', 'mathematical'], chimica: ['chemistry', 'chemical', 'chimic'], biologia: ['biology', 'biological', 'biolog'],
  biotecnologie: ['biotechnology', 'biotechnologies'], farmacia: ['pharmacy', 'farmaceutic'], infermiere: ['infermieristica'], infermieristica: ['nursing'],
  veterinaria: ['veterinary'], agraria: ['agricultural', 'agrarie', 'agroalimentar', 'agricoltura'], gestionale: ['management'], management: ['gestionale', 'gestione', 'aziendale'],
  dati: ['data'], data: ['dati'], ia: ['intelligenza artificiale', 'artificial intelligence'], ai: ['intelligenza artificiale', 'artificial intelligence'],
  turismo: ['tourism', 'turistic'], moda: ['fashion'], design: ['disegno industriale'], comunicazione: ['communication', 'media'], marketing: ['marketing'],
  scienze: ['science', 'sciences'], ambiente: ['environmental', 'ambientale', 'ambientali'], politiche: ['political', 'politics', 'politic'],
};
function distanza(a, b, max) {
  // distanza di modifica (con scambio di lettere vicine), interrotta appena supera max
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prima = null, riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nuova = [i]; let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(riga[j] + 1, nuova[j - 1] + 1, riga[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prima && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prima[j - 2] + 1);
      nuova.push(v); minimo = Math.min(minimo, v);
    }
    if (minimo > max) return max + 1;
    prima = riga; riga = nuova;
  }
  return riga[b.length];
}
const capiti = new Map();
function interpreta(q) {
  // la ricerca diventa: tipo di laurea (se scritto) + per ogni parola le forme che vanno bene (sinonimi, refusi corretti)
  if (capiti.has(q)) return capiti.get(q);
  let tipo = null; const parole = [], corrette = [];
  const ws = norma(q).split(' ').filter(Boolean);
  for (let k = 0; k < ws.length; k++) {
    const w = ws[k];
    if (w === 'ciclo' && ws[k + 1] === 'unico') { tipo = 'ciclo unico'; k++; continue; }
    if (TIPO_IN_RICERCA[w]) { tipo = TIPO_IN_RICERCA[w]; continue; }
    if (VUOTE.has(w)) continue;
    const forme = [w, ...(SINONIMI[w] || [])];
    // refuso: una parola che non è l'inizio di nessuna parola dei corsi si corregge con la più vicina
    if (w.length >= 5 && ![...S.parole].some(x => x.startsWith(w))) {
      const max = w.length >= 8 ? 2 : 1;
      let migliore = null, d0 = max + 1;
      for (const x of S.parole) { if (x[0] !== w[0]) continue; const d = distanza(w, x.slice(0, Math.max(w.length, Math.min(x.length, w.length + 1))), max); if (d < d0) { d0 = d; migliore = x; } }
      if (migliore) { forme.push(migliore); corrette.push(migliore); }
    }
    parole.push(forme.map(x => ' ' + x));
  }
  const r = { tipo, parole, corrette };
  capiti.set(q, r);
  return r;
}
function trova() {
  const f = S.filtri, q = norma(f.q), cap = interpreta(f.q || ''), parole = cap.parole;
  let r = S.corsi.filter(c => {
    if (f.tipo === 'primo' ? c.tipo === 'magistrale' : f.tipo && c.tipo !== f.tipo) return false;
    if (!f.tipo && cap.tipo && c.tipo !== cap.tipo) return false;
    if (f.gruppo && c.gruppo !== f.gruppo) return false;
    if (f.regione && regioneDi(c) !== f.regione) return false;
    if (f.comune && c.comune !== f.comune) return false;
    if (f.classe && c.classe !== f.classe) return false;
    if (f.accesso === 'libero' && !(c.accesso || '').startsWith('libero')) return false;
    if (f.accesso === 'programmato' && !(c.accesso || '').startsWith('programmato')) return false;
    if (f.inglese && !/Inglese/.test(c.lingua || '')) return false;
    if (f.distanza && !/distanza/i.test(c.didattica || '')) return false;
    if (f.piano && !c.piano) return false;
    return parole.every(forme => forme.some(p => c.cerca.includes(p)));
  });
  const punti = c => {
    if (!parole.length) return 0;
    // la ricerca senza le parole che sono filtri («magistrale», «a Milano»): «data science magistrale» → «Data Science» in cima
    const n = ' ' + norma(c.nome), qp = parole.map(forme => forme[0].trim()).join(' ');
    // poi quante parole stanno nel nome (le altre possono essere città, lingua, ateneo), meglio se all'inizio
    const nelNome = parole.filter(forme => forme.some(p => n.includes(p))).length;
    return (n.trim() === q || n.trim() === qp ? 10 : n.startsWith(' ' + q) || n.startsWith(' ' + qp) ? 6 : nelNome === parole.length ? 4
      : nelNome ? 2 + (parole[0].some(p => n.startsWith(p)) ? 1 : 0) : 0) + (c.piano ? 1 : 0);
  };
  if (S.ordine === 'distanza' && S.casa) r.sort((a, b) => (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9));
  else if (S.ordine === 'nome') r.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  else r.sort((a, b) => punti(b) - punti(a) || (S.casa ? (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9) : 0) || a.nome.localeCompare(b.nome, 'it'));
  return r;
}
function conteggio(campo, valoreDi) {
  const m = new Map();
  for (const c of S.corsi) { const v = valoreDi ? valoreDi(c) : c[campo]; if (v) m.set(v, (m.get(v) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------------- viste ---------------- */
function vistaCasa() {
  const n = S.corsi.filter(c => !c.fuori).length, conPiano = S.corsi.filter(c => c.piano && !c.fuori).length;
  const atenei = new Set(S.corsi.filter(c => !c.fuori).map(c => c.ateneo)).size;
  const gruppi = conteggio('gruppo');
  return `<div class="colonna">
    <section class="apertura">
      <div>
        <p class="anno-accademico">Anno accademico ${ANNO_ACCADEMICO}</p>
        <h1>Cosa studiare. E <span class="evidenziato">dove</span>.</h1>
        <p class="sotto">Tutti i corsi di laurea italiani, con il piano degli esami anno per anno: cosa studi davvero, in quale città, e come si entra.</p>
        <form class="cerca-grande" id="form-casa" role="search">
          <label class="campo">${ICONA_CERCA}<input id="cerca-casa" type="search" placeholder="Cerca corso, ateneo o città" autocomplete="off" aria-label="Cerca un corso, un ateneo o una città"></label>
          <div class="esempi"><span class="tenue piccolo">Prova:</span>${['Economia', 'Psicologia', 'Ingegneria informatica', 'Medicina', 'Bologna'].map(e => `<button type="button" data-esempio="${e}">${e}</button>`).join('')}</div>
        </form>
        <div style="margin-top:22px">${campoCasa()}</div>
      </div>
      <figure class="mappa-casa" style="margin:0">
        <canvas id="mappa-casa" aria-label="Mappa delle sedi dei corsi di laurea in Italia"></canvas>
        <figcaption class="didascalia">Ogni punto colorato è un comune dove si tiene almeno un corso di laurea. La sagoma chiara è fatta dagli altri ${fmt(Object.keys(S.comuni).length)} comuni.</figcaption>
      </figure>
    </section>
    <a class="invito-quiz" href="#quiz">
      <span class="tessera">${ICONA_BUSSOLA}</span>
      <span class="invito-testo"><span class="eyebrow">Non sai ancora cosa scegliere?</span><b>Fai il quiz: quale laurea fa per te?</b>
        <span class="tenue">Cinque minuti, niente «ti piace la matematica?». Scegli tra situazioni concrete e assaggia alla cieca il primo anno di sei lauree: il risultato si basa sugli esami veri.</span></span>
      <span class="btn primario">Inizia</span>
    </a>
    <div class="cifre">
      <div><b>${fmt(n)}</b><span>corsi di laurea attivi</span></div>
      <div><b>${fmt(atenei)}</b><span>università</span></div>
      <div><b>${fmt(conPiano)}</b><span>con il piano degli esami</span></div>
      <div><b>${fmt(new Set(S.corsi.filter(c => c.piano).map(c => c.ateneo)).size)}</b><span>atenei con i piani raccolti</span></div>
    </div>
    <div class="strade">
      <a class="strada" href="#esplora" data-preset="primo"><span class="tessera">${ICONE.libro}</span><span class="eyebrow">Dopo le superiori</span><h3>Scegli il tuo corso</h3><p>Triennali e corsi a ciclo unico (come Medicina o Giurisprudenza): filtra per area e città, guarda gli esami anno per anno, confronta gli atenei.</p></a>
      <a class="strada" href="#esplora" data-preset="magistrale"><span class="tessera">${ICONE.gradini}</span><span class="eyebrow">Dopo la triennale</span><h3>Trova la magistrale</h3><p>Per ogni corso: esami, curricula e, dove l’ateneo li pubblica, i requisiti per entrare.</p></a>
      <a class="strada" href="#materie"><span class="tessera">${ICONE.materia}</span><span class="eyebrow">Parti da una materia</span><h3>Dove si studia…</h3><p>Scrivi un esame, per esempio «Intelligenza artificiale»: ecco i corsi che lo hanno nel piano.</p></a>
    </div>
    <section class="aree-casa">
      <h2>Per area di studio</h2>
      <div class="griglia-aree">${gruppi.map(([g, k]) => `<button type="button" data-gruppo="${esc(g)}"><b>${esc(g)}</b><span>${fmt(k)}</span></button>`).join('')}</div>
    </section>
  </div>`;
}

function campoCasa() {
  const nome = S.casa && S.comuni[S.casa] ? `${S.comuni[S.casa][0]} (${S.comuni[S.casa][1]})` : '';
  return `<div class="casa"><label for="casa">${ICONE.luogo}Da dove parti?</label><input id="casa" list="elenco-comuni" value="${esc(nome)}" placeholder="Il tuo comune" autocomplete="off"><datalist id="elenco-comuni"></datalist>${S.casa ? '<span class="tenue piccolo">Mostro le distanze in linea d’aria.</span>' : ''}</div>`;
}
function riempiComuni(q) {
  const dl = $('#elenco-comuni'); if (!dl) return;
  const n = norma(q); if (n.length < 2) { dl.innerHTML = ''; return; }
  const trovati = [];
  for (const [k, c] of Object.entries(S.comuni)) { if (norma(c[0]).startsWith(n)) { trovati.push(`<option value="${esc(c[0])} (${c[1]})">`); if (trovati.length > 30) break; } }
  dl.innerHTML = trovati.join('');
}
function impostaCasa(testo) {
  const m = String(testo).match(/^(.*?)\s*\(([A-Z]{2})\)\s*$/);
  const nome = norma(m ? m[1] : testo), sigla = m ? m[2] : null;
  const k = Object.keys(S.comuni).find(k => norma(S.comuni[k][0]) === nome && (!sigla || S.comuni[k][1] === sigla));
  S.casa = k || null; salva('casa', S.casa);
  if (S.casa && S.ordine === 'pertinenza' && !S.filtri.q) S.ordine = 'distanza';
  disegna(false);
}

function vistaEsplora() {
  const r = trova(), f = S.filtri;
  const regioni = conteggio(null, regioneDi).map(x => x[0]).sort((a, b) => a.localeCompare(b, 'it'));
  const gruppi = conteggio('gruppo').map(x => x[0]).sort((a, b) => a.localeCompare(b, 'it'));
  const tipi = conteggio('tipo');
  const attivi = ['tipo', 'gruppo', 'regione', 'accesso', 'inglese', 'distanza', 'piano', 'comune', 'classe'].filter(k => f[k]).length;
  const titolo = f.classe ? `Classe ${esc(f.classe)}` : f.comune ? `Corsi a ${esc(S.comuni[f.comune]?.[0] || '')}` : f.q ? `«${esc(f.q)}»` : f.gruppo ? esc(f.gruppo) : f.tipo === 'primo' ? 'Corsi dopo il diploma' : 'Tutti i corsi';
  return `<div class="colonna esplora">
    <aside class="filtri" id="filtri" aria-label="Filtri">
      <fieldset><legend>Tipo di laurea</legend><div class="scelte">
        <button type="button" class="scelta-btn" data-filtro="tipo" data-valore="" aria-pressed="${!f.tipo}">Tutti</button>
        <button type="button" class="scelta-btn" data-filtro="tipo" data-valore="primo" aria-pressed="${f.tipo === 'primo'}">Dopo il diploma</button>
        ${tipi.map(([t, n]) => `<button type="button" class="scelta-btn" data-filtro="tipo" data-valore="${esc(t)}" aria-pressed="${f.tipo === t}">${TIPI_BREVI[t] || esc(t)}<small>${fmt(n)}</small></button>`).join('')}
      </div></fieldset>
      <fieldset><legend>Area</legend><select id="f-gruppo" data-filtro-select="gruppo" aria-label="Area"><option value="">Tutte le aree</option>${gruppi.map(g => `<option ${f.gruppo === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></fieldset>
      <fieldset><legend>Regione</legend><select id="f-regione" data-filtro-select="regione" aria-label="Regione"><option value="">Tutta Italia</option>${regioni.map(g => `<option ${f.regione === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></fieldset>
      <fieldset><legend>Accesso</legend><div class="scelte">
        ${[['', 'Tutti'], ['libero', 'Libero'], ['programmato', 'Numero programmato']].map(([v, t]) => `<button type="button" class="scelta-btn" data-filtro="accesso" data-valore="${v}" aria-pressed="${f.accesso === v}">${t}</button>`).join('')}
      </div></fieldset>
      <fieldset><legend>Altro</legend>
        <label class="interruttore"><input type="checkbox" id="f-piano" data-filtro-check="piano" ${f.piano ? 'checked' : ''}> Solo con il piano degli esami</label>
        <label class="interruttore"><input type="checkbox" id="f-inglese" data-filtro-check="inglese" ${f.inglese ? 'checked' : ''}> Insegnato in inglese</label>
        <label class="interruttore"><input type="checkbox" id="f-distanza" data-filtro-check="distanza" ${f.distanza ? 'checked' : ''}> A distanza (telematico)</label>
      </fieldset>
      ${attivi ? '<button type="button" class="btn" data-azione="azzera">Togli i filtri</button>' : ''}
    </aside>
    <section>
      <form class="cerca-esplora solo-telefono" role="search"><label class="campo">${ICONA_CERCA}<input id="cerca-esplora" type="search" value="${esc(f.q)}" placeholder="Cerca corso, ateneo o città" autocomplete="off" aria-label="Cerca un corso, un ateneo o una città"></label></form>
      <div class="barra-risultati">
        <div><h1>${titolo}</h1><p class="tenue piccolo num" role="status">${fmt(r.length)} corsi${f.comune || f.classe ? ' · <a href="#esplora" data-azione="azzera">tutti i corsi</a>' : ''}${f.q && interpreta(f.q).corrette.length ? ` · cerco anche «${esc(interpreta(f.q).corrette.join(' '))}»` : ''}</p></div>
        <div class="destra">
          <button type="button" class="btn mostra-filtri" data-azione="mostra-filtri" aria-controls="filtri">Filtri${attivi ? ` (${attivi})` : ''}</button>
          <button type="button" class="btn" data-azione="mappa" aria-pressed="${S.mappa}">Mappa</button>
          <select id="ordine" aria-label="Ordina" style="width:auto"><option value="pertinenza" ${S.ordine === 'pertinenza' ? 'selected' : ''}>Più pertinenti</option><option value="distanza" ${S.ordine === 'distanza' ? 'selected' : ''} ${S.casa ? '' : 'disabled'}>Più vicini${S.casa ? '' : ' (scegli da dove parti)'}</option><option value="nome" ${S.ordine === 'nome' ? 'selected' : ''}>Per nome</option></select>
        </div>
      </div>
      <div style="margin-bottom:14px">${campoCasa()}</div>
      ${S.mappa ? '<div class="mappa-esplora"><canvas id="mappa-esplora" aria-label="Mappa dei corsi trovati"></canvas><div class="fumetto" id="fumetto" hidden></div></div>' : ''}
      ${r.length ? `<div class="elenco">${r.slice(0, S.mostrati).map(rigaCorso).join('')}</div>${r.length > S.mostrati ? `<div class="altri"><button type="button" class="btn" data-azione="altri">Mostra altri ${fmt(Math.min(60, r.length - S.mostrati))}</button></div>` : ''}`
        : `<div class="vuoto"><b>Nessun corso con questi filtri.</b><span>Prova a togliere un filtro o a cercare con meno parole.</span><button type="button" class="btn" data-azione="azzera">Togli i filtri</button></div>`}
    </section>
  </div>`;
}

// Medicina, Odontoiatria e Veterinaria in italiano: dal 2025/26 l'accesso nazionale passa dal «semestre filtro»
const semestreFiltro = c => c.accesso === 'programmato nazionale' && /^LM-(41|42|46)\b/.test(c.classe || '') && c.lingua === 'Italiano';
// accesso in parole: breve per gli elenchi, intero per la pagina del corso
function testoAccesso(c, intero) {
  const a = c.accesso || '';
  if (a.startsWith('programmato')) return intero ? `Numero ${a}${c.posti ? `, ${fmt(c.posti)} posti` : ''}` : `Numero programmato${c.posti ? ` · ${fmt(c.posti)} posti` : ''}`;
  if (a === 'libero con test') return intero ? 'Libero, con una prova di verifica' : 'Libero, con test';
  if (a === 'libero') return intero ? 'Libero' : 'Accesso libero';
  if (a === 'incerto') return intero ? 'Da controllare' : '';
  return intero ? 'Non indicato' : '';
}
function rigaCorso(c) {
  const d = distanzaDi(c);
  const accesso = testoAccesso(c, false);
  return `<a class="riga" href="#corso.${c.i}">
    <div style="min-width:0">
      <div class="titolo-riga">${esc(titoloCorso(c.nome))}</div>
      <div class="sotto-riga">${esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}</div>
      <div class="etichette">
        ${c.classe ? `<span class="etichetta codice" title="${esc(c.nomeClasse || '')}">${esc(c.classe)}</span>` : ''}
        ${c.tipo ? `<span class="etichetta">${TIPI_BREVI[c.tipo] || esc(c.tipo)}</span>` : ''}
        ${accesso ? `<span class="etichetta${c.accesso.startsWith('programmato') ? ' avviso' : ''}">${accesso}</span>` : ''}
        ${/Inglese/.test(c.lingua || '') ? `<span class="etichetta">${c.lingua === 'Inglese' ? 'In inglese' : esc(c.lingua)}</span>` : ''}
        ${/distanza/i.test(c.didattica || '') ? `<span class="etichetta">${esc(c.didattica)}</span>` : ''}
      </div>
    </div>
    <div class="lato-riga">
      ${d != null ? `<span class="distanza">${testoDistanza(d)}</span>` : ''}
      ${c.comp ? barraComposizione(c.comp) + areaPrincipale(c.comp) : c.piano ? '<span class="senza-piano">Piano degli esami</span>' : '<span class="senza-piano">Piano non disponibile</span>'}
    </div>
  </a>`;
}

/* ---------------- mappa (le sedi disegnano l'Italia) ---------------- */
function disegnaMappa(canvas, corsi, opz = {}) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const coloreFondo = css.getPropertyValue('--linea').trim(), coloreSede = css.getPropertyValue('--lampone').trim(), coloreCasa = css.getPropertyValue('--inchiostro').trim();
  // proiezione equirettangolare corretta per la latitudine media dell'Italia
  const lon0 = 6.5, lon1 = 18.7, lat0 = 36.5, lat1 = 47.2, k = Math.cos(42 * Math.PI / 180);
  const sx = (w - 16) / ((lon1 - lon0) * k), sy = (h - 16) / (lat1 - lat0), s = Math.min(sx, sy);
  const ox = (w - (lon1 - lon0) * k * s) / 2, oy = (h - (lat1 - lat0) * s) / 2;
  const P = (la, lo) => [ox + (lo - lon0) * k * s, oy + (lat1 - la) * s];
  ctx.fillStyle = coloreFondo;
  for (const c of Object.values(S.comuni)) { const [x, y] = P(c[2], c[3]); ctx.fillRect(x - .7, y - .7, 1.4, 1.4); }
  const per = new Map();
  for (const c of corsi) if (c.comune) per.set(c.comune, (per.get(c.comune) || 0) + 1);
  const punti = [];
  ctx.fillStyle = coloreSede; ctx.strokeStyle = css.getPropertyValue('--foglio').trim(); ctx.lineWidth = 1; ctx.globalAlpha = .82;
  for (const [comune, n] of per) {
    const x0 = S.comuni[comune]; if (!x0) continue;
    const [x, y] = P(x0[2], x0[3]), r = Math.min(13, 2.2 + Math.sqrt(n) * (opz.grande ? 1.15 : .9));
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    punti.push({ x, y, r, comune, n });
  }
  ctx.globalAlpha = 1;
  if (S.casa && S.comuni[S.casa]) {
    const [x, y] = P(S.comuni[S.casa][2], S.comuni[S.casa][3]);
    ctx.strokeStyle = coloreCasa; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.stroke();
  }
  canvas._punti = punti;
}
function puntoSotto(canvas, ev) {
  const b = canvas.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
  let migliore = null, dmin = 1e9;
  for (const p of canvas._punti || []) { const d = Math.hypot(p.x - x, p.y - y); if (d < Math.max(8, p.r + 3) && d < dmin) { migliore = p; dmin = d; } }
  return migliore && { ...migliore, px: x, py: y };
}

/* ---------------- pagina del corso ---------------- */
function vistaCorso(i) {
  const c = S.corsi[i];
  if (!c) return `<div class="colonna vuoto">Corso non trovato. <a href="#esplora">Torna all'elenco</a></div>`;
  const nelConfronto = S.confronto.includes(c.i);
  const accesso = testoAccesso(c, true);
  return `<div class="colonna">
    <nav class="briciole" aria-label="Percorso"><a href="#esplora">Corsi</a><span>/</span>${c.gruppo ? `<a href="#esplora" data-gruppo-link="${esc(c.gruppo)}">${esc(c.gruppo)}</a><span>/</span>` : ''}<span>${esc(c.classe || '')}</span></nav>
    <div class="testa-corso">
      <div>
        <h1>${esc(titoloCorso(c.nome))}</h1>
        <p class="ateneo">${esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}${distanzaDi(c) != null ? ` <span class="tenue">· ${distanzaDi(c) < 1 ? 'nel tuo comune' : `a ${testoDistanza(distanzaDi(c))} da casa`}</span>` : ''}</p>
      </div>
      <div class="azioni">
        <button type="button" class="btn" data-azione="confronto" data-i="${c.i}" aria-pressed="${nelConfronto}">${nelConfronto ? 'Nel confronto' : 'Confronta'}</button>
        ${c.sito ? `<a class="btn primario" href="${esc(c.sito)}" target="_blank" rel="noopener">${c.sitoAteneo ? 'Sito dell’ateneo' : 'Sito del corso'} ↗</a>` : ''}
      </div>
    </div>
    <dl class="fatti">
      <div><dt>Tipo</dt><dd>${TIPI_BREVI[c.tipo] || esc(c.tipo || '—')}${c.tipo ? `, ${DURATA[c.tipo] || ''} anni` : ''}</dd></div>
      <div><dt>Classe</dt><dd><span class="codice">${esc(c.classe || '—')}</span>${c.nomeClasse ? `<div class="tenue piccolo" style="font-weight:400">${esc(c.nomeClasse)}</div>` : ''}</dd></div>
      <div><dt>Accesso</dt><dd>${esc(accesso)}${c.accesso === 'incerto' ? '<div class="tenue piccolo" style="font-weight:400">Ministero e ateneo non dicono la stessa cosa (libero o a numero programmato): vale quanto scritto sul sito del corso.</div>' : ''}${semestreFiltro(c) ? '<div class="tenue piccolo" style="font-weight:400">Con il «semestre filtro»: ci si iscrive liberamente al primo semestre, poi si prosegue in base agli esami e alla graduatoria nazionale.</div>' : ''}</dd></div>
      <div><dt>Lingua</dt><dd>${esc(c.lingua || '—')}</dd></div>
      <div><dt>Didattica</dt><dd>${esc(c.didattica || '—')}</dd></div>
    </dl>
    <div id="piano">${c.piano ? '<p class="caricamento">Carico il piano degli esami…</p>' : sezioneSenzaPiano(c)}</div>
    <div id="testi"></div>
    ${sezioneAltrove(c)}
  </div>`;
}
function sezioneSenzaPiano(c) {
  const m = S.motivi[c.ateneo];
  return `<section class="sezione"><h2>Piano degli esami</h2>
    <p class="nota avviso">${m ? `Non disponibile: ${esc(m.motivo)}.` : 'Non disponibile: l’ateneo non lo pubblica nelle pagine da cui raccogliamo i piani.'} ${c.sito ? (c.sitoAteneo ? `Cercalo sul <a href="${esc(c.sito)}" target="_blank" rel="noopener">sito dell’ateneo</a>.` : `Lo trovi sul <a href="${esc(c.sito)}" target="_blank" rel="noopener">sito del corso</a>.`) : ''}</p>
  </section>`;
}
function sezioneAltrove(c) {
  if (!c.classe) return '';
  const altri = S.corsi.filter(x => x.classe === c.classe && x.i !== c.i && !x.fuori);
  if (!altri.length) return '';
  altri.sort((a, b) => S.casa ? (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9) : a.ateneoNome.localeCompare(b.ateneoNome, 'it'));
  return `<section class="sezione altrove"><h2>Lo stesso tipo di corso altrove <small>${fmt(altri.length)} corsi della classe ${esc(c.classe)}${S.casa ? ', dal più vicino' : ''}</small></h2>
    <div class="elenco">${altri.slice(0, 6).map(rigaCorso).join('')}</div>
    <div class="altri"><a class="btn" href="#esplora" data-classe-link="${esc(c.classe)}">Vedi tutti i ${fmt(altri.length + 1)}</a></div></section>`;
}

const statoPiano = { percorso: 0 };
async function riempiPiano(c) {
  const box = $('#piano'); if (!box || !c.piano) return;
  try {
    const dati = await pianiDi(c.ateneo), p = dati.corsi[c.piano];
    if (!p) { box.innerHTML = sezioneSenzaPiano(c); return; }
    statoPiano.percorso = Math.min(statoPiano.percorso, p.p.length - 1);
    box.innerHTML = htmlPiano(c, p, dati.esami);
  } catch (e) { box.innerHTML = `<p class="nota avviso">Non riesco a caricare il piano (${esc(e.message)}). Riprova tra poco.</p>`; }
  const t = await testiDi(c.ateneo), x = t[c.piano];
  const tb = $('#testi'); if (tb && x) tb.innerHTML = htmlTesti(x);
}
function esameDa(v) {
  const [nome, cfu, settori, periodo, taf, lingua, moduli, sotto] = v;
  const s = (settori || '').split(';').filter(Boolean).map(x => { const [k, n] = x.split(':'); return { k, n: n ? +n : null }; });
  return { nome, cfu, settori: s, periodo, taf, lingua, moduli, sotto, macro: s.length ? macroDi(s.slice().sort((a, b) => (b.n || 0) - (a.n || 0))[0].k) : 'alt' };
}
function regolaGruppo(b) {
  if (b.x) return 'Facoltativo';
  if (b.k) return `Scegli ${b.k === 1 ? 'un esame' : `${b.k} esami`}${b.c ? ` · ${fmt(b.c)}${b.m ? `–${fmt(b.m)}` : ''} CFU` : ''}`;
  if (b.c && b.m) return `Scegli tra ${fmt(b.c)} e ${fmt(b.m)} CFU`;
  if (!b.c && b.m) return `Fino a ${fmt(b.m)} CFU`;
  if (b.c) return `Scegli ${fmt(b.c)} CFU`;
  return 'Da scegliere';
}
function htmlPiano(c, p, tabella) {
  const [nomeP, anni] = p.p[statoPiano.percorso];
  const tuttiAnni = anni.map(([anno, blocchi, coorte]) => ({ anno, coorte, blocchi: blocchi.map(b => ({ ...b, esami: (b.i || []).map(k => esameDa(tabella[k])) })) }));
  // quote per area, dagli obbligatori del percorso scelto
  const quote = {}; let totObb = 0;
  for (const a of tuttiAnni) for (const b of a.blocchi) if (!b.s && !b.x) for (const e of b.esami) {
    if (!e.cfu) continue; totObb += e.cfu;
    const s = e.settori.filter(x => x.n); if (s.length) s.forEach(x => quote[macroDi(x.k)] = (quote[macroDi(x.k)] || 0) + x.n); else quote[e.macro] = (quote[e.macro] || 0) + e.cfu;
  }
  const totQ = Object.values(quote).reduce((a, b) => a + b, 0) || 1;
  const legenda = Object.entries(quote).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span><i style="--c:${colore(k)}"></i>${esc(nomeMacro(k))} <span class="tenue num">${Math.round(100 * v / totQ)}%</span></span>`).join('') + '<span><i class="scelta"></i>Esami a scelta</span>';
  const righe = tuttiAnni.filter(a => a.anno != null).map(a => {
    let cfu = 0;
    const celle = a.blocchi.filter(b => !b.x).flatMap(b => b.s
      ? (b.c ? [(cfu += b.c, `<span class="cella scelta" style="--cfu:${b.c}" title="${esc(regolaGruppo(b) + ': ' + (b.e || ''))}"></span>`)] : [])
      : b.esami.filter(e => e.cfu).map(e => (cfu += e.cfu, `<span class="cella" style="--cfu:${e.cfu};--c:${colore(e.macro)}" title="${esc(`${e.nome} · ${e.cfu} CFU`)}"></span>`)));
    return `<div class="anno-striscia"><button type="button" class="lbl" data-azione="vai-anno" data-anno="${a.anno}">${a.anno}° anno</button><div class="celle">${celle.join('')}</div><span class="tot">${fmt(Math.round(cfu))} CFU</span></div>`;
  }).join('');
  const atteso = { triennale: 180, magistrale: 120, 'ciclo unico': (c.classe || '').match(/LM-41|LM-46/) ? 360 : 300 }[c.tipo];
  const fonte = p.f || {};
  // alcune fonti pubblicano gli anni di una coorte uno alla volta: lo si dice, invece di lasciar credere che il piano finisca lì
  const ultimo = Math.max(0, ...tuttiAnni.map(a => a.anno || 0)), durata = (c.classe || '').match(/LM-41|LM-46/) ? 6 : DURATA[c.tipo];
  // se la coorte 2026/27 non è ancora pubblicata si mostra la più recente, e lo si dice chiaramente
  const vecchio = fonte.anno && !String(fonte.anno).startsWith('2026')
    ? `<p class="nota avviso">Questo è il piano di chi si è iscritto nel ${esc(fonte.anno)}: l’ateneo non ha ancora pubblicato quello per chi si iscrive nel 2026/27, che può essere diverso.</p>` : '';
  // anni mancanti: in fondo (pubblicati uno alla volta) o in mezzo (l'anno 1 di una coorte vecchia non è più in catalogo)
  const presenti = new Set(tuttiAnni.map(a => a.anno).filter(Boolean));
  const mancanti = presenti.size && durata ? Array.from({ length: durata }, (_, k) => k + 1).filter(n => !presenti.has(n)) : [];
  // i crediti mostrati devono fare quelli del titolo: se non tornano lo si dice, invece di lasciar credere che il piano sia completo
  let tot = 0, totMax = 0, senzaCrediti = false, obbligatori = 0, inGruppiSenzaCrediti = 0; const contati = new Set(), senza = [];
  for (const a of tuttiAnni) for (const b of a.blocchi) {
    if (b.x) continue;
    if (b.s) {
      const k = /dal\s+\d+°?\s+al\s+\d+°?\s+anno|tra\s+il\s+\d+°?\s+e\s+(?:il\s+)?\d+°?\s+anno/i.test(b.e || '') ? b.e : Symbol();
      if (contati.has(k)) continue; contati.add(k);
      if (!b.c && !b.m) { senzaCrediti = true; inGruppiSenzaCrediti += b.esami.reduce((s, e) => s + (e.cfu || 0), 0); if (!b.k) senza.push(b); }
      tot += b.c || 0; totMax += b.m || b.c || 0;
    } else { const t = b.esami.reduce((s, e) => s + (e.cfu || 0), 0); tot += t; totMax += t; obbligatori += t; }
  }
  const pieno = (c.classe || '').match(/LM-41|LM-46/) ? 360 : atteso;
  let conti = '';
  const incompleto = presenti.size && durata && presenti.size < durata;
  if (pieno && obbligatori < pieno / 2 && inGruppiSenzaCrediti >= pieno - obbligatori && !incompleto) {
    // la fonte mette quasi tutto in gruppi «non obbligatori» senza crediti: non si può dire che siano scelte
    conti = `Per questo corso il catalogo dell’ateneo non distingue bene gli esami obbligatori da quelli a scelta: molti esami nei gruppi qui sotto sono probabilmente obbligatori. Controlla il piano sul sito del corso.`;
  } else if (pieno && !incompleto && senza.length === 1 && tot === totMax && tot < pieno && stimaPossibile(senza[0], pieno - tot)) {
    // un solo gruppo senza crediti e tutto il resto noto: i crediti che mancano al titolo sono, con buona probabilità, i suoi
    senza[0].stima = pieno - tot;
  } else if (pieno && !incompleto && !(tot <= pieno && pieno <= totMax)) {
    if (tot > pieno) conti = `I crediti elencati qui fanno ${fmt(tot)}, più dei ${fmt(pieno)} del titolo: alcune attività sono probabilmente alternative tra loro. Controlla le regole sul sito del corso.`;
    else if (senzaCrediti) conti = `I crediti indicati qui arrivano a ${fmt(totMax)} su ${fmt(pieno)}: il resto si sceglie nei gruppi per cui l’ateneo non indica quanti crediti servono (li trovi nel regolamento del corso).`;
    else conti = `I crediti indicati qui arrivano a ${fmt(totMax)} su ${fmt(pieno)}: una parte del piano (spesso le attività a scelta libera) l’ateneo non la descrive qui. Controlla sul sito del corso.`;
  }
  const parziale = !mancanti.length ? ''
    : mancanti.every(n => n > ultimo)
      ? `<p class="nota avviso">Qui ${ultimo === 1 ? 'c’è solo il 1° anno' : `ci sono solo i primi ${ultimo} anni`}: per ora il catalogo dell’ateneo pubblica solo questi. Il piano completo è nel regolamento del corso.</p>`
      : `<p class="nota avviso">Qui manca${mancanti.length > 1 ? 'no' : ''} ${mancanti.map(n => `il ${n}° anno`).join(' e ')}: il catalogo dell’ateneo non ${mancanti.length > 1 ? 'li' : 'lo'} pubblica. Il piano completo è nel regolamento del corso.</p>`;
  return `<section class="sezione">
    <h2>Il piano degli esami <small>${atteso ? `${atteso} <abbr title="crediti formativi universitari: un anno di studio ne vale 60">CFU</abbr> in ${DURATA[c.tipo] || ''} anni` : ''}${fonte.anno ? ` · ${String(fonte.anno).startsWith('2026') ? 'per chi si iscrive nel' : 'piano di chi si è iscritto nel'} ${esc(String(fonte.anno).replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2'))}` : ''}</small></h2>
    ${p.p.length > 1 ? `<div class="percorsi" role="group" aria-label="Curriculum">${p.p.map(([n], k) => `<button type="button" class="scelta-btn" data-percorso="${k}" aria-pressed="${k === statoPiano.percorso}">${esc(titoloCorso(n))}</button>`).join('')}</div>` : ''}
    ${righe ? `<div class="striscia" role="img" aria-label="Crediti per anno, colorati per area disciplinare">${righe}</div><div class="legenda">${legenda}</div>` : ''}
    ${vecchio}${parziale}${conti ? `<p class="nota avviso">${conti}</p>` : ''}
    ${tuttiAnni.map(a => htmlAnno(a)).join('')}
    <div class="fonte"><span>Fonte: ${esc(fonte.nome || '—')}${fonte.anno ? `, piano ${esc(fonte.anno)}` : ''}. ${fonte.nota ? esc(fonte.nota) : ''}</span>${fonte.url ? `<a href="${esc(fonte.url)}" target="_blank" rel="noopener">Apri la fonte<span class="vh"> (si apre in una nuova scheda)</span> ↗</a>` : ''}</div>
  </section>`;
}
function htmlAnno(a) {
  const obbl = a.blocchi.filter(b => !b.s && !b.x), gruppi = a.blocchi.filter(b => b.s || b.x);
  const cfuObb = obbl.reduce((t, b) => t + b.esami.reduce((s, e) => s + (e.cfu || 0), 0), 0);
  return `<div class="anno"${a.anno != null ? ` id="anno-${a.anno}"` : ''}>
    <h3>${a.anno != null ? `${a.anno}° anno` : 'In qualsiasi anno'}<span>${a.coorte && String(a.coorte) !== '2026' ? `come per gli iscritti nel ${esc(a.coorte)}/${String(+a.coorte + 1).slice(2)} · ` : ''}${cfuObb ? `${fmt(Math.round(cfuObb))} CFU obbligatori` : ''}</span></h3>
    ${obbl.length ? `<ul class="esami">${obbl.flatMap(b => b.esami).map(htmlEsame).join('')}</ul>` : ''}
    ${gruppi.map(b => `<div class="gruppo${b.x ? ' extra' : ''}">
      <div class="regola"><b>${regolaGruppo(b)}</b><span class="codice tenue">${b.esami.length ? `${b.esami.length} ${b.esami.length === 1 ? 'opzione' : 'opzioni'}` : ''}</span></div>
      ${b.e ? `<div class="orig">${esc(b.e)}</div>` : ''}
      ${b.stima ? `<p class="nota">L’ateneo non dice quanti crediti scegliere qui, ma per arrivare ai crediti del titolo ne mancano ${fmt(b.stima)}: probabilmente sono quelli di questo gruppo. Il numero esatto è nel regolamento del corso.</p>`
        : !b.c && !b.m && !b.x && !b.k ? '<p class="nota">Qui l’ateneo non indica quanti crediti scegliere: controlla il regolamento del corso.</p>' : ''}
      ${(b.n || []).map(n => `<p class="nota">${esc(n)}</p>`).join('')}
      ${b.esami.length ? opzioniGruppo(b.esami) : '<p class="nota">Le opzioni non sono elencate: di solito si sceglie tra tutti gli esami dell’ateneo.</p>'}
    </div>`).join('')}
  </div>`;
}
// i crediti che mancano al titolo possono essere quelli del gruppo se le sue opzioni bastano a farli (e non è più piccolo
// della più piccola)
function stimaPossibile(b, resto) {
  const cfu = b.esami.map(e => e.cfu || 0).filter(Boolean);
  return !cfu.length || (resto <= cfu.reduce((s, x) => s + x, 0) && resto >= Math.min(...cfu));
}
function opzioniGruppo(esami) {
  // opzioni divise per percorso («PFP 1…», «Gruppo A…»): un titoletto per ciascuno, nell'ordine della fonte
  if (!esami.some(e => e.sotto)) return `<ul class="esami">${esami.map(htmlEsame).join('')}</ul>`;
  const parti = [...new Set(esami.map(e => e.sotto || ''))];
  return parti.map(t => `${t ? `<p class="sottotitolo">${esc(t)}</p>` : ''}<ul class="esami">${esami.filter(e => (e.sotto || '') === t).map(htmlEsame).join('')}</ul>`).join('');
}
// il periodo come lo scrive la fonte («Secondo Ciclo Semestrale», «2° sem», «Periodo A») in parole comuni; i codici
// di periodo senza significato per chi legge («Periodo P», «non definito») non si mostrano
function periodoBello(p) {
  const t = String(p || '').toLowerCase().trim();
  if (!t) return '';
  if (/si può sostenere|^anni /.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
  const n = /\b(primo|prima|1°|1|i)\b/.test(t) ? 1 : /\b(secondo|seconda|2°|2|ii)\b/.test(t) ? 2 : /\b(terzo|terza|3°|3|iii)\b/.test(t) ? 3 : 0;
  if (/semestr|\bsem\b/.test(t)) return n ? `${n}° semestre` : 'semestrale';
  if (/trimestr/.test(t)) return n ? `${n}° trimestre` : '';
  if (/quadrimestr/.test(t)) return n ? `${n}° quadrimestre` : '';
  if (/annual|^annuale|ciclo annuale|durata annuale/.test(t)) return 'annuale';
  if (/^periodo \d$/.test(t)) return `${t.slice(-1)}° periodo`;
  return '';
}
const maiuscolaIniziale = t => t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
function htmlEsame(e) {
  const lingua = e.lingua && !/^italian/i.test(e.lingua) ? maiuscolaIniziale(e.lingua) : '';
  const info = [periodoBello(e.periodo), lingua === 'Inglese' ? 'in inglese' : lingua].filter(Boolean);
  return `<li class="esame"><span class="pallino" style="--c:${colore(e.macro)}" aria-hidden="true"></span><span class="nome">${esc(titoloCorso(e.nome))}</span><span class="cfu">${e.cfu != null ? `${fmt(e.cfu)} CFU` : ''}</span>
    ${info.length ? `<span class="info">${info.map(x => `<span>${esc(x)}</span>`).join('')}</span>` : ''}
    ${e.moduli ? `<span class="moduli">${e.moduli.map(([n, k]) => `<span>${esc(titoloCorso(n))}${k ? ` · ${fmt(k)} CFU` : ''}</span>`).join('')}</span>` : ''}</li>`;
}
function htmlTesti(x) {
  return `${x.ob ? `<section class="sezione"><h2>Cosa si studia</h2><div class="testo-lungo chiuso" id="testo-ob">${esc(x.ob)}</div><button type="button" class="btn" style="margin-top:10px" data-azione="apri-testo" data-testo="testo-ob" aria-expanded="false" aria-controls="testo-ob">Leggi tutto</button></section>` : ''}
    ${x.rq ? `<section class="sezione"><h2>Come si entra</h2><div class="testo-lungo chiuso" id="testo-rq">${esc(x.rq)}</div><button type="button" class="btn" style="margin-top:10px" data-azione="apri-testo" data-testo="testo-rq" aria-expanded="false" aria-controls="testo-rq">Leggi tutto</button></section>` : ''}
    ${x.sb ? `<section class="sezione"><h2>Dopo la laurea</h2><div class="profili">${x.sb.map(([prof, funz, comp, sbo]) => `<div class="profilo"><h3>${esc(titoloCorso((prof || '').split('\n')[0]).slice(0, 160))}</h3>${sbo ? `<p>${esc(sbo).slice(0, 700)}</p>` : funz ? `<p>${esc(funz).slice(0, 700)}</p>` : ''}</div>`).join('')}</div>
      ${x.pr ? `<h3 style="margin-top:20px;margin-bottom:10px">Professioni (classificazione ISTAT)</h3><div class="mestieri">${x.pr.map(p => `<span class="etichetta">${esc(p)}</span>`).join('')}</div>` : ''}</section>` : ''}`;
}

/* ---------------- materie ---------------- */
const statoMaterie = { q: '', scelta: null };
function vistaMaterie() {
  return `<div class="colonna">
    <h1>Dove si studia una materia</h1>
    <p class="tenue" style="margin:8px 0 18px;max-width:60ch">Scrivi il nome di un esame: trovi i corsi che lo hanno nel piano degli studi, tra i ${fmt(S.corsi.filter(c => c.piano).length)} di cui abbiamo il piano.</p>
    <form class="cerca-materia" id="form-materia" role="search"><input id="cerca-materia" type="search" placeholder="Per esempio: intelligenza artificiale, diritto tributario, anatomia" value="${esc(statoMaterie.q)}" autocomplete="off" aria-label="Nome dell'esame"></form>
    <div id="risultati-materia">${S.esami ? risultatiMaterie() : statoMaterie.q ? '<p class="caricamento">Carico l’indice degli esami…</p>' : ''}</div>
  </div>`;
}
function risultatiMaterie() {
  const q = norma(statoMaterie.q); if (q.length < 3) return '<p class="tenue" style="margin-top:16px">Scrivi almeno tre lettere.</p>';
  const parole = q.split(' '), E = S.esami, trovati = [];
  for (let k = 0; k < E.nomi.length; k++) { const n = E.norme[k]; if (parole.every(p => n.includes(p))) trovati.push(k); }
  trovati.sort((a, b) => E.corsi[b].length - E.corsi[a].length);
  if (!trovati.length) return '<div class="vuoto"><b>Nessun esame con questo nome.</b><span>Prova con una parola sola, per esempio «marketing».</span></div>';
  const sel = statoMaterie.scelta != null && trovati.includes(statoMaterie.scelta) ? [statoMaterie.scelta] : trovati.slice(0, 40);
  const corsi = [...new Set(sel.flatMap(k => E.corsi[k]))].map(i => S.corsi[i]).filter(Boolean);
  corsi.sort((a, b) => S.casa ? (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9) : a.nome.localeCompare(b.nome, 'it'));
  return `<div class="materie-trovate">
    <div><p class="tenue piccolo" style="margin-bottom:8px">${fmt(trovati.length)} nomi d'esame${trovati.length > 40 ? ', i 40 più diffusi' : ''}</p>
      <div class="nomi-materia">${trovati.slice(0, 40).map(k => `<button type="button" data-materia="${k}" aria-pressed="${statoMaterie.scelta === k}">${esc(titoloCorso(E.nomi[k]))}<span>${fmt(E.corsi[k].length)}</span></button>`).join('')}</div></div>
    <div><p class="tenue piccolo" style="margin-bottom:8px">${fmt(corsi.length)} corsi${statoMaterie.scelta != null ? ` con «${esc(titoloCorso(E.nomi[statoMaterie.scelta]))}»` : ''}${S.casa ? ', dal più vicino' : ''}</p>
      <div class="elenco">${corsi.slice(0, 80).map(rigaCorso).join('')}</div></div>
  </div>`;
}
async function caricaEsami() {
  if (S.esami) return;
  const E = await json('dati/esami.json');
  E.norme = E.nomi.map(norma); S.esami = E;
}

/* ---------------- confronta ---------------- */
function vistaConfronta() {
  const corsi = S.confronto.map(i => S.corsi[i]).filter(Boolean);
  if (!corsi.length) return `<div class="colonna"><h1>Confronta</h1><div class="vuoto"><b>Nessun corso da confrontare.</b><span>Apri un corso e premi «Confronta». Puoi metterne fino a tre uno accanto all’altro.</span><a class="btn primario" href="#esplora">Vai ai corsi</a></div></div>`;
  const righe = [
    ['Ateneo', c => esc(c.ateneoNome) + (cittaDi(c) ? `<div class="tenue piccolo">${esc(cittaDi(c))}${distanzaDi(c) != null ? ` · ${testoDistanza(distanzaDi(c))}` : ''}</div>` : '')],
    ['Classe', c => `<span class="codice">${esc(c.classe || '—')}</span>`],
    ['Tipo', c => `${TIPI_BREVI[c.tipo] || '—'}`],
    ['Accesso', c => esc(c.accesso === 'incerto' ? 'Da controllare sul sito del corso' : testoAccesso(c, true))],
    ['Lingua', c => esc(c.lingua || '—')],
    ['Di cosa è fatto', c => c.comp ? `<div class="barre-area">${c.comp.split('.').map(p => [p.slice(0, 3), +p.slice(3)]).map(([k, v]) => `<div><span><span class="b" style="--c:${colore(k)};width:${v}%;display:block"></span><span class="tenue">${esc(nomeMacro(k))}</span></span><span class="num">${v}%</span></div>`).join('')}</div>` : '<span class="tenue">Non disponibile</span>'],
  ];
  return `<div class="colonna"><h1 style="margin-bottom:16px">Confronta</h1>
    <div class="tabella-scorre"><table class="confronto">
      <thead><tr><th scope="col"><span class="tenue piccolo">${corsi.length} di 3</span></th>${corsi.map(c => `<th scope="col"><a href="#corso.${c.i}">${esc(titoloCorso(c.nome))}</a><div style="margin-top:8px"><button type="button" class="btn" data-azione="confronto" data-i="${c.i}">Togli</button></div></th>`).join('')}</tr></thead>
      <tbody>${righe.map(([n, f]) => `<tr><th scope="row">${n}</th>${corsi.map(c => `<td>${f(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="tenue piccolo" style="margin-top:12px">«Di cosa è fatto» somma i crediti degli esami obbligatori per area disciplinare, dai settori scientifici indicati nel piano.</p></div>`;
}

/* ---------------- fonti e note ---------------- */
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function dataLunga(iso) { const [a, m, g] = String(iso).split('-').map(Number); return a ? `${g} ${MESI[m - 1]} ${a}` : ''; }
function vistaFonti() {
  const attivi = S.corsi.filter(c => !c.fuori), conPiano = attivi.filter(c => c.piano);
  // per gli atenei con piani solo per una parte dei corsi contano i corsi rimasti senza
  const senza = Object.entries(S.motivi).map(([k, m]) => ({ nome: S.atenei[k] || k, motivo: m.motivo, n: attivi.filter(c => c.ateneo === k && !c.piano).length, tot: attivi.filter(c => c.ateneo === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  return `<div class="colonna testo-pagina">
    <h1>Fonti e note</h1>
    <p class="sotto">${NOME} raccoglie in un posto solo i corsi di laurea italiani e i loro piani degli esami, presi dalle pagine ufficiali degli atenei. È un aiuto per orientarsi: per iscriverti vale sempre quello che scrive l’ateneo.</p>
    <h2>Da dove vengono i dati</h2>
    <ul>
      <li><b>Elenco dei corsi</b> (${fmt(attivi.length)} corsi per l’anno accademico 2026/27, con classe, tipo, accesso e lingua): Universitaly, il portale del Ministero dell’Università e della Ricerca.</li>
      <li><b>Area di studio e sede</b>: open data del Ministero dell’Università (USTAT), elenco dei corsi 2025/26.</li>
      <li><b>Piani degli esami</b> (${fmt(conPiano.length)} corsi): cataloghi dei corsi e siti ufficiali degli atenei. Ogni piano dice da quale fonte viene e di quale anno è, con il collegamento per controllarlo.</li>
      <li><b>Obiettivi, requisiti d’accesso e sbocchi</b>: le schede pubblicate dagli atenei, riportate senza modifiche.</li>
      <li><b>Comuni e distanze</b>: GeoNames (licenza CC BY 4.0). Le distanze sono in linea d’aria.</li>
    </ul>
    <h2>Come leggere un piano</h2>
    <ul>
      <li>I crediti (CFU) misurano il lavoro di ogni esame: un anno di studio ne vale 60, quindi una triennale 180 e una magistrale 120.</li>
      <li>Il piano mostrato è quello di chi si iscrive nel 2026/27. Se l’ateneo non l’ha ancora pubblicato, si vede quello dell’anno prima, e la pagina del corso lo dice.</li>
      <li>Alcuni atenei pubblicano gli anni di una coorte uno alla volta: in quel caso la pagina dice quali anni mancano.</li>
      <li>Nei gruppi a scelta, quando il catalogo dell’ateneo non dice quanti crediti scegliere, lo scriviamo invece di indovinarlo: il numero esatto è nel regolamento del corso.</li>
      <li>Se i crediti mostrati non fanno quelli del titolo (180, 120, 300 o 360), la pagina del corso lo segnala.</li>
      <li>A volte il catalogo online di un ateneo non coincide con il regolamento del corso (un esame con crediti diversi, un gruppo a scelta descritto in un altro modo). Riportiamo il catalogo così com’è: in caso di dubbio vale il regolamento.</li>
    </ul>
    ${senza.length ? `<h2>Corsi senza piano degli esami</h2><ul>${senza.map(x => `<li><b>${esc(x.nome)}</b> (${x.n === x.tot ? `${fmt(x.n)} corsi` : `${fmt(x.n)} corsi su ${fmt(x.tot)}`}): ${esc(x.motivo)}.</li>`).join('')}</ul>` : ''}
    <h2>Privacy</h2>
    <p>${NOME} non usa cookie, non traccia le visite e non chiede dati a servizi esterni. Il comune di partenza e i corsi messi a confronto restano salvati solo nel tuo browser, per ritrovarli la volta dopo.</p>
    <h2>Aggiornamento</h2>
    <p>Dati raccolti il ${esc(dataLunga(S.aggiornato) || '—')}. I piani possono cambiare durante l’anno: prima di iscriverti controlla sempre sul sito del corso.</p>
  </div>`;
}

/* ---------------- instradamento ---------------- */
function rotta() {
  // le pagine statiche dei corsi (corsi/<nome>.html) dicono quale corso mostrare finché non si naviga altrove
  if (!location.hash && window.BIVIO_CORSO != null) return { nome: 'corso', arg: String(window.BIVIO_CORSO) };
  const h = (location.hash || '#casa').slice(1); const [nome, arg] = h.split('.'); return { nome: nome || 'casa', arg };
}
function disegna(inCima = true) {
  const { nome, arg } = rotta(), app = $('#app');
  const viste = { casa: vistaCasa, esplora: vistaEsplora, corso: () => vistaCorso(+arg), materie: vistaMaterie, confronta: vistaConfronta, fonti: vistaFonti,
    quiz: vistaQuiz, profilo: () => vistaProfilo(arg) };
  const y = window.scrollY;
  // chi usa la tastiera non deve perdere il punto in cui era: dopo il ridisegno il fuoco torna sullo stesso controllo
  const att = document.activeElement, dentro = att && att !== app && app.contains(att);
  const chiaveFuoco = dentro ? (att.id ? `#${CSS.escape(att.id)}` : [...att.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('')) : null;
  const cursore = dentro && typeof att.selectionStart === 'number' ? att.selectionStart : null;
  app.innerHTML = (viste[nome] || vistaCasa)();
  if (chiaveFuoco) { const el = app.querySelector(chiaveFuoco); if (el) { el.focus({ preventScroll: true }); if (cursore != null && el.setSelectionRange) try { el.setSelectionRange(cursore, cursore); } catch {} } }
  const sezione = nome === 'profilo' ? 'quiz' : nome;
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', false) || (a.dataset.nav === sezione && a.setAttribute('aria-current', 'page')));
  const n = $('#n-confronto'); n.hidden = !S.confronto.length; n.textContent = S.confronto.length;
  document.title = nome === 'corso' && S.corsi[+arg] ? `${titoloCorso(S.corsi[+arg].nome)} · ${NOME}` : sezione === 'quiz' ? `Quale laurea fa per te? · ${NOME}` : NOME;
  // il quiz ha i suoi dati: si caricano la prima volta che serve, poi si ridisegna
  if (sezione === 'quiz' && !S.orientamento) caricaOrientamento().then(() => disegna(false));
  if (nome === 'casa') requestAnimationFrame(() => disegnaMappa($('#mappa-casa'), S.corsi.filter(c => !c.fuori), { grande: true }));
  if (nome === 'esplora' && S.mappa) requestAnimationFrame(() => disegnaMappa($('#mappa-esplora'), trova()));
  if (nome === 'corso') riempiPiano(S.corsi[+arg]);
  if (nome === 'materie' && statoMaterie.q && !S.esami) caricaEsami().then(() => { const r = $('#risultati-materia'); if (r) r.innerHTML = risultatiMaterie(); });
  window.scrollTo(0, inCima ? 0 : y);
}
function vai(hash) { if (location.hash === hash) disegna(); else location.hash = hash; }

/* ---------------- eventi ---------------- */
let attesa = null;
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'cerca-testata' || t.id === 'cerca-casa' || t.id === 'cerca-esplora') {
    clearTimeout(attesa);
    attesa = setTimeout(() => { S.filtri = { ...S.filtri, q: t.value, comune: '', classe: '' }; S.mostrati = 60; if (S.casa && t.value) S.ordine = 'pertinenza'; S.scrivendo = rotta().nome !== 'esplora'; vai('#esplora'); }, 260);
  } else if (t.id === 'casa') riempiComuni(t.value);
  else if (t.id === 'cerca-materia') {
    clearTimeout(attesa);
    attesa = setTimeout(async () => { statoMaterie.q = t.value; statoMaterie.scelta = null; const r = $('#risultati-materia'); if (!S.esami) { r.innerHTML = '<p class="caricamento">Carico l’indice degli esami…</p>'; await caricaEsami(); } r.innerHTML = risultatiMaterie(); }, 300);
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'casa') impostaCasa(t.value);
  else if (t.dataset.filtroSelect) { S.filtri[t.dataset.filtroSelect] = t.value; S.mostrati = 60; disegna(false); }
  else if (t.dataset.filtroCheck) { S.filtri[t.dataset.filtroCheck] = t.checked; S.mostrati = 60; disegna(false); }
  else if (t.id === 'ordine') { S.ordine = t.value; disegna(false); }
});
document.addEventListener('submit', ev => { ev.preventDefault(); const i = ev.target.querySelector('input'); if (ev.target.id === 'form-casa') { S.filtri = { ...S.filtri, q: i.value, comune: '', classe: '' }; vai('#esplora'); } });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-esempio],[data-gruppo],[data-filtro],[data-azione],[data-percorso],[data-preset],[data-gruppo-link],[data-classe-link],[data-materia]');
  if (!b) return;
  if (b.tagName === 'A' && (b.dataset.gruppoLink || b.dataset.classeLink || b.dataset.preset || b.dataset.azione === 'azzera')) ev.preventDefault();
  if (b.dataset.esempio) { S.filtri = { ...S.filtri, q: b.dataset.esempio, comune: '', classe: '', gruppo: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.gruppo || b.dataset.gruppoLink) { S.filtri = { ...S.filtri, gruppo: b.dataset.gruppo || b.dataset.gruppoLink, q: '', comune: '', classe: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.classeLink) { S.filtri = { ...S.filtri, classe: b.dataset.classeLink, q: '', comune: '', gruppo: '', tipo: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.preset) { S.filtri = { ...S.filtri, tipo: b.dataset.preset, q: '', comune: '', classe: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.filtro) { S.filtri[b.dataset.filtro] = b.dataset.valore; S.mostrati = 60; disegna(false); }
  else if (b.dataset.percorso) { statoPiano.percorso = +b.dataset.percorso; riempiPiano(S.corsi[+rotta().arg]); }
  else if (b.dataset.materia) { statoMaterie.scelta = statoMaterie.scelta === +b.dataset.materia ? null : +b.dataset.materia; $('#risultati-materia').innerHTML = risultatiMaterie(); }
  else {
    const a = b.dataset.azione;
    if (a === 'altri') { S.mostrati += 60; disegna(false); }
    else if (a === 'azzera') { S.filtri = { q: '', tipo: '', gruppo: '', regione: '', accesso: '', inglese: false, distanza: false, piano: false, comune: '', classe: '' }; S.mostrati = 60; vai('#esplora'); }
    else if (a === 'mostra-filtri') $('#filtri').classList.toggle('aperti');
    else if (a === 'mappa') { S.mappa = !S.mappa; disegna(false); }
    else if (a === 'tema') { const t = temaScuro() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; salva('tema', t); aggiornaTema(); }
    else if (a === 'vai-anno') { const el = document.getElementById('anno-' + b.dataset.anno); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    else if (a === 'apri-testo') { const t = document.getElementById(b.dataset.testo); t.classList.remove('chiuso'); b.remove(); }
    else if (a === 'confronto') {
      const i = +b.dataset.i;
      S.confronto = S.confronto.includes(i) ? S.confronto.filter(x => x !== i) : [...S.confronto, i].slice(-3);
      salva('confronto', S.confronto); const keep = rotta().nome === 'corso'; disegna(!keep);
    }
  }
});
document.addEventListener('mousemove', ev => {
  const cv = ev.target.closest && ev.target.closest('#mappa-esplora'); const tip = $('#fumetto');
  if (!cv || !tip) { if (tip) tip.hidden = true; return; }
  const p = puntoSotto(cv, ev);
  if (!p) { tip.hidden = true; return; }
  tip.hidden = false; tip.style.left = p.px + 'px'; tip.style.top = p.py + 'px'; tip.textContent = `${S.comuni[p.comune][0]} · ${p.n} ${p.n === 1 ? 'corso' : 'corsi'}`;
});
document.addEventListener('click', ev => {
  const cv = ev.target.closest && ev.target.closest('#mappa-esplora'); if (!cv) return;
  const p = puntoSotto(cv, ev); if (!p) return;
  S.filtri = { ...S.filtri, comune: p.comune }; S.mostrati = 60; disegna(false);
});
window.addEventListener('hashchange', () => {
  disegna(true);
  // chi sta scrivendo nella ricerca resta nella casella; negli altri casi il fuoco va al titolo della nuova pagina
  if (S.scrivendo) {
    S.scrivendo = false;
    const i = [$('#cerca-esplora'), $('#cerca-testata')].find(x => x && x.offsetParent !== null);
    if (i) { i.value = S.filtri.q; i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch {} }
    return;
  }
  const t = $('#app h1'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
});
let ridimensiona = null;
window.addEventListener('resize', () => { clearTimeout(ridimensiona); ridimensiona = setTimeout(() => { if (rotta().nome === 'casa') disegnaMappa($('#mappa-casa'), S.corsi.filter(c => !c.fuori), { grande: true }); if ($('#mappa-esplora')) disegnaMappa($('#mappa-esplora'), trova()); }, 150); });

// tema: la scelta fatta col bottone resta nel browser; senza scelta vale quello del dispositivo
const temaScuro = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function aggiornaTema() {
  const b = $('#tema'); if (!b) return;
  const scuro = temaScuro(); b.toggleAttribute('data-scuro', scuro);
  b.setAttribute('aria-label', scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro'); b.title = b.getAttribute('aria-label');
  // le mappe prendono i colori al momento del disegno
  if ($('#mappa-casa')) disegnaMappa($('#mappa-casa'), S.corsi.filter(c => !c.fuori), { grande: true });
  if ($('#mappa-esplora')) disegnaMappa($('#mappa-esplora'), trova());
}
{ const t = leggi('tema', null); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; aggiornaTema(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aggiornaTema);

carica().then(() => disegna(true)).catch(e => { $('#app').innerHTML = `<div class="colonna vuoto"><b>Non riesco a caricare i dati.</b><span>${esc(e.message)}</span></div>`; });
