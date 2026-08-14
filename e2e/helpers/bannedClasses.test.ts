import { describe, expect, it } from 'vitest';
import {
	BELOW_OPACITY_FLOOR,
	findOffenders,
	OPACITY_FLOOR,
	RAW_ELEVATION,
	RAW_MOTION_DURATION,
	RAW_Z_INDEX,
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

describe('RAW_ELEVATION', () => {
	it.each(['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner'])(
		'meldet %s',
		(className) => {
			expect(RAW_ELEVATION.offends(className)).toBe(true);
		}
	);

	/* Das nackte `shadow` ist Tailwinds Alias für `shadow-md` und mit 29
	   Fundstellen die zweithäufigste Form im Bestand. Eine Regel, die nur die
	   benannten Stufen aufzählt, ließe ausgerechnet die unauffälligste durch —
	   dieselbe Grammatik-Lücke wie `white`/`black` bei TAILWIND_PALETTE. */
	it('meldet das nackte shadow', () => {
		expect(RAW_ELEVATION.offends('shadow')).toBe(true);
	});

	/* Der Ersatz muss durchkommen, sonst ist die Regel unerfüllbar. Beide
	   existieren als echte Utilities (@theme-Block in app.css). */
	it.each(['shadow-raised', 'shadow-floating'])('lässt %s durch', (className) => {
		expect(RAW_ELEVATION.offends(className)).toBe(false);
	});

	/* `shadow-none` nimmt einen Schatten zurück und wählt keine Stufe; ein
	   farbiger Schatten stellt eine andere Frage als die Elevation-Stufe. */
	it.each(['shadow-none', 'shadow-primary'])('lässt %s durch', (className) => {
		expect(RAW_ELEVATION.offends(className)).toBe(false);
	});

	/* Verankerung: kein Teilwort-Treffer. */
	it.each(['drop-shadow-sm', 'shadowbox', 'text-shadow-sm'])('lässt %s durch', (className) => {
		expect(RAW_ELEVATION.offends(className)).toBe(false);
	});
});

describe('RAW_Z_INDEX', () => {
	it.each(['z-10', 'z-30', 'z-50', 'z-[1]', 'z-[100]', '-z-10'])('meldet %s', (className) => {
		expect(RAW_Z_INDEX.offends(className)).toBe(true);
	});

	/* Die beiden Formen stehen ausdrücklich zusammen im Muster: `z-[1]` an den
	   Admin-Dropdowns und `z-50` an Navbar und Panel-Toggle sind derselbe
	   Verstoß, und ein Muster für nur eine der beiden erzeugte wieder Deckung,
	   die es nicht gibt. */
	it('meldet die Stufen- und die Arbitrary-Form gleichermaßen', () => {
		expect(RAW_Z_INDEX.offends('z-50')).toBe(RAW_Z_INDEX.offends('z-[50]'));
	});

	/* `z-auto` ist keine Stufenwahl, `z-panel` der vorgesehene Ersatz. */
	it.each(['z-auto', 'z-panel'])('lässt %s durch', (className) => {
		expect(RAW_Z_INDEX.offends(className)).toBe(false);
	});

	/* Der Hinweis muss die Stufen beim Namen nennen, unter dem sie im Markup
	   stehen. Bis der Bestand umgestellt war, gab es diese Utilities nicht und
	   der Hinweis zeigte auf `var(--layer-panel)`; seit sie als `@utility` in
	   app.css stehen, wäre das der Umweg. Die Zuständigkeiten stehen mit dabei,
	   weil die Stufe danach gewählt wird und nicht nach der Zahl, die vorher am
	   Element stand. */
	it('nennt die Layer-Utilities als Ersatz', () => {
		for (const utility of ['z-raised', 'z-panel', 'z-nav', 'z-overlay', 'z-skip']) {
			expect(RAW_Z_INDEX.hint).toContain(utility);
		}
	});

	it.each(['size-10', 'gz-10'])('lässt %s durch', (className) => {
		expect(RAW_Z_INDEX.offends(className)).toBe(false);
	});
});

describe('RAW_MOTION_DURATION', () => {
	it.each(['duration-300', 'duration-200', 'duration-[450ms]'])('meldet %s', (className) => {
		expect(RAW_MOTION_DURATION.offends(className)).toBe(true);
	});

	/* Wie beim Z-Index: die Stufen unter dem Namen, unter dem sie im Markup
	   stehen. Die Dauer gehört mit in den Hinweis — ohne sie ist „quick oder
	   panic?" an der Aufrufstelle nicht entscheidbar. */
	it('nennt die Motion-Utilities samt Dauer als Ersatz', () => {
		for (const utility of [
			'duration-instant',
			'duration-quick',
			'duration-panel',
			'duration-emphasis'
		]) {
			expect(RAW_MOTION_DURATION.hint).toContain(utility);
		}
		expect(RAW_MOTION_DURATION.hint).toContain('200ms');
	});

	it.each(['duration-quick', 'transition-all', 'delay-300'])('lässt %s durch', (className) => {
		expect(RAW_MOTION_DURATION.offends(className)).toBe(false);
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

/**
 * Varianten-Präfixe (`hover:`, `md:`, `group-hover:`, …).
 *
 * **Die Lücke, die diese Gruppe schließt.** Der Scan liest den Ruhezustand —
 * das stand in `design-system.md` und `docs/DESIGN_SYSTEM.md` als bekannte
 * Grenze („Was die Regeln nicht sehen: `hover:`-Varianten"). Für die *gemessene*
 * Farbe stimmt das weiterhin: `getComputedStyle` liefert ohne Zeiger auf dem
 * Element den Ruhewert. Für die **Klassenliste** stimmt es nicht — sie steht
 * vollständig im `class`-Attribut, `hover:text-warning` inklusive. Die Regeln
 * haben sie nur nicht gefunden, weil ihre Muster verankert sind und ein
 * Varianten-Präfix vorne nicht vorgesehen war.
 *
 * Es ist damit dieselbe Fehlerklasse, die diese Datei dreimal beschreibt: Die
 * Lücke saß in der Grammatik, nicht in den Daten — und sie war zusätzlich als
 * unvermeidbar dokumentiert, was sie am längsten am Leben gehalten hat. Ein
 * `hover:text-warning` trägt genau dieselben 2,74:1 wie `text-warning`, nur eben
 * unter dem Zeiger.
 *
 * Die Beispiele hier sind bewusst **konstruiert**: Im Bestand steht keine
 * einzige solche Klasse (nachgezählt am 2026-08-14), der DOM-Scan könnte die
 * Regel also nicht scharf stellen.
 */
describe('Varianten-Präfixe', () => {
	it.each([
		['hover:text-warning', STATUS_AS_FOREGROUND],
		['focus-visible:fill-success', STATUS_AS_FOREGROUND],
		['group-hover:stroke-accent/70', STATUS_AS_FOREGROUND],
		['md:hover:text-info', STATUS_AS_FOREGROUND],
		['hover:bg-red-500', TAILWIND_PALETTE],
		['hover:text-white', TAILWIND_PALETTE],
		['hover:shadow-lg', RAW_ELEVATION],
		['focus:z-50', RAW_Z_INDEX],
		['hover:duration-300', RAW_MOTION_DURATION]
	])('meldet %s', (className, rule) => {
		expect(findOffenders(rule, [element(className)])).toHaveLength(1);
	});

	it('meldet die Deckkraft-Untergrenze auch unter einer Variante', () => {
		expect(findOffenders(BELOW_OPACITY_FLOOR, [element('hover:opacity-40')])).toHaveLength(1);
	});

	it('nennt in der Meldung die Klasse, wie sie im Markup steht', () => {
		expect(findOffenders(STATUS_AS_FOREGROUND, [element('p-2 hover:text-warning')])).toEqual([
			'<span> hover:text-warning — in class="p-2 hover:text-warning"'
		]);
	});

	/* Die konformen Varianten des Bestands — sie dürfen nicht mitgerissen
	   werden. `hover:shadow-floating` steht achtmal im Code, `hover:bg-info/80`
	   und `focus:z-skip` je einmal. */
	it.each([
		['hover:shadow-floating', RAW_ELEVATION],
		['hover:bg-info/80', STATUS_AS_FOREGROUND],
		['hover:bg-base-200', TAILWIND_PALETTE],
		['focus:z-skip', RAW_Z_INDEX],
		['hover:text-warning-strong', STATUS_AS_FOREGROUND],
		['group-hover:bg-scrim/90', TAILWIND_PALETTE],
		['hover:duration-instant', RAW_MOTION_DURATION]
	])('lässt %s durch', (className, rule) => {
		expect(findOffenders(rule, [element(className)])).toEqual([]);
	});

	/* Ein `:` innerhalb eckiger Klammern trennt keine Variante ab — es gehört zum
	   Wert. Würde stumpf am letzten `:` geschnitten, bliebe von
	   `z-[calc(var(--x):1)]` ein Rest übrig, der zufällig auf eine Regel passen
	   kann; und ein Varianten-Selektor wie `[&:hover]:z-50` verlöre seinen
	   Basisnamen gar nicht erst. */
	it('schneidet nicht an einem `:` innerhalb eckiger Klammern', () => {
		expect(findOffenders(RAW_Z_INDEX, [element('[&:hover]:z-50')])).toHaveLength(1);
		expect(findOffenders(RAW_Z_INDEX, [element('[&:hover]:z-panel')])).toEqual([]);
	});
});
