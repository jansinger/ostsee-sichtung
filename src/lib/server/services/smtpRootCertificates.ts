import { rootCertificates } from 'node:tls';

/**
 * DigiCert Global Root CA (2006), gültig bis 2031-11-10.
 *
 * Fingerabdruck (SHA-256):
 * `43:48:A0:E9:44:4C:78:CB:26:5E:05:8D:5E:89:44:B4:D8:4F:96:62:BD:26:DB:25:7F:89:34:A4:43:C7:01:61`
 *
 * Warum das hier liegt: Der Exchange-Online-Connector des Museums
 * (`meeresmuseum-de.mail.protection.outlook.com`) liefert bei STARTTLS eine
 * Kette, die auf genau diesen Root endet — Blatt `mail.protection.outlook.com`
 * über das Zwischenzertifikat `DigiCert SHA2 Secure Server CA`. Node 24 führt
 * in seinem eingebauten Satz nur noch `DigiCert Global Root G2` und `G3`, und
 * das `ca-certificates`-Bundle von Alpine ebenso wenig. Der Handshake scheiterte
 * dadurch im Container mit `unable to get local issuer certificate`, was
 * nodemailer als `ESOCKET`/`CONN` meldet — ein Fehlerbild, das nach Netzwerk
 * aussieht und uns erst Port, DNS und Firewall absuchen ließ.
 *
 * Der Root ist nicht zurückgezogen, sondern im Rahmen von DigiCerts
 * Root-Ablösung aus dem Mozilla-Satz genommen worden, den Node und Alpine
 * übernehmen.
 *
 * **Diese Datei ist auf Widerruf.** Sobald Microsoft die Kette auf G2 umstellt
 * oder der Root 2031 abläuft, gehört sie gelöscht. `smtpRootCertificates.test.ts`
 * schlägt fehl, sobald Node den Root wieder selbst mitbringt.
 */
export const DIGICERT_GLOBAL_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
QTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsB
CSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97
nh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt
43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7P
T19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4
gdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAO
BgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbR
TLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUw
DQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/Esr
hMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg
06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJF
PnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0ls
YSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQk
CAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4=
-----END CERTIFICATE-----
`;

/**
 * Vertrauensanker für die SMTP-Verbindung: Nodes eingebauter Satz **plus** der
 * fehlende Root.
 *
 * Die Ergänzung ist der springende Punkt. `tls.ca` erweitert den Store nicht,
 * sondern ersetzt ihn — wer dort nur `DIGICERT_GLOBAL_ROOT_CA` übergibt, bringt
 * zwar den Connector zum Laufen und kappt gleichzeitig das Vertrauen zu jedem
 * anderen Server, den dieselbe Verbindung ansprechen könnte.
 */
export const SMTP_CA_BUNDLE: string[] = [...rootCertificates, DIGICERT_GLOBAL_ROOT_CA];
