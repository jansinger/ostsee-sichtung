import { expect, type Page } from '@playwright/test';

/**
 * Horizontalen Überlauf messen — und den Verursacher benennen.
 *
 * Die reine Messung (`documentElement.scrollWidth - clientWidth`) sagt nur, DASS
 * das Dokument breiter ist als das Fenster. Bei einem Befund steht man dann vor
 * einem Baum aus tausend Elementen, von denen ein paar Dutzend die volle
 * Dokumentbreite melden — alle mitgezogen, keines davon die Ursache.
 *
 * `findHorizontalOverflow` blendet deshalb Teilbäume aus und misst nach jedem
 * Schritt neu. Auf jeder Ebene gilt:
 *
 * 1. Beseitigt das Ausblenden **eines** Kindes den Überlauf, steckt die Ursache
 *    allein dort — der Abstieg geht in diesem Kind weiter.
 * 2. Sonst wird jedes Kind einzeln geprüft, indem alle Geschwister ausgeblendet
 *    werden: Läuft es dann immer noch über, ist es ein **eigenständiger**
 *    Verursacher. Ohne diesen zweiten Durchgang endet der Abstieg an dem
 *    gemeinsamen Elternelement, sobald zwei Bereiche unabhängig voneinander zu
 *    breit sind — und man bekommt einen 320px breiten Wrapper genannt statt der
 *    beiden Zeilen darin.
 * 3. Qualifiziert sich kein Kind, ist der Knoten selbst das kleinste Element,
 *    das den Überlauf erklärt.
 *
 * **Der Abstieg läuft nur im Fehlerfall.** Ohne Überlauf kehrt die Funktion vor
 * dem ersten `display: none` zurück. Das ist nicht nur eine Ersparnis: In
 * Schritt 1 steht die OpenLayers-Karte, und Aus- und Wiedereinblenden ihres
 * Containers löst Resize-Verarbeitung aus. Ein grüner Lauf fasst die Karte
 * deshalb nicht an; ein roter perturbiert sie, aber dann ist der Befund bereits
 * gemessen und die Diagnose läuft ohnehin auf einen Abbruch zu.
 *
 * Gefunden hat dieses Verfahren die Zeile „GPS-Eingabeformat" in
 * `LocationInput.svelte` (behoben in 8a4ef750): ein `<select>` neben seinem
 * Label in einer Flex-Zeile, das als Flex-Item mit `min-width: auto` nicht unter
 * die Breite seiner längsten Option schrumpft — zusammen rund 420 px harte
 * Mindestbreite, die sich bis zum Seiten-Wrapper durchdrückte.
 */

export type OverflowVerursacher = {
	/** Kurzbeschreibung des Elements: Tag, id, data-testid, erste Klassen. */
	beschreibung: string;
	/** Breite des Elements in Pixeln. */
	breite: number;
	/** Abstiegspfad von `<body>` bis hierher. */
	pfad: string[];
};

export type OverflowBefund = {
	/** Wie viele Pixel das Dokument breiter ist als das Fenster. `<= 0` heißt: kein Überlauf. */
	ueberlauf: number;
	/** Die kleinsten Elemente, die den Überlauf erklären — leer, wenn es keinen gibt. */
	verursacher: OverflowVerursacher[];
};

