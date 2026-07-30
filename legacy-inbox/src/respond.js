/**
 * Einziger Weg, eine Antwort zu schreiben — damit die Kopfzeilen des Vertrags
 * (JSON, UTF-8, nosniff) an keiner Route vergessen werden können.
 */
export function antworteJson(res, status, koerper, kopfzeilen = {}) {
	const text = JSON.stringify(koerper);
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(text),
		'X-Content-Type-Options': 'nosniff',
		...kopfzeilen
	});
	res.end(text);
}
