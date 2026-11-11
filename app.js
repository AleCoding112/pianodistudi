'use strict';
/* ---------------- stato e utilità ---------------- */
// inglese: '' | 'tutto' (solo corsi in inglese) | 'anche' (anche in parte); voglio/evito: aree di S.macro; peso: quota minima
// (%) delle aree volute negli esami obbligatori; quanto: 'niente' | 'poco' per le aree da escludere
const filtriVuoti = () => ({ q: '', tipo: '', gruppo: '', regione: '', accesso: '', inglese: '', distanza: false, piano: false, doppioTitolo: false, comune: '', classe: '',
  voglio: [], peso: 50, evito: [], quanto: 'niente', esame: '' });
const S = { corsi: [], atenei: {}, diz: {}, macro: [], settori: [], motivi: {}, comuni: {}, regioni: {}, piani: {}, testi: {}, dopo: {}, esami: null,
  filtri: filtriVuoti(),
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
const ANNO_COORTE = ANNO_ACCADEMICO.slice(0, 4);   // l'anno d'iscrizione di cui il sito mostra i piani: un piano di un'altra coorte lo dichiara
// l'anno d'iscrizione dopo quello del catalogo: chi legge adesso dalle superiori si iscrive lì, e il suo piano può cambiare
const ANNO_DOPO = `${+ANNO_COORTE + 1}/${String(+ANNO_COORTE + 2).slice(2)}`;
// l'anno accademico scritto corto, come nel resto del sito: «2025/2026» → «2025/26»
const annoBreve = a => String(a).replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2');
// le lingue di un corso in parole: «Italiano - Tedesco - Inglese» → «Italiano, tedesco e inglese»
// l'articolo plurale davanti a un numero: «gli 8», «gli 11», «gli 83», «gli 800», ma «i 149»
const iGli = n => /^8/.test(String(n)) || n === 11 || (n >= 11000 && n < 12000) ? 'gli' : 'i';
// e quello singolare davanti a una percentuale: «l’83%», «l’11%», «l’1,5%», ma «il 63%»
const ilL = n => /^(8|1(,|$)|11(,|$))/.test(fmt(n)) ? 'l’' : 'il ';
const linguaBella = l => l ? elencoSemplice(String(l).split(/\s+-\s+/).map((x, k) => k ? x.toLowerCase() : x)) : '';
const NOME = 'Piano di Studi';
// sul sito pubblicato (non nell'artifact) ci sono le pagine indice: i link ci portano anche i motori di ricerca
const PAGINE = !!document.querySelector('link[rel="canonical"]');
const pagClasse = cl => `classi/${norma(cl).replace(/ /g, '-')}.html`;
const TIPI_BREVI = { 'triennale': 'Triennale', 'magistrale': 'Magistrale', 'ciclo unico': 'Ciclo unico' };
const DURATA = { 'triennale': 3, 'magistrale': 2, 'ciclo unico': 5 };
// la durata di un corso: quella di Universitaly (nell'indice); senza, quella del tipo, e 6 anni per Medicina e Odontoiatria
const durataDi = c => c.durata || (c.tipo === 'ciclo unico' && /^LM-4[16]\b/.test(c.classe || '') ? 6 : DURATA[c.tipo]);
const TAF = { A: 'base', B: 'caratterizzante', C: 'affine', D: 'a scelta', E: 'prova finale e lingua', F: 'altre attività', S: 'tirocinio' };

function titoloCorso(n) {
  // molti nomi arrivano tutti maiuscoli (o tutti minuscoli, nell'indice delle materie): iniziale maiuscola, resto minuscolo
  if (!n) return '';
  n = n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLowerCase() : n.charAt(0).toUpperCase() + n.slice(1);
  // i numeri romani in fondo al nome («Fisica I», «Analisi matematica II (modulo A)») tornano maiuscoli
  return n.replace(/\s(i{1,3}|iv|vi{0,3}|ix|x)(?=$|\s*[-–(:,]|\s+(anno|modulo|parte|semestre|livello)\b)/g, m => m.toUpperCase());
}
const maiuscola = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
// il nome del corso con ciò che lo distingue da un altro dello stesso ateneo con lo stesso nome («Farmacia — Tirana»)
const nomeIntero = c => titoloCorso(c.nome) + (c.variante ? ` — ${c.variante}` : '');
const htmlVariante = c => c.variante ? ` <span class="variante">· ${esc(c.variante)}</span>` : '';
// più sedi («Imola e Bologna») o una sede all'estero («Tirana (Albania)»), da costruisci-sito.py; altrimenti il comune
function cittaDi(c) { if (c.sedi) return c.sedi; const x = S.comuni[c.comune]; return x ? x[0] : ''; }
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
// l'area di un settore scientifico: la tabella è quella del quiz (raccolta/settori.py), arriva con l'indice
function macroDi(settore) {
  for (const [rx, k] of S.settori) if (rx.test(settore || '')) return k;
  return 'alt';
}
// il nome di un settore (DM 639/2024) e la sua area; per i codici vecchi solo l'area
const nomeSettore = k => [S.nomiSettori[k], nomeMacro(macroDi(k))].filter(Boolean).join(' · ');
const nomeMacro = k => (S.macro.find(m => m[0] === k) || [k, 'Area non indicata dall’ateneo'])[1];
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
// un file che non arriva (rete interrotta, risposta del server sbagliata o tagliata) è un errore «dei dati»: la pagina
// propone di riprovare, e chi ha tenuto in memoria la richiesta fallita la dimentica (vedi conDati)
async function json(url) {
  const errore = m => Object.assign(new Error(`${url}: ${m}`), { dati: true });
  let r;
  try { r = await fetch(url); } catch (e) { throw errore(e.message); }
  if (!r.ok) throw errore(`risposta ${r.status}`);
  try { return await r.json(); } catch (e) { throw errore(e.message); }
}
async function carica() {
  // chi lavora un anno dopo la laurea (AlmaLaurea), per l'elenco: se il file non arriva l'elenco resta senza
  const [ind, com, lav] = await Promise.all([json('dati/indice.json'), json('dati/comuni.json'), json('dati/lavoro.json').catch(() => null)]);
  S.annoLavoro = lav?.anno;
  S.diz = ind.diz; S.atenei = ind.atenei; S.macro = ind.macro; S.settori = (ind.settori || []).map(([r, k]) => [new RegExp(r), k]); S.nomiSettori = ind.nomiSettori || {}; S.motivi = ind.motivi; S.statali = ind.statali || {}; S.doppiAtenei = ind.doppiAtenei || []; S.regoleAccesso = ind.regoleAccesso || null; S.comuni = com.comuni; S.regioni = com.regioni; S.aggiornato = ind.aggiornato;
  // nel piè di pagina la preposizione va con la data («all’11 novembre», «al 3 novembre»): nelle pagine scritte prima
  // la parola «al» sta fuori dal segnaposto, e si toglie
  const d = $('#aggiornato');
  if (d && S.aggiornato) {
    const t = d.previousSibling; if (t && t.nodeType === 3) t.nodeValue = t.nodeValue.replace(/\s+al\s*$/, ' ');
    d.textContent = conArticolo(S.aggiornato, 'al', 'all’');
  }
  const D = ind.diz;
  S.corsi = ind.corsi.map((v, i) => {
    const c = { i, nome: v[0], ateneo: D.ateneo[v[1]], classe: v[2], tipo: D.tipo[v[3]], area: D.area[v[4]], gruppo: D.gruppo[v[5]], comune: v[6],
      accesso: D.accesso[v[7]], didattica: D.didattica[v[8]], lingua: D.lingua[v[9]], sito: v[10], piano: v[11], fuori: !!v[12], nomeClasse: v[13], posti: v[14], comp: v[15], sitoAteneo: !!v[16], durata: v[17], test: v[18] || null, variante: v[19] || null, titolo: v[20] || null, sedi: v[21] || null, doppio: v[22] || null, lavoro: lav?.corsi?.[i] || null };
    c.ateneoNome = S.atenei[c.ateneo] || c.ateneo || '';
    c.quote = c.comp ? Object.fromEntries(c.comp.split('.').map(p => [p.slice(0, 3), +p.slice(3)])) : null;
    const x = S.comuni[c.comune];
    // anche la lingua e la didattica a distanza: «medicina in inglese», «ingegneria gestionale online»
    c.cerca = ' ' + norma([c.nome, c.variante, c.ateneoNome, (ind.alias || {})[c.ateneo], cittaDi(c), x ? x[1] : '', regioneDi(c), c.classe, c.nomeClasse,
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
    if (f.inglese === 'tutto' ? c.lingua !== 'Inglese' : f.inglese && !/Inglese/.test(c.lingua || '')) return false;
    if (f.voglio.length || f.evito.length) {
      // dalle quote degli esami obbligatori: senza piano non si sa, e il corso non si mostra
      if (!c.quote) return false;
      if (f.evito.some(k => (c.quote[k] || 0) > (f.quanto === 'poco' ? MAX_POCO : 0))) return false;
      if (f.voglio.length && piace(c) < f.peso) return false;
    }
    if (f.esame && S.esami && !corsiConEsame(f.esame).has(c.i)) return false;
    if (f.distanza && !/distanza/i.test(c.didattica || '')) return false;
    if (f.piano && !c.piano) return false;
    if (f.doppioTitolo && !conDoppioTitolo(c)) return false;
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
  else if (S.ordine === 'lavoro' && ordinePerLavoro(r)) r.sort((a, b) => fasciaLavoro(b) - fasciaLavoro(a) || (b.lavoro?.[0] ?? -1) - (a.lavoro?.[0] ?? -1) || (b.lavoro?.[2] || 0) - (a.lavoro?.[2] || 0) || a.nome.localeCompare(b.nome, 'it'));
  else r.sort((a, b) => punti(b) - punti(a) || piace(b) - piace(a) || (S.casa ? (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9) : 0) || a.nome.localeCompare(b.nome, 'it'));
  return r;
}
// per chi lavora un anno dopo la laurea si ordinano solo magistrali e cicli unici: dopo una triennale quasi tutti
// continuano a studiare, e lavora di meno chi si iscrive di più alla magistrale
const ordinePerLavoro = r => r.length > 0 && r.every(c => c.tipo !== 'triennale');
// prima i corsi con almeno RISPOSTE_LAVORO intervistati, poi quelli con meno (le percentuali su pochi ballano), poi quelli senza
const RISPOSTE_LAVORO = 30;
const fasciaLavoro = c => c.lavoro?.[0] == null ? 0 : c.lavoro[2] >= RISPOSTE_LAVORO ? 2 : 1;
// «cosa vuoi studiare»: quanta parte dei crediti obbligatori è nelle aree scelte (le quote sotto il 3% non sono nell'indice)
const MAX_POCO = 10;
const piace = c => S.filtri.voglio.reduce((t, k) => t + (c.quote?.[k] || 0), 0);
// «con un esame di»: l'intelligenza artificiale si scrive in tanti modi, e «ai» da solo è spesso una preposizione
// («applicata ai beni culturali», «dai 12 ai 18 anni»): conta se non è seguita da un plurale italiano e non chiude un «da … ai»
const IA_CERCATA = new Set(['ai', 'ia', 'a i', 'intelligenza artificiale', 'artificial intelligence']);
const IA_FRASI = /intelligenz[ae] artificial|artificial intelligence|machine learning|deep learning|apprendimento automatico|reti neurali|neural network|large language model/;
function esameIA(n) {
  if (IA_FRASI.test(n)) return true;
  const w = n.split(' ');
  return w.some((x, k) => x === 'ai'
    && !(k && /^(applicat|introduzion|access|contrast|adattament|orientat|approcci|educazion|support)/.test(w[k - 1]))
    && !w.slice(0, k).some(y => /^(dai|dagli|dalle|dal|dalla|dallo|dall)$/.test(y))
    && !(w[k + 1] && ((/i$/.test(w[k + 1]) && !/^i+$/.test(w[k + 1])) || /^(media|caregiver|big|new)$/.test(w[k + 1]))));
}
const esameCercato = { q: null, corsi: null };
function corsiConEsame(q) {
  // corso → fino a tre nomi d'esame trovati nel suo piano (obbligatori o a scelta, in tutti i curricula)
  q = norma(q);
  if (esameCercato.q === q) return esameCercato.corsi;
  const E = S.esami, ia = IA_CERCATA.has(q), parole = q.split(' '), corsi = new Map();
  for (let k = 0; k < E.nomi.length; k++) {
    if (ia ? !esameIA(E.norme[k]) : !parole.every(p => E.norme[k].includes(p))) continue;
    for (const i of E.corsi[k]) { const l = corsi.get(i) || []; if (l.length < 3) l.push(E.nomi[k]); corsi.set(i, l); }
  }
  Object.assign(esameCercato, { q, corsi });
  return corsi;
}
// le classi di un'area del Ministero, dalla più numerosa, con il loro nome (quello più comune fra i corsi) e quanti corsi
// ci sono, del tipo scelto nei filtri
function classiDelGruppo(g) {
  const f = S.filtri, m = new Map();
  for (const c of S.corsi) {
    if (c.gruppo !== g || c.fuori || !c.classe || (f.tipo && !(f.tipo === 'primo' ? c.tipo !== 'magistrale' : c.tipo === f.tipo))) continue;
    const x = m.get(c.classe) || { n: 0, nomi: new Map() };
    x.n++; if (c.nomeClasse) x.nomi.set(c.nomeClasse, (x.nomi.get(c.nomeClasse) || 0) + 1);
    m.set(c.classe, x);
  }
  return [...m.entries()].map(([cl, x]) => [cl, [...x.nomi.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || cl, x.n]).sort((a, b) => b[2] - a[2]);
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
        <p class="sotto">Tutti i corsi di laurea italiani e, per quasi tutti, il piano degli esami anno per anno: cosa studi davvero, in quale città, e come si entra.</p>
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
        <span class="tenue">Una decina di minuti, niente «ti piace la matematica?». Scegli tra situazioni concrete e assaggia alla cieca il primo anno di sei lauree: il risultato si basa sugli esami veri.</span></span>
      <span class="btn primario">Inizia</span>
    </a>
    <a class="invito-quiz secondo" href="#magistrale">
      <span class="tessera">${ICONE.gradini}</span>
      <span class="invito-testo"><span class="eyebrow">Hai già una triennale?</span><b>Il quiz per la magistrale</b>
        <span class="tenue">Parte dagli esami veri del tuo corso: segni quelli che ti sono piaciuti e quelli no, dici cosa cerchi, e trovi le magistrali che li riprendono.</span></span>
      <span class="btn">Inizia</span>
    </a>
    <div class="cifre">
      <div><b>${fmt(n)}</b><span>corsi di laurea attivi</span></div>
      <div><b>${fmt(atenei)}</b><span>atenei (università)</span></div>
      <div><b>${fmt(conPiano)}</b><span>con il piano degli esami</span></div>
      <div><b>${fmt(new Set(S.corsi.filter(c => c.piano).map(c => c.ateneo)).size)}</b><span>atenei con i piani raccolti</span></div>
    </div>
    <div class="strade">
      <a class="strada" href="#esplora" data-preset="primo"><span class="tessera">${ICONE.libro}</span><span class="eyebrow">Dopo le superiori</span><h3>Scegli il tuo corso</h3><p>Triennali e corsi a ciclo unico (come Medicina o Giurisprudenza): filtra per area e città, guarda gli esami anno per anno, confronta gli atenei.</p></a>
      <a class="strada" href="#esplora" data-preset="magistrale"><span class="tessera">${ICONE.gradini}</span><span class="eyebrow">Dopo la triennale</span><h3>Trova la magistrale</h3><p>Per ogni corso: esami, percorsi (curricula) e, dove l’ateneo li pubblica, i requisiti per entrare. Nella pagina della tua triennale, le magistrali più affini.</p></a>
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
  return `<div class="casa"><label for="casa">${ICONE.luogo}Da dove parti?</label><input id="casa" list="elenco-comuni" value="${esc(nome)}" placeholder="Il tuo comune" autocomplete="off"><datalist id="elenco-comuni"></datalist>${S.casa ? '<span class="tenue piccolo">Le distanze sono in linea d’aria.</span>' : ''}</div>`;
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

// la pagina dei corsi ha due parti: i filtri e i risultati. Scrivendo nel campo «con un esame di» si ridisegnano solo i
// risultati (il campo resta com'è, con quello che si sta scrivendo); toccando un filtro anche il pannello, che però resta
// dove si era arrivati scorrendolo
function vistaEsplora() {
  return `<div class="colonna esplora">
    <aside class="filtri${S.filtriAperti ? ' aperti' : ''}" id="filtri" aria-label="Filtri">${filtriEsplora()}</aside>
    <section id="risultati-esplora">${risultatiEsplora()}</section>
  </div>`;
}
const filtriAttivi = f => ['tipo', 'gruppo', 'regione', 'accesso', 'inglese', 'distanza', 'piano', 'doppioTitolo', 'comune', 'classe', 'voglio', 'evito', 'esame'].filter(k => Array.isArray(f[k]) ? f[k].length : f[k]).length;
const PESI = [[25, 'Almeno un quarto'], [50, 'Almeno metà'], [75, 'Quasi tutto']];
function filtriEsplora() {
  const f = S.filtri;
  const regioni = conteggio(null, regioneDi).map(x => x[0]).sort((a, b) => a.localeCompare(b, 'it'));
  const gruppi = conteggio('gruppo').map(x => x[0]).sort((a, b) => a.localeCompare(b, 'it'));
  const tipi = conteggio('tipo');
  const aree = S.macro.filter(([k]) => k !== 'alt');
  const chipArea = (lista, k, nome) => `<button type="button" class="scelta-btn" data-area="${k}" data-lista="${lista}" aria-pressed="${f[lista].includes(k)}">${esc(nome)}</button>`;
  const scelte = (filtro, voci) => `<div class="scelte">${voci.map(([v, t]) => `<button type="button" class="scelta-btn" data-filtro="${filtro}" data-valore="${v}" aria-pressed="${String(f[filtro]) === String(v)}">${t}</button>`).join('')}</div>`;
  const nomi = l => elencoSemplice(l.map(k => nomeMacro(k).toLowerCase()));
  return `
      <fieldset><legend>Tipo di laurea</legend><div class="scelte">
        <button type="button" class="scelta-btn" data-filtro="tipo" data-valore="" aria-pressed="${!f.tipo}">Tutti</button>
        <button type="button" class="scelta-btn" data-filtro="tipo" data-valore="primo" aria-pressed="${f.tipo === 'primo'}">Dopo le superiori</button>
        ${tipi.map(([t, n]) => `<button type="button" class="scelta-btn" data-filtro="tipo" data-valore="${esc(t)}" aria-pressed="${f.tipo === t}">${TIPI_BREVI[t] || esc(t)}<small>${fmt(n)}</small></button>`).join('')}
      </div></fieldset>
      <fieldset><legend>Cosa vuoi studiare</legend>
        <p class="nota-filtro">Scegli una o più materie: contano gli esami obbligatori.</p>
        <div class="scelte">${aree.map(([k, n]) => chipArea('voglio', k, n)).join('')}</div>
        ${f.voglio.length ? `<p class="nota-filtro forte">Quanto del corso deve essere ${esc(nomi(f.voglio))}?</p>${scelte('peso', PESI)}
        <p class="nota-filtro">${f.peso >= 75 ? 'Corsi fatti quasi solo di queste materie.' : f.peso >= 50 ? 'Almeno metà dei crediti obbligatori in queste materie: i corsi dove pesano soprattutto altre materie restano fuori.' : 'Corsi dove queste materie hanno una parte importante, anche accanto ad altre.'} Prima i corsi dove pesano di più.</p>` : ''}
      </fieldset>
      <fieldset><legend>Da escludere</legend>
        <p class="nota-filtro">Materie che non vuoi trovare fra gli esami obbligatori.</p>
        <div class="scelte">${aree.filter(([k]) => !f.voglio.includes(k)).map(([k, n]) => chipArea('evito', k, n)).join('')}</div>
        ${f.evito.length ? scelte('quanto', [['niente', 'Nessun esame'], ['poco', `Al massimo il ${MAX_POCO}%`]]) + `<p class="nota-filtro">${f.quanto === 'poco' ? `Al massimo il ${MAX_POCO}% dei crediti obbligatori in queste materie (circa uno o due esami)` : 'Nessun esame obbligatorio di queste materie (al massimo un piccolo modulo, sotto il 3% dei crediti)'}. Se il corso ha più percorsi, contiamo il primo. Fra gli esami a scelta possono esserci.</p>` : ''}
      </fieldset>
      <fieldset><legend>Con un esame di</legend>
        <input id="f-esame" type="search" value="${esc(f.esame)}" placeholder="Per esempio: intelligenza artificiale" autocomplete="off" aria-label="Con un esame di">
        <p class="nota-filtro">Cerca nei piani degli esami, anche fra gli esami a scelta.</p>
      </fieldset>
      <fieldset><legend>Lingua</legend>${scelte('inglese', [['', 'Tutte'], ['tutto', 'Solo in inglese'], ['anche', 'Anche in parte in inglese']])}</fieldset>
      <fieldset><legend>Regione</legend><select id="f-regione" data-filtro-select="regione" aria-label="Regione"><option value="">Tutta Italia</option>${regioni.map(g => `<option ${f.regione === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></fieldset>
      <fieldset><legend>Accesso</legend>${scelte('accesso', [['', 'Tutti'], ['libero', 'Libero'], ['programmato', 'Numero programmato']])}
        <p class="nota-filtro">A numero programmato (numero chiuso): posti limitati, con un test o una selezione per entrare.</p></fieldset>
      <fieldset><legend>Area ufficiale del Ministero</legend><select id="f-gruppo" data-filtro-select="gruppo" aria-label="Area ufficiale del Ministero"><option value="">Tutte le aree</option>${gruppi.map(g => `<option ${f.gruppo === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <p class="nota-filtro">I gruppi ufficiali del Ministero, diversi da «Cosa vuoi studiare»: comprendono anche i corsi di cui non abbiamo il piano.</p>
        ${f.gruppo ? `<p class="nota-filtro forte">Tipi di corso in quest’area (classi di laurea)</p><div class="scelte classi-area">
          <button type="button" class="scelta-btn" data-filtro="classe" data-valore="" aria-pressed="${!f.classe}">Tutte</button>
          ${classiDelGruppo(f.gruppo).map(([cl, nome, n]) => `<button type="button" class="scelta-btn" data-filtro="classe" data-valore="${esc(cl)}" aria-pressed="${f.classe === cl}" title="${esc(cl)}">${esc(nome)}<small>${fmt(n)}</small></button>`).join('')}</div>` : ''}</fieldset>
      <fieldset><legend>Altro</legend>
        <label class="interruttore"><input type="checkbox" id="f-piano" data-filtro-check="piano" ${f.piano ? 'checked' : ''}> Solo con il piano degli esami</label>
        <label class="interruttore"><input type="checkbox" id="f-distanza" data-filtro-check="distanza" ${f.distanza ? 'checked' : ''}> A distanza (telematico)</label>
        <label class="interruttore"><input type="checkbox" id="f-doppio" data-filtro-check="doppioTitolo" aria-describedby="f-doppio-nota" ${f.doppioTitolo ? 'checked' : ''}> Con doppio titolo o titolo congiunto</label>
        <p class="nota-filtro" id="f-doppio-nota">Solo dove l’ateneo lo dichiara: un elenco completo non esiste, e un corso che qui manca può averlo comunque.</p>
      </fieldset>
      ${filtriAttivi(f) ? '<button type="button" class="btn" data-azione="azzera">Togli i filtri</button>' : ''}`;
}
function risultatiEsplora() {
  const r = trova(), f = S.filtri, attivi = filtriAttivi(f), perLavoro = ordinePerLavoro(r);
  const attesaEsami = f.esame && !S.esami;
  const esameIn = f.esame && S.esami ? corsiConEsame(f.esame) : null;
  const note = [f.voglio.length || f.evito.length ? 'solo corsi di cui conosciamo gli esami obbligatori' : '',
    esameIn && IA_CERCATA.has(norma(f.esame)) ? 'esami di intelligenza artificiale, machine learning, deep learning, reti neurali' : '',
    S.ordine === 'lavoro' && perLavoro ? `in ordine di laureati che lavorano un anno dopo la laurea (AlmaLaurea, laureati del ${S.annoLavoro}): prima i corsi con almeno ${RISPOSTE_LAVORO} intervistati, poi quelli con meno, in fondo quelli senza dati. Dipende anche da chi si iscrive e da dove: non è un voto al corso` : ''].filter(Boolean);
  const quota = c => f.voglio.length ? `<div class="quota-scelta">${esc(elencoSemplice(f.voglio.map(k => nomeMacro(k))))}: ${piace(c)}% degli esami obbligatori</div>` : '';
  const riga = c => rigaCorso(c, quota(c) + (esameIn && esameIn.has(c.i) ? `<div class="esami-trovati">${esc(esameIn.get(c.i).map(titoloCorso).join(' · '))}</div>` : ''));
  const titolo = f.classe ? `Classe ${esc(f.classe)}` : f.comune ? `Corsi a ${esc(S.comuni[f.comune]?.[0] || '')}` : f.q ? `«${esc(f.q)}»` : f.gruppo ? esc(f.gruppo) : f.tipo === 'primo' ? 'Corsi dopo le superiori' : 'Tutti i corsi';
  return `
      <form class="cerca-esplora solo-telefono" role="search"><label class="campo">${ICONA_CERCA}<input id="cerca-esplora" type="search" value="${esc(f.q)}" placeholder="Cerca corso, ateneo o città" autocomplete="off" aria-label="Cerca un corso, un ateneo o una città"></label></form>
      <div class="barra-risultati">
        <div><h1>${titolo}</h1><p class="tenue piccolo num" role="status">${attesaEsami ? 'Carico gli esami…' : `${fmt(r.length)} corsi`}${f.comune || f.classe ? ' · <a href="#esplora" data-azione="azzera">tutti i corsi</a>' : ''}${f.q && interpreta(f.q).corrette.length ? ` · cerco anche «${esc(interpreta(f.q).corrette.join(' '))}»` : ''}${note.map(t => ' · ' + esc(t)).join('')}</p></div>
        <div class="destra">
          <button type="button" class="btn mostra-filtri" data-azione="mostra-filtri" aria-controls="filtri" aria-expanded="${!!S.filtriAperti}">Filtri${attivi ? ` (${attivi})` : ''}</button>
          <button type="button" class="btn" data-azione="mappa" aria-pressed="${S.mappa}">Mappa</button>
          <select id="ordine" aria-label="Ordina" style="width:auto"><option value="pertinenza" ${S.ordine === 'pertinenza' ? 'selected' : ''}>Più pertinenti</option><option value="distanza" ${S.ordine === 'distanza' ? 'selected' : ''} ${S.casa ? '' : 'disabled'}>Più vicini${S.casa ? '' : ' (scegli da dove parti)'}</option><option value="nome" ${S.ordine === 'nome' ? 'selected' : ''}>Per nome</option><option value="lavoro" ${S.ordine === 'lavoro' && perLavoro ? 'selected' : ''} ${perLavoro ? '' : 'disabled'}>Più laureati che lavorano${perLavoro ? '' : ' (solo magistrali e cicli unici)'}</option></select>
        </div>
      </div>
      <div style="margin-bottom:14px">${campoCasa()}</div>
      ${S.mappa ? '<div class="mappa-esplora"><canvas id="mappa-esplora" aria-label="Mappa dei corsi trovati"></canvas><div class="fumetto" id="fumetto" hidden></div></div>' : ''}
      ${attesaEsami ? '<p class="caricamento">Carico l’indice degli esami…</p>' : r.length ? `<div class="elenco">${r.slice(0, S.mostrati).map(riga).join('')}</div>${r.length > S.mostrati ? `<div class="altri"><button type="button" class="btn" data-azione="altri">Mostra altri ${fmt(Math.min(60, r.length - S.mostrati))}</button></div>` : ''}`
        : `<div class="vuoto"><b>Nessun corso con questi filtri.</b><span>${f.voglio.length && f.peso > 25 ? 'Prova a chiedere che le materie scelte pesino di meno, o a togliere un filtro.' : 'Prova a togliere un filtro o a cercare con meno parole.'}</span><button type="button" class="btn" data-azione="azzera">Togli i filtri</button></div>`}`;
}
function aggiornaRisultati() {
  // solo i risultati: il pannello dei filtri (e il campo in cui si sta scrivendo) non si tocca
  const box = $('#risultati-esplora'); if (!box) return;
  box.innerHTML = risultatiEsplora();
  if (S.mappa) requestAnimationFrame(() => disegnaMappa($('#mappa-esplora'), trova()));
}

// Medicina, Odontoiatria e Veterinaria in italiano: dal 2025/26 l'accesso nazionale passa dal «semestre filtro»
// accesso in parole: breve per gli elenchi, intero per la pagina del corso
// cosa vuol dire «libero» (DM 270/2004, art. 6): senza graduatoria, ma per una triennale serve una preparazione iniziale
// che l'ateneo di solito verifica (se non va, obblighi formativi aggiuntivi nel primo anno), per una magistrale i
// requisiti decisi dall'ateneo e una verifica della preparazione personale. E il test, se i requisiti dell'ateneo lo nominano
// come si entra in un corso ad accesso programmato nazionale, secondo i decreti dell'anno (raccolta/accesso.py): la prima
// regola per la classe, la lingua (solo italiano o solo inglese: i corsi in più lingue non si sa) e il tipo di ateneo
function regolaAccesso(c) {
  if (c.accesso !== 'programmato nazionale' || !S.regoleAccesso) return null;
  const lingua = c.lingua === 'Inglese' ? 'inglese' : c.lingua === 'Italiano' ? 'italiano' : null, statale = S.statali[c.ateneo];
  return S.regoleAccesso.regole.find(([classi, l, s]) => new RegExp(classi).test(c.classe || '') && (l == null || l === lingua) && (s == null || s === statale)) || null;
}
// per il filtro: doppio titolo o titolo congiunto dichiarato dal catalogo o dalle pagine ufficiali dell'ateneo (la sola
// convenzione con un ateneo straniero no: non dice che ci sia un titolo in più)
const conDoppioTitolo = c => !!(c.doppio || (c.titolo && (c.titolo[0] === 'D' || c.titolo[0] === 'S')));
// doppio titolo, titolo congiunto, convenzione con un ateneo straniero: solo dove lo dichiara il catalogo dell'ateneo
// (campo corsiConsorziati dei cataloghi Cineca). Non esiste un elenco completo: dove manca, non vuol dire che non ci sia
function htmlTitolo(c) {
  if (!c.titolo && !c.doppio) return '';
  if (!c.titolo) return htmlDoppio(c);
  // i nomi tutti in maiuscolo, come li scrive a volte il catalogo, con le maiuscole dei nomi propri
  const PICCOLE = new Set(['of', 'de', 'del', 'della', 'di', 'da', 'la', 'le', 'des', 'du', 'and', 'e', 'y', 'für', 'der', 'van', 'in']);
  const proprio = n => n !== n.toUpperCase() ? n : n.toLowerCase().split(' ').map((w, k) => k && PICCOLE.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const [tipo, altri] = c.titolo, chi = altri.map(n => esc(proprio(n))).join(', ');
  const nota = 'Non esiste un elenco completo dei corsi con doppio titolo: dove questo sito non lo indica, potrebbe esserci comunque.';
  const frase = tipo === 'D' ? `<b>Doppio titolo.</b> Il catalogo dell’ateneo dichiara un doppio titolo con: ${chi}. Per chi vale e a quali condizioni lo dice il sito del corso. ${nota}`
    : tipo === 'S' ? `<b>Titolo congiunto.</b> Il catalogo dell’ateneo dichiara un titolo congiunto con: ${chi}. Per chi vale e a quali condizioni lo dice il sito del corso. ${nota}`
    : `<b>In convenzione con:</b> ${chi}. Il catalogo dell’ateneo non dice se c’è un doppio titolo: controlla sul sito del corso.`;
  return `<p class="nota regola-accesso">${frase}</p>` + htmlDoppio(c);
}
// doppio titolo dalle pagine ufficiali «doppio titolo / double degree» degli atenei controllati (costruisci-sito.py,
// DOPPI_ATENEI): [tipo, per chi, partner, pagina]. Per chi lo dice la pagina; se non lo dice, lo si scrive
function htmlDoppio(c) {
  if (!c.doppio) return '';
  const TIPI = { D: 'Doppio titolo', M: 'Titolo multiplo', DM: 'Doppio o multiplo titolo', C: 'Titolo congiunto', X: 'Doppio titolo o titolo congiunto' };
  const CHI = { s: 'solo per gli studenti selezionati per il programma', t: 'per tutti gli iscritti' };
  const controllati = (S.doppiAtenei || []).map(a => S.atenei[a] || a).join(', ');
  // cond: il limite che la fonte dice (un curriculum, quando candidarsi), verificato (costruisci-sito.py, _doppi)
  // (senza «per chi» il sito non dice che la pagina non lo dice: l'elenco dell'ateneo non lo dice, ma la pagina del corso
  // spesso sì, un curriculum o un bando; verifica del 4/11/2026, verifica/ricerche/doppio-titolo-pubblica-verifica-*.md)
  const righe = c.doppio.map(([tipo, chi, soci, url, cond]) => `<b>${esc(TIPI[tipo] || TIPI.X)}</b>${soci && soci.length ? ` con ${esc(soci.join(', '))}` : ''}`
    + `${chi ? `: ${esc(CHI[chi])}${cond ? `; ${esc(cond)}` : ''}` : cond ? `: ${esc(cond)}` : tipo === 'C' ? ': un solo titolo, riconosciuto da tutti gli atenei del programma' : ''}.`
    + `${url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">Fonte: pagina dell’ateneo</a>.` : ''}`);
  return `<p class="nota regola-accesso">${righe.join('<br>')} <span class="tenue">Per chi vale (tutti gli iscritti, un curriculum, chi vince un bando) e quando candidarsi (a volte già durante la triennale) lo dice la pagina del programma, quando l’ateneo lo scrive. Elenco costruito dalle pagine ufficiali di questi atenei: ${esc(controllati)}; per gli altri non è controllato.</span></p>`;
}
// sotto i dati del corso, a tutta larghezza: la frase è lunga e nella colonna dell'accesso, sul telefono, non ci sta
function htmlRegolaAccesso(c) {
  const r = regolaAccesso(c);
  return r ? `<p class="nota regola-accesso"><b>Come si entra.</b> ${esc(r[3])} Vale per il ${esc(S.regoleAccesso.anno)}: per l’anno dopo controlla il bando quando esce. <a href="${esc(r[5])}" target="_blank" rel="noopener">Fonte: ${esc(r[4])}</a></p>` : '';
}
function notaAccesso(c) {
  const p = t => `<div class="tenue piccolo" style="font-weight:400">${t}</div>`;
  const test = c.test ? ` Per questo corso i requisiti dell’ateneo indicano il ${esc(c.test)}${/TOLC|CEnT/.test(c.test) ? ' (CISIA)' : ''}.` : '';
  // negli atenei non statali (non telematici) «libero» viene da Universitaly e a volte non è vero: IULM, Cattolica, LUMSA
  // hanno corsi con posti o colloquio che Universitaly dà liberi (verifica indipendente dell'11/11/2026). Dove il catalogo
  // dell'ateneo dice «programmato» lo si corregge già (costruisci-sito.py); qui lo si dice per gli altri
  const nonStatale = S.statali[c.ateneo] === false && !/distanza/i.test(c.didattica || '') && !/telematic|unitelma/i.test((S.atenei[c.ateneo] || '') + c.ateneo);
  // (per le magistrali con in più i requisiti d'accesso, che servono comunque)
  const requisiti = 'servono i requisiti d’accesso dell’ateneo (una laurea di un certo tipo o un minimo di crediti in certe materie) e una verifica della preparazione personale.';
  if (c.accesso === 'libero' && nonStatale)
    return p('Così dice Universitaly, ma in alcuni atenei non statali anche i corsi indicati come liberi hanno posti limitati, un test o un colloquio: controlla il bando dell’ateneo.'
      + (c.tipo === 'magistrale' ? ` In ogni caso ${requisiti}` : test));
  if (c.accesso === 'libero' || c.accesso === 'libero con test')
    return p(c.tipo === 'magistrale' ? `Senza graduatoria, ma ${requisiti}`
      : `Senza graduatoria. Di solito c’è una verifica delle conoscenze iniziali, che non esclude nessuno: chi non la supera ha obblighi formativi aggiuntivi (OFA) da recuperare, di solito nel primo anno.${test}`);
  // «programmato» da solo non dice niente a chi viene dalle superiori: cosa vuol dire, locale o nazionale
  if ((c.accesso || '').startsWith('programmato'))
    return p((c.accesso === 'programmato nazionale' ? 'Posti limitati (numero chiuso), con regole uguali in tutta Italia.' : 'Posti limitati (numero chiuso), con una selezione decisa dall’ateneo.') + test);
  return c.test ? p(test.trim()) : '';
}
function testoAccesso(c, intero) {
  const a = c.accesso || '';
  if (a.startsWith('programmato')) return intero ? `Numero ${a}${c.posti ? `, ${fmt(c.posti)} posti` : ''}` : `Numero programmato${c.posti ? ` · ${fmt(c.posti)} posti` : ''}`;
  if (a === 'libero con test') return intero ? 'Libero, con una prova di verifica' : 'Libero, con test';
  if (a === 'libero') return intero ? 'Libero' : 'Accesso libero';
  if (a === 'incerto') return intero ? 'Da controllare' : '';
  return intero ? 'Non indicato' : '';
}
// un anno dopo la laurea, dalle schede AlmaLaurea: per una triennale anche chi si è iscritto a una magistrale, perché
// lavorare subito non è quello che fa la maggior parte
function lavoroRiga(c) {
  const [lav, mag, n] = c.lavoro || [];
  if (lav == null) return '';
  const t = c.tipo === 'triennale' && mag != null ? `${ilL(mag)}${fmt(mag)}% fa una magistrale, ${ilL(lav)}${fmt(lav)}% lavora (anche studiando)` : `${ilL(lav)}${fmt(lav)}% lavora`;
  return `<div class="lavoro-riga">Un anno dopo la laurea: ${t} <span class="nowrap">· ${fmt(n)} intervistati</span></div>`;
}
function rigaCorso(c, extra = '') {
  const d = distanzaDi(c);
  const accesso = testoAccesso(c, false);
  return `<a class="riga" href="#corso.${c.i}">
    <div style="min-width:0">
      <div class="titolo-riga">${esc(titoloCorso(c.nome))}${htmlVariante(c)}</div>
      <div class="sotto-riga">${esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}</div>${extra}${lavoroRiga(c)}
      <div class="etichette">
        ${c.classe ? `<span class="etichetta codice" title="${esc(c.nomeClasse || '')}">${esc(c.classe)}</span>` : ''}
        ${c.tipo ? `<span class="etichetta">${TIPI_BREVI[c.tipo] || esc(c.tipo)}</span>` : ''}
        ${accesso ? `<span class="etichetta${c.accesso.startsWith('programmato') ? ' avviso' : ''}">${accesso}</span>` : ''}
        ${/Inglese/.test(c.lingua || '') ? `<span class="etichetta">${c.lingua === 'Inglese' ? 'In inglese' : esc(linguaBella(c.lingua))}</span>` : ''}
        ${/distanza/i.test(c.didattica || '') ? `<span class="etichetta">${esc(c.didattica)}</span>` : ''}
      </div>
    </div>
    <div class="lato-riga">
      ${d != null ? `<span class="distanza">${testoDistanza(d)}</span>` : ''}
      ${c.comp ? barraComposizione(c.comp) + areaPrincipale(c.comp) : c.piano ? '<span class="senza-piano">Piano disponibile</span>' : '<span class="senza-piano">Piano non disponibile</span>'}
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
  if (!c) return `<div class="colonna vuoto">Corso non trovato. <a href="#esplora">Torna all’elenco</a></div>`;
  const nelConfronto = S.confronto.includes(c.i);
  const accesso = testoAccesso(c, true);
  return `<div class="colonna">
    <nav class="briciole" aria-label="Percorso"><a href="#esplora">Corsi</a><span>/</span>${c.gruppo ? `<a href="#esplora" data-gruppo-link="${esc(c.gruppo)}">${esc(c.gruppo)}</a><span>/</span>` : ''}${c.classe && PAGINE ? `<a href="${pagClasse(c.classe)}">${esc(c.classe)}</a>` : `<span>${esc(c.classe || '')}</span>`}</nav>
    <div class="testa-corso">
      <div>
        <h1>${esc(titoloCorso(c.nome))}${c.variante ? `<span class="variante-titolo">${esc(maiuscola(c.variante))}</span>` : ''}</h1>
        <p class="ateneo">${PAGINE ? `<a href="atenei/${esc(c.ateneo)}.html">${esc(c.ateneoNome)}</a>` : esc(c.ateneoNome)}${cittaDi(c) ? ` · ${esc(cittaDi(c))}` : ''}${distanzaDi(c) != null ? ` <span class="tenue">· ${distanzaDi(c) < 1 ? 'nel tuo comune' : `a ${testoDistanza(distanzaDi(c))} da casa`}</span>` : ''}</p>
      </div>
      <div class="azioni">
        <button type="button" class="btn" data-azione="confronto" data-i="${c.i}" aria-pressed="${nelConfronto}">${nelConfronto ? 'Nel confronto' : 'Confronta'}</button>
        ${c.sito ? `<a class="btn primario" href="${esc(c.sito)}" target="_blank" rel="noopener">${c.sitoAteneo ? 'Sito dell’ateneo' : 'Sito del corso'} ↗</a>` : ''}
      </div>
    </div>
    <dl class="fatti">
      <div><dt>Tipo</dt><dd>${TIPI_BREVI[c.tipo] || esc(c.tipo || '—')}${durataDi(c) ? `, ${durataDi(c)} anni` : ''}</dd></div>
      <div><dt>Classe di laurea</dt><dd><span class="codice">${esc(c.classe || '—')}</span>${c.nomeClasse ? `<div class="tenue piccolo" style="font-weight:400">${esc(c.nomeClasse)}</div>` : ''}${c.classe ? '<div class="tenue piccolo" style="font-weight:400">Stessa classe vuol dire materie di base simili e titolo con lo stesso valore legale.</div>' : ''}</dd></div>
      <div><dt>Accesso</dt><dd>${esc(accesso)}${notaAccesso(c)}${c.accesso === 'incerto' ? '<div class="tenue piccolo" style="font-weight:400">Ministero e ateneo non dicono la stessa cosa (libero o a numero programmato, cioè con posti limitati): vale quanto scritto sul sito del corso.</div>' : ''}</dd></div>
      <div><dt>Lingua</dt><dd>${esc(linguaBella(c.lingua) || '—')}</dd></div>
      <div><dt>Didattica</dt><dd>${esc(c.didattica || '—')}</dd></div>
    </dl>
    ${htmlRegolaAccesso(c)}
    ${htmlTitolo(c)}
    ${gemelli(c)}
    <div id="piano">${c.piano ? '<p class="caricamento">Carico il piano degli esami…</p>' : sezioneSenzaPiano(c)}</div>
    <div id="testi"></div>
    <div id="laureati"></div>
    ${c.tipo === 'triennale' && c.piano ? '<div id="dopo"></div>' : ''}
    ${sezioneAltrove(c)}
  </div>`;
}
function sezioneSenzaPiano(c) {
  // il motivo (raccolta/atenei-motivi.json) è scritto senza soggetto, perché vale anche per l'elenco delle Fonti, al plurale;
  // senza motivo scritto non si sa perché manca: lo si dice così, senza dare la colpa all'ateneo
  const m = S.motivi[c.ateneo];
  return `<section class="sezione"><h2>Piano degli esami</h2>
    <p class="nota avviso">Non disponibile: ${m ? esc(m.motivo) : 'non l’abbiamo trovato nelle pagine dell’ateneo da cui raccogliamo i piani'}. ${c.sito ? `Cercalo sul <a href="${esc(c.sito)}" target="_blank" rel="noopener">${c.sitoAteneo ? 'sito dell’ateneo' : 'sito del corso'}</a>.` : ''}</p>
  </section>`;
}
// altri corsi dello stesso ateneo con lo stesso nome, classe e città, che nemmeno le fonti distinguono: lo si dice
function gemelli(c) {
  const g = S.corsi.filter(x => x !== c && x.ateneo === c.ateneo && x.classe === c.classe && x.comune === c.comune && norma(x.nome) === norma(c.nome) && (x.variante || '') === (c.variante || ''));
  if (!g.length) return '';
  return `<p class="nota avviso">In questo ateneo, nella stessa città, c’è ${g.length === 1 ? 'un altro corso' : `altri ${g.length} corsi`} con lo stesso nome e la stessa classe:
    ${g.map((x, n) => `<a href="#corso.${x.i}">${g.length === 1 ? 'apri l’altro corso' : `altro corso ${n + 1}`}</a>`).join(', ')}. Le fonti ufficiali non dicono in cosa sono diversi: confronta i piani degli esami e controlla sul sito del corso.</p>`;
}
function sezioneAltrove(c) {
  if (!c.classe) return '';
  const altri = S.corsi.filter(x => x.classe === c.classe && x.i !== c.i && !x.fuori);
  if (!altri.length) return '';
  altri.sort((a, b) => S.casa ? (distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9) : a.ateneoNome.localeCompare(b.ateneoNome, 'it'));
  return `<section class="sezione altrove"><h2>Lo stesso tipo di corso altrove <small>altri ${fmt(altri.length)} corsi della classe ${esc(c.classe)}${S.casa ? ', dal più vicino' : ''}</small></h2>
    <div class="elenco">${altri.slice(0, 6).map(c => rigaCorso(c)).join('')}</div>
    <div class="altri"><a class="btn" href="${PAGINE ? pagClasse(c.classe) : '#esplora'}" data-classe-link="${esc(c.classe)}">Vedi tutti ${iGli(altri.length + 1)} ${fmt(altri.length + 1)}, compreso questo</a></div></section>`;
}

const statoPiano = { percorso: 0 };
async function riempiPiano(c) {
  const box = $('#piano'); if (!box || !c.piano) return;
  try {
    const dati = await pianiDi(c.ateneo), p = dati.corsi[c.piano];
    if (!p) { box.innerHTML = sezioneSenzaPiano(c); return; }
    statoPiano.percorso = Math.min(statoPiano.percorso, p.p.length - 1);
    box.innerHTML = htmlPiano(c, p, dati.esami);
  } catch (e) {
    box.innerHTML = `<p class="nota avviso" role="alert">Non riusciamo a caricare il piano: forse la connessione si è interrotta.
      <button type="button" class="btn" data-azione="riprova">Riprova</button> <span class="tenue piccolo">Motivo: ${esc(e.message)}</span></p>`;
  }
  const t = await testiDi(c.ateneo), x = t[c.piano];
  const tb = $('#testi'); if (tb && x) { tb.innerHTML = htmlTesti(x, ((await pianiDi(c.ateneo)).corsi[c.piano] || {}).f); sistemaTestiLunghi(tb); }
}
function esameDa(v) {
  const [nome, cfu, settori, periodo, taf, lingua, moduli, sotto] = v;
  const s = (settori || '').split(';').filter(Boolean).map(x => { const [k, n] = x.split(':'); return { k, n: n ? +n : null }; });
  return { nome, cfu, settori: s, periodo, taf, lingua, moduli, sotto, macro: s.length ? macroDi(s.slice().sort((a, b) => (b.n || 0) - (a.n || 0))[0].k) : 'alt' };
}
function regolaGruppo(b) {
  // i riquadri a parte: i crediti in sovrannumero sono facoltativi; obblighi formativi aggiuntivi (anche scritti solo «OFA»
  // o «debito») e requisiti per l'iscrizione non sono facoltativi per chi li deve fare, ma non danno crediti
  // (titolo «Senza crediti»); test iniziali e corsi obbligatori che il regolamento mette «in sovrannumero» hanno crediti,
  // ma fuori da quelli che servono per la laurea (Pisa, 10/11/2026)
  if (b.x) return /fuori dai crediti del titolo/i.test(b.e || '') ? 'Fuori dai crediti della laurea' : /obblighi formativi|requisiti per|\bOFA\b|debito/i.test(b.e || '') ? 'Senza crediti' : 'Facoltativo';
  // percorsi alternativi (pulisci-catalogo.py): se ne sceglie uno intero, con i crediti di un percorso
  if (b.p) return `Scegli un percorso${b.c ? ` · ${fmt(b.c)} CFU` : ''}`;
  // pacchetti di esami da prendere interi (ESSE3, regole contate in blocchi)
  if (b.q) return `Scegli ${(b.k || 1) === 1 ? 'un gruppo di esami' : `${b.k} gruppi di esami`}${b.c ? ` · ${fmt(b.c)}${b.m ? `–${fmt(b.m)}` : ''} CFU` : ''}`;
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
  // e per settore: un corso può essere fatto quasi tutto di pochi settori anche con esami dai nomi diversi
  const perSettore = {};
  for (const a of tuttiAnni) for (const b of a.blocchi) if (!b.s && !b.x) for (const e of b.esami) {
    if (!e.cfu || !e.settori.length) continue;
    const s = e.settori.filter(x => x.n);
    if (s.length) s.forEach(x => { perSettore[x.k] = (perSettore[x.k] || 0) + x.n; });
    else e.settori.forEach(x => { perSettore[x.k] = (perSettore[x.k] || 0) + e.cfu / e.settori.length; });
  }
  const conSettore = Object.values(perSettore).reduce((a, b) => a + b, 0);
  const primiSettori = Object.entries(perSettore).sort((a, b) => b[1] - a[1]).filter(([, v]) => v / conSettore >= .05).slice(0, 6);
  // per nome (il codice resta al passaggio del mouse); i codici vecchi, che non hanno un nome nella tabella, come sono
  const settoriTop = conSettore >= 30 && primiSettori.length ? `<p class="settori-top"><span class="tenue">Le materie con più crediti obbligatori${conSettore < .9 * totObb ? ' (fra gli esami di cui il piano dice la materia)' : ''}:</span> ${primiSettori.map(([k, v]) => `${S.nomiSettori[k] ? `<span title="${esc(k)}">${esc(S.nomiSettori[k])}</span>` : `<span class="codice" title="${esc(nomeSettore(k))}">${esc(k)}</span>`}&nbsp;${Math.round(100 * v / conSettore)}%`).join(' · ')}
    <br><span class="tenue">Il codice sotto ogni esame (per esempio <span class="codice">${esc(primiSettori[0][0])}</span>) è il suo settore scientifico: la materia, con una sigla uguale in tutta Italia.</span></p>` : '';
  const legenda = Object.entries(quote).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span><i style="--c:${colore(k)}"></i>${esc(nomeMacro(k))} <span class="tenue num">${100 * v / totQ < .5 ? 'meno dell’1' : Math.round(100 * v / totQ)}%</span></span>`).join('') + '<span><i class="scelta"></i>Esami a scelta</span>';
  const legendaIgnoti = '<span><i class="ignota"></i>A scelta, crediti non indicati</span>';
  // la striscia: per ogni anno gli obbligatori e i gruppi a scelta con i crediti indicati; gli esami che si possono fare
  // in qualsiasi anno in una riga a parte (dividerli fra gli anni sarebbe inventare). I gruppi di cui l'ateneo non dice
  // quanti crediti scegliere hanno una cella con il punto di domanda, fuori dal conto
  let ignoti = false;
  const riga = (a, blocchi) => {
    let cfu = 0; const senzaCfu = [];
    const celle = blocchi.filter(b => !b.x).flatMap(b => b.s
      ? (b.c ? [(cfu += b.c, `<span class="cella scelta" style="--cfu:${b.c}" title="${esc(regolaGruppo(b) + ': ' + (b.e || ''))}"></span>`)] : (senzaCfu.push(b), []))
      : b.esami.filter(e => e.cfu).map(e => (cfu += e.cfu, `<span class="cella" style="--cfu:${e.cfu};--c:${colore(e.macro)}" title="${esc(`${e.nome} · ${e.cfu} CFU`)}"></span>`)));
    if (senzaCfu.length) { ignoti = true; celle.push(`<span class="cella ignota" title="${esc(`A scelta, crediti non indicati dall’ateneo: ${senzaCfu.map(b => regolaGruppo(b) + (b.e ? ` (${b.e})` : '')).join('; ')}`)}">?</span>`); }
    if (!celle.length) return null;
    const lbl = a == null ? `<button type="button" class="lbl due-righe" data-azione="vai-anno" data-anno="qualsiasi">Qualsiasi anno</button>`
      : `<button type="button" class="lbl" data-azione="vai-anno" data-anno="${a}">${a}° anno</button>`;
    return { cfu, celle, lbl };
  };
  const chiudi = (r, scala) => {
    const { cfu, celle, lbl } = r;
    // le righe hanno la stessa scala: un anno da 30 crediti è lungo la metà di uno da 60
    r.html = `<div class="anno-striscia">${lbl}<div class="celle">${celle.join('')}${scala > cfu ? `<span class="resto" style="--cfu:${scala - cfu}"></span>` : ''}</div><span class="tot">${cfu ? fmt(Math.round(cfu)) : '?'} CFU</span></div>`;
    return r;
  };
  const perAnno = tuttiAnni.filter(a => a.anno != null).map(a => riga(a.anno, a.blocchi)).filter(Boolean);
  const qualsiasi = riga(null, tuttiAnni.filter(a => a.anno == null).flatMap(a => a.blocchi));
  const negliAnni = perAnno.reduce((s, r) => s + r.cfu, 0), tutte = [...perAnno, qualsiasi].filter(Boolean);
  const scala = Math.max(60, ...tutte.map(r => r.cfu));
  const righe = tutte.map(r => chiudi(r, scala).html).join('')
    + (qualsiasi && qualsiasi.cfu && perAnno.length ? `<p class="tot-striscia">In tutto ${fmt(Math.round(negliAnni + qualsiasi.cfu))} CFU: ${fmt(Math.round(negliAnni))} nei singoli anni e ${fmt(Math.round(qualsiasi.cfu))} da fare in qualsiasi anno.</p>` : '');
  // i crediti del titolo: 60 per ogni anno di corso
  const durata = durataDi(c), atteso = durata ? 60 * durata : null;
  const fonte = p.f || {};
  // alcune fonti pubblicano gli anni di una coorte uno alla volta: lo si dice, invece di lasciar credere che il piano finisca lì
  const ultimo = Math.max(0, ...tuttiAnni.map(a => a.anno || 0));
  // se la coorte 2026/27 non l'abbiamo trovata si mostra la più recente, e lo si dice chiaramente (o la successiva, quando
  // l'ateneo ha già tolto il 2026/27 dal suo sito: Bolzano, pagine 2027/28). Chi legge adesso dalle superiori si iscrive
  // nel 2027/28: il suo piano può essere diverso, e lo si dice una volta (i verbi restano veri per ogni anno del piano)
  const annoPiano = fonte.anno ? +String(fonte.anno).slice(0, 4) : 0, dopo = annoPiano > +ANNO_COORTE, annoF = esc(annoBreve(fonte.anno || ''));
  const vecchio = !annoPiano || annoPiano === +ANNO_COORTE ? `<p class="nota">Per chi si iscrive nel ${ANNO_DOPO} il piano può cambiare: quando l’ateneo pubblica quello nuovo, lo trovi sul sito del corso.</p>`
    : dopo ? `<p class="nota">Questo è già il piano per chi si iscrive nel ${annoF}: l’ateneo pubblica solo questo. Per chi si è iscritto prima può essere diverso.</p>`
    : `<p class="nota avviso">Questo è il piano di chi si è iscritto nel ${annoF}: uno più recente non l’abbiamo trovato nelle pagine dell’ateneo. Per chi si è iscritto dopo, e per chi si iscrive nel ${ANNO_DOPO}, può essere diverso: controlla sul sito del corso.</p>`;
  // anni mancanti: in fondo (pubblicati uno alla volta) o in mezzo (l'anno 1 di una coorte vecchia non è più in catalogo)
  const presenti = new Set(tuttiAnni.map(a => a.anno).filter(Boolean));
  const mancanti = presenti.size && durata ? Array.from({ length: durata }, (_, k) => k + 1).filter(n => !presenti.has(n)) : [];
  // i crediti mostrati devono fare quelli del titolo: se non tornano lo si dice, invece di lasciar credere che il piano sia completo
  let tot = 0, totMax = 0, senzaCrediti = false, obbligatori = 0, inGruppiSenzaCrediti = 0; const contati = new Set(), senza = [], senzaTutti = [];
  for (const a of tuttiAnni) for (const b of a.blocchi) {
    if (b.x) continue;
    if (b.s) {
      const k = /dal\s+\d+°?\s+al\s+\d+°?\s+anno|tra\s+il\s+\d+°?\s+e\s+(?:il\s+)?\d+°?\s+anno/i.test(b.e || '') ? b.e : Symbol();
      if (contati.has(k)) continue; contati.add(k);
      if (!b.c && !b.m) { senzaCrediti = true; inGruppiSenzaCrediti += b.esami.reduce((s, e) => s + (e.cfu || 0), 0); senzaTutti.push(b); if (!b.k) senza.push(b); }
      tot += b.c || 0; totMax += b.m || b.c || 0;
    } else { const t = b.esami.reduce((s, e) => s + (e.cfu || 0), 0); tot += t; totMax += t; obbligatori += t; }
  }
  const pieno = atteso;
  let conti = '';
  const incompleto = presenti.size && durata && presenti.size < durata;
  if (pieno && obbligatori < pieno / 2 && inGruppiSenzaCrediti >= pieno - obbligatori && !incompleto) {
    // la fonte mette quasi tutto in gruppi «non obbligatori» senza crediti: non si può dire che siano scelte
    conti = `Per questo corso il catalogo dell’ateneo non distingue bene gli esami obbligatori da quelli a scelta: molti esami nei gruppi qui sotto sono probabilmente obbligatori. Controlla il piano sul sito del corso.`;
  } else if (pieno && !incompleto && senza.length === 1 && tot === totMax && tot < pieno && stimaPossibile(senza, pieno - tot)) {
    // un solo gruppo senza crediti e tutto il resto noto: i crediti che mancano al titolo sono, con buona probabilità, i suoi.
    // Se il piano non ha crediti a scelta libera, quei crediti possono essere proprio quelli: spesso si prendono anche fuori
    // dall'elenco (Biologia a Padova: 12 CFU «a libera scelta», con quattro insegnamenti attivati apposta, ma va bene anche
    // un altro insegnamento coerente con il percorso, con il piano approvato dal corso)
    senza[0].stima = pieno - tot;
    senza[0].forseLiberi = !tuttiAnni.some(a => a.blocchi.some(b => b.s && b !== senza[0] && (!b.esami.length || /scelta\s+(libera|dello\s+studente|autonoma)|libera\s+scelta|crediti\s+liberi|elective|free\s+choice/i.test(b.e || ''))));
  } else if (pieno && !incompleto && !(tot <= pieno && pieno <= totMax)) {
    if (tot > pieno) conti = `I crediti elencati qui fanno ${fmt(tot)}, più dei ${fmt(pieno)} che servono per la laurea: alcune attività sono probabilmente alternative tra loro. Controlla le regole sul sito del corso.`;
    else if (senzaCrediti && !stimaPossibile(senzaTutti, pieno - totMax)) conti = `I crediti indicati qui arrivano a ${fmt(totMax)} su ${fmt(pieno)}, e con gli esami a scelta qui sotto non si arriva esattamente ${pieno - totMax === 1 ? 'al credito che manca' : `ai ${fmt(pieno - totMax)} che mancano`}: una parte del piano (spesso crediti a scelta libera, seminari o altre attività) l’ateneo non la descrive qui. Controlla il regolamento del corso.`;
    else if (senzaCrediti) conti = `I crediti indicati qui arrivano a ${fmt(totMax)} su ${fmt(pieno)}: il resto si sceglie nei gruppi per cui l’ateneo non indica quanti crediti servono (li trovi nel regolamento del corso).`;
    else conti = `I crediti indicati qui arrivano a ${fmt(totMax)} su ${fmt(pieno)}: una parte del piano (spesso le attività a scelta libera) l’ateneo non la descrive qui. Controlla sul sito del corso.`;
  }
  const parziale = !mancanti.length ? ''
    : mancanti.every(n => n > ultimo)
      ? `<p class="nota avviso">Qui ${ultimo === 1 ? 'c’è solo il 1° anno' : `ci sono solo i primi ${ultimo} anni`}: per ora il catalogo dell’ateneo pubblica solo questi. Il piano completo è nel regolamento del corso.</p>`
      : `<p class="nota avviso">Qui manca${mancanti.length > 1 ? 'no' : ''} ${mancanti.map(n => `il ${n}° anno`).join(' e ')}: il catalogo dell’ateneo non ${mancanti.length > 1 ? 'li' : 'lo'} pubblica. Il piano completo è nel regolamento del corso.</p>`;
  return `<section class="sezione">
    <h2>Il piano degli esami <small>${atteso ? `${atteso} <abbr title="crediti formativi universitari: un anno di studio ne vale 60">CFU</abbr> in ${durata} anni` : ''}${fonte.anno ? ` · ${dopo ? 'piano per chi si iscrive nel' : 'piano di chi si è iscritto nel'} ${annoF}` : ''}</small></h2>
    ${p.p.length > 1 ? `<p class="tenue piccolo">Questo corso ha ${p.p.length} percorsi (curricula): scegli quale vedere.</p><div class="percorsi" role="group" aria-label="Percorsi (curricula)">${p.p.map(([n], k) => `<button type="button" class="scelta-btn" data-percorso="${k}" aria-pressed="${k === statoPiano.percorso}">${esc(titoloCorso(n))}</button>`).join('')}</div>` : ''}
    ${righe ? `<div class="striscia" role="img" aria-label="Crediti per anno, colorati per area di studio">${righe}</div><div class="legenda">${legenda}${ignoti ? legendaIgnoti : ''}</div>${settoriTop}` : ''}
    ${vecchio}${parziale}${conti ? `<p class="nota avviso">${conti}</p>` : ''}
    ${tuttiAnni.map(a => htmlAnno(a)).join('')}
    <div class="fonte"><span>Fonte: ${esc(fonte.nome || '—')}${fonte.anno ? `, piano ${annoF}` : ''}. ${fonte.nota ? esc(fonte.nota) : ''}</span>${fonte.url ? `<a href="${esc(fonte.url)}" target="_blank" rel="noopener">Apri la fonte<span class="vh"> (si apre in una nuova scheda)</span> ↗</a>` : ''}</div>
  </section>`;
}
function htmlAnno(a) {
  const obbl = a.blocchi.filter(b => !b.s && !b.x), gruppi = a.blocchi.filter(b => b.s || b.x);
  const cfuObb = obbl.reduce((t, b) => t + b.esami.reduce((s, e) => s + (e.cfu || 0), 0), 0);
  // anche i crediti a scelta, dove l'ateneo li indica: chi somma gli obbligatori non deve credere che l'anno finisca lì
  const scelte = gruppi.filter(b => !b.x), cfuScelta = scelte.reduce((t, b) => t + (b.c || 0), 0), senzaCfu = scelte.some(b => !b.c);
  const conti = [cfuObb ? `${fmt(Math.round(cfuObb))} CFU obbligatori` : '', cfuScelta ? `${fmt(Math.round(cfuScelta))} a scelta` : '', senzaCfu ? `${cfuScelta ? 'più altri' : 'esami'} a scelta (crediti non indicati)` : ''].filter(Boolean);
  return `<div class="anno" id="anno-${a.anno != null ? a.anno : 'qualsiasi'}">
    <h3>${a.anno != null ? `${a.anno}° anno` : 'In qualsiasi anno'}<span>${a.coorte && String(a.coorte) !== ANNO_COORTE ? `come per gli iscritti nel ${esc(a.coorte)}/${String(+a.coorte + 1).slice(2)} · ` : ''}${conti.join(' · ')}</span></h3>
    ${obbl.length ? `<ul class="esami">${obbl.flatMap(b => b.esami).map(htmlEsame).join('')}</ul>` : ''}
    ${gruppi.map(b => `<div class="gruppo${b.x ? ' extra' : ''}">
      <div class="regola"><b>${regolaGruppo(b)}</b><span class="codice tenue">${b.esami.length ? `${b.esami.length} ${b.esami.length === 1 ? 'opzione' : 'opzioni'}` : ''}</span></div>
      ${b.e ? `<div class="orig">${esc(b.e)}</div>` : ''}
      ${b.stima ? `<p class="nota">${b.forseLiberi
        ? `L’ateneo non dice quanti crediti scegliere qui. Per arrivare ai crediti che servono per la laurea ne mancano ${fmt(b.stima)}, e il piano non ha altri crediti a scelta libera: possono essere quelli di questo gruppo, oppure crediti a scelta libera, che spesso si possono prendere anche fuori da questo elenco. Il numero esatto e le regole sono nel regolamento del corso.`
        : `L’ateneo non dice quanti crediti scegliere qui, ma per arrivare ai crediti che servono per la laurea ne mancano ${fmt(b.stima)}: probabilmente sono quelli di questo gruppo. Il numero esatto è nel regolamento del corso.`}</p>`
        : !b.c && !b.m && !b.x && !b.k ? '<p class="nota">Qui l’ateneo non indica quanti crediti scegliere: controlla il regolamento del corso.</p>' : ''}
      ${(b.n || []).map(n => `<p class="nota">${esc(n)}</p>`).join('')}
      ${b.esami.length ? opzioniGruppo(b.esami) : (b.n || []).some(n => /non (sono )?elencat|non elenca/i.test(n)) ? '' : `<p class="nota">${!NON_LIBERA_RX.test(b.e || '') && !(b.n || []).some(n => /elenc|regol|guida/i.test(n)) ? 'Le opzioni non sono elencate: di solito si sceglie tra tutti gli esami dell’ateneo.' : 'Le opzioni non sono elencate qui: tra quali esami scegliere lo dice la fonte del piano.'}</p>`}
    </div>`).join('')}
  </div>`;
}
// i crediti che mancano al titolo possono essere quelli dei gruppi senza crediti solo se una scelta delle loro opzioni li fa
// esatti: con tre esami da 6 CFU se ne fanno 6, 12 o 18, non 17 (Chimica e tecnologia farmaceutiche a Firenze: 6 CFU dal
// gruppo e 11 di scelta libera e seminari che il catalogo non elenca). Opzioni senza crediti o nessuna opzione: non si sa
function stimaPossibile(gruppi, resto) {
  const esami = gruppi.flatMap(b => b.esami);
  if (!esami.length || esami.some(e => !e.cfu)) return true;
  const fatti = new Set([0]), m = Math.round(2 * resto);
  for (const e of esami) for (const s of [...fatti]) { const t = s + Math.round(2 * e.cfu); if (t <= m) fatti.add(t); }
  return fatti.has(m);
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
  // il settore scientifico (con i crediti, se l'esame ne ha più d'uno): chi confronta corsi diversi vede le stesse
  // materie anche quando gli esami si chiamano in modo diverso
  const settori = e.settori.map(s => `<span class="codice" title="${esc(nomeSettore(s.k))}">${esc(s.k)}${e.settori.length > 1 && s.n ? ` ${fmt(s.n)}` : ''}</span>`).join(' + ');
  return `<li class="esame"><span class="pallino" style="--c:${colore(e.macro)}" aria-hidden="true"></span><span class="nome">${esc(titoloCorso(e.nome))}</span><span class="cfu">${e.cfu != null ? `${fmt(e.cfu)} CFU` : ''}</span>
    ${info.length || settori ? `<span class="info">${info.map(x => `<span>${esc(x)}</span>`).join('')}${settori ? `<span class="settori-esame">${settori}</span>` : ''}</span>` : ''}
    ${e.moduli ? `<span class="moduli">${e.moduli.map(([n, k]) => `<span>${esc(titoloCorso(n))}${k ? ` · ${fmt(k)} CFU` : ''}</span>`).join('')}</span>` : ''}</li>`;
}
// I testi descrittivi (obiettivi, requisiti, sbocchi) sono quelli che l'ateneo ha scritto nella scheda ufficiale del corso
// (SUA-CdS, pubblicata nel suo catalogo): si mostrano così come sono, con la fonte e il collegamento, chiusi dietro «Leggi
// tutto» quando sono lunghi. Per gli atenei non statali i dati contengono solo l'inizio di ogni testo (x.es): il resto si
// legge alla fonte. Il perché è in PUBBLICAZIONE.md, «Testi descrittivi delle schede».
let nTesti = 0;
function testoLungo(testo, classe = '') {
  const id = `testo-${++nTesti}`;
  return `<div class="testo-lungo chiuso ${classe}" id="${id}">${esc(testo)}</div><button type="button" class="btn leggi-tutto" data-azione="apri-testo" data-testo="${id}" aria-expanded="false" aria-controls="${id}">Leggi tutto</button>`;
}
// un gruppo senza opzioni elencate: niente frase se una nota lo dice già («non sono elencati qui», «la fonte non elenca»);
// «di solito si sceglie tra tutti gli esami dell'ateneo» solo se nulla dice il contrario.
// Non lo si dice per gruppi di affini, caratterizzanti, competenze, lingue, altre attività, né quando le note rimandano a
// elenchi o regole (Bocconi, «4 elective courses»: elenchi chiusi nella Guida; verifica indipendente dell'11/11/2026)
const NON_LIBERA_RX = /affin|caratterizz|\bADO\b|competenz|linguistic|altre attivit|seminar|laborator|tirocin/i;
function htmlTesti(x, f) {
  const anno = f && f.anno ? ` ${esc(annoBreve(f.anno))}` : '';
  const dove = f && f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${x.es ? 'Continua a leggere nel catalogo dell’ateneo' : 'Vedi la scheda nel catalogo dell’ateneo'}</a>` : '';
  const fonte = `<p class="fonte-testo">${x.es ? `Qui c’è solo l’inizio del testo che l’ateneo ha scritto nella scheda ufficiale del corso${anno}.` : `Testo dell’ateneo, dalla scheda ufficiale del corso${anno}, riportato così com’è.`} ${dove}</p>`;
  return `${x.ob ? `<section class="sezione"><h2>Cosa si studia</h2>${testoLungo(x.ob)}${fonte}</section>` : ''}
    ${x.rq ? `<section class="sezione"><h2>Come si entra</h2>${testoLungo(x.rq)}${fonte}</section>` : ''}
    ${x.sb ? `<section class="sezione"><h2>A che lavoro prepara</h2><div class="profili">${x.sb.map(([prof, funz, comp, sbo]) => { const titolo = titoloCorso((prof || '').split('\n')[0]); return `<div class="profilo"><h3>${esc(titolo.length > 160 ? titolo.slice(0, 160).replace(/\s+\S*$/, '') + '…' : titolo)}</h3>${sbo || funz ? testoLungo(sbo || funz, 'in-profilo') : ''}</div>`; }).join('')}</div>
      ${x.pr ? `<h3 style="margin-top:20px;margin-bottom:10px">Professioni (classificazione ISTAT)</h3><div class="mestieri">${x.pr.map(p => `<span class="etichetta">${esc(p)}</span>`).join('')}</div>` : ''}${fonte}</section>` : ''}`;
}
// «Leggi tutto» solo dove il testo è davvero più lungo del riquadro chiuso
function sistemaTestiLunghi(dentro) {
  dentro.querySelectorAll('.testo-lungo.chiuso').forEach(t => {
    if (t.scrollHeight <= t.clientHeight + 4) { t.classList.remove('chiuso'); const b = dentro.querySelector(`[data-testo="${t.id}"]`); if (b) b.remove(); }
  });
}

/* ---------------- dopo la triennale: le magistrali più affini ---------------- */
// per ogni triennale, le magistrali in ordine di affinità (dati/dopo/<ateneo>.json, da raccolta/magistrali.py): quanto i
// loro esami somigliano a quelli della triennale, per settori scientifici. Non è un giudizio sui requisiti d'accesso
async function dopoDi(c) {
  if (!(c.ateneo in S.dopo)) { try { S.dopo[c.ateneo] = await json(`dati/dopo/${c.ateneo}.json`); } catch { S.dopo[c.ateneo] = {}; } }
  return listaDopo(c);
}
// la lista di una triennale, a dati già caricati: [magistrale, affinità, curriculum più affine, ambiti nuovi]
const listaDopo = c => ((S.dopo[c.ateneo] || {})[c.i] || []).map(([j, v, curr, nuovi]) => ({ c: S.corsi[j], v: v / 1000, curr: curr || null, nuovi: nuovi ? nuovi.split('.') : [] }))
  .filter(x => x.c && !x.c.fuori);
const AFFINE = .6;  // da qui in su una magistrale si dice affine (raccolta/magistrali.py, MINIMO)
const NOTA_DOPO = 'In ordine di affinità: quanto i loro esami somigliano a quelli di questo corso, per materia.';
// chi legge l'elenco come «le magistrali a cui posso iscrivermi» sbaglia (segnalato da un utente): lo si dice in evidenza
const AVVISO_REQUISITI = '<p class="nota avviso avviso-requisiti"><b>Non è l’elenco delle magistrali a cui puoi iscriverti.</b> Sono le più vicine per contenuti. Ogni magistrale ha i suoi requisiti d’accesso, decisi dall’ateneo: di solito una laurea di un certo tipo (classe) o un minimo di crediti in certe materie, a volte una prova. Se te ne mancano, spesso puoi recuperarli iscrivendoti a singoli corsi prima della magistrale. I requisiti sono nella pagina della magistrale, alla voce «Come si entra», e nel bando dell’ateneo.</p>';
function rigaDopo(x, stessoAteneo) {
  const nuovi = x.nuovi.map(a => AMBITI_BREVI[a]).filter(Boolean);
  const extra = (x.curr ? `<div class="sotto-riga">Percorso (curriculum) più affine: ${esc(titoloCorso(x.curr))}</div>` : '')
    + (nuovi.length ? `<div class="sotto-riga">Materie nuove rispetto alla triennale: ${esc(elenco(nuovi))}</div>` : '')
    + (stessoAteneo ? '<div class="sotto-riga">Nello stesso ateneo</div>' : '');
  return rigaCorso(x.c, extra);
}
/* ---------------- numeri del corso: iscritti (Ministero) e com'è andata ai laureati (AlmaLaurea) ---------------- */
// un file per ateneo (dati/numeri/<ateneo>.json), caricato la prima volta che serve
const caricamentoNumeri = {};
const numeriAteneo = at => caricamentoNumeri[at] || (caricamentoNumeri[at] = json(`dati/numeri/${at}.json`).catch(() => ({ corsi: {}, classi: {}, campi: [], basi: {} })));
// i numeri di un corso per nome di campo: valori (v), posizione nella classe (p), valori della classe (k)
function numeriCorso(N, c) {
  const r = N.corsi?.[c.i] || {};
  const per = a => a ? Object.fromEntries(N.campi.map((x, j) => [x, a[j]])) : {};
  return { al: r.al, mur: r.mur, v: per(r.v), p: per(r.p), k: per(N.classi?.[r.k]), anni: N.anni, basi: N.basi || {}, aderisce: N.almalaurea };
}
// sotto questa soglia di risposte i numeri ballano troppo: costruisci-sito.py li lascia vuoti
const MIN_RISPOSTE = 10;
function schedaAlmaLaurea(pc, ateneo, tipo, config, anni) {
  const p = { anno: 2025, corstipo: tipo, ateneo, facolta: 'tutti', gruppo: 'tutti', livello: tipo === 'L' ? 1 : 2, area4: 'tutti', pa: ateneo, classe: 'tutti', postcorso: pc, isstella: 0,
    ...(config === 'occupazione' ? { annolau: anni, condocc: 'tutti', iscrls: 'tutti' } : {}), disaggregazione: '', LANG: 'it', CONFIG: config };
  return 'https://www2.almalaurea.it/cgi-php/universita/statistiche/visualizza.php?' + new URLSearchParams(p);
}
const percento = x => `${fmt(Math.round(x))}%`, inEuro = x => `${fmt(Math.round(x))} €`, decimale = x => fmt(x);
// dove sta il corso tra quelli della stessa classe: p è la quota di corsi con un valore più basso (4-6 su 10: nella media)
function posizioneTesto(p, [su, giu] = ['più alto', 'più basso']) {
  if (p == null) return '';
  if (p === 100) return `${su} di tutti gli altri corsi della classe`;
  if (p === 0) return `${giu} di tutti gli altri corsi della classe`;
  if (p >= 60) return `${su} di ${Math.floor(p / 10)} corsi su 10`;
  if (p <= 40) return `${giu} di ${Math.floor((100 - p) / 10)} corsi su 10`;
  return 'nella media della classe';
}
// sotto un numero: il valore di tutta la classe e la posizione del corso
function confrontoClasse(n, campo, forma, parole) {
  const classe = n.k[campo] != null ? `Classe: ${forma(n.k[campo])}` : '', pos = posizioneTesto(n.p[campo], parole);
  if (!classe && !pos) return '';
  return `<small>${classe}${classe && pos ? ' · ' : ''}${classe ? pos : pos.replace(/^./, m => m.toUpperCase()) + (/classe$/.test(pos) ? '' : ' della classe')}</small>`;
}
const cifraCorso = (n, campo, testo, forma, parole, dettaglio = '') => n.v[campo] == null ? '' :
  `<div><b>${forma(n.v[campo])}</b><span>${testo}</span>${dettaglio ? `<span class="dettaglio">${dettaglio}</span>` : ''}${confrontoClasse(n, campo, forma, parole)}</div>`;
const bloccoCifre = (titolo, celle) => (celle = celle.filter(Boolean)).length ? `<h3 class="titolo-laureati">${titolo}</h3><div class="cifre-laureati">${celle.join('')}</div>` : '';

async function riempiNumeri(c) {
  const N = await numeriAteneo(c.ateneo), box = $('#laureati');
  if (!box || rotta().nome !== 'corso' || +rotta().arg !== c.i) return;
  // un ateneo senza nessun numero non ha il file: niente sezione
  const n = numeriCorso(N, c);
  box.innerHTML = N.anni ? sezioneIscritti(n) + sezioneLaureati(n, c) : '';
}

function sezioneIscritti(n) {
  const m = n.mur;
  if (!m) return '';
  const circa = x => x ? 'circa ' : '';
  const variazione = m.prima ? Math.round(100 * (m.iscritti - m.prima) / m.prima) : null;
  const celle = [
    `<div><b>${circa(m.circa)}${fmt(m.iscritti)}</b><span>iscritti nel ${n.anni.iscritti}, tutti gli anni di corso</span>${m.posizione != null ? `<small>${posizioneTesto(m.posizione, ['Più grande', 'Più piccolo'])}${/classe$/.test(posizioneTesto(m.posizione)) ? '' : ' della stessa classe'}</small>` : ''}</div>`,
    variazione != null ? `<div><b>${Math.abs(variazione) < 3 ? 'Stabile' : (variazione > 0 ? '+' : '−') + fmt(Math.abs(variazione)) + '%'}</b><span>iscritti rispetto al ${n.anni.prima} (erano ${fmt(m.prima)})</span></div>` : '',
    m.donne != null ? `<div><b>${m.donne}%</b><span>degli iscritti sono donne</span></div>` : '',
    m.laureati != null ? `<div><b>${circa(m.laureatiCirca)}${fmt(m.laureati)}</b><span>si sono laureati nel ${n.anni.laureati}</span></div>` : '',
  ].filter(Boolean);
  return `<section class="sezione laureati"><h2>Iscritti e laureati</h2><div class="cifre-laureati">${celle.join('')}</div>
    <p class="nota">Fonte: Ministero dell’Università e della Ricerca, <a href="https://dati-ustat.mur.gov.it/" target="_blank" rel="noopener">open data USTAT</a> (iscritti ${n.anni.iscritti}, dati provvisori). Il Ministero non pubblica i gruppi con meno di 6 persone: quando manca quello degli uomini o delle donne il numero è «circa».${m.nome ? ` Nei dati del Ministero il corso si chiama «${esc(m.nome)}».` : ''}</p></section>`;
}

function sezioneLaureati(n, c) {
  if (!n.al) return `<section class="sezione laureati"><h2>Com’è andata a chi si è laureato</h2><p class="nota">${n.aderisce
    ? 'AlmaLaurea non ha numeri per questo corso: può essere un corso nuovo, senza ancora abbastanza laureati, oppure non abbiamo trovato con certezza la sua scheda.'
    : 'Questo ateneo non aderisce ad AlmaLaurea, che raccoglie i numeri sui laureati: per questo corso non ci sono.'}</p></section>`;
  const [pc, ateneo, tipo, tutteLeSedi, nomeAL] = n.al, v = n.v, A = n.anni;
  const magistrale = c.tipo !== 'triennale';
  // le parole del confronto con la classe concordano con il numero: «anni» e «mesi» non sono «più lunghi», la durata sì
  const lunga = ['durata più lunga', 'durata più breve'], lungo = ['tempo più lungo', 'tempo più breve'];
  const fuori = v.fuori1 != null && v.fuori2 != null ? `Con un anno di ritardo: ${percento(v.fuori1)}; con due o più: ${percento(v.fuori2)}` : '';
  const studi = bloccoCifre(`Durante gli studi <small>laureati del ${A.profilo}</small>`, [
    cifraCorso(n, 'inCorso', `si sono laureati nei tempi previsti${durataDi(c) ? ` (${durataDi(c)} anni)` : ''}`, percento, undefined, fuori),
    cifraCorso(n, 'durata', c.tipo === 'magistrale' ? 'anni in media per finire la magistrale' : 'anni in media per laurearsi', decimale, lunga),
    cifraCorso(n, 'esami', 'media dei voti agli esami, su 30', decimale),
    cifraCorso(n, 'voto', 'voto medio di laurea, su 110 (la lode conta 113)', decimale),
    cifraCorso(n, 'frequenza', 'hanno seguito più di tre quarti delle lezioni', percento),
    cifraCorso(n, 'studioEstero', 'hanno studiato all’estero durante il corso (Erasmus o altro)', percento),
    cifraCorso(n, 'tirocinio', 'hanno fatto un tirocinio o un lavoro riconosciuto dal corso', percento),
    cifraCorso(n, 'fuoriRegione', 'vengono da un’altra regione o dall’estero', percento),
  ]);
  const giudizio = bloccoCifre('Cosa ne pensano', [
    cifraCorso(n, 'soddisfatti', 'sono soddisfatti del corso', percento),
    cifraCorso(n, 'rifarebbero', 'rifarebbero lo stesso corso nello stesso ateneo', percento),
    cifraCorso(n, 'docenti', 'sono soddisfatti dei rapporti con i docenti', percento),
    cifraCorso(n, 'carico', 'trovano il carico di studio adeguato alla durata', percento),
  ]);
  const NOTA_LAVORO = 'Lavora chi ha un’attività retribuita, anche di formazione (tirocinio, dottorato con borsa).';
  let dopo = '';
  if (!magistrale) {
    const b = bloccoCifre(`Un anno dopo la laurea <small>laureati del ${A[1]}</small>`, [
      cifraCorso(n, 'magistrale1', 'si sono iscritti a una magistrale', percento),
      cifraCorso(n, 'occupati1', 'lavorano (anche mentre studiano)', percento),
    ]);
    dopo = b ? b + `<p class="nota">${NOTA_LAVORO}</p>` : '';
  } else {
    // una tabella: le stesse voci a uno, tre e cinque anni dalla laurea
    const righe = [
      ['occupati', 'Lavorano', percento],
      ['stipendio', 'Stipendio netto al mese', inEuro],
      ['indeterminato', 'Con un contratto a tempo indeterminato', percento],
      ['efficace', 'Dicono che la laurea è utile nel loro lavoro', percento],
      ['lavoroEstero', 'Lavorano all’estero', percento],
      ['mesi', 'Mesi per trovare il primo lavoro', decimale, lungo],
    ];
    const anni = [1, 3, 5].filter(a => righe.some(([k]) => v[k + a] != null));
    const usate = righe.filter(([k]) => anni.some(a => v[k + a] != null));
    if (anni.length) dopo = `<h3 class="titolo-laureati">Il lavoro dopo la laurea</h3>
      <div class="tabella-scorre"><table class="dopo-laurea">
        <thead><tr><th scope="col"></th>${anni.map(a => `<th scope="col">${a === 1 ? 'Un anno' : a === 3 ? 'Tre anni' : 'Cinque anni'} dopo<small>laureati del ${A[a]}</small></th>`).join('')}</tr></thead>
        <tbody>${usate.map(([k, nome, forma, parole]) => `<tr><th scope="row">${nome}</th>${anni.map(a => `<td>${v[k + a] == null ? '<span class="tenue">—</span>' : `<b>${forma(v[k + a])}</b>${confrontoClasse(n, k + a, forma, parole)}`}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="nota">${NOTA_LAVORO} Stipendio, contratto, utilità della laurea ed estero sono di chi lavora; i mesi per il primo lavoro sono di chi non ha continuato un lavoro che aveva già prima della laurea. Un trattino vuol dire troppe poche risposte (meno di ${MIN_RISPOSTE}).</p>`;
  }
  const parti = studi + giudizio + dopo;
  const fonti = [v.questionari != null ? `${fmt(v.questionari)} questionari su ${fmt(v.laureati)} laureati del ${A.profilo}` : '',
    v.intervistati1 != null ? `${fmt(v.intervistati1)} intervistati a un anno dalla laurea` : '',
    magistrale && v.intervistati3 != null ? `${fmt(v.intervistati3)} a tre anni` : '', magistrale && v.intervistati5 != null ? `${fmt(v.intervistati5)} a cinque anni` : ''].filter(Boolean);
  const link = (testo, config, a) => `<a href="${esc(schedaAlmaLaurea(pc, ateneo, tipo, config, a))}" target="_blank" rel="noopener">${testo}</a>`;
  return `<section class="sezione laureati"><h2>Com’è andata a chi si è laureato</h2>
    ${parti ? `<p class="nota" style="margin:-6px 0 4px">Sotto ogni numero trovi, per confronto, lo stesso numero per tutti i corsi dello stesso tipo (classe ${esc(c.classe || '')}) negli atenei di AlmaLaurea, e come si piazza questo corso rispetto a loro.</p>${parti}`
      : `<p class="nota">AlmaLaurea ha troppe poche risposte su questo corso (meno di ${MIN_RISPOSTE}) per dare numeri affidabili.</p>`}
    <p class="nota">Fonte: ${link('AlmaLaurea', 'profilo')}, indagine 2025${fonti.length ? ` (${esc(elencoSemplice(fonti))})` : ''}.
      ${nomeAL ? `Nelle schede di AlmaLaurea il corso si chiama «${esc(nomeAL)}». ` : ''}${tutteLeSedi ? 'Sono i numeri di tutte le sedi del corso: AlmaLaurea non le distingue. ' : ''}
      Dicono com’è andata a chi si è laureato, non a chi ha lasciato, e dipendono anche da chi si iscrive: un corso che seleziona all’ingresso ha di solito più laureati nei tempi previsti. <a href="#fonti">Come leggerli</a>.
      Schede complete: ${link('profilo dei laureati', 'profilo')} · ${link('lavoro a un anno', 'occupazione', 1)}${magistrale ? ` · ${link('a tre anni', 'occupazione', 3)} · ${link('a cinque anni', 'occupazione', 5)}` : ''}.</p>
  </section>`;
}
const elencoSemplice = l => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];

async function riempiDopo(c) {
  const box = $('#dopo'); if (!box) return;
  const lista = await dopoDi(c), b = $('#dopo');
  if (!b || rotta().nome !== 'corso' || +rotta().arg !== c.i) return;
  if (!lista.length) { b.innerHTML = ''; return; }
  const qui = lista.filter(x => x.c.ateneo === c.ateneo && x.v >= AFFINE).slice(0, 3);
  const altrove = lista.filter(x => !qui.includes(x)).slice(0, 6);
  b.innerHTML = `<section class="sezione altrove dopo"><h2>Dopo la triennale <small>le magistrali più affini a questo corso</small></h2>
    <p class="nota" style="max-width:70ch;margin:-6px 0 12px">${NOTA_DOPO}</p>${AVVISO_REQUISITI}
    ${qui.length ? `<h3 class="titolo-dopo">In questo ateneo</h3><div class="elenco">${qui.map(x => rigaDopo(x)).join('')}</div>` : ''}
    <h3 class="titolo-dopo">In tutta Italia</h3><div class="elenco">${altrove.map(x => rigaDopo(x)).join('')}</div>
    <div class="altri"><a class="btn" href="#dopo.${c.i}">Vedi tutte le ${fmt(lista.length)}</a><a class="btn primario" href="#magistrale.${c.i}">Scegli con il quiz, dagli esami di questo corso</a></div></section>`;
}
const statoDopo = { i: null, ordine: 'affini', regione: '', mostrati: 30 };
function vistaDopo(i) {
  const c = S.corsi[i];
  if (!c || c.tipo !== 'triennale') return `<div class="colonna vuoto">Corso non trovato. <a href="#esplora">Torna all’elenco</a></div>`;
  if (statoDopo.i !== i) Object.assign(statoDopo, { i, ordine: 'affini', regione: '', mostrati: 30 });
  if (!(c.ateneo in S.dopo)) return '<div class="colonna"><p class="caricamento">Carico le magistrali…</p></div>';
  const tutte = listaDopo(c);
  const regioni = [...new Set(tutte.map(x => regioneDi(x.c)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  if (statoDopo.ordine === 'distanza' && !S.casa) statoDopo.ordine = 'affini';
  let r = tutte.filter(x => !statoDopo.regione || regioneDi(x.c) === statoDopo.regione);
  if (statoDopo.ordine === 'distanza') r = [...r].sort((a, b) => (distanzaDi(a.c) ?? 1e9) - (distanzaDi(b.c) ?? 1e9));
  return `<div class="colonna">
    <nav class="briciole" aria-label="Percorso"><a href="#esplora">Corsi</a><span>/</span><a href="#corso.${c.i}">${esc(titoloCorso(c.nome))}</a><span>/</span><span>Dopo la triennale</span></nav>
    <div class="barra-risultati">
      <div><h1>Le magistrali più affini</h1><p class="tenue">a ${esc(titoloCorso(c.nome))} · ${esc(c.ateneoNome)}</p></div>
      <div class="destra">
        <select id="regione-dopo" aria-label="Regione" style="width:auto"><option value="">Tutta Italia</option>${regioni.map(g => `<option ${statoDopo.regione === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <select id="ordine-dopo" aria-label="Ordina" style="width:auto"><option value="affini" ${statoDopo.ordine === 'affini' ? 'selected' : ''}>Più affini</option><option value="distanza" ${statoDopo.ordine === 'distanza' ? 'selected' : ''} ${S.casa ? '' : 'disabled'}>Più vicine${S.casa ? '' : ' (scegli da dove parti)'}</option></select>
      </div>
    </div>
    ${AVVISO_REQUISITI}<p class="nota" style="max-width:70ch;margin:0 0 14px">${NOTA_DOPO} Le affinità vengono dalle materie (settori scientifici) degli esami obbligatori e a scelta dei piani raccolti, quasi tutti del ${ANNO_ACCADEMICO}; per le magistrali con più percorsi (curricula) conta il più affine.</p>
    <div style="margin-bottom:14px">${campoCasa()}</div>
    <p class="tenue piccolo num" role="status">${fmt(r.length)} magistrali${statoDopo.regione ? ` in ${esc(statoDopo.regione)}` : ''}</p>
    ${r.length ? `<div class="elenco">${r.slice(0, statoDopo.mostrati).map(x => rigaDopo(x, x.c.ateneo === c.ateneo)).join('')}</div>${r.length > statoDopo.mostrati ? `<div class="altri"><button type="button" class="btn" data-azione="altri-dopo">Mostra altre ${fmt(Math.min(30, r.length - statoDopo.mostrati))}</button></div>` : ''}`
      : `<div class="vuoto"><b>Nessuna magistrale affine in questa regione.</b><span>Prova con tutta Italia.</span></div>`}
  </div>`;
}

/* ---------------- materie ---------------- */
const statoMaterie = { q: '', scelta: null };
function vistaMaterie() {
  return `<div class="colonna">
    <h1>Dove si studia una materia</h1>
    <p class="tenue" style="margin:8px 0 18px;max-width:60ch">Scrivi il nome di un esame: trovi i corsi che lo hanno nel piano degli esami, tra ${iGli(S.corsi.filter(c => c.piano).length)} ${fmt(S.corsi.filter(c => c.piano).length)} di cui abbiamo il piano.</p>
    <form class="cerca-materia" id="form-materia" role="search"><input id="cerca-materia" type="search" placeholder="Per esempio: intelligenza artificiale, diritto tributario, anatomia" value="${esc(statoMaterie.q)}" autocomplete="off" aria-label="Nome dell’esame"></form>
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
    <div><p class="tenue piccolo" style="margin-bottom:8px">${fmt(trovati.length)} nomi d’esame${trovati.length > 40 ? ', i 40 più diffusi' : ''}</p>
      <div class="nomi-materia">${trovati.slice(0, 40).map(k => `<button type="button" data-materia="${k}" aria-pressed="${statoMaterie.scelta === k}">${esc(titoloCorso(E.nomi[k]))}<span>${fmt(E.corsi[k].length)}</span></button>`).join('')}</div></div>
    <div><p class="tenue piccolo" style="margin-bottom:8px">${fmt(corsi.length)} corsi${statoMaterie.scelta != null ? ` con «${esc(titoloCorso(E.nomi[statoMaterie.scelta]))}»` : ''}${S.casa ? ', dal più vicino' : ''}</p>
      <div class="elenco">${corsi.slice(0, 80).map(c => rigaCorso(c)).join('')}</div></div>
  </div>`;
}
// una volta sola anche se lo chiedono in due (il campo appena toccato e la ricerca che parte)
let caricamentoEsami = null;
function caricaEsami() {
  return caricamentoEsami || (caricamentoEsami = json('dati/esami.json').then(E => { E.norme = E.nomi.map(norma); S.esami = E; }).catch(e => { caricamentoEsami = null; throw e; }));
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
    ['Lingua', c => esc(linguaBella(c.lingua) || '—')],
    ...righeNumeri(corsi),
    ['Di cosa è fatto', c => c.comp ? `<div class="barre-area">${c.comp.split('.').map(p => [p.slice(0, 3), +p.slice(3)]).map(([k, v]) => `<div><span><span class="b" style="--c:${colore(k)};width:${v}%;display:block"></span><span class="tenue">${esc(nomeMacro(k))}</span></span><span class="num">${v}%</span></div>`).join('')}</div>` : '<span class="tenue">Non disponibile</span>'],
  ];
  return `<div class="colonna"><h1 style="margin-bottom:16px">Confronta</h1>
    <div class="tabella-scorre"><table class="confronto">
      <thead><tr><th scope="col"><span class="tenue piccolo">${corsi.length} di 3</span></th>${corsi.map(c => `<th scope="col"><a href="#corso.${c.i}">${esc(nomeIntero(c))}</a><div style="margin-top:8px"><button type="button" class="btn" data-azione="confronto" data-i="${c.i}">Togli</button></div></th>`).join('')}</tr></thead>
      <tbody>${righe.map(([n, f]) => `<tr><th scope="row">${n}</th>${corsi.map(c => `<td>${f(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="tenue piccolo" style="margin-top:12px">Iscritti: Ministero dell’Università, 2025/26. Numeri dei laureati: AlmaLaurea, indagine 2025, con sotto quelli di tutta la classe di laurea; dettagli e fonti nella pagina di ogni corso. «Di cosa è fatto» somma i crediti degli esami obbligatori per area di studio, dalle materie (settori scientifici) indicate nel piano.${corsi.some(c => c.tipo === 'triennale') ? ' Dopo una triennale la maggior parte continua con una magistrale: per le triennali leggi insieme «Lavorano un anno dopo la laurea» e «Iscritti a una magistrale un anno dopo».' : ''}</p>
    ${corsi.length >= 2 ? sezioneTrasferimento(corsi) : ''}</div>`;
}

/* ---------------- se passi da un corso all'altro ---------------- */
// per chi pensa a un trasferimento: gli esami obbligatori del corso di partenza e, per ciascuno, quelli del corso di
// arrivo nello stesso gruppo di settori scientifici (le commissioni riconoscono i crediti guardando il settore e i
// crediti). I codici vecchi (SECS-P/07) e nuovi (ECON-06/A) si confrontano con la stessa traduzione del quiz per la
// magistrale (dati/magistrali.json, da raccolta/magistrali.py); dove non è sicura, conta il codice com'è
const statoTrasf = { da: null, a: null };
function sezioneTrasferimento(corsi) {
  // un trasferimento è fra corsi dello stesso tipo (da una triennale a un'altra triennale)
  const conPiano = corsi.filter(c => c.piano && corsi.some(x => x !== c && x.piano && x.tipo === c.tipo));
  if (conPiano.length < 2) return '';
  if (!conPiano.some(c => c.i === statoTrasf.da)) statoTrasf.da = conPiano[0].i;
  const arrivi = conPiano.filter(c => c.i !== statoTrasf.da && c.tipo === S.corsi[statoTrasf.da].tipo);
  if (!arrivi.some(c => c.i === statoTrasf.a)) statoTrasf.a = arrivi[0].i;
  const da = S.corsi[statoTrasf.da], a = S.corsi[statoTrasf.a];
  const scelta = (id, val, lista) => `<select id="${id}">${lista.map(c => `<option value="${c.i}" ${c.i === val ? 'selected' : ''}>${esc(nomeIntero(c))} · ${esc(c.ateneoNome)}</option>`).join('')}</select>`;
  const testa = `<section class="sezione trasferimento"><h2>Se passi da un corso all’altro</h2>
    <p class="tenue">Per ogni esame obbligatorio del corso da cui parti, gli esami del corso di arrivo della stessa materia (settore scientifico). Non è un riconoscimento: i crediti li riconosce la commissione del corso di arrivo, esame per esame, guardando soprattutto il settore e i crediti.</p>
    <div class="scelte-trasf"><label>Da ${scelta('trasf-da', da.i, conPiano)}</label><label>a ${scelta('trasf-a', a.i, arrivi)}</label></div>`;
  if (!S.piani[da.ateneo] || !S.piani[a.ateneo] || !S.mag) {
    Promise.all([pianiDi(da.ateneo), pianiDi(a.ateneo), caricaMagistrali()]).then(() => { if (rotta().nome === 'confronta') disegna(false); }).catch(mostraErrore);
    return testa + '<p class="caricamento">Carico i due piani…</p></section>';
  }
  const gruppo = k => { const x = S.mag.settori[k]; return x && x[0] >= 0 ? S.mag.gruppi[x[0]] : k; };
  const esamiDi = (c, soloObbligatori) => {
    const d = S.piani[c.ateneo], p = d.corsi[c.piano].p[0], visti = new Set(), out = [];
    for (const [, blocchi] of p[1]) for (const b of blocchi) {
      if (b.x || (soloObbligatori && b.s)) continue;
      for (const k of b.i || []) {
        const e = esameDa(d.esami[k]); if (visti.has(k) || !e.cfu) continue; visti.add(k);
        out.push({ ...e, scelta: !!b.s, gruppi: [...new Set(e.settori.map(s => gruppo(s.k)))] });
      }
    }
    return { esami: out, curricula: d.corsi[c.piano].p.length, nome: p[0] };
  };
  const A = esamiDi(da, true), B = esamiDi(a, false);
  const perGruppo = new Map();
  for (const e of B.esami) for (const g of e.gruppi) (perGruppo.get(g) || perGruppo.set(g, []).get(g)).push(e);
  const conSettore = A.esami.filter(e => e.gruppi.length), tot = conSettore.reduce((s, e) => s + e.cfu, 0);
  const inComune = conSettore.filter(e => e.gruppi.some(g => perGruppo.has(g))).reduce((s, e) => s + e.cfu, 0);
  const stessaClasse = da.classe && da.classe === a.classe;
  const riga = e => {
    const simili = [...new Set(e.gruppi.flatMap(g => perGruppo.get(g) || []))];
    return `<tr><td>${esc(titoloCorso(e.nome))}<div class="tenue piccolo">${e.settori.map(s => esc(s.k)).join(' + ') || 'settore non indicato'}</div></td><td class="num">${fmt(e.cfu)}</td>
      <td>${!e.gruppi.length ? '<span class="tenue">—</span>' : simili.length ? simili.slice(0, 4).map(x => `${esc(titoloCorso(x.nome))} <span class="tenue num">${fmt(x.cfu)} CFU${x.scelta ? ', a scelta' : ''}</span>`).join('<br>') + (simili.length > 4 ? `<br><span class="tenue">e altri ${simili.length - 4}</span>` : '') : '<span class="tenue">nessuno nello stesso settore</span>'}</td></tr>`;
  };
  return testa + `
    <p><b>${tot ? `${fmt(Math.round(100 * inComune / tot))}%` : '—'}</b> dei crediti obbligatori di ${esc(nomeIntero(da))} (${esc(da.ateneoNome)}) sono in settori che ci sono anche nel piano di ${esc(nomeIntero(a))} (${esc(a.ateneoNome)}): ${fmt(Math.round(inComune))} CFU su ${fmt(Math.round(tot))}${A.esami.length > conSettore.length ? `, senza contare ${A.esami.length - conSettore.length} esami di cui il piano non dice il settore` : ''}.</p>
    ${stessaClasse ? `<p class="nota">I due corsi sono della stessa classe (${esc(da.classe)}): in questo caso la legge chiede che almeno metà dei crediti già ottenuti in ciascun settore sia riconosciuta direttamente (per le lauree, DM 16 marzo 2007, art. 3, comma 9; se il corso di partenza è a distanza, solo se è accreditato).</p>` : ''}
    ${A.curricula > 1 || B.curricula > 1 ? `<p class="tenue piccolo">Per i corsi con più percorsi (curricula) si usa il primo (${esc(titoloCorso(A.nome))}; ${esc(titoloCorso(B.nome))}).</p>` : ''}
    <div class="tabella-scorre"><table class="confronto trasf"><thead><tr><th scope="col">Esame obbligatorio di partenza</th><th scope="col">CFU</th><th scope="col">Esami dello stesso settore nel corso di arrivo</th></tr></thead>
    <tbody>${A.esami.map(riga).join('')}</tbody></table></div></section>`;
}

// le righe con i numeri del Ministero e di AlmaLaurea: i file degli atenei si caricano la prima volta che servono, poi si ridisegna
function righeNumeri(corsi) {
  S.numeri = S.numeri || {};
  const mancano = [...new Set(corsi.map(c => c.ateneo))].filter(at => !S.numeri[at]);
  if (mancano.length) {
    Promise.all(mancano.map(at => numeriAteneo(at).then(N => { S.numeri[at] = N; }))).then(() => { if (rotta().nome === 'confronta') disegna(false); });
    return [['Iscritti e laureati', () => '<span class="tenue">Carico…</span>']];
  }
  const di = c => numeriCorso(S.numeri[c.ateneo], c);
  const vuoto = t => `<span class="tenue">${t}</span>`;
  // il valore, con sotto quello della classe; se manca, perché
  const cella = (campo, forma) => c => {
    const n = di(c);
    if (!n.al) return vuoto(n.aderisce ? 'Non disponibile' : 'Ateneo non in AlmaLaurea');
    const x = n.v[campo];
    if (x == null) {
      const base = n.basi[campo], b = base ? n.v[base] : null;
      return vuoto(b != null && b < MIN_RISPOSTE ? 'Pochi dati' : 'Non disponibile');
    }
    return `${forma(x)}${n.k[campo] != null ? `<div class="tenue piccolo">classe: ${forma(n.k[campo])}</div>` : ''}`;
  };
  const solo = (tipo, f) => c => (tipo === 'triennale') === (c.tipo === 'triennale') ? f(c) : vuoto('—');
  const righe = [
    ['Iscritti', c => { const m = di(c).mur; return m ? `${m.circa ? 'circa ' : ''}${fmt(m.iscritti)}` : vuoto('Non disponibile'); }],
    ['Laureati nei tempi previsti', cella('inCorso', percento)],
    ['Media degli esami', cella('esami', decimale)],
    ['Rifarebbero lo stesso corso', cella('rifarebbero', percento)],
    ['Lavorano un anno dopo la laurea', cella('occupati1', percento)],
  ];
  if (corsi.some(c => c.tipo === 'triennale')) righe.push(['Iscritti a una magistrale un anno dopo', solo('triennale', cella('magistrale1', percento))]);
  if (corsi.some(c => c.tipo !== 'triennale')) righe.push(
    ['Stipendio netto un anno dopo', solo('magistrale', cella('stipendio1', x => inEuro(x) + ' al mese'))],
    ['Lavorano cinque anni dopo', solo('magistrale', cella('occupati5', percento))],
    ['Stipendio netto cinque anni dopo', solo('magistrale', cella('stipendio5', x => inEuro(x) + ' al mese'))]);
  return righe.map(([n, f]) => [n, c => `<span class="num">${f(c)}</span>`]);
}

/* ---------------- fonti e note ---------------- */
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function dataLunga(iso) { const [a, m, g] = String(iso).split('-').map(Number); return a ? `${g === 1 ? '1º' : g} ${MESI[m - 1]} ${a}` : ''; }
// la data con la sua preposizione: davanti a 8 e 11 si elide («all’11 novembre», «l’8 marzo»), davanti agli altri no
function conArticolo(iso, art, eliso) { const g = +String(iso).split('-')[2], d = dataLunga(iso); return d ? (g === 8 || g === 11 ? eliso : art + ' ') + d : ''; }
function vistaFonti() {
  const attivi = S.corsi.filter(c => !c.fuori), conPiano = attivi.filter(c => c.piano);
  // per gli atenei con piani solo per una parte dei corsi contano i corsi rimasti senza
  const senza = Object.entries(S.motivi).map(([k, m]) => ({ nome: S.atenei[k] || k, motivo: m.motivo, n: attivi.filter(c => c.ateneo === k && !c.piano).length, tot: attivi.filter(c => c.ateneo === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  // e quelli degli atenei senza un motivo scritto: non si sa perché manca, si dice solo che non l'abbiamo trovato
  const altriSenza = attivi.filter(c => !c.piano && !S.motivi[c.ateneo]), atAltri = new Set(altriSenza.map(c => c.ateneo)).size;
  const corsi = n => `${fmt(n)} ${n === 1 ? 'corso' : 'corsi'}`;
  return `<div class="colonna testo-pagina">
    <h1>Fonti e note</h1>
    <p class="sotto">${NOME} raccoglie in un posto solo i corsi di laurea italiani e i loro piani degli esami, presi dalle pagine ufficiali degli atenei. È un aiuto per orientarsi: per iscriverti vale sempre quello che scrive l’ateneo.</p>
    <h2>Da dove vengono i dati</h2>
    <ul>
      <li><b>Elenco dei corsi</b> (${fmt(attivi.length)} corsi per l’anno accademico 2026/27, con classe, tipo, accesso e lingua): Universitaly, il portale del Ministero dell’Università e della Ricerca.</li>
      <li><b>Area di studio e sede</b>: open data del Ministero dell’Università (USTAT), elenco dei corsi 2025/26.</li>
      <li><b>Piani degli esami</b> (${fmt(conPiano.length)} corsi): cataloghi dei corsi e siti ufficiali degli atenei. Ogni piano dice da quale fonte viene e di quale anno è, con il collegamento per controllarlo.</li>
      <li><b>Cosa si studia, come si entra, cosa si fa dopo</b>: i testi che ogni ateneo scrive nella scheda ufficiale del corso, presi dal suo catalogo. Per gli atenei statali li riportiamo per intero e così come sono; per quelli non statali solo l’inizio, con il collegamento al resto. Sotto ogni testo c’è la fonte.</li>
      <li><b>Iscritti e laureati di ogni corso</b>: open data del Ministero dell’Università (<a href="https://dati-ustat.mur.gov.it/" target="_blank" rel="noopener">USTAT</a>, licenza IODL 2.0): iscritti per corso dal 2016/17 al 2025/26 (l’ultimo anno è provvisorio) e laureati del 2025. Quando un gruppo (per esempio le iscritte donne) ha meno di 6 persone, il Ministero non lo pubblica: in quel caso il numero è approssimato.</li>
      <li><b>Com’è andata ai laureati</b> (regolarità, voti, soddisfazione, lavoro e stipendio a uno, tre e cinque anni): <a href="https://www.almalaurea.it/" target="_blank" rel="noopener">AlmaLaurea</a>, indagine 2025 sul profilo e sulla condizione occupazionale dei laureati, schede pubbliche dei singoli corsi e delle classi di laurea. Ci sono solo gli atenei che aderiscono ad AlmaLaurea: non, per esempio, Bocconi, Politecnico di Milano, Cattolica, Luiss e quasi tutte le telematiche.</li>
      <li><b>Comuni e distanze</b>: GeoNames (licenza CC BY 4.0). Le distanze sono in linea d’aria.</li>
    </ul>
    <h2>Come leggere un piano</h2>
    <ul>
      <li>I crediti (CFU) misurano il lavoro di ogni esame: un anno di studio ne vale 60, quindi una triennale 180 e una magistrale 120.</li>
      <li>Il piano mostrato è quello di chi si è iscritto nel ${ANNO_ACCADEMICO}. Dove non l’abbiamo trovato mostriamo il più recente che c’è (di solito quello dell’anno prima, a volte uno più vecchio o già quello del ${ANNO_DOPO}), e la pagina del corso dice di quale anno è. Per chi si iscrive nel ${ANNO_DOPO} il piano può cambiare: prima di iscriverti controllalo sul sito del corso.</li>
      <li>Alcuni atenei pubblicano il piano un anno alla volta (prima il 1° anno, l’anno dopo il 2°…): in quel caso la pagina dice quali anni mancano.</li>
      <li>Nei gruppi a scelta, quando il catalogo dell’ateneo non dice quanti crediti scegliere, lo scriviamo invece di indovinarlo: il numero esatto è nel regolamento del corso.</li>
      <li>Se i crediti mostrati non fanno quelli che servono per la laurea (180, 120, 300 o 360), la pagina del corso lo segnala.</li>
      <li>A volte il catalogo online di un ateneo non coincide con il regolamento del corso (un esame con crediti diversi, un gruppo a scelta descritto in un altro modo). Riportiamo il catalogo così com’è: in caso di dubbio vale il regolamento.</li>
    </ul>
    ${senza.length || altriSenza.length ? `<h2>Corsi senza piano degli esami</h2><ul>${senza.map(x => `<li><b>${esc(x.nome)}</b> (${x.n === x.tot ? corsi(x.n) : `${corsi(x.n)} su ${fmt(x.tot)}`}): ${esc(x.motivo)}.</li>`).join('')}${altriSenza.length ? `<li><b>Altri ${corsi(altriSenza.length)}</b> di ${fmt(atAltri)} ${atAltri === 1 ? 'ateneo' : 'atenei'}: piano non trovato nelle pagine dell’ateneo da cui raccogliamo i piani.</li>` : ''}</ul>` : ''}
    <h2>Dopo la triennale: le magistrali affini</h2>
    <ul>
      <li>Nella pagina di ogni triennale ci sono le magistrali più affini: quelle i cui esami somigliano di più a quelli del corso, confrontando i settori scientifici degli esami obbligatori e a scelta. Per una magistrale con più curricula conta il più affine.</li>
      <li>L’affinità non dice se puoi iscriverti. I requisiti d’accesso (crediti in certe materie, voto, colloquio) li decide ogni ateneo e sono nella pagina della magistrale. L’unica regola che applichiamo è di legge: le magistrali delle professioni sanitarie sono per chi ha la laurea della stessa area.</li>
      <li>Abbiamo provato il calcolo con i testi dei requisiti delle magistrali che nominano le classi di laurea ammesse: una magistrale che nomina la classe della triennale sta sopra una che non la nomina in circa 9 casi su 10.</li>
      <li>Il <a href="#magistrale">quiz per la magistrale</a> usa lo stesso calcolo, con gli esami che hai segnato tu, e ci aggiunge quello che ti è piaciuto e cosa cerchi. Un limite: marketing e management stanno nello stesso settore scientifico, e il quiz non li distingue.</li>
    </ul>
    <h2>Come leggere i numeri dei laureati</h2>
    <ul>
      <li>Vengono dall’indagine AlmaLaurea del 2025: chi si è laureato nel 2024 ha risposto sugli studi; chi si è laureato nel 2023, nel 2021 e nel 2019 è stato intervistato a uno, tre e cinque anni dalla laurea (tre e cinque solo per magistrali e cicli unici). Regolarità, voti, durata e provenienza riguardano tutti i laureati; il resto chi ha risposto.</li>
      <li>Sotto ogni numero c’è lo stesso numero per tutti i laureati della classe di laurea negli atenei di AlmaLaurea, e la posizione del corso tra quelli della stessa classe che abbiamo trovato in AlmaLaurea: «più alto di 8 corsi su 10» vuol dire che 8 corsi su 10 della classe hanno un valore più basso. Tra 4 e 6 su 10 scriviamo «nella media». La posizione si dà solo se nella classe ci sono almeno altri 5 corsi con abbastanza risposte.</li>
      <li>Un numero che si regge su meno di 10 risposte non si mostra: con così pochi casi ballerebbe troppo da un anno all’altro.</li>
      <li>Lavora chi ha un’attività retribuita, anche di formazione (tirocinio, dottorato con borsa), come nella definizione dell’ISTAT. Stipendio, contratto, utilità della laurea per il lavoro («efficacia», per AlmaLaurea) e lavoro all’estero riguardano chi lavora. Il voto medio di laurea può superare 110 perché AlmaLaurea conta la lode come 113.</li>
      <li>I numeri dicono com’è andata a chi si è laureato, non a chi ha lasciato il corso. E dipendono anche da chi si iscrive: un corso a numero programmato, che seleziona all’ingresso, ha di solito più laureati nei tempi previsti (in corso) e voti più alti.</li>
      <li>Ogni corso è abbinato alla sua scheda AlmaLaurea e alla sua riga del Ministero solo quando ateneo, classe e nome coincidono (o il nome è chiaramente lo stesso corso rinominato); nel dubbio il corso resta senza numeri. Quando AlmaLaurea non distingue le sedi di un corso, la pagina lo dice.</li>
      <li>Gli iscritti contano tutti gli anni di corso, fuori corso compresi. Il confronto con il 2022/23 si mostra solo per i corsi attivi da molti anni (già nel 2016/17): in un corso nuovo gli iscritti crescono comunque, man mano che si riempiono il 2° e il 3° anno.</li>
    </ul>
    <h2>Privacy</h2>
    <p>${PAGINE ? 'Senza il tuo consenso il sito non usa cookie e non chiede niente a servizi esterni; con il consenso usa Google Analytics, solo per contare le visite. <a href="privacy.html">Tutti i dettagli</a>.' : `${NOME} non usa cookie, non traccia le visite e non chiede dati a servizi esterni.`} Il comune di partenza e i corsi messi a confronto restano salvati solo nel tuo browser, per ritrovarli la volta dopo.</p>
    <h2>Aggiornamento</h2>
    <p>Dati raccolti ${esc(conArticolo(S.aggiornato, 'il', 'l’') || 'il —')}. I piani possono cambiare durante l’anno: prima di iscriverti controlla sempre sul sito del corso.</p>
  </div>`;
}

/* ---------------- instradamento ---------------- */
// le pagine indice (atenei/, classi/, citta/) arrivano già scritte: si mostrano com'erano finché non si naviga altrove;
// anche il titolo resta quello scritto (sulle pagine dei corsi è più completo di quello che farebbe l'app)
const STATICA = window.BIVIO_STATICA ? $('#app').innerHTML : null, TITOLO_PAGINA = document.title;
let staticaIntatta = true;
function rotta() {
  // le pagine statiche dei corsi (corsi/<nome>.html) dicono quale corso mostrare finché non si naviga altrove
  if (!location.hash && window.BIVIO_CORSO != null) return { nome: 'corso', arg: String(window.BIVIO_CORSO) };
  if (!location.hash && STATICA) return { nome: 'statica' };
  const h = (location.hash || '#casa').slice(1); const [nome, arg] = h.split('.'); return { nome: nome || 'casa', arg };
}
// un errore mentre si disegna una pagina non deve lasciarla ferma su «Carico…»: si mostra con «Riprova»
function disegna(inCima = true) {
  try { disegnaRotta(inCima); } catch (e) { mostraErrore(e); }
}
function disegnaRotta(inCima) {
  const { nome, arg } = rotta(), app = $('#app');
  const viste = { casa: vistaCasa, esplora: vistaEsplora, corso: () => vistaCorso(+arg), materie: vistaMaterie, confronta: vistaConfronta, fonti: vistaFonti,
    quiz: vistaQuiz, profilo: () => vistaProfilo(arg), dopo: () => vistaDopo(+arg), magistrale: () => vistaMagistrale(arg), statica: () => STATICA };
  const y = window.scrollY;
  // chi usa la tastiera non deve perdere il punto in cui era: dopo il ridisegno il fuoco torna sullo stesso controllo
  const att = document.activeElement, dentro = att && att !== app && app.contains(att);
  const chiaveFuoco = dentro ? (att.id ? `#${CSS.escape(att.id)}` : [...att.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('')) : null;
  const cursore = dentro && typeof att.selectionStart === 'number' ? att.selectionStart : null;
  const scorsoFiltri = $('#filtri')?.scrollTop;
  // la pagina indice arriva già scritta: al primo disegno non si riscrive. Sarebbe identica, ma per il browser diventerebbe
  // un contenuto nuovo, comparso solo quando i dati sono arrivati (e Google misura quando compare il contenuto principale)
  if (!(nome === 'statica' && staticaIntatta)) app.innerHTML = (viste[nome] || vistaCasa)();
  if (nome !== 'statica') staticaIntatta = false;
  if (scorsoFiltri && $('#filtri')) $('#filtri').scrollTop = scorsoFiltri;
  if (chiaveFuoco) { const el = app.querySelector(chiaveFuoco); if (el) { el.focus({ preventScroll: true }); if (cursore != null && el.setSelectionRange) try { el.setSelectionRange(cursore, cursore); } catch {} } }
  const sezione = nome === 'profilo' || nome === 'magistrale' ? 'quiz' : nome;
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', false) || (a.dataset.nav === sezione && a.setAttribute('aria-current', 'page')));
  const n = $('#n-confronto'); n.hidden = !S.confronto.length; n.textContent = S.confronto.length;
  document.title = !location.hash && (STATICA || window.BIVIO_CORSO != null) ? TITOLO_PAGINA : nome === 'corso' && S.corsi[+arg] ? `${nomeIntero(S.corsi[+arg])} · ${NOME}` : nome === 'dopo' && S.corsi[+arg] ? `Magistrali affini a ${titoloCorso(S.corsi[+arg].nome)} · ${NOME}` : nome === 'magistrale' ? `Quale magistrale fa per te? · ${NOME}` : sezione === 'quiz' ? `Quale laurea fa per te? · ${NOME}` : NOME;
  // il quiz ha i suoi dati: si caricano la prima volta che serve, poi si ridisegna
  if (nome !== 'magistrale' && sezione === 'quiz' && !S.orientamento) caricaOrientamento().then(() => disegna(false)).catch(e => { if (['quiz', 'profilo'].includes(rotta().nome)) mostraErrore(e); });
  if (nome === 'casa') requestAnimationFrame(() => disegnaMappa($('#mappa-casa'), S.corsi.filter(c => !c.fuori), { grande: true }));
  if (nome === 'esplora' && S.mappa) requestAnimationFrame(() => disegnaMappa($('#mappa-esplora'), trova()));
  if (nome === 'corso') { riempiPiano(S.corsi[+arg]); riempiNumeri(S.corsi[+arg]); riempiDopo(S.corsi[+arg]); }
  if (nome === 'dopo' && S.corsi[+arg] && !(S.corsi[+arg].ateneo in S.dopo)) dopoDi(S.corsi[+arg]).then(() => { if (rotta().nome === 'dopo') disegna(false); });
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
  } else if (t.id === 'f-esame') {
    clearTimeout(attesa);
    attesa = setTimeout(async () => {
      const v = t.value, n = norma(v);
      S.filtri.esame = n.length >= 3 || IA_CERCATA.has(n) ? v : ''; S.mostrati = 60;
      aggiornaRisultati();
      if (S.filtri.esame && !S.esami) { await caricaEsami(); if (rotta().nome === 'esplora') aggiornaRisultati(); }
    }, 450);
  } else if (t.id === 'casa') riempiComuni(t.value);
  else if (t.id === 'cerca-materia') {
    clearTimeout(attesa);
    attesa = setTimeout(async () => { statoMaterie.q = t.value; statoMaterie.scelta = null; const r = $('#risultati-materia'); if (!S.esami) { r.innerHTML = '<p class="caricamento">Carico l’indice degli esami…</p>'; await caricaEsami(); } r.innerHTML = risultatiMaterie(); }, 300);
  }
});
document.addEventListener('focusin', ev => { if (ev.target.id === 'f-esame' && !S.esami) caricaEsami(); });
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'casa') impostaCasa(t.value);
  else if (t.dataset.filtroSelect) { S.filtri[t.dataset.filtroSelect] = t.value; if (t.dataset.filtroSelect === 'gruppo') S.filtri.classe = ''; S.mostrati = 60; disegna(false); }
  else if (t.dataset.filtroCheck) { S.filtri[t.dataset.filtroCheck] = t.checked; S.mostrati = 60; disegna(false); }
  else if (t.id === 'ordine') { S.ordine = t.value; disegna(false); }
  else if (t.id === 'ordine-dopo') { statoDopo.ordine = t.value; statoDopo.mostrati = 30; disegna(false); }
  else if (t.id === 'trasf-da' || t.id === 'trasf-a') { statoTrasf[t.id === 'trasf-da' ? 'da' : 'a'] = +t.value; disegna(false); }
  else if (t.id === 'regione-dopo') { statoDopo.regione = t.value; statoDopo.mostrati = 30; disegna(false); }
});
document.addEventListener('submit', ev => { ev.preventDefault(); const i = ev.target.querySelector('input'); if (ev.target.id === 'form-casa') { S.filtri = { ...S.filtri, q: i.value, comune: '', classe: '' }; vai('#esplora'); } });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-esempio],[data-gruppo],[data-filtro],[data-azione],[data-percorso],[data-preset],[data-gruppo-link],[data-classe-link],[data-materia],[data-area]');
  if (!b) return;
  if (b.tagName === 'A' && (b.dataset.gruppoLink || b.dataset.classeLink || b.dataset.preset || b.dataset.azione === 'azzera')) ev.preventDefault();
  if (b.dataset.esempio) { S.filtri = { ...S.filtri, q: b.dataset.esempio, comune: '', classe: '', gruppo: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.gruppo || b.dataset.gruppoLink) { S.filtri = { ...S.filtri, gruppo: b.dataset.gruppo || b.dataset.gruppoLink, q: '', comune: '', classe: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.classeLink) { S.filtri = { ...S.filtri, classe: b.dataset.classeLink, q: '', comune: '', gruppo: '', tipo: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.preset) { S.filtri = { ...S.filtri, tipo: b.dataset.preset, q: '', comune: '', classe: '' }; S.mostrati = 60; vai('#esplora'); }
  else if (b.dataset.filtro) { const k = b.dataset.filtro; S.filtri[k] = k === 'peso' ? +b.dataset.valore : b.dataset.valore; S.mostrati = 60; disegna(false); }
  else if (b.dataset.area) {
    // un'area sta in una lista sola: sceglierla fra le preferite la toglie da quelle da evitare, e viceversa
    const k = b.dataset.area, l = b.dataset.lista, altra = l === 'voglio' ? 'evito' : 'voglio';
    S.filtri[l] = S.filtri[l].includes(k) ? S.filtri[l].filter(x => x !== k) : [...S.filtri[l], k];
    S.filtri[altra] = S.filtri[altra].filter(x => x !== k); S.mostrati = 60; disegna(false);
  }
  else if (b.dataset.percorso) { statoPiano.percorso = +b.dataset.percorso; riempiPiano(S.corsi[+rotta().arg]); }
  else if (b.dataset.materia) { statoMaterie.scelta = statoMaterie.scelta === +b.dataset.materia ? null : +b.dataset.materia; $('#risultati-materia').innerHTML = risultatiMaterie(); }
  else {
    const a = b.dataset.azione;
    if (a === 'riprova') conDati().then(() => disegna(false)).catch(mostraErrore);
    else if (a === 'altri') { S.mostrati += 60; disegna(false); }
    else if (a === 'altri-dopo') { statoDopo.mostrati += 30; disegna(false); }
    else if (a === 'azzera') { S.filtri = filtriVuoti(); S.mostrati = 60; vai('#esplora'); }
    else if (a === 'mostra-filtri') { S.filtriAperti = $('#filtri').classList.toggle('aperti'); b.setAttribute('aria-expanded', S.filtriAperti); } // resta aperto ai ridisegni
    else if (a === 'mappa') { S.mappa = !S.mappa; disegna(false); }
    else if (a === 'tema') { const t = temaScuro() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; salva('tema', t); aggiornaTema(); }
    else if (a === 'vai-anno') { const el = document.getElementById('anno-' + b.dataset.anno); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    else if (a === 'apri-testo') { const t = document.getElementById(b.dataset.testo); t.classList.remove('chiuso'); t.tabIndex = -1; b.remove(); t.focus({ preventScroll: true }); }
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
window.addEventListener('hashchange', () => conDati().then(() => {
  disegna(true);
  // chi sta scrivendo nella ricerca resta nella casella; negli altri casi il fuoco va al titolo della nuova pagina
  if (S.scrivendo) {
    S.scrivendo = false;
    const i = [$('#cerca-esplora'), $('#cerca-testata')].find(x => x && x.offsetParent !== null);
    if (i) { i.value = S.filtri.q; i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch {} }
    return;
  }
  const t = $('#app h1'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
}).catch(mostraErrore));
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

// i dati (circa 400 KB compressi) servono alla pagina iniziale, ai corsi e all'app; le pagine indice sono già scritte e li
// scaricano solo quando si cerca o si naviga dentro l'app, così su un telefono si aprono subito
let datiPronti = null;
// una richiesta fallita non resta in memoria: «Riprova» la rifà
function conDati() { return datiPronti || (datiPronti = carica().catch(e => { datiPronti = null; throw e; })); }
// al posto di un'attesa infinita: cosa non va, «Riprova» e, in piccolo, il motivo tecnico (con il punto del codice), che
// chi lo vede può riferire. Nei quiz anche «Ricomincia», nel caso il problema sia nelle risposte salvate sul dispositivo
function mostraErrore(e) {
  console.error(e);
  const app = $('#app'); if (!app) return;
  const dati = !!(e && e.dati), { nome } = rotta(), punto = !dati && String((e && e.stack) || '').match(/([\w.-]+\.js):(\d+)/);
  const motivo = `${(e && e.message) || String(e)}${punto ? ` · ${punto[1]}:${punto[2]}` : ''}`;
  const ricomincia = dati ? '' : nome === 'quiz' ? '<button type="button" class="btn" data-q="inizia">Ricomincia il quiz</button>'
    : nome === 'magistrale' ? '<button type="button" class="btn" data-m="inizia">Ricomincia il quiz</button>'
    : nome === 'profilo' ? '<a class="btn" href="#quiz">Torna al quiz</a>' : '';
  app.innerHTML = `<div class="colonna vuoto" role="alert">
    <b>${dati ? 'Non riusciamo a caricare i dati.' : 'Non riusciamo a mostrare questa pagina.'}</b>
    <span>${dati ? 'Forse la connessione si è interrotta: riprova tra un momento.' : `È un errore del sito, non tuo. Riprova; se si ripete, scrivici${PAGINE ? ' (l’indirizzo è nella pagina <a href="privacy.html">Privacy</a>)' : ''} copiando il motivo qui sotto.`}</span>
    <span class="azioni-errore"><button type="button" class="btn primario" data-azione="riprova">Riprova</button>${ricomincia}</span>
    <span class="tenue piccolo">Motivo: ${esc(motivo)}</span>
  </div>`;
}
if (!STATICA || location.hash) conDati().then(() => disegna(true)).catch(mostraErrore);
