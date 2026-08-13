import { describe, expect, it } from 'vitest';
import { entferneSchutz, schuetzePlatzhalter } from './deeplXml';

/**
 * `tag_handling: 'xml'` lässt DeepL den **ganzen** Quelltext als XML parsen,
 * nicht nur die Stellen, die wir markiert haben. Ein rohes `<`, `>` oder `&`
 * im deutschen Text bricht damit die Anfrage — und zwar den kompletten Stapel
 * von bis zu 50 Segmenten, nicht nur das eine schuldige.
 *
 * Gemessen am Bestand betrifft das zehn Segmente: `Drag & Drop`,
 * `Position & Zeitpunkt`, `Seezeichen & Tonnen` — und die beiden
 * Windstärke-Ränder `(< 1 km/h)` und `(> 117 km/h)`, an denen der Lauf am
 * 2026-08-13 tatsächlich abbrach.
 */
describe('schuetzePlatzhalter', () => {
	it('maskiert XML-Sonderzeichen im Fließtext', () => {
		expect(schuetzePlatzhalter('0 - Windstille (< 1 km/h)')).toBe('0 - Windstille (&lt; 1 km/h)');
		expect(schuetzePlatzhalter('Klicken oder Drag & Drop')).toBe('Klicken oder Drag &amp; Drop');
		expect(schuetzePlatzhalter('12 - Orkan (> 117 km/h)')).toBe('12 - Orkan (&gt; 117 km/h)');
	});

	it('hüllt Platzhalter in ein ignoriertes Tag', () => {
		expect(schuetzePlatzhalter('{count} Sichtungen')).toBe('<x>{count}</x> Sichtungen');
	});

	it('maskiert und hüllt im selben Text, ohne das Tag zu zerstören', () => {
		// Das `<x>` darf NICHT zu `&lt;x&gt;` werden — die Maskierung muss vor
		// dem Einhüllen laufen, sonst schützt sie den Schutz weg.
		expect(schuetzePlatzhalter('{title} per Drag & Drop')).toBe(
			'<x>{title}</x> per Drag &amp; Drop'
		);
	});
});

describe('entferneSchutz', () => {
	it('macht Hülle und Maskierung rückgängig', () => {
		expect(entferneSchutz('<x>{count}</x> sightings')).toBe('{count} sightings');
		expect(entferneSchutz('Click or drag &amp; drop')).toBe('Click or drag & drop');
		expect(entferneSchutz('0 - Calm (&lt; 1 km/h)')).toBe('0 - Calm (< 1 km/h)');
	});

	it('entschlüsselt `&amp;` zuletzt', () => {
		// Sonst würde `&amp;lt;` über den Zwischenschritt `&lt;` zu `<` — ein
		// literales `&lt;` im Text käme als Zeichen zurück statt als Text.
		expect(entferneSchutz('a &amp;lt; b')).toBe('a &lt; b');
	});

	it('ist die Umkehrung von schuetzePlatzhalter', () => {
		for (const quelle of [
			'0 - Windstille (< 1 km/h)',
			'{title} per Drag & Drop oder Klick',
			'Seezeichen & Tonnen (OpenSeaMap)',
			'12 - Orkan (> 117 km/h)',
			'Position & Zeitpunkt',
			'a &lt; b'
		]) {
			expect(entferneSchutz(schuetzePlatzhalter(quelle))).toBe(quelle);
		}
	});
});
