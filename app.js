'use strict';

/* ============================================================
   FitVais — registro di allenamenti di forza.
   Nessun build step, nessuna libreria, dati solo in localStorage.
   ============================================================ */

/* ---------- Costanti ---------- */

const CHIAVE_DATI = 'fitvais.dati.v1';

// Scala dei dischi: un esercizio, un disco.
const DISCHI = ['#4C86FF', '#FFC21A', '#3ECB8B', '#EE5A4C'];
const BLU = '#4C86FF';
const GIALLO = '#FFC21A';
const ROSSO = '#EE5A4C';
const ACCIAIO = '#C9C3B6';
const GESSO_SECONDARIO = '#9C9589';

// Integrazione: cosa prendi e quando. I momenti sono le colonne delle spunte.
const INTEGRATORI = [
  { id: 'omega3', nome: 'Omega 3', momenti: ['mattina', 'sera'] },
  { id: 'multivitaminico', nome: 'Multivitaminico', momenti: ['mattina'], nota: 'Una volta al giorno' },
  { id: 'creatina', nome: 'Creatina', momenti: ['mattina', 'sera'] }
];

const MOMENTI = ['mattina', 'sera'];

/* ---------- Utilità ---------- */

const $ = (sel, radice) => (radice || document).querySelector(sel);

function nuovoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Virgola decimale, spazio per le migliaia.
function formattaNumero(valore, decimali) {
  const n = Number(valore);
  if (!isFinite(n)) return '0';
  const d = typeof decimali === 'number' ? decimali : 0;
  const fisso = Math.abs(n).toFixed(d);
  const parti = fisso.split('.');
  const intera = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const segno = n < 0 ? '-' : '';
  return segno + intera + (parti[1] ? ',' + parti[1] : '');
}

// I carichi hanno un decimale solo quando serve.
function formattaCarico(valore) {
  const n = Number(valore) || 0;
  return formattaNumero(n, Number.isInteger(n) ? 0 : 1);
}

function formattaTempo(secondi) {
  const s = Math.max(0, Math.round(secondi));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function dataBreve(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.getDate() + ' ' + MESI[d.getMonth()];
}

function dataEstesa(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear();
}

// Il giorno secondo l'orologio del telefono, non secondo UTC.
function chiaveGiorno(quando) {
  const d = quando ? new Date(quando) : new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Lunedì come primo giorno: chiave della settimana in formato ISO.
function chiaveSettimana(iso) {
  const d = new Date(iso);
  const giorno = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - giorno);
  return d.toISOString().slice(0, 10);
}

function elemento(tag, classe, testo) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (testo !== undefined && testo !== null) el.textContent = testo;
  return el;
}

