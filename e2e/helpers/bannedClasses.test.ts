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

	/* `fill-` und `stroke-` (seit 2026-07-30). design-system.md verlangt das
	   `-strong` ausdrücklich hinter allen drei Präfixen; im Muster stand nur
	   `text-`. Die Lücke war als solche notiert, mit der Begründung „im Bestand
	   gibt es derzeit keine solche Fundstelle" — genau das Argument, das dieselbe
	   Datei bei PALETTE_HUES verwirft: Eine Regel, die nur kennt, was schon
	   jemand benutzt hat, meldet die erste neue Fundstelle nicht.

	   Erreichbar ist der Fall sehr wohl: `Icon.svelte` rendert `<svg class="…">`,
	   und der Scan liest `class` per `getAttribute` — ein `fill-warning` an einem
	   Icon landet also im gescannten Bestand. Ein SVG, das seine Fläche über
	   `fill-` bezieht, hat dasselbe Kontrastproblem wie ein Zeichen über `text-`;
	   `fill-warning` misst dieselben 2,74:1 und verfehlt damit auch die 3:1 aus
	   WCAG 1.4.11 für grafische Objekte. */
	it.each([
		'fill-warning',
		'stroke-warning',
		'fill-info',
		'stroke-success',
		'fill-secondary/80',
		'stroke-accent/70'
	])('meldet %s', (className) => {
		expect(STATUS_AS_FOREGROUND.offends(className)).toBe(true);
	});

	it('meldet fill- an einem Icon-SVG mit der konkreten Klasse', () => {
		expect(
			findOffenders(STATUS_AS_FOREGROUND, [
				{ tag: 'svg', classes: 'fill-warning h-5 w-5', hasText: false }
			])
		).toEqual(['<svg> fill-warning — in class="fill-warning h-5 w-5"']);
	});

	/* Der Ersatz und die zulässigen Farben müssen hinter allen drei Präfixen
	   durchkommen, sonst ist die Regel unerfüllbar. `stroke-current` ist eine
	   echte Aufrufstelle im Bestand (zwei Fundstellen) und trägt gar keinen
	   Farbnamen — die Verankerung hält sie draußen. */
	it.each([
		'fill-warning-strong',
		'stroke-warning-strong',
		'fill-success-strong/80',
		'fill-primary',
		'stroke-error',
		'stroke-current',
		'fill-base-content',
		'fill-none'
	])('lässt %s durch', (className) => {
		expect(STATUS_AS_FOREGROUND.offends(className)).toBe(false);
	});
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

	/* Die zweite strukturelle Lücke derselben Regel, gefunden beim Schließen der
	   Deckkraft-Lücke: `white` und `black` tragen keine Farbstufe, das `-\d{2,3}`
	   im Muster konnte sie deshalb nie treffen. Sie umgehen das Theme aber
	   genauso vollständig wie `bg-gray-100` — im Bestand standen 27 solche
	   Fundstellen, darunter ein `bg-black/20` über `bg-base-200`, auf dem ein
	   weißes Icon 2,27:1 erreichte.

	   Deckkraft gehört ausdrücklich dazu: Ein Schleier ist der häufigste Fall,
	   und genau er hat die Lücke jahrelang plausibel aussehen lassen. Die
	   Antwort darauf ist `bg-scrim/<n>` (--scrim-surface in tokens.css), nicht
	   eine Ausnahme in dieser Regel. */
	it.each(['bg-white', 'text-white', 'bg-black', 'text-black', 'border-white'])(
		'meldet %s',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(true);
		}
	);

	it.each(['bg-black/50', 'bg-white/95', 'text-white/70', 'bg-black/5'])(
		'meldet %s mit Deckkraft-Suffix',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(true);
		}
	);

	/* Der Ersatz muss durchkommen, sonst ist die Regel unerfüllbar. */
	it.each(['bg-scrim', 'bg-scrim/40', 'text-on-scrim', 'bg-neutral', 'text-neutral-content'])(
		'lässt %s durch',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(false);
		}
	);

	/* Die Aufzählung war auf die Töne beschränkt, die im Bestand vorkamen — zwölf
	   von 22. Ein `bg-teal-500` wäre also durchgerutscht, ohne dass an der Regel
	   etwas „kaputt" gewesen wäre. */
	it.each([
		'bg-stone-100',
		'text-lime-600',
		'bg-teal-500/40',
		'text-cyan-700',
		'bg-violet-400',
		'text-purple-900',
		'bg-fuchsia-300',
		'text-pink-500',
		'bg-rose-600',
		'bg-neutral-500'
	])('meldet %s', (className) => {
		expect(TAILWIND_PALETTE.offends(className)).toBe(true);
	});

	/* `neutral` steht als Paletten-Ton in der Liste UND ist ein Theme-Token. Die
	   Farbstufe im Muster trennt beide — sonst hätte das Schließen der einen
	   Lücke die Ersatz-Klasse aus dem Auth0-Panel verboten. */
	it.each(['bg-neutral', 'text-neutral-content', 'bg-neutral/50'])(
		'lässt das Theme-Token %s durch',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(false);
		}
	);

	/* Verankerung: `white`/`black` dürfen nicht als Teilwort anschlagen —
	   `bg-whitesmoke` gibt es in Tailwind nicht, aber eine eigene Utility mit
	   dem Präfix wäre kein Verstoß. */
	it.each(['bg-whitesmoke', 'text-blackboard'])('lässt %s durch', (className) => {
		expect(TAILWIND_PALETTE.offends(className)).toBe(false);
	});

	/* base-200 ist ein Theme-Token und darf nicht an der Ziffernregel hängen
	   bleiben; base-content/40 gehört der Regel oben. */
	it.each(['bg-base-200', 'text-base-content/40', 'bg-primary', 'border-base-300'])(
		'lässt %s durch',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(false);
		}
	);

	/* Die dritte strukturelle Lücke derselben Regel — und wieder eine in der
	   Grammatik, nicht in den Daten: Das Muster kannte die Präfixe `bg`, `text`
	   und `border`. Ein Verlauf trägt seine Farben aber an `from-`, `via-` und
	   `to-`, und `from-green-50` umgeht das Theme exakt so vollständig wie
	   `bg-green-50` — es ist dieselbe Farbe an derselben Fläche, nur über eine
	   andere Utility gesetzt.

	   Der Fall ist nicht hypothetisch: `src/routes/about/+page.svelte` trug zwei
	   solche Verläufe (`from-green-50 to-emerald-50` und
	   `from-purple-50 to-indigo-50`), und `/about` steht seit jeher in der
	   Scanliste von `design-tokens.spec.ts`. Die Route war also abgedeckt, der
	   Scan lief grün, und die Fundstellen standen trotzdem im DOM. */
	it.each([
		'from-green-50',
		'via-sky-200',
		'to-emerald-50',
		'from-purple-50',
		'to-indigo-50',
		'from-gray-900/80'
	])('meldet den Gradient-Stop %s', (className) => {
		expect(TAILWIND_PALETTE.offends(className)).toBe(true);
	});

	/* `white`/`black` gelten an Gradient-Stops aus demselben Grund wie oben. */
	it.each(['from-white', 'to-black/40', 'via-black'])(
		'meldet den Gradient-Stop %s',
		(className) => {
			expect(TAILWIND_PALETTE.offends(className)).toBe(true);
		}
	);

	/* Die Gegenprobe trägt hier mehr Gewicht als sonst: Verläufe aus
	   Theme-Tokens sind im Bestand die Regel, nicht die Ausnahme (Mission-Card
	   und CTA auf /about, beide mit `from-primary/5 via-secondary/5
	   to-accent/5`). Eine Regel, die diese mitnimmt, wäre unerfüllbar und würde
	   beim ersten roten Lauf aufgeweicht statt befolgt. */
	it.each([
		'from-primary/5',
		'via-secondary/5',
		'to-accent/5',
		'from-base-100',
		'to-base-200',
		'via-scrim/40'
	])('lässt den Theme-Gradient-Stop %s durch', (className) => {
		expect(TAILWIND_PALETTE.offends(className)).toBe(false);
	});

	/* Verankerung: Die neuen Präfixe dürfen nicht als Teilwort greifen.
	   `to-` steckt in `photo-`, `from-` in Wörtern wie `fromage` — beides keine
	   Tailwind-Utilities, aber der Beleg dafür, dass das Muster am Wortanfang
	   verankert bleibt und nicht irgendwo in der Klasse sucht. */
	it.each(['photo-red-500', 'chromatic-white', 'shadow-raised'])('lässt %s durch', (className) => {
		expect(TAILWIND_PALETTE.offends(className)).toBe(false);
	});
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
