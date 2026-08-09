/**
 * bannedCss.ts — die Farbregel für handgeschriebenes CSS.
 *
 * **Warum es diese Datei zusätzlich zu `bannedClasses.ts` gibt.** Die Regeln
 * dort prüfen Klassennamen und werden über einen DOM-Scan auf das gerenderte
 * Dokument angewendet. Was in einem `<style>`-Block einer Svelte-Komponente
 * steht, hat aber gar keinen Klassennamen — es ist eine CSS-Deklaration. Der
 * Scan sieht sie strukturell nicht, egal wie vollständig seine Farbliste ist.
 *
 * Das ist dieselbe Fehlerklasse, die `bannedClasses.ts` an vier Stellen
 * beschreibt, nur eine Ebene höher: Die Lücke saß nicht in den Daten und auch
 * nicht in der Grammatik des Musters, sondern in der **Eingabe**. Der
 * Klassen-Scan lief über Monate grün und erzeugte Deckung für „keine Farben am
 * Theme vorbei", während in `MediaThumbnail.svelte` ein
 * `background-color: rgba(0, 0, 0, 0.9) !important` stand — im selben File,
 * dessen Kommentar die Abschaffung genau dieses Musters erklärt.
 *
 * Geprüft wird deshalb hier der **Quelltext** der `<style>`-Blöcke, nicht das
 * DOM. Das läuft in Node (`npm run test:unit`, damit in `test:quick`) und
 * braucht keinen Browser: Ob ein Farbwert aus einem Token kommt, ist am
 * Quelltext entscheidbar. Gemessen wird der Kontrast weiter im Browser
 * (`e2e/helpers/contrast.ts`) — das ist eine andere Frage.
 *
 * Referenz für die Werte: `.claude/rules/daisyui.md`, `.claude/rules/design-system.md`.
 */

/** Eine Fundstelle im CSS, mit Zeilennummer für die Fehlermeldung. */
export interface CssOffender {
	/** 1-basierte Zeile innerhalb der geprüften Datei. */
	readonly line: number;
	/** Die anstößige Zeile, getrimmt. */
	readonly text: string;
	/** Der konkrete Farbliteral-Treffer, z. B. `rgba(0, 0, 0, 0.9)`. */
	readonly literal: string;
}

/**
 * Farbliterale, die am Theme vorbeigreifen.
 *
 * Erfasst sind die Schreibweisen, die in CSS eine Farbe *direkt* benennen: Hex
 * (`#0af`, `#00aaff`, `#00aaffcc`) und die Farbfunktionen `rgb()`/`rgba()`,
 * `hsl()`/`hsla()`, `oklch()`, `oklab()`, `lab()`, `lch()` sowie `color()`.
 *
 * Die vier letzten haben im Bestand keine Fundstelle und stehen trotzdem im
 * Muster — aus dem Grund, den `bannedClasses.ts` bei `PALETTE_HUES` ausbuchstabiert:
 * Eine Regel, die nur die Schreibweisen kennt, die schon jemand benutzt hat,
 * meldet die erste neue nicht. `color()` ist dabei der wahrscheinlichste
 * Zuwachs, sobald jemand einen P3-Wert aus einem Design-Tool kopiert.
 *
 * **Warum `oklch()` mit dabei ist, obwohl das Theme selbst darin geschrieben
 * ist:** Genau deshalb. `tokens.css` ist die eine Datei, in der ein `oklch()`
 * hingehört — überall sonst ist es eine Kopie eines Theme-Werts, die beim
 * nächsten Theme-Wechsel still stehen bleibt. Die Ausnahme trägt deshalb die
 * Dateiliste unten, nicht das Muster.
 *
 * **Nicht erfasst sind benannte CSS-Farben** (`red`, `transparent`, `currentColor`).
 * `transparent` und `currentColor` sind keine Farbwahl, sondern eine Rücknahme
 * bzw. ein Verweis — beide sind im Bestand legitim und häufig. Ein Muster, das
 * die ~150 CSS-Farbnamen aufzählt, würde an `border: 1px solid` (Farbe
 * weggelassen, erbt `currentColor`) ohnehin vorbeigehen. Wer eine benannte
 * Farbe einträgt, umgeht das Theme genauso — das fängt der Review, nicht dieser
 * Test. Die vier Formen oben decken die Fälle ab, die tatsächlich entstehen,
 * weil sie aus einer Vorlage oder einem Design-Tool kopiert werden.
 */