function svuota(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

/* ---------- Stato e persistenza ---------- */

function statoIniziale() {
  return {
    versione: 1,
    programmi: [],
    programmaAttivo: null,
    sessione: null,
    sessioni: [],
    impostazioni: { chiaveApi: '', modello: 'claude-sonnet-5' },
    coach: { testo: '', data: null },
    spiegazioni: {},
    integrazione: {},
    ultimaChiusura: null
  };
}

let stato = statoIniziale();
let schermataAttiva = 'oggi';
let esercizioCurve = null;

function carica() {
  try {
    const grezzo = localStorage.getItem(CHIAVE_DATI);
    if (!grezzo) {
      // Primo avvio: la scheda 5 giorni è già dentro.
      caricaSchedaPredefinita();
      return;
    }
    const letto = JSON.parse(grezzo);
    if (!letto || typeof letto !== 'object') return;
    stato = Object.assign(statoIniziale(), letto);
    stato.impostazioni = Object.assign({ chiaveApi: '', modello: 'claude-sonnet-5' }, letto.impostazioni || {});
    stato.coach = Object.assign({ testo: '', data: null }, letto.coach || {});
    if (!stato.spiegazioni || typeof stato.spiegazioni !== 'object') stato.spiegazioni = {};
    if (!stato.integrazione || typeof stato.integrazione !== 'object') stato.integrazione = {};
    potaIntegrazione();
    if (!Array.isArray(stato.programmi)) stato.programmi = [];
    if (!Array.isArray(stato.sessioni)) stato.sessioni = [];
  } catch (errore) {
    console.warn('Dati illeggibili, riparto da zero.', errore);
    stato = statoIniziale();
  }
}

function salva() {
  try {
    localStorage.setItem(CHIAVE_DATI, JSON.stringify(stato));
  } catch (errore) {
    console.warn('Salvataggio non riuscito.', errore);
  }
}

/* ---------- Scheda predefinita ---------- */

// Costruisce un programma dal modello in scheda-5-giorni.js, con id propri.
function creaProgrammaDaModello(modello) {
  return {
    id: nuovoId(),
    nome: modello.nome,
    settimana: modello.settimana || '',
    legenda: modello.legenda || '',
    giornate: (modello.giornate || []).map(function (giornata) {
      return {
        id: nuovoId(),
        nome: giornata.nome,
        titolo: giornata.titolo || '',
        descrizione: giornata.descrizione || '',
        nota: giornata.nota || '',
        esercizi: (giornata.esercizi || []).map(function (esercizio) {
          return {
            id: nuovoId(),
            gruppo: esercizio.gruppo || '',
            nome: esercizio.nome,
            schema: esercizio.schema || '',
            serie: Number(esercizio.serie) || 0,
            ripetizioni: Number(esercizio.ripetizioni) || 0,
            recupero: Number(esercizio.recupero) || 0,
            recuperoTesto: esercizio.recuperoTesto || '',
            nota: esercizio.nota || ''
          };
        })
      };
    })
  };
}

function modelloDisponibile() {
  return typeof window !== 'undefined' && window.SCHEDA_5_GIORNI;
}

function schedaGiaCaricata() {
  if (!modelloDisponibile()) return true;
  return stato.programmi.some(function (p) { return p.nome === window.SCHEDA_5_GIORNI.nome; });
}

function caricaSchedaPredefinita() {
  if (!modelloDisponibile()) return null;
  const programma = creaProgrammaDaModello(window.SCHEDA_5_GIORNI);
  stato.programmi.push(programma);
  stato.programmaAttivo = programma.id;
  salva();
  return programma;
}

/* ---------- Calcoli ---------- */

// Epley: carico × (1 + ripetizioni / 30)
function massimaleStimato(carico, ripetizioni) {
  const c = Number(carico) || 0;
  const r = Number(ripetizioni) || 0;
  if (c <= 0 || r <= 0) return 0;
  return c * (1 + r / 30);
}

function serieValide(esercizio) {
  return (esercizio.serie || []).filter(function (s) {
    return s.fatta && Number(s.carico) > 0 && Number(s.ripetizioni) > 0;
  });
}

function volumeEsercizio(esercizio) {
  return serieValide(esercizio).reduce(function (somma, s) {
    return somma + Number(s.carico) * Number(s.ripetizioni);
  }, 0);
}

function volumeSessione(sessione) {
  if (!sessione) return 0;
  return (sessione.esercizi || []).reduce(function (somma, e) {
    return somma + volumeEsercizio(e);
  }, 0);
}

function massimaleEsercizioInSessione(sessione, nome) {
  let massimo = 0;
  (sessione.esercizi || []).forEach(function (e) {
    if (e.nome !== nome) return;
    serieValide(e).forEach(function (s) {
      const m = massimaleStimato(s.carico, s.ripetizioni);
      if (m > massimo) massimo = m;
    });
  });
  return massimo;
}

function sessioniChiuse() {
  return stato.sessioni
    .filter(function (s) { return s.fine; })
    .sort(function (a, b) { return new Date(a.fine) - new Date(b.fine); });
}

// Elenco dei nomi di esercizio, dal più registrato al meno.
function eserciziPerQuantitaDati() {
  const conteggio = {};
  sessioniChiuse().forEach(function (sessione) {
    const visti = {};
    (sessione.esercizi || []).forEach(function (e) {
      if (serieValide(e).length === 0 || visti[e.nome]) return;
      visti[e.nome] = true;
      conteggio[e.nome] = (conteggio[e.nome] || 0) + 1;
    });
  });
  return Object.keys(conteggio).sort(function (a, b) {
    if (conteggio[b] !== conteggio[a]) return conteggio[b] - conteggio[a];
    return a.localeCompare(b, 'it');
  });
}

// Serie dell'ultima volta che hai fatto quell'esercizio.
function ultimeSerie(nome) {
  const chiuse = sessioniChiuse();
  for (let i = chiuse.length - 1; i >= 0; i--) {
    const trovato = (chiuse[i].esercizi || []).filter(function (e) {
      return e.nome === nome && serieValide(e).length > 0;
    })[0];
    if (trovato) return serieValide(trovato);
  }
  return [];
}

// L'ultima volta che hai fatto questo esercizio: quando, e con quali carichi.
function ultimaVolta(nome) {
  const chiuse = sessioniChiuse();
  for (let i = chiuse.length - 1; i >= 0; i--) {
    const trovato = (chiuse[i].esercizi || []).filter(function (e) {
      return e.nome === nome && serieValide(e).length > 0;
    })[0];
    if (trovato) return { data: chiuse[i].fine, serie: serieValide(trovato) };
  }
  return null;
}

// "4 serie da 100 × 5" quando sono tutte uguali, altrimenti l'elenco.
function serieInParole(serie) {
  const scritte = serie.map(function (s) {
    return formattaCarico(s.carico) + ' × ' + formattaNumero(s.ripetizioni);
  });
  const tutteUguali = scritte.every(function (s) { return s === scritte[0]; });
  if (tutteUguali && scritte.length > 1) {
    return formattaNumero(scritte.length) + ' serie da ' + scritte[0];
  }
  return scritte.join(' · ');
}

// Record: massimale stimato più alto fra le sessioni chiuse.
function recordEsercizio(nome) {
  let massimo = 0;
  let quando = null;
  sessioniChiuse().forEach(function (sessione) {
    const m = massimaleEsercizioInSessione(sessione, nome);
    if (m > massimo) { massimo = m; quando = sessione.fine; }
  });
  return { valore: massimo, data: quando };
}

function classificaRecord() {
  const nomi = {};
  sessioniChiuse().forEach(function (sessione) {
    (sessione.esercizi || []).forEach(function (e) {
      if (serieValide(e).length > 0) nomi[e.nome] = true;
    });
  });
  return Object.keys(nomi)
    .map(function (nome) {
      const r = recordEsercizio(nome);
      return { nome: nome, valore: r.valore, data: r.data };
    })
    .filter(function (r) { return r.valore > 0; })
    .sort(function (a, b) { return b.valore - a.valore; });
}

function coloreEsercizio(nome) {
  const elenco = eserciziPerQuantitaDati();
  const indice = elenco.indexOf(nome);
  return DISCHI[(indice < 0 ? 0 : indice) % DISCHI.length];
}

/* ---------- Navigazione ---------- */

function mostraSchermata(nome) {
  schermataAttiva = nome;
  ['oggi', 'scheda', 'curve', 'integrazione', 'coach'].forEach(function (s) {
    $('#schermata-' + s).classList.toggle('attiva', s === nome);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.voce-nav'), function (voce) {
    voce.classList.toggle('attiva', voce.dataset.schermata === nome);
  });
  window.scrollTo(0, 0);
  disegna();
}

function disegna() {
  if (schermataAttiva === 'oggi') disegnaOggi();
  if (schermataAttiva === 'scheda') disegnaScheda();
  if (schermataAttiva === 'curve') disegnaCurve();
  if (schermataAttiva === 'integrazione') disegnaIntegrazione();
  if (schermataAttiva === 'coach') disegnaCoach();
}

/* ---------- Timer di recupero ---------- */

const recupero = { restanti: 0, riferimento: 0, intervallo: null, nome: '' };

// Durante il recupero lo schermo resta acceso: il timer si vede senza toccare nulla.
let sentinellaSchermo = null;

function tieniAccesoSchermo() {
  if (!('wakeLock' in navigator) || sentinellaSchermo) return;
  navigator.wakeLock.request('screen').then(function (sentinella) {
    sentinellaSchermo = sentinella;
    sentinella.addEventListener('release', function () { sentinellaSchermo = null; });
  }).catch(function () {
    // Non è essenziale: se il telefono dice di no, il timer funziona lo stesso.
  });
}

function lasciaSpegnereSchermo() {
  if (!sentinellaSchermo) return;
  const sentinella = sentinellaSchermo;
  sentinellaSchermo = null;
  sentinella.release().catch(function () {});
}

function avviaRecupero(secondi, nome) {
  const durata = Number(secondi) > 0 ? Number(secondi) : 90;
  recupero.restanti = durata;
  recupero.nome = nome || '';
  recupero.riferimento = Date.now() + durata * 1000;
  if (recupero.intervallo) clearInterval(recupero.intervallo);
  recupero.intervallo = setInterval(passoRecupero, 250);
  document.body.classList.add('timer-acceso');
  $('#timer').hidden = false;
  tieniAccesoSchermo();
  aggiornaTimer();
}

function passoRecupero() {
  const restanti = Math.round((recupero.riferimento - Date.now()) / 1000);
  recupero.restanti = restanti;
  aggiornaTimer();
  if (restanti <= 0) fineRecupero();
}

function aggiornaTimer() {
  $('#timer-tempo').textContent = formattaTempo(Math.max(0, recupero.restanti));
}

function fermaRecupero() {
  if (recupero.intervallo) clearInterval(recupero.intervallo);
  recupero.intervallo = null;
  recupero.restanti = 0;
  document.body.classList.remove('timer-acceso');
  $('#timer').hidden = true;
  lasciaSpegnereSchermo();
}

function fineRecupero() {
  // Se il tempo è scaduto mentre l'app era chiusa, suonare adesso sarebbe in ritardo.
  if (document.visibilityState === 'visible') {
    suona();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  fermaRecupero();
}

// Suono generato, nessun file esterno.
let contestoAudio = null;
function suona() {
  try {
    const Contesto = window.AudioContext || window.webkitAudioContext;
    if (!Contesto) return;
    if (!contestoAudio) contestoAudio = new Contesto();
    if (contestoAudio.state === 'suspended') contestoAudio.resume();
    const adesso = contestoAudio.currentTime;
    [0, 0.28].forEach(function (scarto) {
      const osc = contestoAudio.createOscillator();
      const guadagno = contestoAudio.createGain();
      osc.type = 'square';
      osc.frequency.value = 660;
      guadagno.gain.setValueAtTime(0.0001, adesso + scarto);
      guadagno.gain.exponentialRampToValueAtTime(0.18, adesso + scarto + 0.02);
      guadagno.gain.exponentialRampToValueAtTime(0.0001, adesso + scarto + 0.2);
      osc.connect(guadagno).connect(contestoAudio.destination);
      osc.start(adesso + scarto);
      osc.stop(adesso + scarto + 0.22);
    });
  } catch (errore) {
    console.warn('Audio non disponibile.', errore);
  }
}

/* ---------- Integrazione ---------- */

// Tiene gli ultimi quattro mesi: il resto è zavorra.
function potaIntegrazione() {
  const giorni = Object.keys(stato.integrazione).sort();
  while (giorni.length > 120) delete stato.integrazione[giorni.shift()];
}

function presiOggi() {
  return stato.integrazione[chiaveGiorno()] || {};
}

function segnaPreso(idIntegratore, momento, preso) {
  const giorno = chiaveGiorno();
  if (!stato.integrazione[giorno]) stato.integrazione[giorno] = {};
  const chiave = idIntegratore + ':' + momento;
  if (preso) stato.integrazione[giorno][chiave] = true;
  else delete stato.integrazione[giorno][chiave];
  if (!Object.keys(stato.integrazione[giorno]).length) delete stato.integrazione[giorno];
  potaIntegrazione();
  salva();
}

function doseTotali() {
  return INTEGRATORI.reduce(function (somma, i) { return somma + i.momenti.length; }, 0);
}

function dosePrese() {
  const oggi = presiOggi();
  return INTEGRATORI.reduce(function (somma, integratore) {
    return somma + integratore.momenti.filter(function (momento) {
      return oggi[integratore.id + ':' + momento];
    }).length;
  }, 0);
}

function disegnaIntegrazione() {
  const corpo = $('#corpo-integrazione');
  svuota(corpo);

  const sezione = elemento('div');

  const testa = elemento('div', 'esercizio-testa');
  testa.appendChild(elemento('p', 'etichetta', dataEstesa(new Date().toISOString())));
  const conteggio = elemento('span', 'riga-dettaglio conteggio-integrazione',
    formattaNumero(dosePrese()) + ' su ' + formattaNumero(doseTotali()));
  testa.appendChild(conteggio);
  sezione.appendChild(testa);

  sezione.appendChild(elemento('div', 'barra'));

  const intestazione = elemento('div', 'riga-integratore intestazione-integrazione');
  intestazione.appendChild(elemento('span', null, ''));
  MOMENTI.forEach(function (momento) {
    intestazione.appendChild(elemento('span', 'etichetta', momento));
  });
  sezione.appendChild(intestazione);

  const oggi = presiOggi();

  INTEGRATORI.forEach(function (integratore) {
    const riga = elemento('div', 'riga-integratore');

    const sinistra = elemento('div');
    sinistra.appendChild(elemento('div', 'integratore-nome', integratore.nome));
    if (integratore.nota) sinistra.appendChild(elemento('div', 'riga-dettaglio', integratore.nota));
    riga.appendChild(sinistra);

    MOMENTI.forEach(function (momento) {
      if (integratore.momenti.indexOf(momento) < 0) {
        riga.appendChild(elemento('span', null, ''));
        return;
      }
      const preso = !!oggi[integratore.id + ':' + momento];
      const spunta = elemento('button', 'spunta' + (preso ? ' fatta' : ''));
      spunta.type = 'button';
      spunta.setAttribute('aria-pressed', preso ? 'true' : 'false');
      spunta.setAttribute('aria-label', integratore.nome + ', ' + momento);
      spunta.appendChild(elemento('span', 'spunta-cerchio'));
      spunta.addEventListener('click', function () {
        const adesso = !spunta.classList.contains('fatta');
        spunta.classList.toggle('fatta', adesso);
        spunta.setAttribute('aria-pressed', adesso ? 'true' : 'false');
        segnaPreso(integratore.id, momento, adesso);
        conteggio.textContent = formattaNumero(dosePrese()) + ' su ' + formattaNumero(doseTotali());
      });
      riga.appendChild(spunta);
    });

    sezione.appendChild(riga);
  });

  corpo.appendChild(sezione);
  corpo.appendChild(disegnaStoricoIntegrazione());
}

// Gli ultimi sette giorni, zeri compresi: i buchi sono il dato.
function disegnaStoricoIntegrazione() {
  const storico = elemento('div', 'sezione');
  storico.appendChild(elemento('p', 'etichetta', 'Ultimi sette giorni'));

  const totale = doseTotali();
  for (let scarto = 6; scarto >= 0; scarto--) {
    const quando = new Date();
    quando.setDate(quando.getDate() - scarto);
    const giorno = stato.integrazione[chiaveGiorno(quando)] || {};
    const prese = INTEGRATORI.reduce(function (somma, integratore) {
      return somma + integratore.momenti.filter(function (momento) {
        return giorno[integratore.id + ':' + momento];
      }).length;
    }, 0);

    const riga = elemento('div', 'riga');
    riga.appendChild(elemento('span', 'riga-titolo', scarto === 0 ? 'Oggi' : dataEstesa(quando.toISOString())));
    const valore = elemento('span', 'numero numero-medio', formattaNumero(prese) + ' / ' + formattaNumero(totale));
    if (prese === 0) valore.className += ' testo-secondario';
    riga.appendChild(valore);
    storico.appendChild(riga);
  }

  return storico;
}

/* ---------- Oggi ---------- */

function programmaAttivo() {
  if (!stato.programmi.length) return null;
  return stato.programmi.filter(function (p) { return p.id === stato.programmaAttivo; })[0] || stato.programmi[0];
}

function serieIniziali(nome, quante, ripetizioni) {
  const precedenti = ultimeSerie(nome);
  const numero = Math.max(1, Number(quante) || precedenti.length || 3);
  const serie = [];
  for (let i = 0; i < numero; i++) {
    const vecchia = precedenti[i] || precedenti[precedenti.length - 1];
    serie.push({
      carico: vecchia ? String(vecchia.carico) : '',
      ripetizioni: vecchia ? String(vecchia.ripetizioni) : (ripetizioni ? String(ripetizioni) : ''),
      fatta: false
    });
  }
  return serie;
}

function avviaSessione(giornata) {
  const esercizi = (giornata && giornata.esercizi ? giornata.esercizi : []).map(function (e) {
    return {
      id: nuovoId(),
      nome: e.nome,
      gruppo: e.gruppo || '',
      schema: e.schema || '',
      recupero: Number(e.recupero) || 90,
      recuperoTesto: e.recuperoTesto || '',
      nota: e.nota || '',
      obiettivoSerie: Number(e.serie) || 0,
      obiettivoRipetizioni: Number(e.ripetizioni) || 0,
      serie: serieIniziali(e.nome, e.serie, e.ripetizioni)
    };
  });
  stato.sessione = {
    id: nuovoId(),
    inizio: new Date().toISOString(),
    fine: null,
    nome: giornata ? giornata.nome : 'Libera',
    esercizi: esercizi,
    note: ''
  };
  stato.ultimaChiusura = null;
  salva();
  disegnaOggi();
}

function aggiungiEsercizioASessione(nome) {
  const pulito = (nome || '').trim();
  if (!pulito || !stato.sessione) return;
  stato.sessione.esercizi.push({
    id: nuovoId(),
    nome: pulito,
    gruppo: '',
    schema: '',
    recupero: 90,
    recuperoTesto: '',
    nota: '',
    obiettivoSerie: 3,
    obiettivoRipetizioni: 0,
    serie: serieIniziali(pulito, 3, 0)
  });
  salva();
  disegnaOggi();
}

function chiudiSessione() {
  const sessione = stato.sessione;
  if (!sessione) return;
  sessione.fine = new Date().toISOString();
  sessione.esercizi = sessione.esercizi.filter(function (e) { return serieValide(e).length > 0; });
  const volume = volumeSessione(sessione);
  if (sessione.esercizi.length > 0) stato.sessioni.push(sessione);
  stato.sessione = null;
  stato.ultimaChiusura = { volume: volume, data: sessione.fine, vuota: sessione.esercizi.length === 0 };
  fermaRecupero();
  salva();
  disegnaOggi();
}

function disegnaOggi() {
  const corpo = $('#corpo-oggi');
  svuota(corpo);
  if (stato.sessione) disegnaSessioneInCorso(corpo);
  else disegnaAvvio(corpo);
}

function disegnaAvvio(corpo) {
  if (stato.ultimaChiusura) {
    const esito = elemento('p', 'testo-verde');
    esito.textContent = stato.ultimaChiusura.vuota
      ? 'Chiuso. Nessuna serie registrata.'
      : 'Chiuso. ' + formattaNumero(stato.ultimaChiusura.volume) + ' kg';
    corpo.appendChild(esito);
  }

  const programma = programmaAttivo();
  const sezione = elemento('div', 'sezione');
  sezione.appendChild(elemento('p', 'etichetta', programma ? programma.nome : 'Nessuna scheda'));

  if (!programma || !programma.giornate.length) {
    sezione.appendChild(elemento('p', 'vuoto',
      'Non hai ancora una scheda. Creala in Scheda, oppure parti con una sessione libera e aggiungi gli esercizi mentre ti alleni.'));
  } else {
    const elenco = elemento('div');
    programma.giornate.forEach(function (giornata) {
      const voce = elemento('button', 'voce-giornata');
      voce.type = 'button';
      voce.appendChild(elemento('span', 'nome', giornata.nome));
      const quanti = (giornata.esercizi || []).length;
      const dettaglio = [giornata.titolo, quanti === 1 ? '1 esercizio' : quanti + ' esercizi']
        .filter(function (parte) { return parte; }).join(' · ');
      voce.appendChild(elemento('div', 'riga-dettaglio', dettaglio));
      voce.addEventListener('click', function () { avviaSessione(giornata); });
      elenco.appendChild(voce);
    });
    sezione.appendChild(elenco);
  }
  corpo.appendChild(sezione);

  const ultime = sessioniChiuse().slice(-3).reverse();
  if (ultime.length) {
    const storico = elemento('div', 'sezione');
    storico.appendChild(elemento('p', 'etichetta', 'Ultimi allenamenti'));
    ultime.forEach(function (sessione) {
      const riga = elemento('div', 'riga');
      const sinistra = elemento('div');
      sinistra.appendChild(elemento('div', 'riga-titolo', sessione.nome));
      sinistra.appendChild(elemento('div', 'riga-dettaglio', dataEstesa(sessione.fine)));
      riga.appendChild(sinistra);
      const valore = elemento('span', 'numero numero-grande', formattaNumero(volumeSessione(sessione)));
      riga.appendChild(valore);
      storico.appendChild(riga);
    });
    corpo.appendChild(storico);
  }

  const azioni = elemento('div', 'sezione azioni-fondo');
  const avvia = elemento('button', 'pulsante pulsante-principale', 'Vai');
  avvia.type = 'button';
  avvia.addEventListener('click', function () { avviaSessione(null); });
  azioni.appendChild(avvia);
  azioni.appendChild(elemento('p', 'riga-dettaglio', 'Sessione libera: aggiungi gli esercizi mentre ti alleni.'));
  corpo.appendChild(azioni);
}

function disegnaSessioneInCorso(corpo) {
  const sessione = stato.sessione;

  const testa = elemento('div');
  testa.appendChild(elemento('p', 'etichetta', sessione.nome + ' · ' + dataEstesa(sessione.inizio)));
  corpo.appendChild(testa);

  sessione.esercizi.forEach(function (esercizio) {
    corpo.appendChild(disegnaEsercizio(esercizio));
  });

  if (!sessione.esercizi.length) {
    corpo.appendChild(elemento('p', 'vuoto', 'Nessun esercizio. Aggiungine uno qui sotto.'));
  }

  // Aggiunta di un esercizio alla sessione
  const aggiunta = elemento('div', 'sezione');
  aggiunta.appendChild(elemento('p', 'etichetta', 'Aggiungi esercizio'));
  const campo = elemento('div', 'campo');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nome esercizio';
  input.autocomplete = 'off';
  input.setAttribute('list', 'elenco-esercizi');
  campo.appendChild(input);
  aggiunta.appendChild(campo);

  const lista = document.createElement('datalist');
  lista.id = 'elenco-esercizi';
  nomiEserciziConosciuti().forEach(function (nome) {
    const opzione = document.createElement('option');
    opzione.value = nome;
    lista.appendChild(opzione);
  });
  aggiunta.appendChild(lista);

  const aggiungi = elemento('button', 'pulsante', 'Aggiungi');
  aggiungi.type = 'button';
  aggiungi.addEventListener('click', function () {
    aggiungiEsercizioASessione(input.value);
  });
  aggiunta.appendChild(aggiungi);
  corpo.appendChild(aggiunta);

  // Note
  const note = elemento('div', 'sezione');
  note.appendChild(elemento('p', 'etichetta', 'Note della sessione'));
  const area = document.createElement('textarea');
  area.value = sessione.note || '';
  area.placeholder = 'Sensazioni, carichi, dolori.';
  area.addEventListener('input', function () {
    sessione.note = area.value;
    salva();
  });
  note.appendChild(area);
  corpo.appendChild(note);

  // Volume e chiusura
  const riepilogo = elemento('div', 'riepilogo');
  const sinistra = elemento('div');
  sinistra.appendChild(elemento('p', 'etichetta', 'Volume'));
  sinistra.appendChild(elemento('span', 'numero numero-grande', formattaNumero(volumeSessione(sessione)) + ' kg'));
  riepilogo.appendChild(sinistra);
  const destra = elemento('div');
  destra.appendChild(elemento('p', 'etichetta', 'Serie fatte'));
  const fatte = sessione.esercizi.reduce(function (somma, e) { return somma + serieValide(e).length; }, 0);
  destra.appendChild(elemento('span', 'numero numero-grande', formattaNumero(fatte)));
  riepilogo.appendChild(destra);
  corpo.appendChild(riepilogo);

  const chiudi = elemento('button', 'pulsante pulsante-concluso', 'Chiudi allenamento');
  chiudi.type = 'button';
  chiudi.addEventListener('click', chiudiSessione);
  corpo.appendChild(chiudi);

  const annulla = elemento('button', 'pulsante-testo', 'Annulla sessione');
  annulla.type = 'button';
  annulla.addEventListener('click', function () {
    if (!confirm('Annulli la sessione? I dati non registrati vanno persi.')) return;
    stato.sessione = null;
    stato.ultimaChiusura = null;
    fermaRecupero();
    salva();
    disegnaOggi();
  });
  corpo.appendChild(annulla);
}

function nomiEserciziConosciuti() {
  const nomi = {};
  stato.programmi.forEach(function (p) {
    (p.giornate || []).forEach(function (g) {
      (g.esercizi || []).forEach(function (e) { nomi[e.nome] = true; });
    });
  });
  sessioniChiuse().forEach(function (s) {
    (s.esercizi || []).forEach(function (e) { nomi[e.nome] = true; });
  });
  return Object.keys(nomi).sort(function (a, b) { return a.localeCompare(b, 'it'); });
}

function disegnaEsercizio(esercizio) {
  const blocco = elemento('div', 'esercizio');

  const testa = elemento('div', 'esercizio-testa');
  const sinistra = elemento('div');
  if (esercizio.gruppo) sinistra.appendChild(elemento('div', 'etichetta-gruppo', esercizio.gruppo));
  sinistra.appendChild(nomeToccabile(esercizio));
  testa.appendChild(sinistra);
  testa.appendChild(destraEsercizio(esercizio));
  blocco.appendChild(testa);

  // In corso: la barra è blu.
  blocco.appendChild(elemento('div', 'barra barra-blu'));

  blocco.appendChild(sottoBarra(esercizio));

  const precedente = ultimaVolta(esercizio.nome);
  const riferimento = elemento('p', 'storico-esercizio');
  if (precedente) {
    riferimento.appendChild(elemento('span', 'etichetta-storico', 'Ultima volta, ' + dataBreve(precedente.data)));
    riferimento.appendChild(document.createTextNode(serieInParole(precedente.serie)));
  } else {
    riferimento.className = 'storico-esercizio testo-secondario';
    riferimento.textContent = 'Prima volta: nessuno storico per questo esercizio.';
  }
  blocco.appendChild(riferimento);

  const record = recordEsercizio(esercizio.nome);

  esercizio.serie.forEach(function (serie, indice) {
    blocco.appendChild(disegnaSerie(esercizio, serie, indice, record.valore));
  });

  const azioniEsercizio = elemento('div', 'riga-azioni');
  const aggiungi = elemento('button', 'pulsante-testo pulsante-testo-blu', 'Aggiungi serie');
  aggiungi.type = 'button';
  aggiungi.addEventListener('click', function () {
    const ultima = esercizio.serie[esercizio.serie.length - 1];
    esercizio.serie.push({
      carico: ultima ? ultima.carico : '',
      ripetizioni: ultima ? ultima.ripetizioni : '',
      fatta: false
    });
    salva();
    disegnaOggi();
  });
  azioniEsercizio.appendChild(aggiungi);
  azioniEsercizio.appendChild(pulsanteSpiega(esercizio));
  blocco.appendChild(azioniEsercizio);

  // Un calo va detto: il resto lo leggi già nella riga sopra le serie.
  if (precedente) {
    const massimoPrecedente = precedente.serie.reduce(function (massimo, s) {
      return Math.max(massimo, massimaleStimato(s.carico, s.ripetizioni));
    }, 0);
    const massimoAdesso = serieValide(esercizio).reduce(function (massimo, s) {
      return Math.max(massimo, massimaleStimato(s.carico, s.ripetizioni));
    }, 0);
    if (massimoAdesso > 0 && massimoAdesso < massimoPrecedente * 0.97) {
      blocco.appendChild(elemento('div', 'riga-dettaglio testo-rosso',
        'In calo sull\u2019ultima volta: ' + formattaNumero(massimoPrecedente, 1) + ' kg stimati contro ' +
        formattaNumero(massimoAdesso, 1) + ' di oggi.'));
    }
  }

  if (record.valore > 0) {
    const riga = elemento('div', 'riga-dettaglio');
    riga.appendChild(document.createTextNode('Record '));
    const blocchetto = elemento('span', 'numero blocco-record', formattaNumero(record.valore, 1));
    riga.appendChild(blocchetto);
    riga.appendChild(document.createTextNode(' kg stimati'));
    blocco.appendChild(riga);
  }

  return blocco;
}

// Il nome è toccabile: apre la scheda che spiega l'esercizio.
function nomeToccabile(esercizio) {
  const nome = elemento('button', 'esercizio-nome nome-toccabile', esercizio.nome);
  nome.type = 'button';
  nome.setAttribute('aria-label', 'Spiega ' + esercizio.nome);
  nome.addEventListener('click', function () { apriSpiegazione(esercizio); });
  return nome;
}

function pulsanteSpiega(esercizio) {
  const spiega = elemento('button', 'pulsante-testo pulsante-testo-blu', 'Spiega');
  spiega.type = 'button';
  spiega.addEventListener('click', function () { apriSpiegazione(esercizio); });
  return spiega;
}

// A destra del nome: la prescrizione, come dettata.
function destraEsercizio(esercizio) {
  const serie = esercizio.obiettivoSerie || esercizio.serie || 0;
  const ripetizioni = esercizio.obiettivoRipetizioni || esercizio.ripetizioni || 0;
  const schema = esercizio.schema ||
    (serie && ripetizioni ? serie + ' × ' + ripetizioni : 'Da definire');
  return elemento('span', 'esercizio-target', schema);
}

// Sotto la barra: recupero e indicazione tecnica, come dettati.
function sottoBarra(esercizio) {
  const recupero = esercizio.recuperoTesto ||
    (Number(esercizio.recupero) ? formattaNumero(esercizio.recupero) + ' s' : 'Da definire');
  const parti = ['Rec. ' + recupero.toLowerCase()];
  if (esercizio.nota) parti.push(esercizio.nota);
  return elemento('p', 'nota-esercizio', parti.join(' · '));
}

function disegnaSerie(esercizio, serie, indice, record) {
  const riga = elemento('div', 'serie');
  riga.appendChild(elemento('span', 'serie-numero', String(indice + 1)));

  const carico = document.createElement('input');
  carico.type = 'text';
  carico.inputMode = 'decimal';
  carico.className = 'numero';
  carico.value = String(serie.carico).replace('.', ',');
  carico.placeholder = 'kg';
  carico.setAttribute('aria-label', 'Carico serie ' + (indice + 1));
  carico.addEventListener('input', function () {
    serie.carico = carico.value.replace(',', '.');
    salva();
  });
  riga.appendChild(carico);

  riga.appendChild(elemento('span', 'serie-per', '×'));

  const ripetizioni = document.createElement('input');
  ripetizioni.type = 'text';
  ripetizioni.inputMode = 'numeric';
  ripetizioni.className = 'numero';
  ripetizioni.value = serie.ripetizioni;
  ripetizioni.placeholder = 'rip';
  ripetizioni.setAttribute('aria-label', 'Ripetizioni serie ' + (indice + 1));
  ripetizioni.addEventListener('input', function () {
    serie.ripetizioni = ripetizioni.value;
    salva();
  });
  riga.appendChild(ripetizioni);

  const spunta = elemento('button', 'spunta' + (serie.fatta ? ' fatta' : ''));
  spunta.type = 'button';
  spunta.setAttribute('aria-pressed', serie.fatta ? 'true' : 'false');
  spunta.setAttribute('aria-label', 'Completa serie ' + (indice + 1));
  spunta.appendChild(elemento('span', 'spunta-cerchio'));
  spunta.addEventListener('click', function () {
    serie.fatta = !serie.fatta;
    spunta.classList.toggle('fatta', serie.fatta);
    spunta.setAttribute('aria-pressed', serie.fatta ? 'true' : 'false');
    salva();
    if (serie.fatta) avviaRecupero(esercizio.recupero, esercizio.nome);
    aggiornaRiepilogoOggi();
  });
  riga.appendChild(spunta);

  return riga;
}

// Aggiorna volume e serie senza ridisegnare i campi: in palestra non si perde il fuoco.
function aggiornaRiepilogoOggi() {
  const sessione = stato.sessione;
  if (!sessione) return;
  const valori = document.querySelectorAll('#corpo-oggi .riepilogo .numero');
  if (valori.length < 2) return;
  valori[0].textContent = formattaNumero(volumeSessione(sessione)) + ' kg';
  const fatte = sessione.esercizi.reduce(function (somma, e) { return somma + serieValide(e).length; }, 0);
  valori[1].textContent = formattaNumero(fatte);
}

/* ---------- Scheda ---------- */

function disegnaScheda() {
  const corpo = $('#corpo-scheda');
  svuota(corpo);

  if (!stato.programmi.length) {
    corpo.appendChild(elemento('p', 'vuoto',
      'Nessun programma. Creane uno: dentro ci metti le giornate, dentro le giornate gli esercizi.'));
  }

  stato.programmi.forEach(function (programma) {
    corpo.appendChild(disegnaProgramma(programma));
  });

  if (!schedaGiaCaricata()) {
    const ripristino = elemento('div', 'sezione');
    ripristino.appendChild(elemento('p', 'etichetta', 'Scheda 5 giorni'));
    ripristino.appendChild(elemento('p', 'vuoto', 'La scheda originale non è caricata.'));
    const carica = elemento('button', 'pulsante', 'Carica la scheda 5 giorni');
    carica.type = 'button';
    carica.addEventListener('click', function () {
      caricaSchedaPredefinita();
      disegnaScheda();
    });
    ripristino.appendChild(carica);
    corpo.appendChild(ripristino);
  }

  const nuovo = elemento('div', 'sezione');
  nuovo.appendChild(elemento('p', 'etichetta', 'Nuovo programma'));
  const campo = elemento('div', 'campo');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nome del programma';
  input.autocomplete = 'off';
  campo.appendChild(input);
  nuovo.appendChild(campo);
  const crea = elemento('button', 'pulsante pulsante-principale', 'Crea programma');
  crea.type = 'button';
  crea.addEventListener('click', function () {
    const nome = input.value.trim();
    if (!nome) return;
    const programma = { id: nuovoId(), nome: nome, giornate: [] };
    stato.programmi.push(programma);
    stato.programmaAttivo = programma.id;
    salva();
    disegnaScheda();
  });
  nuovo.appendChild(crea);
  corpo.appendChild(nuovo);
}

function disegnaProgramma(programma) {
  const blocco = elemento('div', 'sezione');

  const testa = elemento('div', 'esercizio-testa');
  testa.appendChild(elemento('span', 'titolo-programma', programma.nome));
  const attivo = programma.id === (programmaAttivo() || {}).id;
  if (attivo) {
    testa.appendChild(elemento('span', 'esercizio-target', 'In uso'));
  } else {
    const usa = elemento('button', 'pulsante-testo pulsante-testo-blu', 'Usa');
    usa.type = 'button';
    usa.addEventListener('click', function () {
      stato.programmaAttivo = programma.id;
      salva();
      disegnaScheda();
    });
    testa.appendChild(usa);
  }
  blocco.appendChild(testa);
  blocco.appendChild(elemento('div', 'barra'));

  if (programma.settimana) blocco.appendChild(elemento('p', 'nota-esercizio', 'Settimana: ' + programma.settimana));
  if (programma.legenda) blocco.appendChild(elemento('p', 'nota-esercizio', programma.legenda));

  (programma.giornate || []).forEach(function (giornata) {
    blocco.appendChild(disegnaGiornata(programma, giornata));
  });

  if (!programma.giornate.length) {
    blocco.appendChild(elemento('p', 'vuoto', 'Nessuna giornata.'));
  }

  const campo = elemento('div', 'campo');
  campo.style.marginTop = '14px';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nome della giornata';
  input.autocomplete = 'off';
  campo.appendChild(input);
  blocco.appendChild(campo);

  const aggiungi = elemento('button', 'pulsante', 'Aggiungi giornata');
  aggiungi.type = 'button';
  aggiungi.addEventListener('click', function () {
    const nome = input.value.trim();
    if (!nome) return;
    programma.giornate.push({ id: nuovoId(), nome: nome, esercizi: [] });
    salva();
    disegnaScheda();
  });
  blocco.appendChild(aggiungi);

  const elimina = elemento('button', 'pulsante-testo', 'Elimina programma');
  elimina.type = 'button';
  elimina.addEventListener('click', function () {
    if (!confirm('Elimini il programma "' + programma.nome + '"? Gli allenamenti registrati restano.')) return;
    stato.programmi = stato.programmi.filter(function (p) { return p.id !== programma.id; });
    if (stato.programmaAttivo === programma.id) {
      stato.programmaAttivo = stato.programmi.length ? stato.programmi[0].id : null;
    }
    salva();
    disegnaScheda();
  });
  blocco.appendChild(elimina);

  return blocco;
}

function disegnaGiornata(programma, giornata) {
  const blocco = elemento('div');
  blocco.style.marginTop = '18px';

  const testa = elemento('div', 'esercizio-testa');
  testa.appendChild(elemento('span', 'etichetta', giornata.nome));
  const elimina = elemento('button', 'pulsante-testo', 'Elimina');
  elimina.type = 'button';
  elimina.addEventListener('click', function () {
    if (!confirm('Elimini la giornata "' + giornata.nome + '"?')) return;
    programma.giornate = programma.giornate.filter(function (g) { return g.id !== giornata.id; });
    salva();
    disegnaScheda();
  });
  testa.appendChild(elimina);
  blocco.appendChild(testa);

  if (giornata.titolo) blocco.appendChild(elemento('p', 'riga-titolo', giornata.titolo));
  if (giornata.descrizione) blocco.appendChild(elemento('p', 'nota-esercizio', giornata.descrizione));
  if (giornata.nota) blocco.appendChild(elemento('p', 'nota-esercizio', giornata.nota));

  (giornata.esercizi || []).forEach(function (esercizio) {
    blocco.appendChild(disegnaEsercizioScheda(giornata, esercizio));
  });

  if (!giornata.esercizi.length) {
    blocco.appendChild(elemento('p', 'vuoto', 'Nessun esercizio.'));
  }

  const campo = elemento('div', 'campo');
  campo.style.marginTop = '12px';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nome esercizio';
  input.autocomplete = 'off';
  campo.appendChild(input);
  blocco.appendChild(campo);

  const aggiungi = elemento('button', 'pulsante', 'Aggiungi esercizio');
  aggiungi.type = 'button';
  aggiungi.addEventListener('click', function () {
    const nome = input.value.trim();
    if (!nome) return;
    giornata.esercizi.push({ id: nuovoId(), nome: nome, serie: 3, ripetizioni: 8, recupero: 90 });
    salva();
    disegnaScheda();
  });
  blocco.appendChild(aggiungi);

  return blocco;
}

function disegnaEsercizioScheda(giornata, esercizio) {
  const blocco = elemento('div');
  blocco.style.marginTop = '14px';

  const testa = elemento('div', 'esercizio-testa');
  const sinistra = elemento('div');
  if (esercizio.gruppo) sinistra.appendChild(elemento('div', 'etichetta-gruppo', esercizio.gruppo));
  sinistra.appendChild(nomeToccabile(esercizio));
  testa.appendChild(sinistra);
  testa.appendChild(destraEsercizio(esercizio));
  blocco.appendChild(testa);

  // Fuori dalla sessione la barra è d'acciaio: è telaio, non è in corso.
  blocco.appendChild(elemento('div', 'barra'));

  blocco.appendChild(sottoBarra(esercizio));

  const griglia = elemento('div', 'serie');
  griglia.style.gridTemplateColumns = '1fr 1fr 1fr';
  [
    { campo: 'serie', etichetta: 'Serie', modo: 'numeric' },
    { campo: 'ripetizioni', etichetta: 'Ripetizioni', modo: 'numeric' },
    { campo: 'recupero', etichetta: 'Recupero s', modo: 'numeric' }
  ].forEach(function (definizione) {
    const cella = elemento('div');
    cella.appendChild(elemento('div', 'etichetta', definizione.etichetta));
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = definizione.modo;
    input.className = 'numero';
    input.style.fontSize = '30px';
    input.style.textAlign = 'center';
    // Zero significa "da definire": il campo resta vuoto.
    input.value = Number(esercizio[definizione.campo]) ? esercizio[definizione.campo] : '';
    input.placeholder = '—';
    input.setAttribute('aria-label', definizione.etichetta + ' ' + esercizio.nome);
    input.addEventListener('input', function () {
      esercizio[definizione.campo] = Number(input.value.replace(',', '.')) || 0;
      salva();
    });
    cella.appendChild(input);
    griglia.appendChild(cella);
  });
  blocco.appendChild(griglia);

  const azioniEsercizio = elemento('div', 'riga-azioni');
  azioniEsercizio.appendChild(pulsanteSpiega(esercizio));
  const elimina = elemento('button', 'pulsante-testo', 'Elimina esercizio');
  elimina.type = 'button';
  elimina.addEventListener('click', function () {
    giornata.esercizi = giornata.esercizi.filter(function (e) { return e.id !== esercizio.id; });
    salva();
    disegnaScheda();
  });
  azioniEsercizio.appendChild(elimina);
  blocco.appendChild(azioniEsercizio);

  return blocco;
}

/* ---------- Grafici in SVG, disegnati a mano ---------- */

const NS_SVG = 'http://www.w3.org/2000/svg';

function nodoSvg(tag, attributi) {
  const nodo = document.createElementNS(NS_SVG, tag);
  Object.keys(attributi || {}).forEach(function (chiave) {
    nodo.setAttribute(chiave, attributi[chiave]);
  });
  return nodo;
}

const LARGHEZZA = 340;
const ALTEZZA = 180;
const MARGINE = { sinistra: 46, destra: 12, sopra: 14, sotto: 28 };

function telaioGrafico(minimo, massimo, etichette) {
  const svg = nodoSvg('svg', {
    viewBox: '0 0 ' + LARGHEZZA + ' ' + ALTEZZA,
    class: 'grafico',
    role: 'img',
    preserveAspectRatio: 'xMidYMid meet'
  });

  const alto = MARGINE.sopra;
  const basso = ALTEZZA - MARGINE.sotto;

  // Griglia: acciaio, solo telaio.
  for (let i = 0; i <= 3; i++) {
    const y = alto + (basso - alto) * (i / 3);
    svg.appendChild(nodoSvg('line', {
      x1: MARGINE.sinistra, x2: LARGHEZZA - MARGINE.destra, y1: y, y2: y,
      stroke: ACCIAIO, 'stroke-width': i === 3 ? 1.5 : 0.75, opacity: i === 3 ? 0.9 : 0.3
    }));
    const valore = massimo - (massimo - minimo) * (i / 3);
    const testo = nodoSvg('text', {
      x: MARGINE.sinistra - 6, y: y + 4, fill: GESSO_SECONDARIO,
      'font-size': 10, 'text-anchor': 'end', 'font-family': 'Chivo, sans-serif'
    });
    testo.textContent = formattaNumero(valore, massimo - minimo < 12 ? 1 : 0);
    svg.appendChild(testo);
  }

  // Etichette dell'asse: prima, mediana e ultima.
  const indici = etichette.length > 2 ? [0, Math.floor(etichette.length / 2), etichette.length - 1] : etichette.map(function (_, i) { return i; });
  const passo = etichette.length > 1 ? (LARGHEZZA - MARGINE.sinistra - MARGINE.destra) / (etichette.length - 1) : 0;
  indici.forEach(function (indice) {
    const x = MARGINE.sinistra + passo * indice;
    const testo = nodoSvg('text', {
      x: x, y: ALTEZZA - 8, fill: GESSO_SECONDARIO,
      'font-size': 10, 'text-anchor': indice === 0 ? 'start' : (indice === etichette.length - 1 ? 'end' : 'middle'),
      'font-family': 'Chivo, sans-serif'
    });
    testo.textContent = etichette[indice];
    svg.appendChild(testo);
  });

  return svg;
}

function scale(punti) {
  const valori = punti.map(function (p) { return p.valore; });
  let massimo = Math.max.apply(null, valori);
  let minimo = Math.min.apply(null, valori);
  if (massimo === minimo) { massimo = massimo + Math.max(1, massimo * 0.1); minimo = Math.max(0, minimo - Math.max(1, minimo * 0.1)); }
  const respiro = (massimo - minimo) * 0.12;
  return { minimo: Math.max(0, minimo - respiro), massimo: massimo + respiro };
}

function posizioni(punti, limiti) {
  const alto = MARGINE.sopra;
  const basso = ALTEZZA - MARGINE.sotto;
  const passo = punti.length > 1 ? (LARGHEZZA - MARGINE.sinistra - MARGINE.destra) / (punti.length - 1) : 0;
  return punti.map(function (punto, indice) {
    const quota = (punto.valore - limiti.minimo) / (limiti.massimo - limiti.minimo || 1);
    return {
      x: MARGINE.sinistra + passo * indice + (punti.length === 1 ? (LARGHEZZA - MARGINE.sinistra - MARGINE.destra) / 2 : 0),
      y: basso - quota * (basso - alto)
    };
  });
}

function graficoLinea(punti, colore, descrizione) {
  const limiti = scale(punti);
  const svg = telaioGrafico(limiti.minimo, limiti.massimo, punti.map(function (p) { return p.etichetta; }));
  svg.appendChild(nodoSvg('title')).textContent = descrizione || '';

  const coordinate = posizioni(punti, limiti);
  const percorso = coordinate.map(function (c, i) { return (i === 0 ? 'M' : 'L') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(' ');

  svg.appendChild(nodoSvg('path', {
    d: percorso, fill: 'none', stroke: colore, 'stroke-width': 2.5,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round'
  }));

  const massimo = Math.max.apply(null, punti.map(function (p) { return p.valore; }));
  coordinate.forEach(function (c, i) {
    const ultimo = i === coordinate.length - 1;
    const record = ultimo && punti[i].valore >= massimo && punti.length > 1;
    const calo = ultimo && !record && i > 0 && punti[i].valore < punti[i - 1].valore;
    svg.appendChild(nodoSvg('circle', {
      cx: c.x, cy: c.y, r: ultimo ? 5 : 3,
      fill: record ? GIALLO : (calo ? ROSSO : colore)
    }));
  });

  return svg;
}

function graficoBarre(punti, colore, descrizione) {
  const limiti = { minimo: 0, massimo: Math.max.apply(null, punti.map(function (p) { return p.valore; })) * 1.12 || 1 };
  const svg = telaioGrafico(limiti.minimo, limiti.massimo, punti.map(function (p) { return p.etichetta; }));
  svg.appendChild(nodoSvg('title')).textContent = descrizione || '';

  const alto = MARGINE.sopra;
  const basso = ALTEZZA - MARGINE.sotto;
  const area = LARGHEZZA - MARGINE.sinistra - MARGINE.destra;
  const larghezzaBarra = Math.min(28, (area / punti.length) * 0.62);
  const passo = punti.length > 1 ? area / (punti.length - 1) : 0;
  const massimo = Math.max.apply(null, punti.map(function (p) { return p.valore; }));

  punti.forEach(function (punto, indice) {
    const centro = MARGINE.sinistra + (punti.length > 1 ? passo * indice : area / 2);
    const quota = punto.valore / (limiti.massimo || 1);
    const altezza = Math.max(2, quota * (basso - alto));
    const ultimo = indice === punti.length - 1;
    const record = ultimo && punto.valore >= massimo && punti.length > 1;
    const calo = ultimo && !record && indice > 0 && punto.valore < punti[indice - 1].valore;
    svg.appendChild(nodoSvg('rect', {
      x: Math.max(MARGINE.sinistra, centro - larghezzaBarra / 2),
      y: basso - altezza,
      width: larghezzaBarra,
      height: altezza,
      fill: record ? GIALLO : (calo ? ROSSO : colore)
    }));
  });

  return svg;
}

/* ---------- Curve ---------- */

function disegnaCurve() {
  const corpo = $('#corpo-curve');
  svuota(corpo);

  const chiuse = sessioniChiuse();
  if (chiuse.length < 2) {
    corpo.appendChild(elemento('p', 'vuoto',
      'Servono più dati. Chiudi almeno due allenamenti: con uno solo non c’è una curva da disegnare.'));
    return;
  }

  const esercizi = eserciziPerQuantitaDati();
  if (!esercizi.length) {
    corpo.appendChild(elemento('p', 'vuoto', 'Nessuna serie registrata nelle sessioni chiuse.'));
    return;
  }

  // Il selettore si apre sull'esercizio con più dati.
  if (!esercizioCurve || esercizi.indexOf(esercizioCurve) < 0) esercizioCurve = esercizi[0];

  const selettore = elemento('div', 'selettore');
  esercizi.forEach(function (nome) {
    const voce = elemento('button', 'voce-selettore' + (nome === esercizioCurve ? ' attiva' : ''), nome);
    voce.type = 'button';
    voce.addEventListener('click', function () {
      esercizioCurve = nome;
      disegnaCurve();
    });
    selettore.appendChild(voce);
  });
  corpo.appendChild(selettore);

  // Massimale stimato
  const sezioneMassimale = elemento('div', 'sezione');
  sezioneMassimale.appendChild(elemento('p', 'etichetta', 'Massimale stimato · ' + esercizioCurve));
  const puntiMassimale = [];
  chiuse.forEach(function (sessione) {
    const valore = massimaleEsercizioInSessione(sessione, esercizioCurve);
    if (valore > 0) puntiMassimale.push({ etichetta: dataBreve(sessione.fine), valore: valore });
  });

  if (puntiMassimale.length < 2) {
    sezioneMassimale.appendChild(elemento('p', 'vuoto',
      'Servono più dati per ' + esercizioCurve + '. Registralo in almeno due allenamenti.'));
  } else {
    const colore = coloreEsercizio(esercizioCurve);
    sezioneMassimale.appendChild(graficoLinea(puntiMassimale, colore, 'Massimale stimato di ' + esercizioCurve));
    const ultimo = puntiMassimale[puntiMassimale.length - 1].valore;
    const precedente = puntiMassimale[puntiMassimale.length - 2].valore;
    const differenza = ultimo - precedente;
    const nota = elemento('p', 'riga-dettaglio' + (differenza < 0 ? ' testo-rosso' : ''));
    nota.textContent = formattaNumero(ultimo, 1) + ' kg stimati, ' +
      (differenza >= 0 ? '+' : '−') + formattaNumero(Math.abs(differenza), 1) + ' kg sull’allenamento prima.';
    sezioneMassimale.appendChild(nota);
    const legenda = elemento('div', 'legenda');
    const voce = elemento('span');
    const segno = elemento('i');
    segno.style.background = colore;
    voce.appendChild(segno);
    voce.appendChild(document.createTextNode(esercizioCurve));
    legenda.appendChild(voce);
    sezioneMassimale.appendChild(legenda);
  }
  corpo.appendChild(sezioneMassimale);

  // Volume per sessione
  const sezioneVolume = elemento('div', 'sezione');
  sezioneVolume.appendChild(elemento('p', 'etichetta', 'Volume per sessione'));
  const puntiVolume = chiuse.slice(-12).map(function (sessione) {
    return { etichetta: dataBreve(sessione.fine), valore: volumeSessione(sessione) };
  });
  sezioneVolume.appendChild(graficoLinea(puntiVolume, BLU, 'Volume per sessione in kg'));
  sezioneVolume.appendChild(elemento('p', 'riga-dettaglio',
    'Ultima: ' + formattaNumero(puntiVolume[puntiVolume.length - 1].valore) + ' kg'));
  corpo.appendChild(sezioneVolume);

  // Volume settimanale
  const settimane = {};
  chiuse.forEach(function (sessione) {
    const chiave = chiaveSettimana(sessione.fine);
    settimane[chiave] = (settimane[chiave] || 0) + volumeSessione(sessione);
  });
  const chiaviSettimane = Object.keys(settimane).sort().slice(-8);
  const sezioneSettimane = elemento('div', 'sezione');
  sezioneSettimane.appendChild(elemento('p', 'etichetta', 'Volume settimanale'));
  sezioneSettimane.appendChild(graficoBarre(
    chiaviSettimane.map(function (chiave) { return { etichetta: dataBreve(chiave), valore: settimane[chiave] }; }),
    BLU, 'Volume settimanale in kg'));
  corpo.appendChild(sezioneSettimane);

  // Classifica dei record
  const record = classificaRecord();
  const sezioneRecord = elemento('div', 'sezione');
  sezioneRecord.appendChild(elemento('p', 'etichetta', 'Record, massimale stimato'));
  if (!record.length) {
    sezioneRecord.appendChild(elemento('p', 'vuoto', 'Nessun record ancora.'));
  } else {
    record.forEach(function (voce) {
      const riga = elemento('div', 'riga');
      const sinistra = elemento('div');
      sinistra.appendChild(elemento('div', 'riga-titolo', voce.nome));
      sinistra.appendChild(elemento('div', 'riga-dettaglio', dataEstesa(voce.data)));
      riga.appendChild(sinistra);
      riga.appendChild(elemento('span', 'numero numero-grande blocco-record', formattaNumero(voce.valore, 1)));
      sezioneRecord.appendChild(riga);
    });
  }
  corpo.appendChild(sezioneRecord);
}

/* ---------- Davemaxxer, il coach ---------- */

function riassuntoSessioni(quante) {
  return sessioniChiuse().slice(-quante).map(function (sessione) {
    return {
      data: sessione.fine.slice(0, 10),
      giornata: sessione.nome,
      volume_kg: Math.round(volumeSessione(sessione)),
      note: sessione.note || '',
      esercizi: (sessione.esercizi || []).map(function (e) {
        const valide = serieValide(e);
        return {
          nome: e.nome,
          serie: valide.map(function (s) {
            return { carico_kg: Number(s.carico), ripetizioni: Number(s.ripetizioni) };
          }),
          massimale_stimato_kg: Math.round(massimaleEsercizioInSessione(sessione, e.nome) * 10) / 10
        };
      })
    };
  });
}

function costruisciPrompt(dati) {
  return [
    'Ti chiami Davemaxxer e sei un allenatore di forza. Non presentarti e non firmare la risposta.',
    'Analizzi i dati di allenamento qui sotto, in JSON.',
    'Le sessioni sono in ordine cronologico. Il massimale stimato usa la formula di Epley.',
    '',
    'Rispondi in italiano, in seconda persona, imperativo, senza entusiasmo e senza complimenti.',
    'Niente elenchi puntati con simboli, niente emoji, niente titoli: tre paragrafi brevi.',
    '',
    'Primo paragrafo: cosa migliora, con i numeri che lo dimostrano.',
    'Secondo paragrafo: cosa è fermo, e perché lo è secondo i dati.',
    'Terzo paragrafo: due o tre modifiche pratiche per le prossime due settimane.',
    '',
    'Regola vincolante: se i dati non bastano per un’affermazione, scrivi "dati insufficienti" e passa oltre.',
    'Non inventare numeri, non dedurre esercizi che non compaiono, non ipotizzare com’è andata.',
    '',
    'Dati:',
    JSON.stringify(dati)
  ].join('\n');
}

// Unica porta verso l'API: la usano sia Davemaxxer sia le spiegazioni.
async function chiamataAnthropic(messaggio, tettoToken) {
  const chiave = (stato.impostazioni.chiaveApi || '').trim();
  const modello = (stato.impostazioni.modello || 'claude-sonnet-5').trim();

  if (!chiave) throw new Error('Manca la chiave API. Inseriscila nelle impostazioni.');

  let risposta;
  try {
    risposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': chiave,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modello,
        max_tokens: tettoToken || 1200,
        messages: [{ role: 'user', content: messaggio }]
      })
    });
  } catch (errore) {
    throw new Error('Nessuna rete. Riprova quando sei online.');
  }

  if (!risposta.ok) {
    let dettaglio = '';
    try {
      const errore = await risposta.json();
      dettaglio = (errore && errore.error && errore.error.message) ? errore.error.message : '';
    } catch (ignora) { dettaglio = ''; }
    throw new Error('Richiesta rifiutata (' + risposta.status + ')' + (dettaglio ? ': ' + dettaglio : '.'));
  }

  const corpo = await risposta.json();
  const testo = (corpo.content || [])
    .filter(function (parte) { return parte.type === 'text'; })
    .map(function (parte) { return parte.text; })
    .join('\n')
    .trim();

  return testo || 'Risposta vuota.';
}

