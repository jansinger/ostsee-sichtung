import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Wächter für die zwei Standard-Dateien, die als statische Datei ausgeliefert
 * werden statt aus einer Route zu kommen: `security.txt` und `manifest.json`.
 *
 * `security.txt` braucht den Wächter am dringendsten. RFC 9116 verlangt ein
 * `Expires`-Feld, und eine abgelaufene Datei ist schlechter als gar keine: Sie
 * signalisiert einem Meldenden, dass der Kontakt nicht mehr gilt. Ein Ablauf
 * fällt niemandem im Betrieb auf — hier bricht er stattdessen das Test-Gate,
 * und zwar mit Vorlauf (siehe VORWARNUNG_TAGE), nicht erst am Stichtag.
 */
const wurzel = process.cwd();
const lies = (pfad: string) => readFileSync(join(wurzel, 'static', pfad), 'utf-8');

describe('/.well-known/security.txt (RFC 9116)', () => {
	const txt = lies('.well-known/security.txt');
	const feld = (name: string) =>
		[...txt.matchAll(new RegExp(`^${name}: (.+)$`, 'gm'))].map((m) => (m[1] ?? '').trim());

	it('nennt mindestens einen Kontakt', () => {
		const kontakte = feld('Contact');
		expect(kontakte.length).toBeGreaterThan(0);
		// RFC 9116 §2.5.3: Contact ist eine URI — `mailto:`, `https:` oder `tel:`.
		for (const kontakt of kontakte) {
			expect(kontakt).toMatch(/^(mailto:|https:\/\/|tel:)/);
		}
	});

	it('trägt ein gültiges, nicht abgelaufenes Expires im ISO-8601-Format', () => {
		const werte = feld('Expires');
		expect(werte).toHaveLength(1); // RFC 9116: genau einmal
		const ablauf = new Date(werte[0] ?? '');
		expect(Number.isNaN(ablauf.getTime())).toBe(false);
		expect(ablauf.getTime()).toBeGreaterThan(Date.now());
	});

	it('läuft nicht innerhalb der nächsten 60 Tage ab', () => {
		const VORWARNUNG_TAGE = 60;
		const ablauf = new Date(feld('Expires')[0] ?? '');
		const restTage = (ablauf.getTime() - Date.now()) / 86_400_000;
		expect(
			restTage,
			`security.txt läuft in ${Math.floor(restTage)} Tagen ab. ` +
				'Kontakt prüfen und Expires um ein Jahr weiterstellen.'
		).toBeGreaterThan(VORWARNUNG_TAGE);
	});

	it('verweist auf die ausführliche Fassung im Repository', () => {
		expect(feld('Policy').length).toBeGreaterThan(0);
	});
});

describe('manifest.json', () => {
	const manifest = JSON.parse(lies('manifest.json'));

	it('trägt die Pflichtfelder für einen installierbaren Web-App-Eintrag', () => {
		for (const feld of ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
			expect(manifest, `manifest.json: ${feld} fehlt`).toHaveProperty(feld);
		}
	});

	it('nennt die Sprache — sonst rät der Browser sie für name/description', () => {
		expect(manifest.lang).toBe('de');
		expect(manifest.dir).toBe('ltr');
	});

	it('nutzt die Markenfarben aus tokens.css, nicht die Vorgabe eines Generators', () => {
		// --brand-sea-600 (#004062) ist laut tokens.css die kanonische Markenfarbe,
		// --brand-mist-100 (#e6ecf2) der Seitenhintergrund. Das vorherige Paar
		// (#0ea5e9 auf #ffffff) gehörte zu keinem der beiden.
		expect(manifest.theme_color).toBe('#004062');
		expect(manifest.background_color).toBe('#e6ecf2');
	});

	it('schreibt keine Ausrichtung vor', () => {
		// JSON trägt keine Kommentare, deshalb steht die Begründung hier:
		// `orientation` legt die Standardausrichtung für alle Top-Level-Kontexte
		// fest und sperrt die installierte App auf diese Lage. Bei einer Anwendung,
		// deren Kernansicht eine Karte ist, wäre das Querformat damit unerreichbar.
		// Ohne das Feld gilt `any` — die Lage folgt dem Gerät.
		expect(manifest.orientation).toBeUndefined();
	});

	it('deklariert den Verwendungszweck jedes Icons ausdrücklich', () => {
		// Ohne `purpose` gilt `any` — das ist hier auch richtig. Ausdrücklich
		// hingeschrieben, damit niemand ein vorhandenes Icon nachträglich als
		// `maskable` markiert: Android beschneidet maskable-Icons auf einen Kreis,
		// und keines dieser Icons hat die dafür nötige Schutzzone.
		expect(manifest.icons.length).toBeGreaterThan(0);
		for (const icon of manifest.icons) {
			expect(icon.purpose).toBe('any');
		}
	});
});
