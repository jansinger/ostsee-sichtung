/**
 * Auswertung des `Range`-Headers nach RFC 9110, Abschnitt 14.
 *
 * Bewusst als reine Funktion ohne Storage- oder Request-Bezug: Die Grenzfälle
 * (Suffix, offenes Ende, Überlauf) sind fehleranfällig und lassen sich so
 * vollständig prüfen, ohne eine Datei zu brauchen.
 *
 * Mehrfach-Bereiche werden absichtlich wie „kein Range" behandelt — eine
 * `multipart/byteranges`-Antwort ist erlaubt, aber nicht nötig, und kein
 * Videoplayer fordert sie an.
 */
export type ParsedRange =
	| { kind: 'none' }
	| { kind: 'satisfiable'; start: number; end: number }
	| { kind: 'unsatisfiable' };

const BYTES_RANGE = /^bytes=(\d*)-(\d*)$/;

/**
 * Zerlegt einen `Range`-Header in Start/Ende-Rohtext, wenn er syntaktisch ein
 * `bytes=`-Bereichsausdruck ist (nicht leer, richtige Einheit, nicht
 * Mehrfach-Bereiche, nicht "bytes=-" ohne Anfang und Ende) — sonst `null`.
 *
 * Einzige Stelle, die das `bytes=`-Muster kennt: `isRangeHeaderSyntaxValid`
 * und `parseRangeHeader` bauen beide darauf auf, statt die Regel zweimal zu
 * pflegen.
 */
function matchBytesRange(header: string | null): { rawStart: string; rawEnd: string } | null {
	if (!header) {
		return null;
	}

	const match = BYTES_RANGE.exec(header.trim());
	if (!match) {
		return null;
	}

	const rawStart = match[1] ?? '';
	const rawEnd = match[2] ?? '';

	// "bytes=-" nennt weder Anfang noch Ende und ist damit keine Angabe.
	if (rawStart === '' && rawEnd === '') {
		return null;
	}

	return { rawStart, rawEnd };
}

/**
 * Reine Syntaxprüfung eines `Range`-Headers, ohne Dateigröße.
 *
 * Für die Rate-Limit-Stufenwahl in `+server.ts` reichte bisher
 * `!!request.headers.get('range')` — ein syntaktisch kaputter Header
 * (`Range: unsinn`) zählte damit gegen das zehnfach höhere
 * `media_range`-Limit, obwohl `parseRangeHeader` ihn als `kind: 'none'`
 * einstuft und die volle Datei liefert (Befund 4, PR #682 Review). Diese
 * Funktion beantwortet nur „ist das syntaktisch ein Bereichsausdruck, den
 * `parseRangeHeader` NICHT als `kind: 'none'` behandelt" — bewusst nicht
 * „erfüllbar", das hängt von der zu diesem Zeitpunkt noch unbekannten
 * Dateigröße ab.
 */
export function isRangeHeaderSyntaxValid(header: string | null): boolean {
	return matchBytesRange(header) !== null;
}

export function parseRangeHeader(header: string | null, totalSize: number): ParsedRange {
	const match = matchBytesRange(header);
	if (!match) {
		return { kind: 'none' };
	}

	const { rawStart, rawEnd } = match;

	if (totalSize === 0) {
		return { kind: 'unsatisfiable' };
	}

	// Suffix-Form "bytes=-N": die letzten N Bytes.
	if (rawStart === '') {
		const suffixLength = Number(rawEnd);
		if (suffixLength === 0) {
			return { kind: 'unsatisfiable' };
		}
		const start = Math.max(0, totalSize - suffixLength);
		return { kind: 'satisfiable', start, end: totalSize - 1 };
	}

	const start = Number(rawStart);
	if (start >= totalSize) {
		return { kind: 'unsatisfiable' };
	}

	const end = rawEnd === '' ? totalSize - 1 : Math.min(Number(rawEnd), totalSize - 1);
	if (end < start) {
		return { kind: 'unsatisfiable' };
	}

	return { kind: 'satisfiable', start, end };
}
