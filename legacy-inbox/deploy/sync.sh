#!/bin/sh
#
# Schickt den Legacy-Posteingang an die konfigurierte Instanz und verschiebt
# jede angenommene Datei nach importiert/. Gedacht für einen Zeitplan alle
# 15 Minuten.
#
# Das Werkzeug selbst liegt im deployten Repo; ein `plesk ext git --deploy`
# zieht es mit.
#
# Dieser Wrapper beantwortet eine einzige Frage: Muss ein Mensch hinsehen?
#
#   nichts zu tun            → still
#   alles übertragen         → kurze Ausgabe, keine Meldung
#   Rate-Limit erreicht      → kurze Ausgabe, keine Meldung  ← siehe unten
#   alles andere             → Ausgabe UND Mail, Exit ≠ 0
#
# Warum das Rate-Limit keine Meldung wert ist: Die Zielinstanz nimmt 20
# Meldungen pro Stunde und IP an. Ein Rückstand — etwa am 2026-08-12, als ein
# Nutzer 111 Sichtungen aus sechs Jahren nachtrug — verteilt sich deshalb über
# Stunden, und jeder Lauf dazwischen endet am Limit. Das ist der vorgesehene
# Ablauf und heilt sich beim nächsten Lauf von selbst; bei vier Läufen je
# Stunde wären es vier Meldungen für einen Zustand, der in Ordnung ist.
#
# Anders als `netzwerk` (unklar, ob die Sichtung angelegt wurde) und
# `verschieben` (Sichtung angelegt, Datei liegt noch im Posteingang) braucht
# hier niemand einzugreifen. Die Ausnahme gilt nur, wenn sonst nichts auffiel:
# Kam zusätzlich eine Ablehnung vor, bleibt es bei Mail und Exit ≠ 0.
#
# Der Versand läuft über melde.sh und nicht über den Plesk-Zeitplan — dessen
# Benachrichtigung kommt nachweislich nicht an (Begründung dort).
set -u

VERZEICHNIS=$(dirname "$0")
. "$VERZEICHNIS/config"
. "$VERZEICHNIS/melde.sh"

CLI="$REPO_TOOLS/send-legacy-inbox-cli.js"

if [ ! -f "$CLI" ]; then
	# Lieber laut scheitern als still nichts tun: Fehlt das Skript, ist der
	# Deploy kaputt oder verschoben — und ein Sync, der bloß schweigt, sähe
	# von außen wie ein ruhiger Tag aus.
	TEXT="Das Sync-Skript wurde nicht gefunden: $CLI

Der Posteingang wird derzeit NICHT nach Produktion übertragen.
Ist der Git-Deploy des Repos durchgelaufen? (plesk ext git --deploy)"
	echo "$TEXT"
	echo "$TEXT" | melde "Posteingang-Sync: Skript fehlt"
	exit 1
fi

AUSGABE=$("$NODE" "$CLI" "$ZIEL_URL" "--dir=$DATEN_DIR" 2>&1)
CODE=$?

if [ "$CODE" -ne 0 ]; then
	# Rate-Limit ohne begleitende Ablehnung: erwarteter Zwischenstand.
	case "$AUSGABE" in
	*"Rate-Limit erreicht"*)
		case "$AUSGABE" in
		*", 0 abgelehnt."*)
			echo "$AUSGABE" | grep "übernommen und nach importiert"
			echo "Rate-Limit der Zielinstanz erreicht — der Rest folgt beim nächsten Lauf."
			exit 0
			;;
		esac
		;;
	esac

	echo "$AUSGABE"
	printf '%s\n\n%s\n' "$AUSGABE" "Offen im Posteingang: $(ls -1 "$DATEN_DIR/posteingang" 2>/dev/null | wc -l | tr -d ' ') Datei(en)." |
		melde "Posteingang-Sync fehlgeschlagen"
	exit "$CODE"
fi

# Erfolgreicher Lauf ohne Übertragung: der Normalfall zwischen zwei Meldungen.
case "$AUSGABE" in
*"0/0 übernommen"*) exit 0 ;;
esac

echo "$AUSGABE"