async function chiediAlCoach() {
  const dati = riassuntoSessioni(14);
  if (!dati.length) throw new Error('Nessun allenamento chiuso da analizzare.');
  return chiamataAnthropic(costruisciPrompt(dati), 1200);
}

function disegnaCoach() {
  const corpo = $('#corpo-coach');
  svuota(corpo);

  const chiuse = sessioniChiuse();
  const info = elemento('p', 'riga-dettaglio',
    chiuse.length
      ? 'Manda le ultime ' + Math.min(14, chiuse.length) + ' sessioni chiuse e leggi il commento.'
      : 'Nessun allenamento chiuso. Chiudine uno e torna qui.');
  corpo.appendChild(info);

  if (!(stato.impostazioni.chiaveApi || '').trim()) {
    const avviso = elemento('p', 'vuoto', 'Manca la chiave API. Inseriscila nelle impostazioni.');
    corpo.appendChild(avviso);
    const apri = elemento('button', 'pulsante', 'Apri impostazioni');
    apri.type = 'button';
    apri.addEventListener('click', apriImpostazioni);
    corpo.appendChild(apri);
  }

  const risposta = elemento('div', 'sezione');
  if (stato.coach.testo) {
    risposta.appendChild(elemento('p', 'etichetta', 'Commento del ' + dataEstesa(stato.coach.data)));
    risposta.appendChild(elemento('div', 'barra'));
    risposta.appendChild(elemento('div', 'risposta', stato.coach.testo));
  }
  corpo.appendChild(risposta);

  const messaggio = elemento('p', 'riga-dettaglio');
  messaggio.hidden = true;
  corpo.appendChild(messaggio);

  const azioni = elemento('div', 'azioni-fondo');
  const chiedi = elemento('button', 'pulsante pulsante-principale', 'Chiedi');
  chiedi.type = 'button';
  chiedi.disabled = chiuse.length === 0;
  chiedi.addEventListener('click', async function () {
    chiedi.textContent = 'In corso';
    chiedi.disabled = true;
    messaggio.hidden = true;
    try {
      const testo = await chiediAlCoach();
      stato.coach = { testo: testo, data: new Date().toISOString() };
      salva();
      disegnaCoach();
    } catch (errore) {
      messaggio.className = 'riga-dettaglio testo-rosso';
      messaggio.textContent = errore.message;
      messaggio.hidden = false;
      chiedi.textContent = 'Chiedi';
      chiedi.disabled = false;
    }
  });
  azioni.appendChild(chiedi);

  const nota = elemento('p', 'riga-dettaglio',
    'La chiamata parte dal telefono e usa la tua chiave. Modello: ' + (stato.impostazioni.modello || 'claude-sonnet-5') + '.');
  azioni.appendChild(nota);
  corpo.appendChild(azioni);
}