export async function findHorizontalOverflow(page: Page): Promise<OverflowBefund> {
	return page.evaluate(() => {
		const wurzel = document.documentElement;
		const messen = () => wurzel.scrollWidth - wurzel.clientWidth;

		const ueberlauf = messen();
		if (ueberlauf <= 0) return { ueberlauf, verursacher: [] };

		/** Knapp, aber wiedererkennbar: Tag, id, data-testid und die ersten Klassen. */
		const beschreiben = (element: Element): string => {
			const id = element.id ? `#${element.id}` : '';
			const testid = element.getAttribute('data-testid');
			const klassen = (element.getAttribute('class') ?? '')
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 4)
				.map((klasse) => `.${klasse}`)
				.join('');
			return `${element.tagName.toLowerCase()}${id}${testid ? `[data-testid="${testid}"]` : ''}${klassen}`;
		};

		/** Nur Elemente mit `style`-Property lassen sich ausblenden (HTML und SVG). */
		const stylebar = (element: Element): element is HTMLElement | SVGElement =>
			element instanceof HTMLElement || element instanceof SVGElement;

		const gemerkt = new Map<Element, string>();
		const ausblenden = (element: HTMLElement | SVGElement) => {
			gemerkt.set(element, element.style.display);
			element.style.display = 'none';
		};
		const zuruecksetzen = (element: HTMLElement | SVGElement) => {
			element.style.display = gemerkt.get(element) ?? '';
			gemerkt.delete(element);
		};

		/* Obergrenzen: reine Sicherheitsnetze. Ein DOM, das 60 Ebenen tief liegt
		   oder 8 unabhängige Überläufe hat, ist kein Testbefund mehr, sondern ein
		   eigenes Problem — und die Suche ist pro Ebene quadratisch in der Zahl der
		   Kinder. */
		const MAX_TIEFE = 60;
		const MAX_BEFUNDE = 8;

		/**
		 * Vorbedingung: Das Ausblenden von `knoten` beseitigt im aktuellen
		 * Sichtbarkeitszustand den Überlauf — er ist also diesem Teilbaum
		 * zuzurechnen. Der Zweig für mehrere Verursacher stellt sie für den
		 * Abstieg eigens her, indem er die Geschwister währenddessen ausgeblendet
		 * lässt; ohne das gälte sie ab dem ersten verzweigten Abstieg nicht mehr.
		 */
		const suchen = (knoten: Element, pfad: string[]): OverflowVerursacherIntern[] => {
			const selbst = () => [
				{
					beschreibung: beschreiben(knoten),
					breite: Math.round(knoten.getBoundingClientRect().width),
					pfad
				}
			];
			if (pfad.length >= MAX_TIEFE) return selbst();

			const kinder = Array.from(knoten.children).filter(stylebar);
			if (kinder.length === 0) return selbst();

			/* Läuft der Knoten auch ohne jeden Inhalt über, ist seine eigene Box zu
			   breit (feste Breite, Padding, Rahmen) — dann führt jeder Abstieg in
			   ein Kind nur von der Ursache weg. */
			kinder.forEach(ausblenden);
			const ohneKinder = messen();
			kinder.forEach(zuruecksetzen);
			if (ohneKinder > 0) return selbst();

			// 1. Ein einzelnes Kind erklärt den Überlauf allein.
			for (const kind of kinder) {
				ausblenden(kind);
				// Das Lesen von `scrollWidth` erzwingt ein Layout — der Wert gilt also
				// wirklich für den ausgeblendeten Zustand.
				const ohneKind = messen();
				zuruecksetzen(kind);
				if (ohneKind <= 0) return suchen(kind, [...pfad, beschreiben(kind)]);
			}

			/* 2. Mehrere Kinder laufen unabhängig voneinander über. Bei genau einem
			   Kind läuft dieser Zweig auf „das Kind ist es" hinaus — richtig so:
			   Schritt 1 hat dann nur deshalb nicht gegriffen, weil anderswo im
			   Dokument ein zweiter Überlauf steht. */
			const ergebnisse: OverflowVerursacherIntern[] = [];
			for (const kind of kinder) {
				const geschwister = kinder.filter((anderes) => anderes !== kind);
				geschwister.forEach(ausblenden);
				if (messen() > 0) ergebnisse.push(...suchen(kind, [...pfad, beschreiben(kind)]));
				geschwister.forEach(zuruecksetzen);
			}

			return ergebnisse.length > 0 ? ergebnisse : selbst();
		};

		type OverflowVerursacherIntern = { beschreibung: string; breite: number; pfad: string[] };

		const verursacher = suchen(document.body, [beschreiben(document.body)]).slice(0, MAX_BEFUNDE);
		return { ueberlauf, verursacher };
	});
}

/**
 * Behauptet, dass das Dokument nicht breiter ist als das Fenster.
 *
 * `kontext` beschreibt den geprüften Zustand (Breite, Schritt, aufgeklappte
 * Bereiche) und steht in der Fehlermeldung — ohne ihn wäre bei einem Lauf über
 * mehrere Breiten und Schritte nicht erkennbar, welcher Zustand gerissen ist.
 */
export async function expectNoHorizontalOverflow(page: Page, kontext: string): Promise<void> {
	const befund = await findHorizontalOverflow(page);

	const meldung =
		befund.ueberlauf > 0
			? [
					`Horizontaler Überlauf bei ${kontext}: ${befund.ueberlauf}px.`,
					...befund.verursacher.map(
						(eintrag) =>
							`Verursacher: ${eintrag.beschreibung} (${eintrag.breite}px breit)\n  Pfad: ${eintrag.pfad.join(' > ')}`
					)
				].join('\n')
			: kontext;

	expect(befund.ueberlauf, meldung).toBeLessThanOrEqual(0);
}

/**
 * Klappt jede Disclosure im Dokument auf und liefert deren Anzahl.
 *
 * Der Sinn des Ganzen: Ein zugeklapptes `<details>` hat keine Layout-Box, sein
 * Inhalt kann also nicht überlaufen — genau deshalb war der GPS-Format-Fehler
 * jahrelang unsichtbar. Geprüft werden muss der aufgeklappte Zustand.
 *
 * Bewusst über alle `<details>` statt über eine Aufzählung von Test-IDs: Eine
 * neue Disclosure ist damit automatisch mit abgedeckt. Die Bereiche, die nicht
 * an einem `<details>` hängen, sondern an Formularwerten (Totfund, Motorfrage),
 * schaltet der Spec einzeln.
 */
export async function openAllDetails(page: Page): Promise<number> {
	return page.evaluate(() => {
		const disclosures = Array.from(document.querySelectorAll('details'));
		for (const disclosure of disclosures) disclosure.open = true;
		return disclosures.length;
	});
}
