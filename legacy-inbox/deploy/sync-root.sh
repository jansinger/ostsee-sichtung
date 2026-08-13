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
#
# WICHTIG — dieses Skript gehört NICHT ins Deploy-Verzeichnis. Es wird von
# root ausgeführt, und der Git-Deploy legt dort alles unter dem Domain-Benutzer
# an (nachgemessen: auch bei unveränderter Datei). Ein root-Zeitplan, der eine
# vom Anwendungsbenutzer beschreibbare Datei ausführt, ist ein Weg zu root —
# der Posteingang-Dienst läuft unter genau diesem Benutzer und ist aus dem
# Internet erreichbar.
#
# Deshalb wird es nach /usr/local/sbin/ installiert (siehe install.sh) und
# findet die übrigen Bausteine über SKRIPT_DIR aus der config, nicht über
# `dirname $0`.
set -u

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

if [ -z "${SKRIPT_DIR:-}" ]; then
	echo "SKRIPT_DIR ist in $KONFIG nicht gesetzt."
	echo "Erwartet wird das Deploy-Verzeichnis, z. B. …/repo/legacy-inbox/deploy"
	exit 1
fi

if [ ! -r "$SKRIPT_DIR/melde.sh" ]; then
	echo "Melde-Baustein nicht lesbar: $SKRIPT_DIR/melde.sh"
	echo "Ist der Git-Deploy durchgelaufen? (plesk ext git --deploy)"
	exit 1
fi

. "$SKRIPT_DIR/melde.sh"

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

exec /usr/sbin/runuser -u "$SYNC_USER" -- "$SKRIPT_DIR/sync.sh"
