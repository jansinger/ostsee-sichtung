#!/usr/bin/env bash
#
# Erzeugt lokal vertrauenswürdige TLS-Zertifikate für den Dev-Server (https://localhost:4000).
#
# mkcert legt eine eigene CA an und trägt sie in den System-Trust-Store ein. Chrome
# akzeptiert davon ausgestellte Zertifikate ohne Warnung, weil die CT- und Laufzeit-
# Regeln nur für öffentliche CAs gelten, nicht für lokal installierte.
#
# Das Skript ist idempotent und läuft automatisch vor `npm run dev`:
#   - vorhandenes, noch ausreichend lange gültiges Zertifikat  -> nichts tun
#   - mkcert nicht installiert                                 -> Hinweis, Exit 0
#     (Vite fällt dann auf @vitejs/plugin-basic-ssl zurück, Chrome warnt wieder)
#
# Manuell ausführbar über: npm run certs:setup
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

# Namen, für die das Zertifikat gilt — muss zu server.host in vite.config.ts passen
DOMAINS=(localhost 127.0.0.1 ::1 '*.local.dev')

# Neu ausstellen, sobald weniger als 30 Tage Restlaufzeit bleiben
RENEW_BEFORE_SECONDS=$((30 * 24 * 60 * 60))

# In CI gibt es keinen Trust-Store, den wir sinnvoll bespielen könnten —
# dort läuft der Server ohnehin über vite.config.ci.ts ohne HTTPS.
if [ -n "${CI:-}" ]; then
	echo "certs: CI erkannt — überspringe mkcert-Setup"
	exit 0
fi

if ! command -v mkcert >/dev/null 2>&1; then
	cat <<-'EOF'
		certs: mkcert nicht gefunden — der Dev-Server nutzt ein selbstsigniertes
		       Zertifikat, Chrome zeigt deshalb eine Sicherheitswarnung.

		       Einmalig einrichten:
		         brew install mkcert nss
		         npm run certs:setup
	EOF
	exit 0
fi

# Zertifikat vorhanden und lange genug gültig? Dann sind wir fertig.
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ] &&
	openssl x509 -in "$CERT_FILE" -noout -checkend "$RENEW_BEFORE_SECONDS" >/dev/null 2>&1; then
	echo "certs: Zertifikat in certs/ ist gültig"
	exit 0
fi

# Die lokale CA muss im Trust-Store liegen, sonst warnt Chrome trotz mkcert-Zertifikat.
# `mkcert -install` ist idempotent; nur die Erstinstallation fragt nach dem Passwort.
CAROOT="$(mkcert -CAROOT)"
if [ ! -f "$CAROOT/rootCA.pem" ]; then
	if [ ! -t 0 ]; then
		echo "certs: lokale CA fehlt und die Installation braucht eine Eingabeaufforderung."
		echo "       Bitte einmalig 'npm run certs:setup' in einem Terminal ausführen."
		exit 0
	fi
	echo "certs: lege lokale CA an und installiere sie im Trust-Store"
	echo "       (macOS fragt dafür nach deinem Passwort)"
fi
mkcert -install

mkdir -p "$CERT_DIR"
mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" "${DOMAINS[@]}"
chmod 600 "$KEY_FILE"

echo "certs: Zertifikat für ${DOMAINS[*]} in certs/ erstellt"
