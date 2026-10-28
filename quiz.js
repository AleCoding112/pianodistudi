'use strict';
/* ---------------- quiz di orientamento ----------------
   Chi lo fa sceglie tra situazioni concrete (la più e la meno attraente di quattro), dice che lavoro immagina e le sue
   condizioni pratiche, poi assaggia «alla cieca» il primo anno vero di sei lauree vicine al suo profilo. Il profilo è un
   punteggio da -1 a +1 su 24 ambiti di studio; ogni classe di laurea ha la quota dei suoi crediti obbligatori in ciascun
   ambito (dati/orientamento.json, da raccolta/orientamento.py). L'affinità di una laurea è la media dei gusti pesata sui
   suoi crediti. Usa le utilità di app.js, che va caricato prima. */

const AMBITI_NOMI = {
  mat: 'matematica', sta: 'statistica e analisi dei dati', fis: 'fisica', inf: 'informatica',
  ele: 'elettronica, automazione e telecomunicazioni', ind: 'ingegneria industriale', civ: 'architettura, edilizia e territorio',
  des: 'arte, design e spettacolo', chi: 'chimica', bio: 'biologia', ter: 'scienze della Terra e dell’ambiente',
  agr: 'agraria, alimenti e animali', med: 'medicina e salute', mot: 'sport e movimento', psi: 'psicologia',
  edu: 'educazione e insegnamento', eco: 'economia', eaz: 'aziende, management e finanza', giu: 'diritto',
  pol: 'società, politica e comunicazione', lin: 'lingue e culture straniere', let: 'letteratura e lingua italiana e classica',
  sto: 'storia, archeologia e beni culturali', fil: 'filosofia',
};
// gli stessi ambiti con un nome corto, per le frasi: quelli lunghi hanno virgole e «e» dentro, e in un elenco si confondono
const AMBITI_BREVI = {
  mat: 'matematica', sta: 'statistica', fis: 'fisica', inf: 'informatica', ele: 'elettronica', ind: 'ingegneria industriale',
  civ: 'architettura', des: 'design', chi: 'chimica', bio: 'biologia', ter: 'scienze della Terra', agr: 'agraria',
  med: 'medicina', mot: 'sport', psi: 'psicologia', edu: 'educazione', eco: 'economia', eaz: 'gestione aziendale', giu: 'diritto',
  pol: 'scienze sociali', lin: 'lingue straniere', let: 'letteratura', sto: 'storia', fil: 'filosofia',
};
// otto famiglie per il titolo del profilo e il grafico (24 ambiti sono troppi da leggere a colpo d'occhio)
const FAMIGLIE = [
  { k: 'numeri', nome: 'Numeri e logica', ambiti: ['mat', 'sta', 'fis'] },
  { k: 'tecno', nome: 'Tecnologia e ingegneria', ambiti: ['inf', 'ele', 'ind'] },
  { k: 'progetto', nome: 'Progettare spazi e oggetti', ambiti: ['civ', 'des'] },
  { k: 'natura', nome: 'Natura e scienze della vita', ambiti: ['chi', 'bio', 'ter', 'agr'] },
  { k: 'salute', nome: 'Salute e corpo', ambiti: ['med', 'mot'] },
  { k: 'persone', nome: 'Mente ed educazione', ambiti: ['psi', 'edu'] },
  { k: 'societa', nome: 'Economia, diritto e società', ambiti: ['eco', 'eaz', 'giu', 'pol'] },
  { k: 'culture', nome: 'Lingue, testi e storia', ambiti: ['lin', 'let', 'sto', 'fil'] },
];
// dodici situazioni da quattro attività; ogni ambito compare due volte. Sei situazioni mettono a confronto due coppie di
// ambiti vicini (architettura e design, informatica e statistica, economia e gestione aziendale, biologia e chimica,
// matematica e fisica, psicologia ed educazione, lettere e lingue, elettronica e ingegneria industriale, diritto e politica,
// storia e filosofia, medicina e sport, scienze della Terra e agraria): senza, due interessi vicini arriverebbero tutti e
// due al massimo e il quiz non saprebbe quale preferisci. Le altre sei mescolano ambiti lontani.
// Le attività descrivono il ragionamento di una disciplina, non un prodotto: «creare un sito» o «programmare un'app» oggi
// si fanno con l'intelligenza artificiale e misurerebbero la voglia di fare una cosa, non quella di studiarla
const SITUAZIONI = [
  { d: 'Ti regalano un corso estivo di due settimane. Quale scegli?', o: [
    ['Logica e giochi matematici, come alle olimpiadi di matematica', { mat: 1 }],
    ['Elettronica: capire come un sensore trasforma il calore in un segnale, e costruirne uno', { ele: 1 }],
    ['Agricoltura del futuro: coltivare con meno acqua e senza impoverire il suolo', { agr: 1 }],
    ['Diritto per tutti: contratti, affitti, multe, i tuoi diritti di tutti i giorni', { giu: 1 }]] },
  { d: 'Progetto di gruppo sull’uso dei telefoni a scuola. Quale parte prendi?', o: [
    ['Capire perché l’app con cui raccogliete i dati è lenta, e riscrivere la parte che la rallenta', { inf: 1 }],
    ['Capire se le differenze fra le classi nelle risposte al questionario sono reali o solo un caso', { sta: 1 }],
    ['Scrivere il testo finale, rileggendolo finché ogni frase suona giusta', { let: 1 }],
    ['Tradurre il progetto per una scuola in Germania, senza perdere il tono', { lin: 1 }]] },
  { d: 'Quale di questi enigmi ti terrebbe sveglio la notte?', o: [
    ['Perché il tempo scorre più lento vicino a un buco nero?', { fis: 1 }],
    ['Come fa un computer a trovare in un attimo la strada più breve fra milioni di possibili?', { inf: 1 }],
    ['Perché assomigliamo ai nostri genitori, ma non del tutto?', { bio: 1 }],
    ['Perché in certi Paesi quasi tutti vanno a votare e in altri quasi nessuno?', { pol: 1 }]] },
  { d: 'Un’azienda sta per lanciare un nuovo integratore. In quale parte del lavoro vorresti stare?', o: [
    ['Studiare che cosa fa davvero alle cellule e all’intestino', { bio: 1 }],
    ['Capire di quali molecole è fatto e come evitare che si alteri col tempo', { chi: 1 }],
    ['Capire come cambierebbero prezzi e consumi se lo Stato tassasse gli integratori', { eco: 1 }],
    ['Decidere prezzo, budget e come organizzare il lancio sul mercato', { eaz: 1 }]] },
  { d: 'Una persona a cui tieni ti chiede una mano. Dove ti senti più utile?', o: [
    ['Deve capire che cosa dicono i suoi esami del sangue prima di tornare dal medico', { med: 1 }],
    ['È in ansia per un esame e vuole capire come gestire l’agitazione', { psi: 1 }],
    ['Vuole capire perché il suo stipendio compra meno cose di due anni fa', { eco: 1 }],
    ['Si trasferisce all’estero e deve imparare in fretta la lingua', { lin: 1 }]] },
  { d: 'Quale di queste cose ti piacerebbe saper fare?', o: [
    ['Dimostrare che un ragionamento funziona sempre, non solo negli esempi che hai provato', { mat: 1 }],
    ['Prevedere con una formula come cade, rimbalza o vibra un oggetto', { fis: 1 }],
    ['Capire perché ricordiamo certe cose e ne dimentichiamo altre', { psi: 1 }],
    ['Spiegare la stessa cosa a chi la capisce subito e a chi fa fatica', { edu: 1 }]] },
  { d: 'Stasera il documentario lo scegli tu.', o: [
    ['Come si prevede il risultato di un’elezione intervistando solo mille persone', { sta: 1 }],
    ['Come nasce un’auto elettrica, dalla batteria alla catena di montaggio', { ind: 1 }],
    ['Vulcani, terremoti e clima: come cambia la Terra', { ter: 1 }],
    ['Come è nato un grande romanzo, dalle prime bozze all’ultima pagina', { let: 1 }]] },
  { d: 'Il tuo comune vuole rimettere a nuovo la vecchia stazione. Di cosa ti occupi?', o: [
    ['Progettare gli spazi: luce, percorsi, struttura dell’edificio', { civ: 1 }],
    ['Disegnare arredi, panchine e cartelli, perché siano belli e facili da usare', { des: 1 }],
    ['Ricostruire la storia dell’edificio e di chi ci passava, documenti alla mano', { sto: 1 }],
    ['Ragionare su che cosa rende un luogo pubblico giusto e accogliente per tutti', { fil: 1 }]] },
  { d: 'Quale libro ti porteresti in vacanza?', o: [
    ['Perché un ponte romano sta in piedi da duemila anni e uno nuovo crolla', { civ: 1 }],
    ['La chimica in cucina: cosa succede davvero quando cuoci, lieviti, friggi', { chi: 1 }],
    ['Come una bottega di famiglia è diventata un marchio conosciuto in tutto il mondo', { eaz: 1 }],
    ['Un saggio su che cosa è giusto fare quando nessuno ti vede', { fil: 1 }]] },
  { d: 'Visiti una fabbrica di treni. Dove ti fermi più a lungo?', o: [
    ['Davanti al sistema che controlla motori e frenata con sensori e segnali', { ele: 1 }],
    ['Ai banchi di prova dove si verifica che ruote e telaio reggano milioni di chilometri', { ind: 1 }],
    ['Con chi scrive i contratti con i fornitori e decide chi risponde se un pezzo si rompe', { giu: 1 }],
    ['Con chi studia come è cambiata la città da quando la fabbrica ha aperto', { pol: 1 }]] },
  { d: 'Un anno di servizio civile. Dove lo fai?', o: [
    ['In un teatro, fra scenografie, luci e costumi', { des: 1 }],
    ['In una società sportiva, ad allenare ragazzi con disabilità', { mot: 1 }],
    ['In una scuola di periferia, ad aiutare i ragazzi con i compiti', { edu: 1 }],
    ['In un archivio storico, a riordinare documenti e preparare le visite', { sto: 1 }]] },
  { d: 'Ultima: un mese in montagna con un’associazione. Di cosa ti occupi?', o: [
    ['Del presidio di primo soccorso: capire cos’ha chi sta male e cosa fare', { med: 1 }],
    ['Della preparazione fisica del gruppo prima delle escursioni', { mot: 1 }],
    ['Dei rilievi su una frana: capire perché il versante si muove', { ter: 1 }],
    ['Delle stalle e dei pascoli: come stanno gli animali e che cosa mangiano', { agr: 1 }]] },
];
const LAVORO = { d: 'Tra dieci anni, una giornata di lavoro riuscita è una giornata in cui…', o: [
  ['…ho aiutato qualcuno a stare meglio', { med: .6, psi: .5, edu: .3, mot: .3 }],
  ['…ho risolto un problema difficile con i numeri o con il codice', { inf: .6, mat: .5, sta: .5, fis: .3 }],
  ['…ho progettato o costruito qualcosa che prima non c’era', { ind: .5, civ: .5, ele: .5, des: .5 }],
  ['…ho preso decisioni, trattato, convinto qualcuno', { eaz: .6, giu: .5, eco: .4, pol: .4 }],
  ['…ho scoperto qualcosa di nuovo su come funziona la natura', { bio: .5, chi: .5, ter: .5, agr: .3, fis: .3 }],
  ['…ho scritto, tradotto o raccontato qualcosa', { let: .6, lin: .6, sto: .4, fil: .3, pol: .3 }]] };
