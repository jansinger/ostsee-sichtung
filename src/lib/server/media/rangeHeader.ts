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

export function parseRangeHeader(header: string | null, totalSize: number): ParsedRange {
	if (!header) {
		return { kind: 'none' };
	}

	const match = BYTES_RANGE.exec(header.trim());
	if (!match) {
		return { kind: 'none' };
	}

	const rawStart = match[1] ?? '';
	const rawEnd = match[2] ?? '';

	// "bytes=-" nennt weder Anfang noch Ende und ist damit keine Angabe.
	if (rawStart === '' && rawEnd === '') {
		return { kind: 'none' };
	}

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
