'use strict';
/* ---------------- misurazione delle visite, e il consenso che la precede ----------------
   Google Analytics scrive cookie e trasmette dati a un terzo: in Italia serve un consenso preventivo, quindi il tag non
   è scritto nelle pagine. Lo crea questo codice, e solo dopo un sì esplicito: fino ad allora verso googletagmanager.com
   non parte nulla. Le regole (le stesse di decumulo.it), che decidono la forma del banner:
    1. rifiutare è facile quanto accettare: due pulsanti uguali;
    2. il silenzio non è consenso: chiudere, scorrere o navigare non vale come sì, e il banner non ha la crocetta;
    3. il consenso si revoca com'è stato dato: il piè di pagina di ogni pagina dice lo stato e permette di cambiarlo.
   Solo sul sito pubblicato: le pagine lo includono dal build, l'artifact (pagina.html) no. */
(() => {
  const CHIAVE = 'bivio.consenso';
  const ID = 'G-XLPKF86VR6';
  let acceso = false, caricato = false;

  // localStorage può essere negato (navigazione privata): allora la scelta non si ricorda e il banner ricompare, che è
  // il verso prudente. Niente cookie al suo posto: scrivere un cookie è proprio quello che si sta chiedendo
  const leggi = () => { try { return localStorage.getItem(CHIAVE); } catch { return null; } };
  const scrivi = v => { try { localStorage.setItem(CHIAVE, v); } catch {} };

  function accendi() {
    if (acceso) return;
    acceso = true;
    // chi ha revocato e ci ripensa nella stessa visita: lo script c'è già, si toglie solo il blocco
    window['ga-disable-' + ID] = false;
    if (!caricato) {
      caricato = true;
      const s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
      document.head.appendChild(s);
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // solo statistica, detto nel codice e non affidato al pannello: niente Google Signals (che incrocia i dati con gli
    // account Google) e niente segnali per la pubblicità personalizzata. L'informativa lo dichiara, qui lo garantisce
    window.gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }

  // revocare non è solo smettere di misurare: il blocco ufficiale di Google ferma subito ogni invio della pagina, e i
  // cookie già scritti (_ga, _ga_<id>, sul dominio e sul dominio con il punto davanti) si cancellano
  function spegni() {
    acceso = false;
    window['ga-disable-' + ID] = true;
    try { delete window.gtag; } catch { window.gtag = undefined; }
    const host = location.hostname;
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      if (!n.startsWith('_ga')) return;
      [host, '.' + host, ''].forEach(d => { document.cookie = `${n}=; Max-Age=0; path=/${d ? '; domain=' + d : ''}`; });
    });
  }

  const mostra = v => { const e = document.getElementById('consenso'); if (e) e.hidden = !v; };
  const stato = () => { const e = document.getElementById('consenso-stato'); if (e) e.textContent = leggi() === 'si' ? 'attiva' : 'non attiva'; };
  function scelta(v) { scrivi(v); if (v === 'si') accendi(); else spegni(); mostra(false); stato(); }

  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-consenso]');
    if (!b) return;
    if (b.dataset.consenso === 'cambia') mostra(true); else scelta(b.dataset.consenso);
  });
  stato();
  // il banner resta finché una scelta non c'è; chi ha già risposto non lo rivede: un avviso che torna a ogni visita
  // spinge ad accettare per toglierselo, ed è un consenso estorto
  if (leggi() === 'si') accendi();
  else if (leggi() !== 'no') mostra(true);
})();