// il modo di studiare e di lavorare: tre domande sulla stessa schermata, ognuna con una via di mezzo. Non toccano i gusti:
// servono a distinguere lauree con materie simili (Biologia e Biotecnologie, Matematica e Ingegneria, Lettere e Comunicazione).
// Ogni opzione è [valore salvato, testo]; l'ordine è quello in cui si mostrano, con la via di mezzo al centro
const MODO = [
  { k: 'teoria', d: 'Davanti a una cosa nuova, cosa ti prende di più?', o: [[0, 'Capire perché funziona così'], [1, 'Tutte e due allo stesso modo'],
    [2, 'Capire come usarla per risolvere un problema']] },
  { k: 'persone', d: 'Nel lavoro che immagini, passi le giornate soprattutto…', o: [[0, 'Con le persone: ascoltare, curare, insegnare, convincere'],
    [1, 'Un po’ con le persone, un po’ no'], [2, 'Con oggetti, dati, testi o progetti']] },
  { k: 'strada', d: 'Che tipo di laurea preferisci?', o: [[0, 'Una che porta dritta a un mestiere preciso (infermiere, architetta, farmacista…)'],
    [2, 'Non lo so ancora'], [1, 'Una che apre molte strade, da scegliere più avanti']] },
];
// lauree che preparano a una professione precisa (spesso abilitanti): contano per la domanda sulla strada
const PROFESSIONALI = new Set(['L/SNT1', 'L/SNT2', 'L/SNT3', 'L/SNT4', 'LM-41', 'LM-46', 'LM-42', 'LM-13', 'LM-4 c.u.',
  'LM-85 bis', 'LMG/01', 'LMR/02', 'L-39', 'L-P01', 'L-P02', 'L-P03']);
// come si studia e dove porta ogni laurea: [teoria −1 / applicazione +1, oggetti, dati e testi −1 / persone +1], 0 se sta
// nel mezzo o dipende dal corso. È un giudizio nostro, non un dato dei piani: per questo pesa poco e serve solo a separare
// lauree che le materie da sole non distinguono. Le classi che mancano valgono 0 e 0
const COME = {
  'L- Sc. Mat.': [0, -1], 'L-1': [0, 0], 'L-2': [1, -1], 'L-3': [0, 0], 'L-4': [1, -1], 'L-5': [-1, -1], 'L-6': [0, -1], 'L-7': [1, -1],
  'L-8': [1, -1], 'L-9': [1, -1], 'L-10': [-1, 0], 'L-11': [0, 0], 'L-12': [1, 0], 'L-13': [-1, -1], 'L-14': [1, 0], 'L-15': [1, 1],
  'L-16': [1, 0], 'L-17': [1, -1], 'L-18': [1, 0], 'L-19': [1, 1], 'L-20': [1, 0], 'L-21': [1, -1], 'L-22': [1, 1], 'L-23': [1, -1],
  'L-24': [0, 1], 'L-25': [1, -1], 'L-26': [1, -1], 'L-27': [-1, -1], 'L-28': [1, -1], 'L-29': [1, -1], 'L-30': [-1, -1], 'L-31': [0, -1],
  'L-32': [0, -1], 'L-33': [-1, -1], 'L-34': [0, -1], 'L-35': [-1, -1], 'L-36': [0, 0], 'L-37': [1, 1], 'L-38': [1, -1], 'L-39': [1, 1],
  'L-40': [-1, 0], 'L-41': [0, -1], 'L-42': [-1, -1], 'L-43': [1, -1], 'L-P01': [1, -1], 'L-P02': [1, -1], 'L-P03': [1, -1],
  'L/DS': [1, 0], 'L/GASTR': [1, 0], 'L/SNT1': [1, 1], 'L/SNT2': [1, 1], 'L/SNT3': [1, 0], 'L/SNT4': [1, 0], 'LM-13': [1, 0],
  'LM-4 c.u.': [1, -1], 'LM-41': [1, 1], 'LM-42': [1, 0], 'LM-46': [1, 1], 'LM-85 bis': [1, 1], 'LMG/01': [0, 0], 'LMR/02': [1, -1],
};
// le quattro classi delle professioni sanitarie hanno quasi gli stessi settori: nel risultato stanno in una scheda sola
const SANITARIE = new Set(['L/SNT1', 'L/SNT2', 'L/SNT3', 'L/SNT4']);
const NOMI_CLASSI = {
  'L- Sc. Mat.': 'Scienza dei materiali', 'L-1': 'Beni culturali', 'L-2': 'Biotecnologie', 'L-3': 'Arti, musica e spettacolo',
  'L-4': 'Design', 'L-5': 'Filosofia', 'L-6': 'Geografia', 'L-7': 'Ingegneria civile e ambientale',
  'L-8': 'Ingegneria informatica, elettronica e delle telecomunicazioni', 'L-9': 'Ingegneria industriale: meccanica, gestionale, energetica…',
  'L-10': 'Lettere', 'L-11': 'Lingue e culture moderne', 'L-12': 'Mediazione linguistica', 'L-13': 'Biologia',
  'L-14': 'Scienze dei servizi giuridici', 'L-15': 'Turismo', 'L-16': 'Scienze dell’amministrazione', 'L-17': 'Architettura',
  'L-18': 'Economia aziendale e management', 'L-19': 'Scienze dell’educazione', 'L-20': 'Scienze della comunicazione',
  'L-21': 'Urbanistica e pianificazione del territorio', 'L-22': 'Scienze motorie', 'L-23': 'Ingegneria edile',
  'L-24': 'Psicologia', 'L-25': 'Agraria e scienze forestali', 'L-26': 'Scienze e tecnologie alimentari', 'L-27': 'Chimica',
  'L-28': 'Scienze nautiche e della navigazione', 'L-29': 'Scienze farmaceutiche applicate e nutrizione',
  'L-30': 'Fisica', 'L-31': 'Informatica', 'L-32': 'Scienze ambientali e naturali', 'L-33': 'Economia', 'L-34': 'Geologia',
  'L-35': 'Matematica', 'L-36': 'Scienze politiche e relazioni internazionali', 'L-37': 'Cooperazione e sviluppo',
  'L-38': 'Produzioni animali', 'L-39': 'Servizio sociale', 'L-40': 'Sociologia', 'L-41': 'Statistica e data science',
  'L-42': 'Storia', 'L-43': 'Diagnostica per i beni culturali', 'L-P01': 'Tecniche per l’edilizia e il territorio',
  'L-P02': 'Tecniche agrarie e alimentari', 'L-P03': 'Tecniche industriali', 'L/DS': 'Scienze della difesa e della sicurezza',
  'L/GASTR': 'Scienze gastronomiche', 'L/SNT1': 'Infermieristica e ostetricia', 'L/SNT2': 'Fisioterapia, logopedia e riabilitazione',
  'L/SNT3': 'Tecniche sanitarie: radiologia, laboratorio, dietistica…', 'L/SNT4': 'Prevenzione sanitaria',
  'LM-13': 'Farmacia', 'LM-4 c.u.': 'Architettura (ciclo unico)', 'LM-41': 'Medicina e chirurgia', 'LM-42': 'Medicina veterinaria',
  'LM-46': 'Odontoiatria', 'LM-85 bis': 'Scienze della formazione primaria', 'LMG/01': 'Giurisprudenza',
  'LMR/02': 'Conservazione e restauro dei beni culturali',
};
// il nome di un percorso: quello più comune fra i suoi corsi (dati/orientamento.json); per le classi delle professioni
// sanitarie raccolte in una scheda sola, il nome breve della classe
const nomePercorso = cl => cl.nome;
// il modo di studiare di un percorso: quello della sua classe, tranne i percorsi che dentro la classe vanno altrove
const COME_PERCORSI = [[/gestional|management engineering/, [1, 0]], [/biomedic|medica\b|salute/, [1, 0]]];
const comeDi = cl => (COME_PERCORSI.find(([rx]) => rx.test(norma(cl.nome))) || [, COME[cl.classe] || [0, 0]])[1];
const PARTI = [['Cosa ti attira', 0, 12], ['Il lavoro e il modo di studiare', 12, 14], ['Le tue condizioni', 14, 15], ['Alla cieca', 15, 17]];
const PASSI = 17, KM_VICINO = 60;
const COND_BASE = { dove: 2, test: 1, inglese: 1, online: 0, ciclo: 1 };
const ICONA_BUSSOLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="m16.2 7.8-1.8 5.4a2 2 0 0 1-1.3 1.3l-5.3 1.7 1.8-5.4a2 2 0 0 1 1.3-1.3z"/></svg>';

/* ---------- dati ---------- */
let caricamentoOrientamento = null;
function caricaOrientamento() {
  if (!caricamentoOrientamento) caricamentoOrientamento = json('dati/orientamento.json').then(o => {
    o.percorsoDi = {};
    o.percorsi.forEach((cl, k) => { cl.k = k; cl.quote = Object.fromEntries(o.ambiti.map((a, j) => [a, cl.profilo[j]])); cl.corsi.forEach(i => { o.percorsoDi[i] = k; }); });
    S.orientamento = o;
  });
  return caricamentoOrientamento;
}
const corsiDelPercorso = cl => cl.corsi.map(i => S.corsi[i]).filter(c => c && !c.fuori);
// il profilo di un singolo corso (quote dei crediti per ambito), per ordinare i corsi di un percorso
function quoteCorso(i) {
  const p = S.orientamento.profili[i];
  return p ? Object.fromEntries(p.map(([a, q]) => [S.orientamento.ambiti[a], q / 100])) : null;
}
// le condizioni pratiche scartano i corsi, non le persone: una laurea resta in gara se ha almeno un corso che va bene
function corsoAdatto(c, cond) {
  if (!cond.test && (c.accesso || '').startsWith('programmato')) return false;
  if (!cond.inglese && c.lingua === 'Inglese') return false;
  if (!cond.online && /distanza/i.test(c.didattica || '')) return false;
  return true;
}
function vicino(c, cond) {
  if (!S.casa || cond.dove === 2 || /distanza/i.test(c.didattica || '')) return true;
  if (cond.dove === 0) { const d = distanzaDi(c); return d != null && d <= KM_VICINO; }
  return regioneDi(c) === S.regioni[S.comuni[S.casa]?.[4]];
}

