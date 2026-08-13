#!/bin/sh
#
# Einstieg für den serverweiten Plesk-Zeitplan. Gibt sofort die Rechte an den
# Domain-Benutzer ab und ruft dann sync.sh.
#
# Warum dieser Umweg? Ein Zeitplan auf Abonnement-Ebene wäre der kürzere Weg,
# scheitert hier aber: Plesk führt solche Tasks in einer chroot-Umgebung aus,
# und der Domain-Benutzer steht nicht in deren passwd — die Shell des
# Abonnements ist /bin/false, SSH-Login also bewusst gesperrt. Das zu ändern,
# nur damit ein Zeitplan läuft, hieße SSH-Zugang zu öffnen; der Preis steht in
# keinem Verhältnis.
#
# `runuser -u … --` startet das Kommando direkt, ohne Login-Shell. Die
# gesperrte /bin/false stört deshalb nicht.
set -eu

exec /usr/sbin/runuser -u schweinswalsichtung._s2vpvkhkarg -- \
	/var/www/vhosts/schweinswalsichtung.de/legacy-sync/sync.sh
