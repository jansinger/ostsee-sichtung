/**
 * Unit Tests für das CA-Bundle der SMTP-Verbindung.
 *
 * Hintergrund (2026-08-19): Der Versand über den Exchange-Online-Connector
 * `meeresmuseum-de.mail.protection.outlook.com` scheiterte im Container
 * reproduzierbar mit `unable to get local issuer certificate`. Microsoft
 * liefert dort eine Kette, die auf **DigiCert Global Root CA** (2006) endet —
 * einen Root, den Node 24 und Alpine nicht mehr mitbringen: Nodes eingebauter
 * Satz führt nur noch G2 und G3, das Alpine-Bundle im Image ebenso wenig.
 *
 * Nodemailer meldet den geplatzten Handshake als `ESOCKET`/`CONN`, was wie ein
 * Netzwerkfehler aussieht — deshalb hier festgehalten, wonach wir sonst wieder
 * Port, DNS und Firewall absuchen.
 */
import { describe, expect, it } from 'vitest';
import { X509Certificate } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { DIGICERT_GLOBAL_ROOT_CA, SMTP_CA_BUNDLE } from './smtpRootCertificates';

/** SHA-256-Fingerabdruck von DigiCert Global Root CA, gültig bis 2031-11-10. */
const EXPECTED_FINGERPRINT =
	'43:48:A0:E9:44:4C:78:CB:26:5E:05:8D:5E:89:44:B4:D8:4F:96:62:BD:26:DB:25:7F:89:34:A4:43:C7:01:61';

describe('SMTP_CA_BUNDLE', () => {
	it('liefert genau den Root, den Microsofts Connector-Kette braucht', () => {
		const cert = new X509Certificate(DIGICERT_GLOBAL_ROOT_CA);

		expect(cert.fingerprint256).toBe(EXPECTED_FINGERPRINT);
		expect(cert.subject).toContain('CN=DigiCert Global Root CA');
	});

	it('ergänzt die eingebauten Roots, statt sie zu ersetzen', () => {
		// `tls.ca` ist keine Erweiterung, sondern eine Ersetzung: Wer hier nur das
		// eine Zertifikat übergibt, kappt das Vertrauen zu jedem anderen Server.
		for (const root of rootCertificates) {
			expect(SMTP_CA_BUNDLE).toContain(root);
		}

		expect(SMTP_CA_BUNDLE).toContain(DIGICERT_GLOBAL_ROOT_CA);
		expect(SMTP_CA_BUNDLE.length).toBe(rootCertificates.length + 1);
	});

	it('enthält den Root nur, solange Node ihn nicht selbst mitbringt', () => {
		// Bringt Node ihn eines Tages wieder mit — oder stellt Microsoft die Kette
		// auf G2 um —, ist diese Datei überflüssig. Der Test schlägt dann fehl und
		// erinnert daran, statt sie stillschweigend liegen zu lassen.
		const bundledSubjects = rootCertificates.map((pem) => new X509Certificate(pem).subject);

		expect(bundledSubjects.some((s) => s.includes('CN=DigiCert Global Root CA'))).toBe(false);
	});
});
