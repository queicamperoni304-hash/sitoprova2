# FitVais

Registro di allenamenti di forza. Funziona offline, i dati restano sul telefono.

Dentro c'è già la Scheda 5 giorni (Lun · Mar · Mer · Gio riposo · Ven · Sab),
riportata come nel PDF originale: dove la prescrizione non c'era, l'app scrive
"da definire" invece di inventare un numero. I carichi li scrivi tu la prima
volta; dalla seconda in poi i campi arrivano già pieni con l'ultima volta.
Se cancelli il programma, in Scheda trovi il pulsante per rimetterlo.

## Spiegazione degli esercizi

Tocca il nome di un esercizio, in Oggi o in Scheda, e si apre una scheda che lo
spiega: come si esegue, cosa lavora, gli errori tipici e come scegliere il
carico per la prescrizione di quel giorno. La chiede all'API di Anthropic con la
stessa chiave del Coach.

Serve la rete solo la prima volta: la spiegazione resta sul telefono, si riapre
offline e non la paghi due volte. "Rifai la spiegazione" ne chiede una nuova.

## Metterla online

Due strade. La prima non richiede il computer.

**GitHub Pages.** Sul repository: Settings, poi Pages nella colonna a sinistra.
Source "Deploy from a branch", branch `claude/new-session-9umek6`, cartella
`/ (root)`, Save. Dopo un minuto l'indirizzo compare in cima alla stessa pagina:

    https://queicamperoni304-hash.github.io/sitoprova2/

Da lì in poi ogni push aggiorna il sito da solo.

**Cloudflare Pages.** Dal computer, nella cartella del progetto:
`npx wrangler login` una volta sola, poi `./deploy.sh`.

## Installare l'app sul telefono

**iPhone.** Apri l'indirizzo con Safari (da Chrome non si può). Tocca il pulsante
Condividi in basso, scorri l'elenco e scegli "Aggiungi a Home". Conferma con
"Aggiungi". L'icona FV compare fra le app.

**Android.** Apri l'indirizzo con Chrome. Tocca i tre puntini in alto a destra e
scegli "Aggiungi a schermata Home"; a volte compare da solo l'avviso "Installa
app". Conferma. L'icona FV compare fra le app.

## Aggiornare l'app

1. Modifica i file e salva.
2. Incrementa la costante `VERSIONE` in cima a `sw.js`: `fitvais-2` diventa `fitvais-3`.
3. Pubblica: `git push` con GitHub Pages, `./deploy.sh` con Cloudflare.

Senza il passo 2 il telefono continua a servire la versione vecchia dalla cache.
Dopo il passo 3, sul telefono compare in basso "Versione nuova disponibile" con
il pulsante Ricarica.

Gli aggiornamenti non toccano i dati: il codice e gli allenamenti stanno in due
posti diversi del telefono. Nemmeno reinstallare l'icona li cancella.

La scheda predefinita si carica solo la prima volta. Se cambi
`scheda-5-giorni.js`, i telefoni che hanno già dei dati continuano a tenersi la
versione vecchia: per prendere quella nuova, elimina il programma da Scheda e
usa il pulsante "Carica la scheda 5 giorni" che compare al suo posto.

## Darla a un amico

Mandagli l'indirizzo. Stessa app, stesso link, ma i dati stanno nel telefono di
chi la usa: lui vede i suoi allenamenti, tu i tuoi, e nessuno dei due vede
quelli dell'altro. Non c'è un server in mezzo, non ci sono account.

Anche lui si troverà dentro la Scheda 5 giorni: se non gli serve, la elimina da
Scheda e si costruisce la sua.

Per il Coach serve una chiave API sua. Se gli passi la tua, le sue richieste le
paghi tu.

## I dati

Stanno solo nella memoria del browser di questo telefono. Nessun server, nessun
account, nessuna copia altrove. Se cancelli i dati del sito, cambi telefono o
disinstalli l'app, spariscono.

Esportali ogni tanto: Impostazioni, "Esporta JSON". Il file si rimette dentro con
"Importa JSON".
