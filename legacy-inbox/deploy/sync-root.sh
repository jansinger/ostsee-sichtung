#!/bin/sh
#
# Einstieg für den serverweiten Plesk-Zeitplan. Gibt sofort die Rechte an den
# Domain-Benutzer ab und ruft dann sync.sh daneben.
#
# Warum der Umweg? Ein Zeitplan auf Abonnement-Ebene wäre kürzer, scheitert
# hier aber: Plesk führt solche Aufgaben in einer chroot-Umgebung aus, und der
# Domain-Benutzer steht nicht in deren passwd — seine Shell ist /bin/false,
# SSH-Login also bewusst gesperrt. Das zu ändern, nur damit ein Zeitplan
# läuft, hieße SSH-Zugang zu öffnen.
#
# `runuser -u … --` startet das Kommando direkt, ohne Login-Shell; die
# gesperrte /bin/false stört deshalb nicht.
set -u

VERZEICHNIS=$(dirname "$0")
KONFIG="${LEGACY_SYNC_CONFIG:-/var/www/vhosts/schweinswalsichtung.de/legacy-sync/config}"

# Ohne Konfiguration ist nicht einmal bekannt, wem gemeldet werden soll —
# deshalb hier nur die Ausgabe. Der Plesk-Zeitplan hält sie in seinem
# Aufgabenprotokoll fest.
if [ ! -r "$KONFIG" ]; then
	echo "Konfiguration nicht lesbar: $KONFIG"
	echo "Ohne sie kann der Posteingang nicht übertragen werden."
	exit 1
fi

. "$KONFIG"

if [ ! -r "$VERZEICHNIS/melde.sh" ]; then
	echo "Melde-Baustein nicht lesbar: $VERZEICHNIS/melde.sh"
	exit 1
fi

. "$VERZEICHNIS/melde.sh"

# Der Systembenutzer der Domain steht in der config und nicht hier im Skript:
# Plesk vergibt ihn beim Anlegen des Abonnements, und nach einer Migration
# heißt er anders. Stünde er fest im Code, liefe der Zeitplan als root
# weiter, `runuser` fiele auf die Nase — und weil melde.sh erst in sync.sh
# eingebunden würde, käme darüber nie eine Meldung. Der Sync stünde still,
# ohne dass es jemand erfährt. Genau deshalb wird hier geprüft und gemeldet.
if [ -z "${SYNC_USER:-}" ]; then
	TEXT="SYNC_USER ist in $KONFIG nicht gesetzt — der Posteingang wird nicht übertragen."
	echo "$TEXT"
	echo "$TEXT" | melde "Posteingang-Sync: SYNC_USER fehlt"
	exit 1
fi

if ! id "$SYNC_USER" >/dev/null 2>&1; then
	TEXT="Der Systembenutzer '$SYNC_USER' existiert nicht (aus $KONFIG).

Nach einer Migration oder Neuanlage des Abonnements vergibt Plesk einen
anderen Namen. Aktuellen Namen ermitteln und in der config eintragen:

  plesk bin subscription --info schweinswalsichtung.de | grep -i 'system user'

Bis dahin wird der Posteingang NICHT nach Produktion übertragen."
	echo "$TEXT"
	echo "$TEXT" | melde "Posteingang-Sync: Systembenutzer unbekannt"
	exit 1
fi

exec /usr/sbin/runuser -u "$SYNC_USER" -- "$VERZEICHNIS/sync.sh"