/* ---------- risposte: stato, salvataggio, codice per il link al risultato ---------- */
// le risposte salvate di una versione precedente del quiz (domande diverse) non valgono più
let Q = leggi('quiz', null);
if (Q && Q.versione !== 3) Q = null;
const NESSUNA = 4;  // al posto dell'attività «di più»: nessuna delle quattro attira davvero
function mescola(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nuovoQuiz() {
  Q = { versione: 3, passo: 0, ordine: SITUAZIONI.map(() => mescola(4)), scelte: SITUAZIONI.map(() => [null, null]), lavoro: null, strada: null, teoria: null, persone: null,
    ordineLavoro: mescola(LAVORO.o.length), cond: { ...COND_BASE }, assaggi: [null, null], ordineAssaggi: [mescola(3), mescola(3)] };
  salva('quiz', Q);
}
// un carattere per risposta: versione, 12 coppie (più, meno; più = 4 se nessuna attira), lavoro, strada, teoria, persone,
// 5 condizioni, 2 assaggi (3 = nessuno, 9 = non mostrato). Le versioni 1 e 2 avevano altre situazioni: i loro link non si
// possono più leggere, e il profilo lo dice (vecchioProfilo)
function codifica(q) {
  const c = q.cond;
  return '3' + q.scelte.map(([b, w]) => `${b}${w}`).join('') + (q.lavoro ?? 9) + (q.strada ?? 2) + (q.teoria ?? 1) + (q.persone ?? 1)
    + c.dove + c.test + c.inglese + c.online + c.ciclo + q.assaggi.map(x => x ?? 9).join('');
}
function decodifica(t) {
  if (!/^3\d{35}$/.test(t || '')) return null;
  const d = t.slice(1).split('').map(Number), scelte = [];
  for (let k = 0; k < 12; k++) { const [b, w] = [d[2 * k], d[2 * k + 1]]; if (b > NESSUNA || w > 3 || b === w) return null; scelte.push([b, w]); }
  const lavoro = d[24] === 9 ? null : d[24], [dove, test, inglese, online, ciclo] = d.slice(28, 33);
  if ([d[25], d[26], d[27]].some(x => x > 2)) return null;
  return { scelte, lavoro, strada: d[25], teoria: d[26], persone: d[27], cond: { dove, test, inglese, online, ciclo }, assaggi: d.slice(33, 35).map(x => x === 9 ? null : x) };
}

/* ---------- calcolo ---------- */
// i gusti da -1 a +1 per ambito. senza: una situazione da lasciare fuori, per misurare quanto il risultato dipende da una
// sola risposta (vedi margini)
function gustiPerAmbito(r, senza = -1) {
  const A = S.orientamento.ambiti, grezzo = Object.fromEntries(A.map(a => [a, 0])), peso = { ...grezzo };
  SITUAZIONI.forEach((sit, k) => {
    if (k === senza) return;
    const [b, w] = r.scelte[k];
    sit.o.forEach(([, pesi], i) => { for (const [a, p] of Object.entries(pesi)) { peso[a] += p; if (i === b) grezzo[a] += p; if (i === w) grezzo[a] -= p; } });
  });
  // il lavoro immaginato è una scelta sola: alza gli ambiti dell'opzione scelta e pesa un po' meno gli altri
  if (r.lavoro != null) LAVORO.o.forEach(([, pesi], i) => { for (const [a, p] of Object.entries(pesi)) { peso[a] += p; if (i === r.lavoro) grezzo[a] += p; } });
  return Object.fromEntries(A.map(a => [a, peso[a] ? Math.max(-1, Math.min(1, grezzo[a] / peso[a])) : 0]));
}
const SOGLIA = .3;  // da qui in su un ambito «ti attira», da -SOGLIA in giù «l'hai scartato»
// i pesi sono tarati con gli studenti simulati di verifica/quiz-studenti.mjs: chi li cambia rilanci quella verifica
const PESO_FORMA = .7, PESO_SCARTO = .4, PESO_COME = .05, PESO_STRADA = .04, MARGINE_MINIMO = .015, FORMA_ESTREMI = [.4, 1];
const direzione = v => v === 0 ? -1 : v === 2 ? 1 : 0;  // le risposte sul modo: 0 e 2 sono i due estremi, 1 la via di mezzo
function affinita(cl, s, r, forma = PESO_FORMA) {
  // due misure insieme. La forma: il coseno tra quello che ti attira e le quote dei crediti premia le lauree che coprono i
  // tuoi interessi nelle stesse proporzioni, anche quando sono miste (Comunicazione, Biotecnologie). La quantità: la parte
  // dei crediti in ambiti che ti attirano premia le lauree concentrate su quello che ti attira di più. Da sola, la quantità
  // favorisce le lauree fatte di un solo ambito; da sola, la forma esagera nell'altro verso, perché scegliere «di più» fra
  // quattro attività dà il massimo anche a un interesse secondario (l'architetto che ama un po' il design finirebbe a
  // Design). Poi tolgono punti i crediti negli ambiti scartati, e il modo di studiare e la strada spostano di poco
  let dot = 0, nq = 0, np = 0, quanti = 0, scarto = 0;
  for (const a in s) {
    const q = cl.quote[a] || 0, p = Math.max(0, s[a]);
    dot += q * p; nq += q * q; np += p * p; quanti += q * p;
    if (s[a] < 0) scarto -= q * s[a];
  }
  let v = forma * (np && nq ? dot / Math.sqrt(nq * np) : 0) + (1 - forma) * quanti - PESO_SCARTO * scarto;
  const [t, p] = comeDi(cl);
  v += PESO_COME * (direzione(r.teoria) * t - direzione(r.persone) * p);
  if (r.strada === 0 && PROFESSIONALI.has(cl.classe)) v += PESO_STRADA;
  if (r.strada === 1 && !PROFESSIONALI.has(cl.classe)) v += PESO_STRADA;
  return v;
}
function gustiDellaClasse(cl, s) {
  let piace = 0, scarta = 0; const pro = [], contro = [];
  for (const a in s) {
    const q = cl.quote[a] || 0; if (!q) continue;
    if (s[a] >= SOGLIA) { piace += q; pro.push([a, q, q * s[a]]); } else if (s[a] <= -SOGLIA) { scarta += q; contro.push([a, q, -q * s[a]]); }
  }
  const tot = Object.values(cl.quote).reduce((x, y) => x + y, 0) || 1;
  return { piace: piace / tot, scarta: scarta / tot, pro: pro.sort((x, y) => y[2] - x[2]), contro: contro.sort((x, y) => y[2] - x[2]) };
}
// la classifica in «voci». Una voce raccoglie le varianti della stessa laurea, perché non si contendano i primi posti:
// i percorsi della stessa classe con la stessa parola chiave nel nome («Odontoiatria» e «Odontoiatria e protesi dentaria»,
// le tre «Design»), e tutte le professioni sanitarie. La parola chiave salta le parole generiche, così Ingegneria
// gestionale e Ingegneria meccanica restano voci diverse. La voce prende il posto, e il nome, della variante più vicina
const GENERICHE = new Set(['ingegneria', 'scienze', 'scienza', 'tecniche', 'tecnica', 'tecnologie', 'tecnologia', 'studi', 'discipline', 'corso', 'laurea']);
function famiglia(cl) {
  if (SANITARIE.has(cl.classe)) return 'SNT';
  const parola = norma(cl.nome).split(' ').find(w => w.length > 3 && !GENERICHE.has(w)) || norma(cl.nome);
  return `${cl.classe}|${cl.tipo}|${parola.slice(0, 6)}`;
}
function voci(classi) {
  const out = [], per = new Map();
  for (const x of classi) {
    const f = famiglia(x.cl);
    if (per.has(f)) { per.get(f).classi.push(x); continue; }
    const v = { classi: [x], sanitarie: f === 'SNT' };
    per.set(f, v); out.push(v);
  }
  out.forEach(v => {
    v.affinita = v.classi[0].affinita; v.campione = v.classi[0].cl.campione;
    if (v.classi[0].varianti) {
      v.varianti = v.classi[0].varianti.map((_, k) => Math.max(...v.classi.map(x => x.varianti[k])));
      v.estremi = v.classi[0].estremi.map((_, k) => Math.max(...v.classi.map(x => x.estremi[k])));
    }
  });
  return out;
}
// quanto è solida la classifica. Due lauree sono alla pari con la prima in due casi:
// - il rumore: i punteggi rifatti dodici volte, ogni volta senza una delle situazioni. Lo scarto tipico della differenza
//   fra una laurea e la prima (stima jackknife) è il margine sotto cui l'ordine potrebbe invertirsi cambiando una risposta;
// - quello che le risposte non dicono: se due ambiti ti attirano entrambi al massimo (succede quando nelle loro situazioni
//   non competono mai fra loro, come architettura e design), il quiz non sa quale preferisci, e la laurea che li mescola e
//   quella concentrata su uno solo si scambiano di posto a seconda di quanto pesa la forma rispetto alla quantità. Se con
//   la sola forma, o con poca forma, la laurea passa davanti alla prima, le due sono alla pari.
// Le lauree alla pari con la prima, dall'alto, formano il gruppo di testa
function margini(lista) {
  const t = lista[0], n = t ? t.varianti.length : 0;
  let testa = true;
  lista.forEach((v, j) => {
    const d = v.varianti.map((x, k) => t.varianti[k] - x), m = d.reduce((a, b) => a + b, 0) / n;
    v.margine = Math.max(MARGINE_MINIMO, Math.sqrt((n - 1) / n * d.reduce((a, b) => a + (b - m) ** 2, 0)));
    v.pari = j === 0 || t.affinita - v.affinita < v.margine || v.estremi.some((x, k) => x >= t.estremi[k]);
    testa = testa && v.pari; v.inTesta = testa;
  });
}
// ogni ambito è l'attività principale (peso 1) in due situazioni: dove, per dire quali scelte si confermano
const APPARIZIONI = {};
SITUAZIONI.forEach((sit, k) => sit.o.forEach(([, pesi], i) => { for (const a in pesi) if (pesi[a] === 1) (APPARIZIONI[a] = APPARIZIONI[a] || []).push([k, i]); }));
// quanto è netto il profilo: la distanza fra le due aree che ti attirano di più e le due che ti attirano di meno, messa a
// confronto con quella di 1.000 risposte date a caso (sempre le stesse). Dodici scelte forzate sono troppo poche per
// misurare la coerenza di una persona (provato con gli studenti simulati: nessuna misura separa bene chi risponde a caso da
// chi è solo un po' incostante); dire se il profilo si distingue dal caso, invece, si può. pct: la quota di risposte a caso
// con un profilo meno netto. Sotto la metà il profilo non si distingue dal caso, e il risultato lo dice
const nettezza = s => { const f = FAMIGLIE.map(f => f.ambiti.reduce((t, a) => t + s[a], 0) / f.ambiti.length).sort((x, y) => y - x); return f[0] + f[1] - f[6] - f[7]; };
// il confronto è con risposte a caso date nelle stesse condizioni: dove hai detto «nessuna mi attira», anche il caso lo dice
// (sennò chi è selettivo, e lo dice spesso, sembrerebbe rispondere a caso: il profilo diventa meno largo, non meno vero)
const NETTEZZE_CASO = new Map();
function nitidezza(r, s) {
  const nessune = r.scelte.map(([b]) => b === NESSUNA), chiave = nessune.map(Number).join('') + (r.lavoro == null ? '-' : '');
  if (!NETTEZZE_CASO.has(chiave)) {
    // generatore con un seme fisso (mulberry32): le stesse risposte a caso a ogni visita, quindi lo stesso verdetto
    let seme = 20261028;
    const caso = n => { seme = (seme + 0x6D2B79F5) | 0; let x = Math.imul(seme ^ (seme >>> 15), 1 | seme); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return Math.floor(((x ^ (x >>> 14)) >>> 0) / 4294967296 * n); };
    NETTEZZE_CASO.set(chiave, Array.from({ length: 1000 }, () => nettezza(gustiPerAmbito({
      scelte: SITUAZIONI.map((_, k) => { const b = caso(4), w = (b + 1 + caso(3)) % 4; return [nessune[k] ? NESSUNA : b, w]; }),
      lavoro: r.lavoro == null ? null : caso(LAVORO.o.length) }))).sort((x, y) => x - y));
  }
  const NC = NETTEZZE_CASO.get(chiave);
  const x = nettezza(s), sotto = NC.findIndex(v => v >= x), pct = (sotto < 0 ? NC.length : sotto) / NC.length;
  const voto = ([k, i]) => r.scelte[k][0] === i ? 1 : r.scelte[k][1] === i ? -1 : 0;
  const coppie = Object.entries(APPARIZIONI).map(([a, [x1, y1]]) => [a, voto(x1), voto(y1)]);
  return { pct, livello: pct >= .8 ? 'alta' : pct >= .5 ? 'media' : 'bassa',
    confermati: coppie.filter(([, x1, y1]) => x1 === y1 && x1 !== 0).map(([a, x1]) => [a, x1]),  // scelto, o scartato, tutte e due le volte
    contraddetti: coppie.filter(([, x1, y1]) => x1 * y1 === -1).map(([a]) => a) };             // scelto una volta e scartato l'altra
}
function calcola(r, opz = {}) {
  const s = gustiPerAmbito(r), O = S.orientamento;
  const assaggiati = r.assaggi.some(x => x != null && x <= 2);
  const varianti = opz.incertezza || assaggiati ? SITUAZIONI.map((_, k) => gustiPerAmbito(r, k)) : null;
  const tutte = O.percorsi.map(cl => {
    const corsi = corsiDelPercorso(cl), adatti = corsi.filter(c => corsoAdatto(c, r.cond));
    let escluso = '';
    if (!r.cond.ciclo && cl.tipo === 'ciclo unico') escluso = 'è a ciclo unico (5 o 6 anni)';
    else if (corsi.length && !adatti.length) escluso = !r.cond.test && corsi.every(c => (c.accesso || '').startsWith('programmato')) ? 'tutti i corsi sono a numero programmato'
      : !r.cond.inglese && corsi.every(c => c.lingua === 'Inglese') ? 'tutti i corsi sono in inglese' : 'nessun corso rispetta le condizioni che hai scelto';
    return { cl, corsi, adatti, escluso, affinita: affinita(cl, s, r), varianti: varianti && varianti.map(sv => affinita(cl, sv, r)),
      estremi: varianti && [affinita(cl, s, r, FORMA_ESTREMI[0]), affinita(cl, s, r, FORMA_ESTREMI[1])] };
  }).sort((a, b) => b.affinita - a.affinita);
  const base = voci(tutte.filter(x => !x.escluso && x.adatti.length));
  if (varianti && base.length) margini(base);
  // assaggi: il primo anno delle voci 1-3 e 4-6. Scegliere un primo anno guardando solo gli esami decide fra lauree alla
  // pari: quella scelta passa in testa se era alla pari con la prima, altrimenti guadagna il suo margine di incertezza e
  // supera solo quelle che la precedevano di poco, non quelle davvero più vicine
  const giri = [base.slice(0, 3), base.slice(3, 6)].map(g => g.filter(v => v.campione));
  // il secondo giro (lauree 4-6) non scavalca la laurea scelta nel primo, che hai preferito fra le tre più vicine
  const scelte = new Set();
  let tetto = Infinity;
  giri.forEach((g, k) => {
    const p = r.assaggi[k], v = p != null && p <= 2 && g[p];
    if (!v) return;
    scelte.add(v);
    const su = Math.min(v.pari && v !== base[0] ? base[0].affinita - v.affinita + 1e-6 : v.margine, tetto - 1e-6 - v.affinita);
    v.affinita += su; v.varianti = v.varianti.map(x => x + su); v.estremi = v.estremi.map(x => x + su);
    tetto = v.affinita;
  });
  const finale = base.slice().sort((a, b) => b.affinita - a.affinita);
  if (varianti && finale.length) margini(finale);
  const fam = FAMIGLIE.map(f => ({ ...f, v: f.ambiti.reduce((t, a) => t + s[a], 0) / f.ambiti.length })).sort((a, b) => b.v - a.v);
  return { s, fam, tutte, voci: finale, giri, scelte, nitidezza: nitidezza(r, s) };
}
function forma(fam, R) {
  // un profilo che non si distingue da risposte date a caso non ha una forma: il risultato lo dice invece di inventarla
  if (R && R.nitidezza.livello === 'bassa') return 'piatto';
  const v = fam.map(f => f.v);
  if (v[0] < .2 || v[0] - v[7] < .35) return 'piatto';
  if (v[0] - v[1] >= .25) return 'netto';
  // «ampio» solo se anche la terza area attira davvero e non è lontana dalla prima; altrimenti contano le prime due
  if (v[2] >= .35 && v[0] - v[2] < .3) return 'ampio';
  return 'due';
}

/* ---------- schermate del quiz ---------- */
function vistaQuiz() {
  if (!S.orientamento) return '<div class="colonna caricamento">Preparo il quiz…</div>';
  const p = Q ? Q.passo : -1;
  if (p < 0 || p == null || Q.fatto) return introQuiz();
  if (p < 12) return schermataSituazione(p);
  if (p === 12) return schermataScelta(LAVORO, 'lavoro', p);
  if (p === 13) return schermataModo();
  if (p === 14) return schermataCondizioni();
  return schermataAssaggio(p - 15);
}
function introQuiz() {
  const inCorso = Q && !Q.fatto && Q.scelte.some(([b]) => b != null), ultimo = leggi('profilo', null);
  const n = S.orientamento.percorsi.reduce((t, c) => t + c.conPiano, 0);
  return `<div class="colonna quiz-intro">
    <span class="tessera grande">${ICONA_BUSSOLA}</span>
    <h1 tabindex="-1">Quale laurea fa per te?</h1>
    <p class="sotto">Un quiz di 5 minuti che non ti chiede «ti piace la matematica?». Scegli tra situazioni concrete, poi confrontiamo le tue risposte con quello che si studia davvero in ogni laurea: i crediti degli esami di ${fmt(n)} corsi triennali e a ciclo unico.</p>
    <ol class="quiz-tappe">
      <li><b>Cosa ti attira.</b> Dodici situazioni: in ognuna scegli l’attività che ti attira di più e quella che ti attira di meno. Se nessuna ti attira, puoi dirlo.</li>
      <li><b>Il lavoro, il modo di studiare e le tue condizioni.</b> Che giornata vorresti tra dieci anni, se ti piace di più capire o applicare, se ti va bene un test d’ingresso, quanto sei disposto a spostarti.</li>
      <li><b>Alla cieca.</b> Ti mostriamo il primo anno vero di sei lauree vicine al tuo profilo, senza dirti quali sono: scegli solo guardando gli esami.</li>
    </ol>
    <div class="quiz-azioni">
      ${inCorso ? `<button type="button" class="btn primario grande" data-q="riprendi">Riprendi da dove eri</button><button type="button" class="btn grande" data-q="inizia">Ricomincia</button>`
        : `<button type="button" class="btn primario grande" data-q="inizia">Inizia il quiz</button>`}
      ${ultimo && decodifica(ultimo) ? `<a class="btn grande" href="#profilo.${ultimo}">Il tuo ultimo profilo</a>` : ''}
    </div>
    <p class="tenue piccolo">Non ti chiediamo i voti né dati personali. Le risposte restano su questo dispositivo. È un aiuto per orientarsi, non un verdetto.</p>
    <p class="tenue piccolo">Hai già una triennale? <a href="#magistrale">C’è il quiz per la magistrale</a>, che parte dagli esami che hai fatto.</p>
  </div>`;
}
function barraQuiz(p) {
  const k = PARTI.findIndex(([, a, b]) => p >= a && p < b);
  return `<div class="quiz-testa">
    <div class="quiz-parti" aria-hidden="true">${PARTI.map(([, a, b]) => `<span style="flex:${b - a}"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, (p - a) / (b - a))))}%"></i></span>`).join('')}</div>
    <p class="quiz-dove"><b>Parte ${k + 1} di 4</b> · ${PARTI[k][0]}<span class="tenue num"> · ${p + 1} di ${PASSI}</span></p>
  </div>`;
}
function navQuiz(avanti, testo = 'Avanti') {
  return `<div class="quiz-nav"><button type="button" class="btn" data-q="indietro">← Indietro</button>${avanti ? `<button type="button" class="btn primario" data-q="avanti">${testo} →</button>` : ''}</div>`;
}
const SEGNO_PIU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const SEGNO_MENO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
function schermataSituazione(k) {
  const sit = SITUAZIONI[k], [b, w] = Q.scelte[k];
  const istr = b == null ? 'Tocca l’attività che ti attira <b>di più</b>. Se nessuna ti attira davvero, dillo qui sotto.' : w == null ? 'Ora tocca quella che ti attira <b>di meno</b>.' : 'Fatto. Puoi cambiare idea toccando di nuovo un’attività.';
  return `<div class="colonna quiz">${barraQuiz(k)}
    <h1 class="quiz-domanda" tabindex="-1">${esc(sit.d)}</h1>
    <p class="quiz-istruzione" aria-live="polite">${istr}</p>
    <div class="opzioni">${Q.ordine[k].map(i => {
      const st = i === b ? 'piu' : i === w ? 'meno' : '';
      return `<button type="button" class="opzione" data-q="opz" data-i="${i}"${st ? ` data-stato="${st}"` : ''}><span>${esc(sit.o[i][0])}</span>${st === 'piu' ? `<span class="segno">${SEGNO_PIU}Di più</span>` : st === 'meno' ? `<span class="segno">${SEGNO_MENO}Di meno</span>` : ''}</button>`;
    }).join('')}</div>
    <button type="button" class="btn nessuna" data-q="nessuna" aria-pressed="${b === NESSUNA}">Nessuna mi attira davvero</button>
    ${navQuiz(b != null && w != null)}
  </div>`;
}
function schermataScelta(dom, campo, p) {
  const ordine = campo === 'lavoro' ? Q.ordineLavoro : dom.o.map((_, i) => i);
  return `<div class="colonna quiz">${barraQuiz(p)}
    <h1 class="quiz-domanda" tabindex="-1">${esc(dom.d)}</h1>
    <p class="quiz-istruzione">Scegline una.</p>
    <div class="opzioni">${ordine.map(i => `<button type="button" class="opzione" data-q="${campo}" data-i="${i}"${Q[campo] === i ? ' data-stato="scelta"' : ''}><span>${esc(dom.o[i][0])}</span></button>`).join('')}</div>
    ${navQuiz(Q[campo] != null)}
  </div>`;
}
function schermataModo() {
  const pronte = MODO.every(m => Q[m.k] != null);
  return `<div class="colonna quiz">${barraQuiz(13)}
    <h1 class="quiz-domanda" tabindex="-1">Come ti piace imparare e lavorare?</h1>
    <p class="quiz-istruzione">Tre domande veloci. Servono a distinguere lauree che hanno materie simili ma si studiano in modo diverso.</p>
    <div class="condizioni">${MODO.map(m => `<fieldset class="cond"><legend>${esc(m.d)}</legend><div class="scelte modo">${m.o.map(([v, testo]) =>
      `<button type="button" class="scelta-btn" data-q="modo" data-k="${m.k}" data-v="${v}" aria-pressed="${Q[m.k] === v}">${esc(testo)}</button>`).join('')}</div></fieldset>`).join('')}
    </div>
    ${navQuiz(pronte, 'Continua')}
  </div>`;
}
function gruppoCond(k, titolo, scelte, nota) {
  return `<fieldset class="cond"><legend>${titolo}</legend>${nota ? `<p class="tenue piccolo">${nota}</p>` : ''}<div class="scelte">${scelte.map(([v, t]) =>
    `<button type="button" class="scelta-btn" data-q="cond" data-k="${k}" data-v="${v}" aria-pressed="${Q.cond[k] === v}">${t}</button>`).join('')}</div></fieldset>`;
}
function schermataCondizioni() {
  const c = Q.cond;
  return `<div class="colonna quiz">${barraQuiz(14)}
    <h1 class="quiz-domanda" tabindex="-1">Qualche condizione pratica</h1>
    <p class="quiz-istruzione">Non cambiano il tuo profilo: servono a scegliere quali lauree e quali corsi mostrarti.</p>
    <div class="condizioni">
      ${gruppoCond('dove', 'Dove studieresti?', [[0, `Vicino a casa (entro ${KM_VICINO} km)`], [1, 'Nella mia regione'], [2, 'Ovunque in Italia']])}
      ${c.dove < 2 ? `<div class="cond-casa">${campoCasa()}</div>` : ''}
      ${gruppoCond('test', 'Corsi a numero programmato', [[1, 'Va bene, ci provo'], [0, 'Preferisco evitarli']], 'Hanno un test o una selezione per entrare (Medicina, le professioni sanitarie, molte lauree di Psicologia…).')}
      ${gruppoCond('ciclo', 'Una laurea a ciclo unico da 5 o 6 anni', [[1, 'Mi va bene'], [0, 'Preferisco una triennale']], 'Medicina, Giurisprudenza, Farmacia, Architettura, Veterinaria, Formazione primaria.')}
      ${gruppoCond('inglese', 'Corsi in inglese', [[1, 'Anche in inglese'], [0, 'Solo in italiano']])}
      ${gruppoCond('online', 'Università telematiche (lezioni online)', [[0, 'No'], [1, 'Sì, anche online']])}
    </div>
    ${navQuiz(true, 'Continua')}
  </div>`;
}
function schermataAssaggio(g) {
  const R = calcola(Q), giro = R.giri[g];
  const lettere = 'ABC';
  return `<div class="colonna quiz">${barraQuiz(15 + g)}
    <h1 class="quiz-domanda" tabindex="-1">${g === 0 ? 'Alla cieca: quale primo anno ti attira di più?' : 'Ancora tre, poi il risultato.'}</h1>
    <p class="quiz-istruzione">${g === 0 ? 'Sono i primi anni veri di tre lauree vicine al tuo profilo, presi dai piani degli atenei. Non ti diciamo quali sono: scegli solo guardando gli esami. Lo scoprirai alla fine.' : 'Altre tre lauree vicine al tuo profilo. Stessa regola: scegli guardando solo gli esami.'}</p>
    <div class="assaggi">${Q.ordineAssaggi[g].filter(i => giro[i]).map((i, n) => {
      const c = giro[i].campione;
      return `<div class="assaggio${Q.assaggi[g] === i ? ' scelto' : ''}">
        <p class="assaggio-testa"><span class="lettera">${lettere[n]}</span>Primo anno</p>
        <ul>${c.esami.map(([nome, cfu]) => `<li><span>${esc(titoloCorso(nome))}</span><span class="cfu num">${cfu ? fmt(cfu) : ''}</span></li>`).join('')}</ul>
        ${c.altri || c.gruppi ? `<p class="tenue piccolo">${[c.altri ? `e altri ${c.altri} esami` : '', c.gruppi ? `${c.gruppi === 1 ? 'un gruppo' : `${c.gruppi} gruppi`} di esami a scelta` : ''].filter(Boolean).join(', ')}</p>` : ''}
        <button type="button" class="btn${Q.assaggi[g] === i ? ' primario' : ''}" data-q="assaggio" data-i="${i}">${Q.assaggi[g] === i ? 'Scelto' : `Scelgo il ${lettere[n]}`}</button>
      </div>`;
    }).join('')}</div>
    <div class="quiz-nav"><button type="button" class="btn" data-q="indietro">← Indietro</button><button type="button" class="btn" data-q="assaggio" data-i="3">Nessuno mi convince</button></div>
  </div>`;
}

/* ---------- risultato ---------- */
const vecchioProfilo = t => /^(1\d{33}|2\d{35})$/.test(t || '');
function vistaProfilo(codice) {
  if (!S.orientamento) return '<div class="colonna caricamento">Calcolo il tuo profilo…</div>';
  const r = decodifica(codice);
  if (!r && vecchioProfilo(codice)) return `<div class="colonna vuoto"><b>Questo profilo è di una versione precedente del quiz.</b><span>Da allora abbiamo cambiato le domande e il modo di calcolare il risultato: rifai il quiz per un profilo aggiornato.</span><a class="btn primario" href="#quiz">Rifai il quiz</a></div>`;
  if (!r) return `<div class="colonna vuoto"><b>Questo link al profilo non è valido.</b><span>Forse è stato copiato a metà.</span><a class="btn primario" href="#quiz">Fai il quiz</a></div>`;
  const R = calcola(r, { incertezza: true }), f = forma(R.fam, R), [f1, f2] = R.fam;
  profiloAperto = { codice, r, R };
  // il titolo: gli ambiti che spiccano davvero (scelti spesso), non la media delle grandi aree, che può nasconderli (chi
  // sceglie sempre filosofia ma non lingue e letteratura vedrebbe «Lingue, testi e storia» neutra); senza ambiti che
  // spiccano, le aree
  const spiccano = Object.keys(R.s).filter(a => R.s[a] >= SPICCA).sort((a, b) => R.s[b] - R.s[a]).slice(0, 3);
  const titolo = f === 'piatto' ? 'Un profilo ancora da scoprire' : spiccano.length ? esc(maiuscola(elenco(spiccano.map(a => AMBITI_BREVI[a]))))
    : f === 'netto' ? esc(f1.nome) : f === 'due' ? `${esc(f1.nome)} <span class="piu-titolo">+</span> ${esc(f2.nome)}` : 'Curiosità a tutto campo';
  if (!R.voci.length) return `<div class="colonna vuoto"><b>Nessuna laurea rispetta tutte le condizioni che hai scelto.</b><span>Prova ad accettare i corsi a numero programmato o quelli in inglese.</span><a class="btn primario" href="#quiz" data-q="rifai">Rifai il quiz</a></div>`;
  // in testa le lauree alla pari con la prima (anche più di cinque, fino a otto), poi le altre fino a cinque
  const testa = R.voci.filter(v => v.inTesta).length, prime = R.voci.slice(0, Math.max(5, Math.min(testa, 8))), restanti = R.voci.slice(prime.length, 15);
  const sorpresa = restanti.find(v => !v.sanitarie && v.classi[0].corsi.length < 30 && v.affinita > 0 && v.affinita >= .5 * prime[0].affinita);
  const mostrate = new Set(prime.flatMap(v => v.classi.map(x => x.cl)));
  const fuori = [];
  for (const x of R.tutte.slice(0, 10)) {
    if (!x.escluso || mostrate.has(x.cl) || fuori.length >= 3) continue;
    if (SANITARIE.has(x.cl.classe)) { if (fuori.some(y => y.sanitarie)) continue; fuori.push({ ...x, sanitarie: true }); } else fuori.push(x);
  }
  const NUMERI = ['', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto'];
  const notaTesta = testa >= 2
    ? `<p class="nota-pari"><b>Le prime ${NUMERI[testa] || fmt(testa)} sono alla pari.</b> La differenza fra loro è più piccola di quanto cambierebbe il risultato togliendo una sola delle tue risposte: guardale tutte allo stesso modo.</p>`
    : `<p class="nota-pari"><b>La prima si stacca dalle altre</b> più di quanto cambierebbe il risultato togliendo una sola delle tue risposte.</p>`;
  return `<div class="colonna pagina-profilo">
    <nav class="briciole" aria-label="Percorso"><a href="#quiz">Quiz</a><span>/</span><span>Il tuo profilo</span></nav>
    <header class="profilo-testa">
      <p class="eyebrow-profilo">Il tuo profilo</p>
      <h1 tabindex="-1">${titolo}</h1>
      <div class="ritratto">${ritrattoDi(r, R, f).map(t => `<p>${t}</p>`).join('')}</div>
    </header>
    ${graficoFamiglie(R.fam, R.s)}
    <section class="sezione">
      <h2>Le lauree più vicine a te <small>su ${fmt(R.tutte.filter(x => !x.escluso && x.adatti.length).length)} tipi di laurea che rispettano le tue condizioni</small></h2>
      ${notaTesta}
      ${legendaGusti()}
      ${S.casa ? '' : `<div class="chiedi-casa">${campoCasa()}<span class="tenue piccolo">Scrivi da dove parti: in ogni laurea ti mostriamo i corsi più vicini.</span></div>`}
      <div class="lauree">${prime.map((v, k) => schedaLaurea(v, v.inTesta ? 1 : k + 1, R, r)).join('')}</div>
    </section>
    <section class="sezione idea">
      <h2>Avevi già in mente una laurea?</h2>
      <p class="tenue">Scrivila: ti diciamo quanto il suo piano degli esami somiglia ai gusti che sono venuti fuori dal quiz.</p>
      <label class="campo-idea">${ICONA_CERCA}<input id="idea-laurea" type="search" placeholder="Per esempio Medicina, Ingegneria, Psicologia" autocomplete="off" aria-label="La laurea che avevi in mente"></label>
      <div id="idea-risultati" aria-live="polite"></div>
    </section>
    ${sorpresa ? `<section class="sezione"><h2>Ci avevi pensato?</h2><p class="tenue" style="margin-bottom:14px;max-width:62ch">Una laurea con pochi corsi in Italia, che in pochi conoscono, ma che somiglia al tuo profilo più di tante altre.</p><div class="lauree">${schedaLaurea(sorpresa, null, R, r)}</div></section>` : ''}
    ${fuori.length ? `<section class="sezione"><h2>Se cambiassi idea sulle condizioni</h2><ul class="fuori">${fuori.map(x => `<li><b>${esc(x.sanitarie ? 'Le professioni sanitarie' : nomePercorso(x.cl))}</b> ${x.sanitarie ? 'sarebbero' : 'sarebbe'} tra le lauree più vicine al tuo profilo, ma ${esc(x.escluso)}.</li>`).join('')}</ul></section>` : ''}
    <section class="sezione prossimi">
      <h2>E adesso?</h2>
      <ul>
        <li>Apri i piani degli esami delle lauree che ti incuriosiscono: guarda soprattutto il primo anno, è quello che ti aspetta da subito.</li>
        <li>Metti due o tre corsi a confronto, anche di atenei diversi: la stessa laurea cambia molto da un posto all’altro.</li>
        <li>Vai agli open day e parla con chi ci studia già. Chiedi com’è una settimana tipo.</li>
      </ul>
      <div class="quiz-azioni">
        <button type="button" class="btn primario" data-q="confronta">Metti a confronto le prime tre</button>
        <button type="button" class="btn" data-q="copia">Copia il link al profilo</button>
        <a class="btn" href="#quiz" data-q="rifai">Rifai il quiz</a>
      </div>
      <p class="tenue piccolo" id="copiato" role="status"></p>
    </section>
    <details class="metodo sezione">
      <summary>Come abbiamo calcolato il risultato</summary>
      <ul>
        <li>Le dodici situazioni coprono 24 ambiti di studio, ognuno due volte. Ogni volta che scegli un’attività come «di più» l’ambito sale, come «di meno» scende; se nessuna ti attira, non sale niente. Metà delle situazioni mette a confronto ambiti vicini (architettura e design, economia e gestione aziendale, biologia e chimica…), per capire quale dei due preferisci. Il lavoro che immagini conta un po’ meno.</li>
        <li>Le attività descrivono il ragionamento di una disciplina, non un prodotto: costruire un sito o un’app oggi si fa con l’intelligenza artificiale, e direbbe poco su cosa ti piacerebbe studiare.</li>
        <li>Non usiamo le classi del Ministero ma quello che si studia davvero: dai settori scientifici degli esami nei piani di ${fmt(S.orientamento.percorsi.reduce((t, c) => t + c.conPiano, 0))} corsi abbiamo calcolato quanta parte dei crediti obbligatori è in ogni ambito, corso per corso, e abbiamo raggruppato i corsi in ${S.orientamento.percorsi.length} percorsi con piani simili. Così Ingegneria gestionale sta per conto suo e non dentro Ingegneria industriale. Dentro ogni percorso, i corsi sono in ordine di vicinanza ai tuoi gusti, ateneo per ateneo.</li>
        <li>La vicinanza mette insieme due cose: quanto la forma dei tuoi gusti somiglia a quella della laurea (anche quando la laurea mescola più ambiti, come Comunicazione o Biotecnologie) e quanta parte dei suoi crediti è in ambiti che ti attirano. Tolgono punti i crediti in ambiti che hai scartato.</li>
        <li>Le domande sul modo di studiare spostano di poco. Per ogni laurea abbiamo indicato noi se è più teorica o più applicata e se porta a lavorare con le persone: è un giudizio nostro, non un dato, e serve solo a separare lauree con materie simili.</li>
        <li>Rifacciamo il calcolo dodici volte, togliendo ogni volta una delle situazioni: due lauree la cui differenza sta dentro quelle variazioni sono «alla pari». Nell’assaggio alla cieca la laurea scelta guadagna proprio quel margine: supera quelle con cui era alla pari, non quelle davvero più vicine a te.</li>
        <li>Per dire quanto è netto il profilo confrontiamo la distanza fra le aree che ti attirano di più e quelle che ti attirano di meno con quella di 1.000 serie di risposte date a caso (che dicono «nessuna mi attira» dove l’hai detto tu).</li>
        <li>Abbiamo provato il calcolo con 26 studenti simulati, di cui sapevamo quale laurea cercare e che rispondevano con qualche incertezza, come le persone vere: la laurea giusta è finita tra le prime tre in circa 9 casi su 10. Sono simulazioni, non persone vere: servono a scoprire errori nel calcolo, non a garantire il risultato.</li>
        <li>Non usiamo i voti: dicono quanto vai bene oggi in una materia, non quanto ti piacerà studiarla. È un aiuto per orientarsi, non un test psicologico.</li>
        <li>Il quiz non prevede il mercato del lavoro fra dieci anni, e con l’intelligenza artificiale che cambia molti mestieri nessuno lo sa fare in modo affidabile. Ti aiuta a scegliere qualcosa che ti piacerà studiare, che è quello che fa arrivare in fondo.</li>
      </ul>
      <details class="ambiti"><summary>I tuoi 24 ambiti</summary>${tabellaAmbiti(R.s)}</details>
    </details>
  </div>`;
}
let profiloAperto = null;
// il ritratto: invece di frasi che descrivono una personalità, quello che hai scelto davvero. Le frasi sono già in HTML
function ritrattoDi(r, R, f) {
  const N = R.nitidezza, frasi = [], s = R.s;
  const testo = (k, i) => `«${esc(SITUAZIONI[k].o[i][0])}»`;
  const primario = (k, i) => Object.keys(SITUAZIONI[k].o[i][1]).find(a => SITUAZIONI[k].o[i][1][a] === 1);
  const nomi = as => elenco(as.map(a => AMBITI_BREVI[a]));
  if (N.livello === 'bassa') frasi.push('Le tue risposte non disegnano un profilo più netto di quello che darebbe la maggior parte delle risposte date a caso, quindi il quiz può dirti poco. Non è un difetto: forse ti interessano tante cose allo stesso modo, o queste situazioni non ti hanno detto molto. Prendi le lauree qui sotto come spunti da esplorare, e guarda i piani di studio di quelle che ti incuriosiscono.');
  const piace = Object.keys(s).filter(a => s[a] >= SOGLIA).sort((a, b) => s[b] - s[a]).slice(0, 3);
  if (piace.length) {
    const esempi = [], sempre = N.confermati.filter(([a, x]) => x > 0 && piace.includes(a)).map(([a]) => a);
    r.scelte.forEach(([b], k) => { if (b !== NESSUNA && piace.includes(primario(k, b)) && esempi.length < 2) esempi.push(testo(k, b)); });
    const quando = sempre.length === piace.length ? ', tutte e due le volte che te le abbiamo proposte'
      : sempre.length ? ` (quelle di ${esc(nomi(sempre))} tutte e due le volte che te le abbiamo proposte)` : '';
    frasi.push(`Hai preferito più spesso le attività di ${esc(nomi(piace))}${quando}${esempi.length ? `: per esempio ${elenco(esempi)}` : ''}.`);
  }
  const scarta = Object.keys(s).filter(a => s[a] <= -SOGLIA).sort((a, b) => s[a] - s[b]).slice(0, 3);
  if (scarta.length) {
    const esempio = r.scelte.map(([, w], k) => scarta.includes(primario(k, w)) ? testo(k, w) : null).find(Boolean);
    frasi.push(`Hai messo invece tra le meno attraenti le attività di ${esc(nomi(scarta))}${esempio ? `, come ${esempio}` : ''}.`);
  }
  const nessuna = r.scelte.filter(([b]) => b === NESSUNA).length;
  if (nessuna) frasi.push(nessuna === 1 ? 'In una situazione nessuna attività ti attirava davvero: lì abbiamo contato solo quella che ti attirava di meno.'
    : `In ${nessuna} situazioni su 12 nessuna attività ti attirava davvero: lì abbiamo contato solo quella che ti attirava di meno.${nessuna >= 6 ? ' Sono tante: forse quello che cerchi è più specifico di queste situazioni, e la sezione «Avevi già in mente una laurea?» qui sotto può dirti di più.' : ''}`);
  const modo = [
    r.teoria === 0 ? 'ti interessa di più capire perché le cose funzionano' : r.teoria === 2 ? 'ti interessa di più usare quello che sai per risolvere problemi concreti' : '',
    r.persone === 0 ? 'ti vedi a lavorare soprattutto con le persone' : r.persone === 2 ? 'ti vedi a lavorare soprattutto con oggetti, dati, testi o progetti' : '',
    r.strada === 0 ? 'preferisci una laurea che porta a un mestiere preciso' : r.strada === 1 ? 'preferisci una laurea che apre molte strade' : '',
  ].filter(Boolean);
  frasi.push([r.lavoro != null ? `Tra dieci anni ti immagini una giornata in cui ${esc(LAVORO.o[r.lavoro][0].replace(/^…ho /, 'hai '))}.` : '',
    modo.length ? maiuscola(elenco(modo)) + '.' : ''].filter(Boolean).join(' '));
  if (f === 'due') {
    const ponte = R.voci.filter(v => !v.sanitarie).map(v => v.classi[0].cl).filter(cl => quotaFamiglia(cl, R.fam[0]) >= .15 && quotaFamiglia(cl, R.fam[1]) >= .15).slice(0, 3);
    if (ponte.length) frasi.push(`Le tue due aree si incontrano in lauree come ${elenco(ponte.map(cl => `«${esc(nomePercorso(cl))}»`))}.`);
  }
  if (N.contraddetti.length >= 3) frasi.push(`Alcune attività le hai scelte una volta e scartate l’altra (quelle di ${esc(nomi(N.contraddetti.slice(0, 3)))}): su quegli ambiti il quiz è meno sicuro.`);
  if (N.livello !== 'bassa') frasi.push(N.pct >= .995 ? 'Il tuo profilo è più netto di tutte le 1.000 serie di risposte date a caso con cui l’abbiamo confrontato.'
    : `Il tuo profilo è più netto di quello che darebbero ${Math.round(100 * N.pct)} serie di risposte date a caso su 100${N.livello === 'media' ? ': abbastanza per orientarti, non per decidere' : ''}.`);
  return frasi.filter(Boolean);
}
// «Avevi già in mente una laurea?»: si cerca fra i nomi dei corsi, poi si mostra dove sta la classe nella tua classifica
function risultatiIdea(q) {
  const P = profiloAperto; if (!P) return '';
  const parole = norma(q).split(' ').filter(w => w.length >= 3 && !VUOTE.has(w));
  if (!parole.length) return '';
  // prima si cerca nel nome dei corsi; solo se non c'è niente, anche nel nome della classe («Infermieristica» sta già nel
  // nome dei corsi; «professioni sanitarie» solo in quello della classe). I nomi brevi delle classi elencano più lauree
  // («Ingegneria industriale: meccanica, gestionale…») e nel primo giro farebbero trovare tutta la classe
  const O = S.orientamento, trova = testo => parole.every(w => (' ' + norma(testo)).includes(' ' + w));
  const conta = new Map();
  let magistrali = 0;
  for (const largo of [false, true]) {
    for (const c of S.corsi) {
      if (c.fuori || !trova(largo ? `${c.nome} ${c.nomeClasse || ''} ${NOMI_CLASSI[c.classe] || ''}` : c.nome)) continue;
      const k = O.percorsoDi[c.i];
      if (k == null) { if (c.tipo === 'magistrale') magistrali++; continue; }
      conta.set(k, (conta.get(k) || 0) + 1);
    }
    if (conta.size || magistrali) break;
  }
  const trovate = P.R.tutte.filter(x => conta.has(x.cl.k)).sort((a, b) => conta.get(b.cl.k) - conta.get(a.cl.k)).slice(0, 3);
  if (!trovate.length) return magistrali
    ? '<p class="nota">È una laurea magistrale, che si sceglie dopo la triennale: il quiz confronta le lauree triennali e a ciclo unico. Prova con il nome della triennale che porta lì. Se la triennale ce l’hai già, c’è <a href="#magistrale">il quiz per la magistrale</a>.</p>'
    : '<p class="nota">Non troviamo una laurea con questo nome. Prova con un’altra parola, per esempio la materia principale.</p>';
  const tot = P.R.voci.length;
  return trovate.map(x => {
    const cl = x.cl, g = gustiDellaClasse(cl, P.R.s), j = P.R.voci.findIndex(v => v.classi.some(y => y.cl === cl)), v = P.R.voci[j];
    // il giudizio guarda il piano, non solo il posto: quando molte lauree ti somigliano, anche la quindicesima può essere fatta
    // quasi tutta di cose che ti attirano
    const posto = j < 0 ? '' : `È al ${j + 1}° posto su ${tot}`;
    const giudizio = j < 0 ? `Con le condizioni che hai scelto è esclusa: ${esc(x.escluso || 'nessun corso le rispetta')}.`
      : v.inTesta ? 'È tra le lauree più vicine a te.'
      : g.piace >= .6 && g.scarta < .15 ? `${posto}, ma è vicina ai tuoi gusti: il ${pct(g.piace)} dei crediti è in ambiti che ti attirano. Ce ne sono solo altre ancora più vicine.`
      : g.scarta >= .3 ? `${posto}: lontana da quello che hai scelto nel quiz, perché il ${pct(g.scarta)} dei crediti è in ambiti che hai scartato. Non vuol dire che sia sbagliata per te, ma guarda bene il piano degli esami: è quello che studieresti.`
      : `${posto}: a metà strada fra quello che hai scelto e quello che hai scartato.`;
    return `<article class="laurea idea-scheda">
      <header class="laurea-testa"><div class="laurea-nome"><h3>${esc(nomePercorso(cl))}</h3><p class="tenue piccolo">${classiDi(cl)} · ${fmt(x.corsi.length)} corsi in Italia</p></div></header>
      <p><b>${giudizio}</b></p>
      ${barraGusti(g)}
      <div class="perche">${perche(g)}</div>
      <button type="button" class="btn" data-esempio="${esc(nomePercorso(cl))}">Cerca «${esc(nomePercorso(cl))}» fra tutti i corsi</button>
    </article>`;
  }).join('');
}
const classiDi = cl => `${cl.classi.length > 1 ? 'Classi' : 'Classe'} ${esc(elenco(cl.classi))}`;
const elenco = xs => xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + (/^[eèé]/i.test(xs[xs.length - 1]) ? ' ed ' : ' e ') + xs[xs.length - 1];
const pct = x => `${Math.round(100 * x)}%`;
function quotaFamiglia(cl, f) { return f.ambiti.reduce((t, a) => t + (cl.quote[a] || 0), 0); }
function giudizio(v) { return v >= .6 ? 'ti attira molto' : v >= SOGLIA ? 'ti attira' : v > -SOGLIA ? 'neutro' : v > -.6 ? 'ti attira poco' : 'lo eviti'; }
// le famiglie sono medie di più ambiti, quindi più vicine allo zero: soglie più basse, le stesse della lunghezza delle barre
function giudizioFamiglia(v) { return v >= .45 ? 'ti attira molto' : v >= .15 ? 'ti attira' : v > -.15 ? 'neutro' : v > -.45 ? 'ti attira poco' : 'lo eviti'; }
const SPICCA = .6;  // un ambito «spicca» se l'hai scelto quasi ogni volta che compariva
function graficoFamiglie(fam, s) {
  // barre divergenti: a destra ciò che ti attira (lampone), a sinistra ciò che scarti (blu), al centro lo zero
  return `<figure class="famiglie" aria-labelledby="titolo-famiglie">
    <figcaption id="titolo-famiglie"><b>Cosa ti attira, per grandi aree</b><span class="legenda-gusti"><span><i class="piace"></i>Ti attira</span><span><i class="scarta"></i>Ti attira meno</span></span></figcaption>
    <div class="righe-famiglie">${fam.map(f => {
      const w = Math.round(Math.abs(f.v) * 50);
      return `<div class="riga-famiglia" title="${esc(`${f.nome}: ${giudizioFamiglia(f.v)}`)}"><span class="nome-famiglia">${esc(f.nome)}</span>
        <span class="binario"><i class="${f.v >= 0 ? 'piace' : 'scarta'}" style="${f.v >= 0 ? `left:50%;width:${w}%` : `right:50%;width:${w}%`}"></i></span>
        <span class="giudizio">${giudizioFamiglia(f.v)}${(() => {
          // un'area tiepida può contenere un ambito che spicca: si dice, invece di lasciarlo sparire nella media
          const forti = f.ambiti.filter(a => s[a] >= SPICCA);
          return f.v < .15 && forti.length ? `, ma ${esc(elenco(forti.map(a => AMBITI_BREVI[a])))} sì` : '';
        })()}</span></div>`;
    }).join('')}</div>
  </figure>`;
}
function tabellaAmbiti(s) {
  const righe = Object.entries(s).sort((a, b) => b[1] - a[1]);
  return `<table class="tabella-ambiti"><thead><tr><th scope="col">Ambito</th><th scope="col">Per te</th></tr></thead><tbody>${righe.map(([a, v]) =>
    `<tr><td>${esc(maiuscola(AMBITI_NOMI[a]))}</td><td>${giudizio(v)}</td></tr>`).join('')}</tbody></table>`;
}
function legendaGusti() {
  return `<p class="legenda-gusti spiegata">La barra di ogni laurea divide i suoi crediti obbligatori secondo i tuoi gusti:
    <span><i class="piace"></i>in ambiti che ti attirano</span><span><i class="neutro"></i>neutri</span><span><i class="scarta"></i>in ambiti che hai scartato</span></p>`;
}
function barraGusti(g) {
  const n = Math.max(0, 1 - g.piace - g.scarta);
  return `<div class="barra-gusti" role="img" aria-label="${esc(`${pct(g.piace)} dei crediti in ambiti che ti attirano, ${pct(g.scarta)} in ambiti che hai scartato`)}">
    ${g.piace > .005 ? `<i class="piace" style="flex:${g.piace}"></i>` : ''}${n > .005 ? `<i class="neutro" style="flex:${n}"></i>` : ''}${g.scarta > .005 ? `<i class="scarta" style="flex:${g.scarta}"></i>` : ''}</div>
    <p class="cifre-gusti num"><span><b>${pct(g.piace)}</b> ti attira</span><span><b>${pct(g.scarta)}</b> scartato</span></p>`;
}
function perche(g) {
  const pro = g.pro.slice(0, 2).map(([a, q]) => `${AMBITI_BREVI[a]} (${pct(q)})`), contro = g.contro.filter(([, q]) => q >= .05).slice(0, 2);
  const frasi = [];
  if (pro.length && g.piace < .1) frasi.push('<b>Perché:</b> quasi niente del piano degli esami è in ambiti che ti attirano.');
  else if (pro.length) frasi.push(`<b>Perché:</b> ${g.piace >= .5 ? 'più della metà' : g.piace >= .3 ? 'una buona parte' : 'una parte'} dei crediti è in ambiti che ti attirano, soprattutto ${elenco(pro)}.`);
  else frasi.push('<b>Perché:</b> non contiene quasi nulla di quello che hai scartato, anche se nessun ambito ti attira in modo netto.');
  if (contro.length) frasi.push(`<b>Da sapere:</b> circa il ${pct(contro.reduce((t, [, q]) => t + q, 0))} dei crediti è di ${elenco(contro.map(([a]) => AMBITI_BREVI[a]))}, che hai messo spesso tra le cose che ti attirano meno.`);
  else if (g.scarta < .05) frasi.push('<b>Da sapere:</b> quasi niente di quello che hai scartato.');
  return frasi.map(t => `<p>${t}</p>`).join('');
}
function corsiDaMostrare(x, r, s) {
  // i corsi che rispettano le condizioni (vicino a casa, se l'hai chiesto), dal più vicino ai tuoi gusti: la stessa laurea
  // cambia da un ateneo all'altro, e il piano di ogni corso lo dice. A parità, il più vicino a casa; tre atenei diversi
  const ok = x.adatti.slice(), dentro = ok.filter(c => vicino(c, r.cond));
  const gusto = new Map(ok.map(c => { const q = quoteCorso(c.i); return [c, q ? affinita({ ...x.cl, quote: q }, s, r) : -1]; }));
  const visti = new Set();
  const lista = (dentro.length ? dentro : ok)
    .sort((a, b) => (gusto.get(b) - gusto.get(a)) || ((distanzaDi(a) ?? 1e9) - (distanzaDi(b) ?? 1e9)) || a.ateneoNome.localeCompare(b.ateneoNome, 'it'))
    .filter(c => !visti.has(c.ateneo) && visti.add(c.ateneo));
  return { lista: lista.slice(0, 3), dentro: dentro.length, tutti: ok.length };
}
function schedaLaurea(v, posizione, R, r) {
  const x = v.classi[0], cl = x.cl, g = gustiDellaClasse(cl, R.s), alla = R.scelte.has(v);
  const c = corsiDaMostrare(x, r, R.s), camp = cl.campione, ese = camp && S.corsi[camp.corso];
  const dove = r.cond.dove < 2 && S.casa ? (r.cond.dove === 0 ? `entro ${KM_VICINO} km da casa` : 'nella tua regione') : '';
  const titolo = v.sanitarie ? 'Professioni sanitarie' : nomePercorso(cl);
  const sotto = v.sanitarie ? `${v.classi.length === 1 ? '1 percorso' : `${v.classi.length} percorsi`} · lauree triennali abilitanti, a numero programmato`
    : `${classiDi(cl)} · ${cl.tipo === 'ciclo unico' ? `Ciclo unico, ${/LM-41|LM-46/.test(cl.classe) ? 6 : 5} anni` : 'Triennale'} · ${fmt(x.corsi.length)} corsi in Italia`;
  const nomi = cl.nomiComuni.filter(([n]) => norma(n) !== norma(titolo)).slice(0, 3).map(([n]) => `«${esc(n)}»`);
  const primissima = v === R.voci[0];
  return `<article class="laurea${primissima ? ' prima' : ''}">
    <header class="laurea-testa">
      ${posizione ? `<span class="posizione num" aria-label="Posizione ${posizione}">${posizione}</span>` : `<span class="tessera">${ICONA_BUSSOLA}</span>`}
      <div class="laurea-nome">
        <h3>${esc(titolo)}</h3>
        <p class="tenue piccolo">${sotto}</p>
      </div>
      ${v.inTesta && !primissima ? '<span class="etichetta pari">Alla pari con la prima</span>' : ''}
      ${alla ? '<span class="etichetta forte cieca">Scelta alla cieca</span>' : ''}
    </header>
    ${barraGusti(g)}
    <div class="perche">${perche(g)}</div>
    ${nomi.length ? `<p class="tenue piccolo">${v.sanitarie ? 'Per esempio' : 'Di solito i corsi si chiamano'} ${elenco(nomi)}.</p>` : ''}
    ${v.classi.length > 1 ? `<div class="varianti"><p class="piccolo"><b>${v.sanitarie ? 'Le professioni, dalla più vicina ai tuoi gusti' : 'Le varianti di questa laurea, dalla più vicina ai tuoi gusti'}</b></p>
      <ul class="sottoclassi">${v.classi.map(y => `<li><b>${esc(nomePercorso(y.cl))}</b><span class="tenue"> · ${fmt(y.corsi.length)} corsi · ${pct(gustiDellaClasse(y.cl, R.s).piace)} ti attira</span></li>`).join('')}</ul></div>` : ''}
    ${camp && ese ? `<details class="primo-anno"${primissima ? ' open' : ''}><summary>Un primo anno vero, per esempio ${esc(ese.ateneoNome)}${cittaDi(ese) ? `, ${esc(cittaDi(ese))}` : ''}</summary>
      <ul>${camp.esami.map(([n, k]) => `<li><span>${esc(titoloCorso(n))}</span><span class="cfu num">${k ? `${fmt(k)} CFU` : ''}</span></li>`).join('')}</ul>
      <a href="#corso.${ese.i}">Il piano completo di questo corso →</a></details>` : ''}
    <div class="laurea-corsi">
      <p class="piccolo"><b>${c.dentro ? `Corsi ${dove || 'per te'}` : 'I corsi più vicini'}</b>${dove && !c.dentro ? ` <span class="tenue">· nessuno ${esc(dove)}</span>` : ''} <span class="tenue">· dal piano più vicino ai tuoi gusti</span></p>
      <div class="elenco">${c.lista.map(rigaCorso).join('')}</div>
      ${v.sanitarie ? `<a class="btn" href="#esplora" data-classe-link="${esc(cl.classe)}">Tutti i ${fmt(x.corsi.length)} corsi di ${esc(nomePercorso(cl))}</a>`
        : `<button type="button" class="btn" data-esempio="${esc(titolo)}">Cerca «${esc(titolo)}» fra tutti i corsi</button>`}
    </div>
  </article>`;
}

/* ---------- eventi ---------- */
function mostraQuiz(nuovaSchermata = true, fuoco = null) {
  if (rotta().nome !== 'quiz') return;
  $('#app').innerHTML = vistaQuiz();
  if (nuovaSchermata) { window.scrollTo(0, 0); const h = $('#app h1'); if (h) h.focus({ preventScroll: true }); }
  else if (fuoco) { const el = $(fuoco); if (el) el.focus({ preventScroll: true }); }
}
function passa(n) {
  Q.passo = n;
  // gli assaggi: se un giro ha meno di due lauree da mostrare, si salta
  if (n >= 15 && n < PASSI && calcola(Q).giri[n - 15].length < 2) { Q.assaggi[n - 15] = null; return passa(n + 1); }
  if (n >= PASSI) return finisci();
  salva('quiz', Q); mostraQuiz();
}
function finisci() {
  // per sicurezza: una situazione rimasta senza risposta riporta lì
  const manca = Q.scelte.findIndex(([b, w]) => b == null || w == null);
  if (manca >= 0) { Q.passo = manca; salva('quiz', Q); return mostraQuiz(); }
  const codice = codifica(Q);
  Q.fatto = true; salva('quiz', Q); salva('profilo', codice);
  location.hash = '#profilo.' + codice;
}
let attesaQuiz = null, attesaIdea = null;
document.addEventListener('input', ev => {
  if (ev.target.id !== 'idea-laurea') return;
  clearTimeout(attesaIdea);
  attesaIdea = setTimeout(() => { const box = $('#idea-risultati'); if (box) box.innerHTML = risultatiIdea(ev.target.value); }, 250);
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-q]'); if (!b) return;
  const a = b.dataset.q, i = +b.dataset.i;
  if (a === 'inizia') { nuovoQuiz(); mostraQuiz(); }
  else if (a === 'riprendi') { Q.passo = Math.max(0, Q.passo); salva('quiz', Q); mostraQuiz(); }
  else if (a === 'rifai') { if (Q) { Q.fatto = true; salva('quiz', Q); } }
  else if (a === 'indietro') { clearTimeout(attesaQuiz); let n = Q.passo - 1; while (n >= 15 && calcola(Q).giri[n - 15].length < 2) n--; Q.passo = n; salva('quiz', Q); mostraQuiz(); }
  else if (a === 'avanti') passa(Q.passo + 1);
  else if (a === 'nessuna') {
    const k = Q.passo, sc = Q.scelte[k], completa = sc[0] != null && sc[1] != null;
    sc[0] = sc[0] === NESSUNA ? null : NESSUNA;
    salva('quiz', Q); mostraQuiz(false, '[data-q="nessuna"]');
    clearTimeout(attesaQuiz);
    if (!completa && sc[0] != null && sc[1] != null) attesaQuiz = setTimeout(() => { if (Q.passo === k && rotta().nome === 'quiz') passa(k + 1); }, 450);
  }
  else if (a === 'opz') {
    const k = Q.passo, sc = Q.scelte[k], completa = sc[0] != null && sc[1] != null;
    if (sc[0] === i) sc[0] = null;
    else if (sc[1] === i) sc[1] = null;
    else if (sc[0] == null) sc[0] = i;
    else sc[1] = i;
    salva('quiz', Q); mostraQuiz(false, `[data-q="opz"][data-i="${i}"]`);
    // appena la schermata è completa si passa alla successiva, con un attimo per vedere la scelta
    clearTimeout(attesaQuiz);
    if (!completa && sc[0] != null && sc[1] != null) attesaQuiz = setTimeout(() => { if (Q.passo === k && rotta().nome === 'quiz') passa(k + 1); }, 450);
  }
  else if (a === 'modo') { Q[b.dataset.k] = +b.dataset.v; salva('quiz', Q); mostraQuiz(false, `[data-q="modo"][data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`); }
  else if (a === 'lavoro') {
    const k = Q.passo; Q[a] = i; salva('quiz', Q); mostraQuiz(false, `[data-q="${a}"][data-i="${i}"]`);
    clearTimeout(attesaQuiz); attesaQuiz = setTimeout(() => { if (Q.passo === k && rotta().nome === 'quiz') passa(k + 1); }, 350);
  }
  else if (a === 'cond') { Q.cond[b.dataset.k] = +b.dataset.v; salva('quiz', Q); mostraQuiz(false, `[data-q="cond"][data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`); }
  else if (a === 'assaggio') { Q.assaggi[Q.passo - 15] = i; passa(Q.passo + 1); }
  else if (a === 'confronta') {
    const r = decodifica(rotta().arg), R = calcola(r);
    S.confronto = R.voci.slice(0, 3).map(v => corsiDaMostrare(v.classi[0], r, R.s).lista[0]).filter(Boolean).map(c => c.i);
    salva('confronto', S.confronto); vai('#confronta');
  }
  else if (a === 'copia') {
    const fatto = t => { const p = $('#copiato'); if (p) p.textContent = t; };
    try { navigator.clipboard.writeText(location.href).then(() => fatto('Link copiato: puoi mandarlo a chi vuoi.'), () => fatto(`Copia questo link: ${location.href}`)); }
    catch { fatto(`Copia questo link: ${location.href}`); }
  }
});