const COLOR_LITERAL_PATTERN =
	/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\s*\(/g;

/**
 * Aufrufe, in deren Innerem ein Farbliteral in Ordnung geht.
 *
 * `var(--x, #fff)` ist die vorgesehene Schreibweise: Der Wert kommt aus einem
 * Token, das Literal steht nur als Fallback daneben. `color-mix()` erlaubt
 * dasselbe eine Ebene tiefer.
 *
 * **Entscheidend ist, dass nur der Aufruf selbst ausgenommen wird, nicht die
 * Zeile.** Die erste Fassung sprang aus der ganzen Zeile heraus, sobald
 * irgendwo ein `var(` darin stand — ein Literal daneben blieb damit unsichtbar.
 * Das ist keine konstruierte Lücke: Genau diese Form hatte das Lade-Muster, das
 * mit diesem PR aus `MediaThumbnail.svelte` entfallen ist —
 * `linear-gradient(45deg, transparent 25%, var(--color-base-300) 25%, …)`. Ein
 * `#fff` an einem dieser Stops wäre nie gemeldet worden, und die Regel hätte
 * ausgerechnet für die Schreibweise gedeckt, in der Farben tatsächlich
 * gemischt auftreten.
 */
const TOKEN_CALL_PATTERN = /\b(?:var|color-mix)\(/;

/**
 * Entfernt `var(…)`- und `color-mix(…)`-Aufrufe samt Inhalt aus einer Zeile.
 *
 * Zählt Klammern, statt bis zur nächsten `)` zu springen — sonst überlebt bei
 * `var(--a, var(--b, #fff))` der innere Rest und wird als Fundstelle gemeldet.
 * Bleibt eine Klammer offen (mehrzeiliger Aufruf), fällt der Zeilenrest weg: Was
 * dahinter steht, gehört dann noch in den Aufruf hinein.
 */
function stripTokenCalls(line: string): string {
	let result = line;

	for (;;) {
		const match = TOKEN_CALL_PATTERN.exec(result);
		if (!match) return result;

		const openParen = match.index + match[0].length - 1;
		let depth = 0;
		let close = -1;

		for (let i = openParen; i < result.length; i++) {
			if (result[i] === '(') depth++;
			else if (result[i] === ')' && --depth === 0) {
				close = i;
				break;
			}
		}

		result =
			close === -1
				? result.slice(0, match.index)
				: result.slice(0, match.index) + result.slice(close + 1);
	}
}

/**
 * Dateien, in denen Farbliterale hingehören.
 *
 * **`tokens.css`** ist die Quelle der Wahrheit — dort *muss* der Wert stehen.
 * **`weather-icons*.css`** sind eingebundene Fremd-Stylesheets (Icon-Font), die
 * nicht am Theme hängen. **`mapStyles.css`** trägt OpenLayers-Overlays, deren
 * Farben an die Kartenkacheln gebunden sind und nicht ans Theme.
 *
 * Die Liste ist bewusst kurz und namentlich: Ein Muster wie „alles unter
 * `src/css/`" würde die nächste Datei dort stillschweigend mit befreien.
 */
const EXEMPT_FILES = [
	'src/css/tokens.css',
	'src/css/weather-icons.css',
	'src/css/weather-icons-wind.css',
	'src/lib/map/mapStyles.css'
] as const;

/** Ist für `path` (repo-relativ, mit `/`) die Farbregel ausgesetzt? */
export function isExemptFile(path: string): boolean {
	return EXEMPT_FILES.some((exempt) => path.endsWith(exempt));
}

/**
 * Schneidet die `<style>`-Blöcke aus einer Svelte-Datei.
 *
 * Gibt Paare aus Zeilenversatz und Inhalt zurück, damit die Fundstelle später
 * eine Zeilennummer **in der Datei** tragen kann und nicht im Ausschnitt — eine
 * Meldung, die auf „Zeile 62 des dritten Style-Blocks" zeigt, kostet den Leser
 * genau die Suche, die der Test ihm abnehmen soll.
 */
export function extractStyleBlocks(source: string): { offset: number; content: string }[] {
	const blocks: { offset: number; content: string }[] = [];
	const pattern = /<style[^>]*>([\s\S]*?)<\/style>/g;

	let match: RegExpExecArray | null;
	while ((match = pattern.exec(source)) !== null) {
		// Zeilen vor dem Blockinhalt zählen: der Treffer beginnt beim `<style`,
		// der Inhalt erst hinter dem `>`.
		const beforeContent = source.slice(0, match.index + match[0].indexOf('>') + 1);
		blocks.push({
			offset: beforeContent.split('\n').length - 1,
			content: match[1]
		});
	}

	return blocks;
}

/**
 * Meldet Farbliterale in `css`, die nicht aus einem Token stammen.
 *
 * @param css CSS-Quelltext (ein `<style>`-Blockinhalt oder eine ganze Datei).
 * @param lineOffset Zeilen, die vor `css` in der Datei stehen — für die Nummer.
 * @returns Fundstellen (leer = konform).
 */
export function findCssColorOffenders(css: string, lineOffset = 0): CssOffender[] {
	const offenders: CssOffender[] = [];
	const lines = css.split('\n');
	const stripped = stripComments(css).split('\n');

	stripped.forEach((line, index) => {
		const matches = stripTokenCalls(line).match(COLOR_LITERAL_PATTERN);
		if (!matches) return;

		offenders.push({
			line: lineOffset + index + 1,
			// Aus der Originalzeile, damit die Meldung zeigt, was dort wirklich steht.
			text: lines[index].trim(),
			literal: matches[0].replace(/\s*\($/, '()')
		});
	});

	return offenders;
}

/**
 * Entfernt `/* … *\/`-Kommentare, **behält aber die Zeilenstruktur**.
 *
 * Beides ist nötig. Ohne Entfernen meldet der Test die eigene Dokumentation:
 * Die Begründungen im Bestand führen die verbotenen Werte als Gegenbeispiel auf
 * (`bg-black/20` in `tokens.css`, `rgba(0, 0, 0, 0.9)` in dieser Datei), und ein
 * Test, der seine eigene Erklärung anmeckert, wird abgeschaltet statt befolgt.
 *
 * Ohne Zeilenerhalt wiederum zeigen alle Fundstellen hinter dem ersten
 * mehrzeiligen Kommentar auf die falsche Zeile — und mehrzeilig sind hier
 * praktisch alle. Deshalb wird der Inhalt durch Leerzeichen ersetzt und nur das
 * `\n` durchgereicht, statt den Kommentar herauszuschneiden.
 */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}