/* ---------- Spiegazione dell'esercizio ---------- */

const ETICHETTE_SPIEGAZIONE = ['Come si esegue', 'Cosa lavora', 'Errori tipici', 'Il carico'];

function chiaveSpiegazione(nome) {
  return String(nome || '').trim().toLowerCase();
}

function promptSpiegazione(esercizio) {
  const righe = ['Spieghi un esercizio di sala pesi a chi lo deve fare oggi.', ''];
  righe.push('Esercizio: ' + esercizio.nome + '.');
  if (esercizio.gruppo) righe.push('Gruppo muscolare indicato dalla scheda: ' + esercizio.gruppo + '.');
  if (esercizio.schema) righe.push('Prescrizione della scheda: ' + esercizio.schema + '.');
  if (esercizio.recuperoTesto) righe.push('Recupero previsto: ' + esercizio.recuperoTesto + '.');
  if (esercizio.nota) righe.push('Indicazione della scheda: ' + esercizio.nota);
  righe.push(
    '',
    'Rispondi in italiano, in seconda persona, imperativo, senza entusiasmo e senza complimenti.',
    'Esattamente quattro paragrafi separati da una riga vuota, in questo ordine, senza intestazioni,',
    'senza elenchi, senza trattini, senza simboli, senza emoji, massimo novanta parole ciascuno:',
    '',
    'Primo: come si esegue. Posizione di partenza, movimento, respirazione, ritmo.',
    'Secondo: cosa lavora. Muscoli principali e secondari.',
    'Terzo: gli errori tipici e come li correggi.',
    'Quarto: come scegli il carico per la prescrizione qui sopra e da cosa capisci che è giusto.',
    '',
    'Se non riconosci l\u2019esercizio con questo nome, scrivi "esercizio non riconosciuto" nel primo',
    'paragrafo e fermati lì. Non inventare varianti che non esistono.'
  );
  return righe.join('\n');
}

