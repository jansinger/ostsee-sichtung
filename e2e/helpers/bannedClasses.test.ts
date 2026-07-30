import { describe, expect, it } from 'vitest';
import {
	BELOW_OPACITY_FLOOR,
	findOffenders,
	OPACITY_FLOOR,
	STATUS_AS_FOREGROUND,
	TAILWIND_PALETTE,
	type ScannedElement
} from './bannedClasses';

/**
 * bannedClasses.test.ts — die drei Scan-Regeln an konstruierten Beispielen.
 *
 * **Warum es diesen Test gibt.** Der DOM-Scan in `e2e/design-tokens.spec.ts`
 * kann nur finden, was im Bestand steht. Ist der Bestand sauber, ist er grün —
 * auch dann, wenn die Regel eine Lücke hat. Genau so ist die Deckkraft-Lücke
 * entstanden: `text-success/80` war der einzige Fall im Code, wurde von Hand
 * gefunden und behoben, und der Scan blieb grün, weil er das Suffix nie sehen
 * konnte. Ein Scan über einen konformen Bestand belegt nichts über die Regel.
 *
 * Deshalb steht hier je Regel ein Beispiel, das die Lücke reproduziert, und ein
 * Gegenbeispiel, das nicht anschlagen darf. Wer die Muster später „vereinfacht"
 * und dabei das Deckkraft-Suffix wieder verliert, macht diese Datei rot — nicht
 * erst den nächsten Reviewer.
 *
 * Läuft im Node-Projekt von Vitest (`npm run test:unit`, damit auch in
 * `test:quick`) und braucht keinen Browser: die Regeln sind reine Funktionen
 * über Klassennamen. Gemessen wird die *Farbe* weiter im Browser — das ist die
 * Kontrast-Gruppe in `design-tokens.spec.ts`.
 */

/** Baut ein Element, wie es der Scan aus dem Browser mitbringt. */
const element = (classes: string, hasText = true): ScannedElement => ({
	tag: 'span',
	classes,
	hasText
});

describe('STATUS_AS_FOREGROUND', () => {
	/* Der eigentliche Testfall dieses PR: die Klasse, die der alte Scan nicht
	   sehen konnte. Sie ist keine Erfindung — sie stand in
	   DropzoneEnhanced.svelte auf einem bg-success/10-Tint. */
	it('meldet eine Statusfarbe mit Deckkraft-Suffix', () => {
		expect(findOffenders(STATUS_AS_FOREGROUND, [element('text-success/80 font-mono')])).toEqual([
			'<span> text-success/80 — in class="text-success/80 font-mono"'
		]);
	});

	it('meldet die Statusfarbe auch ohne Suffix', () => {
		expect(STATUS_AS_FOREGROUND.offends('text-warning')).toBe(true);
	});

	/* Die Verankerung ersetzt das `grep -v -- -strong`, an dem die
	   „32 Fundstellen"-Liste in docs/DESIGN_SYSTEM.md gescheitert ist. */
	it.each(['text-warning-strong', 'text-warning-content', 'text-success-strong/80'])(
		'lässt %s durch',
		(className) => {
			expect(STATUS_AS_FOREGROUND.offends(className)).toBe(false);
		}
	);

	/* primary (9,22:1) und error (6,04:1) sind als Textfarbe zulässig. Stünden
	   sie im Muster, wäre die halbe App rot — und die Regel damit erledigt. */
	it.each(['text-primary', 'text-error', 'bg-warning', 'bg-success/10'])(
		'lässt %s durch',
		(className) => {
			expect(STATUS_AS_FOREGROUND.offends(className)).toBe(false);
		}
	);
});

describe('BELOW_OPACITY_FLOOR', () => {
	/* /30 lag im Bestand (admin/statistics, Heatmap) und wäre von der alten
	   Aufzählung (40|50) nie gemeldet worden. Die Schwelle findet jeden Wert
	   darunter, nicht zwei Literale. */
	it.each([10, 25, 30, 40, 50, OPACITY_FLOOR - 1])('meldet /%i auf Text', (opacity) => {
		expect(BELOW_OPACITY_FLOOR.offends(`text-base-content/${opacity}`)).toBe(true);
		expect(BELOW_OPACITY_FLOOR.offends(`opacity-${opacity}`)).toBe(true);
	});

	it.each([OPACITY_FLOOR, 70, 80, 100])('lässt /%i durch', (opacity) => {
		expect(BELOW_OPACITY_FLOOR.offends(`text-base-content/${opacity}`)).toBe(false);
		expect(BELOW_OPACITY_FLOOR.offends(`opacity-${opacity}`)).toBe(false);
	});

	/* Dekoration ist erlaubt — das leere Heatmap-Feld auf text-base-content/30
	   und das Leerzustands-Icon auf opacity-50 sind genau dieser Fall. */
	it('lässt ein Element ohne Textinhalt durch', () => {
		expect(findOffenders(BELOW_OPACITY_FLOOR, [element('text-base-content/30', false)])).toEqual(
			[]
		);
	});

	it('meldet dasselbe Element, sobald es Text trägt', () => {
		expect(findOffenders(BELOW_OPACITY_FLOOR, [element('text-base-content/30', true)])).toEqual([
			'<span> text-base-content/30 — in class="text-base-content/30"'
		]);
	});
});

describe('TAILWIND_PALETTE', () => {
	/* Mit Deckkraft umgeht die Paletten-Farbe das Theme genauso vollständig. */
	it('meldet eine Paletten-Farbe mit Deckkraft-Suffix', () => {
		expect(TAILWIND_PALETTE.offends('bg-red-500/50')).toBe(true);
	});

	it('meldet eine Paletten-Farbe ohne Suffix', () => {
		expect(TAILWIND_PALETTE.offends('text-gray-700')).toBe(true);
	});

	/* base-200 ist ein Theme-Token und darf nicht an der Ziffernregel hängen
	   bleiben; base-content/40 gehört der Regel oben. */
	it.each(['bg-base-200', 'text-base-content/40', 'bg-primary', 'border-base-300'])(
		'lässt %s durch',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(false);
		}
	);
});

describe('findOffenders', () => {
	/* Zwei Verstöße in einer Klassenliste: bei der Vorgänger-Regex mit
	   `(^|\s)…(\s|$)` verschluckte der erste Treffer das trennende Leerzeichen,
	   der zweite war danach nicht mehr auffindbar. */
	it('findet beide Verstöße in einer Klassenliste', () => {
		expect(findOffenders(STATUS_AS_FOREGROUND, [element('text-info/70 p-2 text-accent')])).toEqual([
			'<span> text-info/70 text-accent — in class="text-info/70 p-2 text-accent"'
		]);
	});

	it('kürzt die Fundliste auf das Limit', () => {
		const many = Array.from({ length: 5 }, () => element('text-warning'));
		expect(findOffenders(STATUS_AS_FOREGROUND, many, 2)).toHaveLength(2);
	});

	it('meldet einen konformen Bestand als leer', () => {
		expect(
			findOffenders(STATUS_AS_FOREGROUND, [
				element('text-warning-strong'),
				element('bg-success/10 text-base-content')
			])
		).toEqual([]);
	});
});
