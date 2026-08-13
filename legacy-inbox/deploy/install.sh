#!/bin/sh
#
# Installiert die beiden root-Einstiege nach /usr/local/sbin/.
#
# Als root aufrufen, nach jeder Änderung an sync-root.sh oder
# client-report.sh:
#
#   sudo /var/www/vhosts/<domain>/repo/legacy-inbox/deploy/install.sh
#
# Warum überhaupt kopieren, statt aus dem Deploy-Verzeichnis zu starten?
#
# Beide Skripte werden vom Plesk-Zeitplan als root ausgeführt: sync-root.sh
# gibt die Rechte an den Domain-Benutzer ab, client-report.sh liest die
# Zugriffsprotokolle, die nur root lesen darf. Der Git-Deploy legt im
# Deploy-Verzeichnis aber alles unter dem Domain-Benutzer an — nachgemessen am
# 2026-08-13, auch bei unveränderter Datei. Ein root-Zeitplan, der eine vom
# Anwendungsbenutzer beschreibbare Datei ausführt, ist ein Weg zu root, und
# der Posteingang-Dienst läuft unter genau diesem Benutzer und ist aus dem
# Internet erreichbar.
#
# Ein `chown root:root` nach jedem Deploy wäre die Alternative gewesen. Sie
# hält nur so lange, wie jemand daran denkt — und Plesks Post-Deploy-Aktionen
# können hier nicht einspringen: Sie liefen in der chroot-Umgebung des
# Abonnements, in der die Shell auf /bin/false steht, und wurden im Test
# überhaupt nicht ausgeführt.
#
# Die übrigen Bausteine (sync.sh, melde.sh) bleiben im Deploy-Verzeichnis und
# kommen mit jedem Deploy frisch: sync.sh läuft als Domain-Benutzer, melde.sh
# wird nur eingebunden. Beide finden sich über SKRIPT_DIR aus der config.
set -eu

QUELLE=$(cd "$(dirname "$0")" && pwd)
ZIEL=/usr/local/sbin

if [ "$(id -u)" -ne 0 ]; then
	echo "Bitte als root aufrufen (sudo)."
	exit 1
fi

installiere() {
	quelle="$QUELLE/$1"
	ziel="$ZIEL/$2"

	if [ ! -f "$quelle" ]; then
		echo "Nicht gefunden: $quelle"
		exit 1
	fi

	install -o root -g root -m 700 "$quelle" "$ziel"
	echo "installiert: $ziel"
}

installiere sync-root.sh legacy-inbox-sync
installiere client-report.sh legacy-inbox-report

cat <<HINWEIS

Die Plesk-Zeitpläne müssen auf diese Pfade zeigen:

  $ZIEL/legacy-inbox-sync      alle 15 Minuten
  $ZIEL/legacy-inbox-report    täglich

  plesk bin scheduler --update <id> -command $ZIEL/legacy-inbox-sync

In der config muss SKRIPT_DIR auf das Deploy-Verzeichnis zeigen:

  SKRIPT_DIR="$QUELLE"
HINWEIS