let esercizioSpiegato = null;

function apriSpiegazione(esercizio) {
  esercizioSpiegato = esercizio;
  disegnaSpiegazione();
  $('#pannello-spiegazione').hidden = false;
  window.scrollTo(0, 0);
}

function chiudiSpiegazione() {
  $('#pannello-spiegazione').hidden = true;
  esercizioSpiegato = null;
}

function disegnaSpiegazione(inCorso, errore) {
  const esercizio = esercizioSpiegato;
  if (!esercizio) return;
  const corpo = $('#corpo-spiegazione');
  svuota(corpo);

  const titolo = elemento('h2', 'titolo-pannello', esercizio.nome);
  corpo.appendChild(titolo);
  corpo.appendChild(elemento('div', 'barra'));

  const contesto = [];
  if (esercizio.gruppo) contesto.push(esercizio.gruppo);
  if (esercizio.schema) contesto.push(esercizio.schema);
  if (esercizio.recuperoTesto) contesto.push('rec. ' + esercizio.recuperoTesto.toLowerCase());
  if (contesto.length) corpo.appendChild(elemento('p', 'nota-esercizio', contesto.join(' · ')));

  const salvata = stato.spiegazioni[chiaveSpiegazione(esercizio.nome)];

  if (salvata && salvata.testo) {
    const paragrafi = salvata.testo.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    const sezione = elemento('div', 'sezione sezione-spiegazione');
    if (paragrafi.length === ETICHETTE_SPIEGAZIONE.length) {
      paragrafi.forEach(function (paragrafo, indice) {
        sezione.appendChild(elemento('p', 'etichetta', ETICHETTE_SPIEGAZIONE[indice]));
        sezione.appendChild(elemento('p', 'risposta', paragrafo));
      });
    } else {
      sezione.appendChild(elemento('div', 'risposta', salvata.testo));
    }
    corpo.appendChild(sezione);
    corpo.appendChild(elemento('p', 'nota-esercizio',
      'Spiegazione del ' + dataEstesa(salvata.data) + '. Indicazioni generali: interrompi se compare dolore.'));
  } else if (!inCorso) {
    corpo.appendChild(elemento('p', 'vuoto',
      (stato.impostazioni.chiaveApi || '').trim()
        ? 'Non l\u2019hai ancora chiesta. Serve la rete solo la prima volta: dopo resta sul telefono.'
        : 'Manca la chiave API. Inseriscila nelle impostazioni.'));
  }

  if (inCorso) corpo.appendChild(elemento('p', 'vuoto', 'In corso.'));
  if (errore) corpo.appendChild(elemento('p', 'riga-dettaglio testo-rosso', errore));

  const azioni = elemento('div', 'azioni-fondo');

  if (!(stato.impostazioni.chiaveApi || '').trim()) {
    const apri = elemento('button', 'pulsante', 'Apri impostazioni');
    apri.type = 'button';
    apri.addEventListener('click', function () {
      chiudiSpiegazione();
      apriImpostazioni();
    });
    azioni.appendChild(apri);
  } else {
    const chiedi = elemento('button', 'pulsante pulsante-principale', salvata ? 'Rifai la spiegazione' : 'Spiega');
    chiedi.type = 'button';
    chiedi.disabled = !!inCorso;
    chiedi.addEventListener('click', function () { generaSpiegazione(esercizio); });
    azioni.appendChild(chiedi);
  }

  const chiudi = elemento('button', 'pulsante', 'Chiudi');
  chiudi.type = 'button';
  chiudi.style.marginTop = '10px';
  chiudi.addEventListener('click', chiudiSpiegazione);
  azioni.appendChild(chiudi);

  corpo.appendChild(azioni);
}

