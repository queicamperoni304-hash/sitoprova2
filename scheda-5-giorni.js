/* FitVais — Scheda 5 giorni, versione originale.
   Riportata come dettata: dove la prescrizione non c'è, resta "da definire".
   Il campo "schema" è la prescrizione testuale; serie, ripetizioni e recupero
   sono i numeri che servono all'app per precompilare le righe e il timer.
   Recupero 0 significa da definire: il timer parte con il valore predefinito. */

window.SCHEDA_5_GIORNI = {
  nome: 'Scheda 5 giorni',
  settimana: 'Lun · Mar · Mer · Gio riposo · Ven · Sab',
  legenda: 'RP = rest-pause · DROP = riduci il carico · MAX = massimo tecnico',
  giornate: [
    {
      nome: 'Lunedì',
      titolo: 'Petto · Dorso · Richiamo spalle',
      descrizione: 'Seduta mista upper: priorità petto, poi dorso e deltoide laterale.',
      nota: 'Schema fedele: RP sulla chest press in entrambe le serie e drop a corpo libero dopo ogni serie di dip.',
      esercizi: [
        { gruppo: 'Petto', nome: 'Croci ai cavi seduto — ipotesi iniziale', schema: '2 × 15', serie: 2, ripetizioni: 15, recupero: 0, recuperoTesto: 'Da definire', nota: 'Solo se i cavi sono liberi: panca a 90°, cavi dietro. Se le fai qui, salta il finisher.' },
        { gruppo: 'Petto', nome: 'Spinta manubri inclinata 30°', schema: '3 × 6', serie: 3, ripetizioni: 6, recupero: 150, recuperoTesto: '≥ 2′30"', nota: 'Serie pesanti; riparti solo quando ti senti pronto.' },
        { gruppo: 'Petto', nome: 'Chest press convergente', schema: '2 × 10 RP', serie: 2, ripetizioni: 10, recupero: 120, recuperoTesto: '2′00"', nota: 'Ogni serie: carico da circa 6 rep; 6, pausa breve, poi altri 4 colpi.' },
        { gruppo: 'Petto', nome: 'Dip zavorrate + drop', schema: '3 × 6–8 + MAX', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Dopo ogni serie togli la zavorra e continua a corpo libero fino al massimo tecnico.' },
        { gruppo: 'Petto', nome: 'Pec deck o croci ai cavi — finisher', schema: '2 × 15', serie: 2, ripetizioni: 15, recupero: 0, recuperoTesto: 'Da definire', nota: 'Esegui alla fine soltanto se non hai fatto le croci opzionali all’inizio.' },
        { gruppo: 'Dorso', nome: 'Lat machine', schema: '3 × 8', serie: 3, ripetizioni: 8, recupero: 120, recuperoTesto: '≈ 2′ / pronto', nota: 'Recupera comunque finché la prestazione è tornata.' },
        { gruppo: 'Dorso', nome: 'Low row in piedi con petto appoggiato', schema: '2 × 10 RP', serie: 2, ripetizioni: 10, recupero: 0, recuperoTesto: 'Da definire', nota: 'Ogni serie: 6 ripetizioni, pausa breve, altri 4 colpi.' },
        { gruppo: 'Dorso', nome: 'Pulldown ai cavi con corda', schema: '2 × 15', serie: 2, ripetizioni: 15, recupero: 0, recuperoTesto: 'Da definire', nota: 'Braccia quasi tese; porta la corda verso le cosce con il dorso.' },
        { gruppo: 'Spalle', nome: 'Alzate laterali con manubri', schema: '2 × 15', serie: 2, ripetizioni: 15, recupero: 0, recuperoTesto: 'Da definire', nota: 'Movimento controllato, senza slancio eccessivo.' },
        { gruppo: 'Spalle', nome: 'Alzata laterale al cavo singolo', schema: '1 sequenza MAX', serie: 1, ripetizioni: 0, recupero: 0, recuperoTesto: 'Senza pausa', nota: 'Alterna un braccio e l’altro finché non riesci più ad alzare con tecnica valida.' }
      ]
    },
    {
      nome: 'Martedì',
      titolo: 'Gambe · Addome pesante',
      descrizione: 'Unica seduta lower settimanale, con tecniche ad alta intensità sulla pressa.',
      nota: 'Schema fedele: leg extension pesante prima del pendulum; entrambe le serie di pressa sono 8+6+4 con pause da 10 secondi.',
      esercizi: [
        { gruppo: 'Gambe', nome: 'Leg extension', schema: '2 avvic. + 3 × 6–8', serie: 5, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Due serie progressive iniziali, poi tre serie allenanti pesanti.' },
        { gruppo: 'Gambe', nome: 'Pendulum squat', schema: '3 × 6–8', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Riscaldati prima e mantieni ampiezza e controllo.' },
        { gruppo: 'Gambe', nome: 'Pressa inclinata — rest-pause', schema: '2 × (8+6+4)', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: '10" tra mini-set', nota: 'In ciascuna serie: 8 rep, 10", 6 rep, 10", 4 rep. Pausa tra serie da definire.' },
        { gruppo: 'Gambe', nome: 'Affondi bulgari', schema: '2 × 8 / gamba', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Appoggio stabile; ripetizioni complete per ciascuna gamba.' },
        { gruppo: 'Gambe', nome: 'Leg curl', schema: '3 × 12', serie: 3, ripetizioni: 12, recupero: 0, recuperoTesto: 'Da definire', nota: 'Bacino stabile e ritorno controllato.' },
        { gruppo: 'Gambe', nome: 'Stacco rumeno con manubri', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Chiudi il lavoro gambe; anca indietro e schiena neutra.' },
        { gruppo: 'Addome', nome: 'Crunch al cavo con corda', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Versione pesante, flettendo il tronco senza tirare con le braccia.' },
        { gruppo: 'Addome', nome: 'Leg raises zavorrato', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Evita lo slancio; retroversione del bacino in chiusura.' },
        { gruppo: 'Addome', nome: 'Barchetta isometrica zavorrata', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Zavorra solo se mantieni la zona lombare aderente.' },
        { gruppo: 'Addome', nome: 'Crunch', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Contrazione controllata; collo rilassato.' }
      ]
    },
    {
      nome: 'Mercoledì',
      titolo: 'Spalle pesanti · Richiamo braccia',
      descrizione: 'Press, molto lavoro laterale e posteriore, richiamo completo di bicipiti e tricipiti.',
      nota: 'Schema fedele: volume spalle mantenuto integralmente; i parametri non dettati restano da definire.',
      esercizi: [
        { gruppo: 'Spalle', nome: 'Shoulder press alla Smith', schema: '3 × 6–8', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Scelta preferita; alternativa: spinte con manubri su panca inclinata.' },
        { gruppo: 'Spalle', nome: 'Alzate laterali pesanti con manubri', schema: '3 × 6–8', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Carico molto alto, come richiesto.' },
        { gruppo: 'Spalle', nome: 'Macchina alzate laterali + drop', schema: '2 × 8 + 8 drop', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Dopo le 8 ripetizioni, riduci il carico e fanne altre 8.' },
        { gruppo: 'Spalle', nome: 'Alzata laterale singola su panca', schema: '1 × 8 / lato', serie: 1, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Un braccio alla volta, busto sostenuto dalla panca.' },
        { gruppo: 'Posteriori', nome: 'Face pull o reverse pec deck', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Scegli una delle due varianti per il deltoide posteriore.' },
        { gruppo: 'Posteriori', nome: 'Apertura posteriore al cavo singolo', schema: '1 × 8 / lato', serie: 1, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Un braccio alla volta; traiettoria controllata.' },
        { gruppo: 'Bicipiti', nome: 'Curl con bilanciere EZ', schema: '3 × 6', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Gomiti stabili e niente slancio del busto.' },
        { gruppo: 'Bicipiti', nome: 'Curl Scott con manubrio singolo', schema: '2 × 8 / lato', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Appoggia bene il braccio e controlla la discesa.' },
        { gruppo: 'Tricipiti', nome: 'Pushdown con corda', schema: '3 × 6–8', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Gomiti fermi vicino al busto.' },
        { gruppo: 'Tricipiti', nome: 'French press con manubri', schema: '2 × 8', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Controlla l’allungamento senza aprire i gomiti.' }
      ]
    },
    {
      nome: 'Venerdì',
      titolo: 'Dorso · Richiamo petto · Addome',
      descrizione: 'Seconda seduta upper: rematore pesante, altre tirate e richiamo del petto.',
      nota: 'Il giorno è riportato come venerdì, coerentemente con il giovedì di riposo indicato nella split.',
      esercizi: [
        { gruppo: 'Dorso', nome: 'Rematore pesante', schema: '3 × 6–8', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Scegli una variante stabile e mantieni il busto controllato.' },
        { gruppo: 'Dorso', nome: 'Tirata dorsale al cavo singolo', schema: '2 × 8 / lato', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Un braccio alla volta; guida con il gomito.' },
        { gruppo: 'Dorso', nome: 'Low row seduto', schema: '2 × 10', serie: 2, ripetizioni: 10, recupero: 0, recuperoTesto: 'Da definire', nota: 'Tirata dal basso con busto stabile.' },
        { gruppo: 'Dorso', nome: 'Trazioni', schema: '2 × MAX', serie: 2, ripetizioni: 0, recupero: 0, recuperoTesto: 'Quanto serve', nota: 'Conta soltanto ripetizioni tecnicamente valide.' },
        { gruppo: 'Petto', nome: 'Panca inclinata alla Smith + RP', schema: '3 × 8 + RP', serie: 3, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Rest-pause previsto; numero delle mini-ripetizioni non specificato.' },
        { gruppo: 'Petto', nome: 'Croci alla pec deck', schema: '2 × 8', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Allungamento controllato e spalle stabili.' },
        { gruppo: 'Petto', nome: 'Dip finali', schema: '1 × MAX', serie: 1, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Una serie al massimo tecnico.' },
        { gruppo: 'Addome', nome: 'Crunch al cavo', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Carico gestibile e chiusura del tronco controllata.' },
        { gruppo: 'Addome', nome: 'Crunch zavorrato', schema: 'Da definire', serie: 0, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Disco al petto; evita di tirare il collo.' }
      ]
    },
    {
      nome: 'Sabato',
      titolo: 'Richiamo spalle · Braccia pesanti · Addome',
      descrizione: 'Richiamo deltoidi, poi tricipiti e bicipiti con lavoro pesante e finisher.',
      nota: 'Schema fedele: spalle all’inizio, panca stretta pesante, dip zavorrate e finisher 7–21.',
      esercizi: [
        { gruppo: 'Spalle', nome: 'Alzata laterale al cavo', schema: '2 × 8 / lato', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Un braccio alla volta.' },
        { gruppo: 'Posteriori', nome: 'Alzata posteriore al cavo', schema: '2 × 8 / lato', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Tensione continua sul deltoide posteriore.' },
        { gruppo: 'Spalle', nome: 'Macchina di spinta per deltoide frontale', schema: '2 × 8', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Va bene qualsiasi press machine disponibile.' },
        { gruppo: 'Tricipiti', nome: 'Panca stretta pesante', schema: '3 × 6', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Presa comoda, gomiti sotto controllo.' },
        { gruppo: 'Tricipiti', nome: 'Pushdown al cavo singolo', schema: '2 × 8 / lato', serie: 2, ripetizioni: 8, recupero: 0, recuperoTesto: 'Da definire', nota: 'Estendi completamente senza muovere il gomito.' },
        { gruppo: 'Tricipiti', nome: 'Dip su panca zavorrate', schema: '2 × MAX', serie: 2, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: 'Zavorra sulle cosce; serie al massimo tecnico.' },
        { gruppo: 'Bicipiti', nome: 'Curl con bilanciere', schema: '3 × 6', serie: 3, ripetizioni: 6, recupero: 0, recuperoTesto: 'Da definire', nota: 'Busto fermo; discesa controllata.' },
        { gruppo: 'Bicipiti', nome: 'Hammer curl con manubri', schema: '2 × 15', serie: 2, ripetizioni: 15, recupero: 0, recuperoTesto: 'Da definire', nota: 'Presa neutra e gomiti fermi.' },
        { gruppo: 'Bicipiti', nome: 'Finisher 7–21', schema: '1 sequenza', serie: 1, ripetizioni: 0, recupero: 0, recuperoTesto: 'Da definire', nota: '7 basse + 7 alte + 7 complete, senza cambiare carico.' },
        { gruppo: 'Addome', nome: 'Circuito addome', schema: '8 minuti', serie: 1, ripetizioni: 0, recupero: 0, recuperoTesto: 'A circuito', nota: 'Scegli esercizi noti e alternali per otto minuti.' }
      ]
    }
  ]
};
