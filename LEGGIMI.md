# FitVais

Registro di allenamenti di forza. Funziona offline, i dati restano sul telefono.

## Installare l'app sul telefono

**iPhone.** Apri l'indirizzo con Safari (da Chrome non si può). Tocca il pulsante
Condividi in basso, scorri l'elenco e scegli "Aggiungi a Home". Conferma con
"Aggiungi". L'icona FV compare fra le app.

**Android.** Apri l'indirizzo con Chrome. Tocca i tre puntini in alto a destra e
scegli "Aggiungi a schermata Home"; a volte compare da solo l'avviso "Installa
app". Conferma. L'icona FV compare fra le app.

## Aggiornare l'app

1. Modifica i file e salva.
2. Incrementa la costante `VERSIONE` in cima a `sw.js`: `fitvais-1` diventa `fitvais-2`.
3. Lancia `./deploy.sh`.

Senza il passo 2 il telefono continua a servire la versione vecchia dalla cache.
Dopo il passo 3, sul telefono compare in basso "Versione nuova disponibile" con
il pulsante Ricarica.

## I dati

Stanno solo nella memoria del browser di questo telefono. Nessun server, nessun
account, nessuna copia altrove. Se cancelli i dati del sito, cambi telefono o
disinstalli l'app, spariscono.

Esportali ogni tanto: Impostazioni, "Esporta JSON". Il file si rimette dentro con
"Importa JSON".