async function generaSpiegazione(esercizio) {
  disegnaSpiegazione(true);
  try {
    const testo = await chiamataAnthropic(promptSpiegazione(esercizio), 900);
    stato.spiegazioni[chiaveSpiegazione(esercizio.nome)] = { testo: testo, data: new Date().toISOString() };
    salva();
    disegnaSpiegazione();
  } catch (problema) {
    disegnaSpiegazione(false, problema.message);
  }
}

/* ---------- Impostazioni ---------- */

function apriImpostazioni() {
  disegnaImpostazioni();
  $('#pannello-impostazioni').hidden = false;
}

function chiudiImpostazioni() {
  $('#pannello-impostazioni').hidden = true;
  disegna();
}

function disegnaImpostazioni() {
  const corpo = $('#corpo-impostazioni');
  svuota(corpo);

  const chiave = elemento('div', 'campo');
  chiave.style.marginTop = '20px';
  const etichettaChiave = elemento('label', null, 'Chiave API di Anthropic');
  etichettaChiave.setAttribute('for', 'campo-chiave');
  chiave.appendChild(etichettaChiave);
  const inputChiave = document.createElement('input');
  inputChiave.id = 'campo-chiave';
  inputChiave.type = 'password';
  inputChiave.autocomplete = 'off';
  inputChiave.spellcheck = false;
  inputChiave.placeholder = 'sk-ant-...';
  inputChiave.value = stato.impostazioni.chiaveApi || '';
  inputChiave.addEventListener('input', function () {
    stato.impostazioni.chiaveApi = inputChiave.value.trim();
    salva();
  });
  chiave.appendChild(inputChiave);
  corpo.appendChild(chiave);

  const modello = elemento('div', 'campo');
  const etichettaModello = elemento('label', null, 'Modello');
  etichettaModello.setAttribute('for', 'campo-modello');
  modello.appendChild(etichettaModello);
  const inputModello = document.createElement('input');
  inputModello.id = 'campo-modello';
  inputModello.type = 'text';
  inputModello.autocomplete = 'off';
  inputModello.spellcheck = false;
  inputModello.value = stato.impostazioni.modello || 'claude-sonnet-5';
  inputModello.addEventListener('input', function () {
    stato.impostazioni.modello = inputModello.value.trim();
    salva();
  });
  modello.appendChild(inputModello);
  corpo.appendChild(modello);

  const dati = elemento('div', 'sezione');
  dati.appendChild(elemento('p', 'etichetta', 'Dati'));
  dati.appendChild(elemento('p', 'riga-dettaglio',
    'I dati stanno solo su questo telefono. Esportali ogni tanto. Il file non contiene la chiave API: quella resta qui.'));

  const esporta = elemento('button', 'pulsante pulsante-concluso', 'Esporta JSON');
  esporta.type = 'button';
  esporta.style.marginTop = '12px';
  esporta.addEventListener('click', esportaDati);
  dati.appendChild(esporta);

  const importa = elemento('button', 'pulsante', 'Importa JSON');
  importa.type = 'button';
  importa.style.marginTop = '10px';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.className = 'nascosto';
  file.addEventListener('change', function () {
    if (file.files && file.files[0]) importaDati(file.files[0]);
  });
  importa.addEventListener('click', function () { file.click(); });
  dati.appendChild(importa);
  dati.appendChild(file);

  const esito = elemento('p', 'riga-dettaglio');
  esito.id = 'esito-dati';
  esito.hidden = true;
  dati.appendChild(esito);
  corpo.appendChild(dati);

  const conteggio = elemento('div', 'sezione');
  conteggio.appendChild(elemento('p', 'etichetta', 'Registrato'));
  const riga = elemento('div', 'riga');
  riga.appendChild(elemento('span', 'riga-titolo', 'Allenamenti chiusi'));
  riga.appendChild(elemento('span', 'numero numero-grande', formattaNumero(sessioniChiuse().length)));
  conteggio.appendChild(riga);
  corpo.appendChild(conteggio);

  const chiudi = elemento('button', 'pulsante', 'Chiudi');
  chiudi.type = 'button';
  chiudi.style.marginTop = '24px';
  chiudi.addEventListener('click', chiudiImpostazioni);
  corpo.appendChild(chiudi);
}

