#!/bin/sh
#
# Gemeinsamer Melde-Baustein für die Zeitpläne des Legacy-Posteingangs.
# Wird per `.` eingebunden, nicht ausgeführt.
#
# Warum der Versand hier steht und nicht bei Plesk: Die Benachrichtigung des
# Plesk-Zeitplans (`-notify errors`) kommt nachweislich nicht an. Am
# 2026-08-12 scheiterten die planmäßigen Sync-Läufe mehrfach am Rate-Limit,
# und eine eigens angelegte Test-Aufgabe endete mit Exit 1 — in beiden Fällen
# entstand keine Mail, obwohl die Zustellung an die Adresse laut Mail-Log
# funktioniert. Eine Überwachung, deren Meldeweg im Stillen versagt, ist
# schlimmer als keine: Sie erzeugt das Gefühl, informiert zu werden.
#
# KEINE eigene From-Kopfzeile. Der erste Entwurf setzte
# `noreply@schweinswalsichtung.de`, und der Plesk-Wrapper
# (/usr/lib/plesk-9.0/postfix-sendmail-wrapper) verwarf die Mail daraufhin
# **stillschweigend**: Exit 0, kein Eintrag im Mail-Log, nichts zugestellt.
# Für diese Domain gibt es keinen Mail-Dienst, also auch kein Postfach, aus
# dem heraus verschickt werden dürfte. Ohne eigene From-Zeile setzt der
# Wrapper den ausführenden Benutzer ein (root@hawking.singer-tc.de) und
# stellt zu — am 2026-08-13 gegen beide Varianten gemessen.
#
# Das ist dieselbe Falle wie beim Plesk-Zeitplan, nur eine Ebene tiefer:
# ein Versand, der Erfolg meldet und nichts tut.

# Verschickt eine Meldung. Betreff als Argument, Text über die Standardeingabe.
# Ohne konfigurierte Adresse passiert nichts (und das ist kein Fehler: Wer den
# Versand nicht will, leert MELDE_AN in der config).
melde() {
	if [ -z "${MELDE_AN:-}" ]; then
		return 0
	fi

	{
		echo "To: $MELDE_AN"
		echo "Subject: $1"
		echo "Content-Type: text/plain; charset=UTF-8"
		echo
		cat
	} | /usr/sbin/sendmail -t
}
