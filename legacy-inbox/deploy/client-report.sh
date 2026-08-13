#!/bin/sh
#
# Tägliche Kontrolle, ob die Meldungen der angebundenen Apps tatsächlich
# angenommen werden.
#
# Anlass: Zwischen dem 31.07. und dem 09.08.2026 sind 187 POSTs des
# Android-Clients (okhttp/3.10.0) an einer erzwungenen HTTPS-Umleitung
# gescheitert — jeder einzelne, elf Tage lang. Aufgefallen ist das erst, als
# jemand aus einem anderen Grund ins Zugriffsprotokoll sah. Der Posteingang
# selbst konnte davon nichts wissen: Die Anfragen haben ihn nie erreicht.
#
# Genau diese Lücke schließt dieses Skript. Es sieht nicht in den Posteingang,
# sondern ins Zugriffsprotokoll — dorthin, wo auch das steht, was nie
# angekommen ist.
#
# Meldet sich nur bei Auffälligkeiten, und zwar per Mail aus dem Skript selbst
# (melde.sh). Nicht über den Plesk-Zeitplan: Dessen Benachrichtigung kommt
# nachweislich nicht an, und eine Überwachung mit stillem Meldeweg ist
# schlimmer als keine.
#
# Ein stiller Lauf heißt: Jede gestern eingegangene Meldung wurde mit 201
# angenommen.
#
# Aufruf ohne Argument prüft den Vortag. Ein Datum im Format TT/Mon/JJJJ
# (z. B. 31/Jul/2026) prüft stattdessen jenen Tag — zum Nachvollziehen.
set -u

VERZEICHNIS=$(dirname "$0")
. "$VERZEICHNIS/config"
. "$VERZEICHNIS/melde.sh"

LOGS=/var/www/vhosts/system/schweinswalsichtung.de/logs

if [ $# -ge 1 ]; then
	TAG="$1"
else
	TAG=$(LC_ALL=C date -d yesterday +%d/%b/%Y)
fi

# Warum die .processed-Dateien und nicht proxy_access_ssl_log: Letztere hält
# nur den laufenden Tag. Die .processed-Fassung reicht Wochen zurück — das ist
# genau der Unterschied, der die elf Tage unentdeckt gelassen hat.
ZEILEN=$(cat "$LOGS/access_ssl_log.processed" "$LOGS/access_log.processed" 2>/dev/null |
	grep "\[$TAG" |
	grep "POST /rest_sichtungen" |
	awk '{
		ua = "sonstige"
		if (match($0, /okhttp\/[0-9.]+/))          ua = substr($0, RSTART, RLENGTH)
		else if (match($0, /OstSeeTiere\/[0-9]+/)) ua = substr($0, RSTART, RLENGTH)
		print ua, $9
	}')

if [ -z "$ZEILEN" ]; then
	# Kein Client hat gemeldet. Das ist an einem ruhigen Tag normal und kein
	# Fehler — eine Meldung dafür wäre das Rauschen, in dem echte Befunde
	# untergehen.
	exit 0
fi

FEHLER=$(echo "$ZEILEN" | awk '$2 != 201' | wc -l | tr -d ' ')

if [ "$FEHLER" -eq 0 ]; then
	exit 0
fi

BERICHT=$(
	echo "Sichtungsmeldungen am $TAG, die NICHT angenommen wurden: $FEHLER"
	echo
	echo "Aufschlüsselung nach Client und Status:"
	echo "$ZEILEN" | sort | uniq -c | sort -rn
	echo
	echo "201 = angenommen. Alles andere hat den Posteingang nicht oder nicht"
	echo "verwertbar erreicht. Ein 301 bedeutet erzwungene HTTPS-Umleitung: Der"
	echo "Client wandelt sein POST beim Folgen in ein GET um und verliert dabei"
	echo "die Meldung. Ein 429 bedeutet Rate-Limit."
	echo
	echo "Protokoll ansehen:"
	echo "  grep '\[$TAG' $LOGS/access_ssl_log.processed | grep rest_sichtungen"
)

echo "$BERICHT"
echo "$BERICHT" | melde "App-Meldungen am $TAG nicht angenommen ($FEHLER)"

exit 1