function messaggioDati(testo, errore) {
  const esito = $('#esito-dati');
  if (!esito) return;
  esito.className = 'riga-dettaglio ' + (errore ? 'testo-rosso' : 'testo-verde');
  esito.textContent = testo;
  esito.hidden = false;
}

// La chiave API non viaggia mai in un file: resta su questo telefono.
function datiEsportabili() {
  const copia = JSON.parse(JSON.stringify(stato));
  if (copia.impostazioni) copia.impostazioni.chiaveApi = '';
  return copia;
}

function esportaDati() {
  try {
    const contenuto = JSON.stringify(datiEsportabili(), null, 2);
    const blob = new Blob([contenuto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const collegamento = document.createElement('a');
    collegamento.href = url;
    collegamento.download = 'fitvais-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(collegamento);
    collegamento.click();
    document.body.removeChild(collegamento);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    messaggioDati('Esportato.', false);
  } catch (errore) {
    messaggioDati('Esportazione non riuscita.', true);
  }
}

function importaDati(file) {
  const lettore = new FileReader();
  lettore.onload = function () {
    try {
      const letto = JSON.parse(String(lettore.result));
      if (!letto || typeof letto !== 'object' || !Array.isArray(letto.sessioni)) {
        throw new Error('formato');
      }
      if (!confirm('Sostituisci i dati di questo telefono con quelli del file?')) return;
      // La chiave del telefono resta la sua: quella del file, se c'è, si ignora.
      const chiaveDelTelefono = stato.impostazioni.chiaveApi || '';
      stato = Object.assign(statoIniziale(), letto);
      stato.impostazioni = Object.assign({ chiaveApi: '', modello: 'claude-sonnet-5' }, letto.impostazioni || {});
      stato.impostazioni.chiaveApi = chiaveDelTelefono;
      salva();
      esercizioCurve = null;
      messaggioDati('Importato. ' + formattaNumero(sessioniChiuse().length) + ' allenamenti.', false);
      disegnaImpostazioni();
      disegna();
    } catch (errore) {
      messaggioDati('File non valido.', true);
    }
  };
  lettore.onerror = function () { messaggioDati('File illeggibile.', true); };
  lettore.readAsText(file);
}

/* ---------- Service worker e aggiornamenti ---------- */

function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  navigator.serviceWorker.register('sw.js').then(function (registrazione) {
    if (!registrazione) return;
    registrazione.addEventListener('updatefound', function () {
      const nuovo = registrazione.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', function () {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) {
          mostraAvvisoAggiornamento(nuovo);
        }
      });
    });
  }).catch(function (errore) {
    console.warn('Service worker non registrato.', errore);
  });

  let ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (ricaricato) return;
    ricaricato = true;
    location.reload();
  });
}

function mostraAvvisoAggiornamento(lavoratore) {
  const avviso = $('#avviso-aggiornamento');
  avviso.hidden = false;
  $('#ricarica').onclick = function () {
    if (lavoratore) lavoratore.postMessage({ tipo: 'SALTA_ATTESA' });
    setTimeout(function () { location.reload(); }, 400);
  };
}

/* ---------- Avvio ---------- */

function avvia() {
  carica();

  Array.prototype.forEach.call(document.querySelectorAll('.voce-nav'), function (voce) {
    voce.addEventListener('click', function () { mostraSchermata(voce.dataset.schermata); });
  });

  $('#apri-impostazioni').addEventListener('click', apriImpostazioni);

  $('#timer-piu').addEventListener('click', function () {
    recupero.riferimento += 30000;
    passoRecupero();
  });
  $('#timer-salta').addEventListener('click', fermaRecupero);

  // Tornando all'app il conto si rifà sull'orologio, non sui tic persi.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !recupero.intervallo) return;
    tieniAccesoSchermo();
    passoRecupero();
  });

  mostraSchermata('oggi');
  registraServiceWorker();
}

document.addEventListener('DOMContentLoaded', avvia);
