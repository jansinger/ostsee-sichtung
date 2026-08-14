#!/bin/sh
#
# Zustandsbericht des Legacy-Posteingangs. Nur lesend — verändert nichts,
# verschickt nichts, kann jederzeit gefahrlos laufen.
#
#   sudo /usr/local/sbin/legacy-inbox-status        letzte 7 Tage
#   sudo /usr/local/sbin/legacy-inbox-status 30     letzte 30 Tage
#
# Warum ein eigenes Skript und nicht "mal eben nachsehen": Die Antwort auf
# "läuft alles?" steckt an fünf verschiedenen Stellen — im Posteingang, im
# Zugriffsprotokoll, in den Zeitplänen, in den Dateirechten und in den
# Endpunkten. Die einzelnen Handgriffe hat diese Anlage schon zweimal
# überfordert: Ein elf Tage währender Totalausfall des Android-Clients fiel
# niemandem auf, und zwei Überwachungen meldeten monatelang nichts, weil ihr
# Meldeweg still versagte.
#
# Die wichtigste Zeile ist deshalb die letzte: ein Urteil, kein Datenhaufen.
set -u

TAGE="${1:-7}"
LOGS=/var/www/vhosts/system/schweinswalsichtung.de/logs
KONFIG="${LEGACY_SYNC_CONFIG:-/var/www/vhosts/schweinswalsichtung.de/legacy-sync/config}"
BEFUNDE=0

if [ ! -r "$KONFIG" ]; then
	echo "Konfiguration nicht lesbar: $KONFIG"
	exit 1
fi

. "$KONFIG"

echo "Legacy-Posteingang — Zustand am $(date '+%d.%m.%Y %H:%M')"
echo "================================================================"

# ---------------------------------------------------------------- Posteingang
echo
echo "POSTEINGANG"
OFFEN=$(ls -1 "$DATEN_DIR/posteingang" 2>/dev/null | wc -l | tr -d ' ')
FERTIG=$(ls -1 "$DATEN_DIR/importiert" 2>/dev/null | wc -l | tr -d ' ')
ABGEWIESEN=$(ls -1 "$DATEN_DIR/abgewiesen" 2>/dev/null | wc -l | tr -d ' ')
echo "  offen: $OFFEN   übertragen: $FERTIG   abgewiesen: $ABGEWIESEN"

# Offene Dateien sind normal, solange sie jung sind — die Zielinstanz nimmt
# 20 Meldungen pro Stunde. Alt heißt: Der Sync kommt nicht mehr hinterher oder
# läuft nicht.
if [ "$OFFEN" -gt 0 ]; then
	ALT=$(find "$DATEN_DIR/posteingang" -name '*.json' -mmin +180 2>/dev/null | wc -l | tr -d ' ')
	if [ "$ALT" -gt 0 ]; then
		echo "  BEFUND: $ALT Datei(en) liegen länger als 3 Stunden — läuft der Sync?"
		BEFUNDE=$((BEFUNDE + 1))
	else
		echo "  (in Übertragung, Rate-Limit der Zielinstanz: 20/Stunde)"
	fi
fi

if [ "$ABGEWIESEN" -gt 0 ]; then
	echo "  BEFUND: $ABGEWIESEN abgewiesene Meldung(en) — brauchen einen Menschen"
	BEFUNDE=$((BEFUNDE + 1))
fi

# ------------------------------------------------------------------- Meldungen
echo
echo "MELDUNGEN DER LETZTEN $TAGE TAGE (POST /rest_sichtungen)"
i=0
GESAMT_FEHL=0
while [ "$i" -lt "$TAGE" ]; do
	TAG=$(LC_ALL=C date -d "-$i day" +%d/%b/%Y)
	ZEILEN=$(cat "$LOGS/access_ssl_log.processed" "$LOGS/access_log.processed" 2>/dev/null |
		grep "\[$TAG" | grep "POST /rest_sichtungen" |
		awk '{
			ua = "sonstige"
			if (match($0, /okhttp\/[0-9.]+/))          ua = substr($0, RSTART, RLENGTH)
			else if (match($0, /OstSeeTiere\/[0-9]+/)) ua = substr($0, RSTART, RLENGTH)
			print ua, $9
		}')

	if [ -n "$ZEILEN" ]; then
		OK=$(echo "$ZEILEN" | awk '$2 == 201' | wc -l | tr -d ' ')
		FEHL=$(echo "$ZEILEN" | awk '$2 != 201' | wc -l | tr -d ' ')
		GESAMT_FEHL=$((GESAMT_FEHL + FEHL))
		CLIENTS=$(echo "$ZEILEN" | awk '{print $1}' | sort -u | tr '\n' ' ')
		if [ "$FEHL" -gt 0 ]; then
			echo "  $TAG  $OK angenommen, $FEHL NICHT angenommen   [$CLIENTS]"
			echo "$ZEILEN" | awk '$2 != 201' | sort | uniq -c | sed 's/^/      /'
		else
			echo "  $TAG  $OK angenommen   [$CLIENTS]"
		fi
	fi
	i=$((i + 1))
done

if [ "$GESAMT_FEHL" -gt 0 ]; then
	echo "  BEFUND: $GESAMT_FEHL Meldung(en) haben den Posteingang nicht erreicht"
	BEFUNDE=$((BEFUNDE + 1))
fi

# ------------------------------------------------------------------ Zeitpläne
echo
echo "ZEITPLÄNE"
for id in 3090 3097; do
	Z=$(plesk bin scheduler --list -user root 2>/dev/null | grep -A6 "ID: *$id\$" | grep -E "Active|Command" | tr -s ' ' | tr '\n' ' ')
	[ -n "$Z" ] && echo "  $id: $Z"
done

# ------------------------------------------------------------------- Rechte
echo
echo "RECHTE (root darf nichts einbinden, was der Dienst schreiben kann)"
for f in /usr/local/sbin/legacy-inbox-sync /usr/local/sbin/legacy-inbox-report \
	/usr/local/sbin/legacy-inbox-melde "$KONFIG"; do
	if [ ! -e "$f" ]; then
		echo "  FEHLT: $f"
		BEFUNDE=$((BEFUNDE + 1))
		continue
	fi
	EIG=$(stat -c '%U' "$f")
	echo "  $(stat -c '%A %U:%G' "$f")  $f"
	if [ "$EIG" != "root" ]; then
		echo "    BEFUND: gehört $EIG statt root — nach einem Deploy install.sh laufen lassen"
		BEFUNDE=$((BEFUNDE + 1))
	fi
done

# ----------------------------------------------------------------- Endpunkte
echo
echo "ENDPUNKTE"
for pfad in /health /rest_sichtungen /rest_sichtungen/antworten.json /deploy/sync.sh; do
	CODE=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "https://schweinswalsichtung.de$pfad" 2>/dev/null)
	case "$pfad" in
	/deploy/*) ERWARTET=403 ;;
	*) ERWARTET=200 ;;
	esac
	if [ "$CODE" = "$ERWARTET" ]; then
		echo "  $pfad → $CODE"
	else
		echo "  $pfad → $CODE (erwartet $ERWARTET)   BEFUND"
		BEFUNDE=$((BEFUNDE + 1))
	fi
	sleep 1
done

# -------------------------------------------------------------------- Urteil
echo
echo "================================================================"
if [ "$BEFUNDE" -eq 0 ]; then
	echo "Keine Auffälligkeiten."
	exit 0
fi

echo "$BEFUNDE Befund(e) — siehe oben."
exit 1
