/**
 * Vorübersetzung der noch deutschen `messages/en.json`-Werte über DeepL.
 *
 * **Was das Skript ist und was nicht.** Es ist ein *Vorschlag-Generator*, kein
 * Abschluss: DeepL sieht ein Segment ohne sein Markup und weiß nicht, dass
 * `feature_sehen_sie_die` mit einem `<strong>` und zwei weiteren Segmenten zu
 * einem Satz zusammengesetzt wird. Genau deshalb schreibt es standardmäßig
 * nichts, sondern zeigt nur einen Diff (`--write` schreibt).
 *
 * Was es NICHT anfasst:
 *  - Schlüssel, deren englischer Wert bereits vom deutschen abweicht — die sind
 *    von Hand übersetzt und dürfen nicht überschrieben werden.
 *  - `messages/de.json` (die Quelle) und `germanBaseline.json`.
 *  - Den Datenschutz-Abschnitt auf `/about` (`routes_about_page_privacy_*`).
 *    Diese Sätze wurden mehrfach gegen die Datenschutzerklärung des Museums
 *    korrigiert (`docs/DATENSCHUTZ_ABGLEICH_DMM_2026-08-02.md`); eine
 *    Maschinenübersetzung ist dort genauso ungeprüft wie eine von Hand und
 *    braucht dieselbe rechtliche Abnahme. Bewusst ausgeschlossen, nicht
 *    vergessen — mit `--include-privacy` trotzdem möglich.
 *
 * **Platzhalter.** Paraglide-Botschaften tragen `{name}`-Platzhalter, die DeepL
 * sonst übersetzt oder umstellt (`{count} Dateien` → `{number} files`). Sie
 * werden deshalb in `<x>`-Tags gekapselt und über `ignore_tags` geschützt;
 * danach prüft das Skript für jeden Wert, dass **dieselbe Menge** Platzhalter
 * zurückkommt. Ein Wert, der die Prüfung nicht besteht, wird verworfen und
 * gemeldet, statt eine kaputte Botschaft zu schreiben.
 *
 * **Plurale.** Die inlang-Variantenform (`declarations`/`selectors`/`match`) ist
 * kein String, sondern ein Objekt. Das Skript übersetzt die Werte unter `match`
 * einzeln und lässt die Struktur unangetastet. Achtung: Die CLDR-Kategorien
 * von DE und EN stimmen hier zufällig überein (`one`/`other`) — für eine
 * Sprache mit anderen Kategorien (z. B. `few`, `many`) wäre das Ergebnis
 * unvollständig und müsste von Hand ergänzt werden.
 *
 * **Verwendung:**
 * ```bash
 * export DEEPL_API_KEY=...            # aus der Umgebung, nie im Repo
 * npx tsx scripts/deeplPretranslate.ts            # Trockenlauf, zeigt den Diff
 * npx tsx scripts/deeplPretranslate.ts --write    # schreibt messages/en.json
 * npx tsx scripts/deeplPretranslate.ts --limit 20 # nur die ersten 20 (Probelauf)
 * ```
 *
 * Nach `--write` gehört zwingend gefahren: `npm run i18n:compile`,
 * `npm run check`, `npm run test:quick`. Und dann gelesen — Stichproben im
 * Diff, besonders bei kurzen Segmenten, die Teil eines größeren Satzes sind.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DE_PATH = 'messages/de.json';
const EN_PATH = 'messages/en.json';

/** Ein Wert in der Nachrichtendatei: einfacher String oder inlang-Variantenform. */
type MessageValue = string | unknown[];

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const INCLUDE_PRIVACY = args.includes('--include-privacy');
const LIMIT = (() => {
	const i = args.indexOf('--limit');
	return i >= 0 && args[i + 1] ? Number(args[i + 1]) : Infinity;
})();

/** Siehe Docblock: rechtlich geprüfter Text, keine Maschinenübersetzung. */
const PRIVACY_PREFIX = 'routes_about_page_privacy_';

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
	console.error('DEEPL_API_KEY fehlt. Setzen und erneut ausführen:\n  export DEEPL_API_KEY=...');
	process.exit(1);
}
// Kostenlose Keys enden auf ":fx" und sprechen einen anderen Host an.
const endpoint = apiKey.endsWith(':fx')
	? 'https://api-free.deepl.com/v2/translate'
	: 'https://api.deepl.com/v2/translate';

const PLACEHOLDER = /\{[^}]+\}/g;

function schuetzePlatzhalter(text: string): string {
	return text.replace(PLACEHOLDER, (treffer) => `<x>${treffer}</x>`);
}
function entferneSchutz(text: string): string {
	return text.replace(/<x>(\{[^}]*\})<\/x>/g, '$1');
}
function platzhalterMenge(text: string): string[] {
	return (text.match(PLACEHOLDER) ?? []).sort();
}

/** Übersetzt einen Stapel Texte; Reihenfolge der Antwort entspricht der Anfrage. */
async function uebersetze(texte: string[]): Promise<string[]> {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			text: texte.map(schuetzePlatzhalter),
			source_lang: 'DE',
			target_lang: 'EN-GB', // en-GB, wie in Aufgabe 2.1 entschieden
			tag_handling: 'xml',
			ignore_tags: ['x']
		})
	});
	if (!response.ok) {
		throw new Error(`DeepL ${response.status}: ${await response.text()}`);
	}
	const daten = (await response.json()) as { translations: { text: string }[] };
	return daten.translations.map((t) => entferneSchutz(t.text));
}

/** Sammelt alle zu übersetzenden Einzelstrings samt ihrer Rückschreib-Adresse. */
interface Auftrag {
	key: string;
	/** `undefined` = einfacher String; sonst der Schlüssel unter `match`. */
	matchKey?: string;
	quelle: string;
}

const de = JSON.parse(readFileSync(DE_PATH, 'utf-8')) as Record<string, MessageValue>;
const en = JSON.parse(readFileSync(EN_PATH, 'utf-8')) as Record<string, MessageValue>;

const auftraege: Auftrag[] = [];
for (const [key, deWert] of Object.entries(de)) {
	if (!INCLUDE_PRIVACY && key.startsWith(PRIVACY_PREFIX)) continue;
	const enWert = en[key];
	// Bereits von Hand übersetzt → unangetastet lassen.
	if (JSON.stringify(deWert) !== JSON.stringify(enWert)) continue;

	if (typeof deWert === 'string') {
		auftraege.push({ key, quelle: deWert });
		continue;
	}
	// inlang-Variantenform: nur die Texte unter `match` übersetzen.
	const variante = (deWert as { match?: Record<string, string> }[])[0];
	for (const [matchKey, text] of Object.entries(variante?.match ?? {})) {
		auftraege.push({ key, matchKey, quelle: text });
	}
}

const zuTun = auftraege.slice(0, LIMIT === Infinity ? undefined : LIMIT);
console.log(
	`${auftraege.length} unübersetzte Segmente gefunden` +
		(zuTun.length < auftraege.length ? `, ${zuTun.length} werden bearbeitet (--limit)` : '') +
		`\nZiel: ${EN_PATH} · Modus: ${WRITE ? 'SCHREIBEN' : 'Trockenlauf'}\n`
);
if (zuTun.length === 0) process.exit(0);

const BATCH = 50; // DeepL erlaubt bis 50 `text`-Felder pro Anfrage
const verworfen: { key: string; grund: string }[] = [];
let geschrieben = 0;

for (let i = 0; i < zuTun.length; i += BATCH) {
	const stapel = zuTun.slice(i, i + BATCH);
	const ergebnisse = await uebersetze(stapel.map((a) => a.quelle));

	stapel.forEach((auftrag, index) => {
		const uebersetzt = ergebnisse[index];
		if (uebersetzt === undefined) {
			verworfen.push({ key: auftrag.key, grund: 'keine Antwort von DeepL' });
			return;
		}
		// Gegenprobe: dieselben Platzhalter, sonst ist die Botschaft kaputt.
		const vorher = platzhalterMenge(auftrag.quelle);
		const nachher = platzhalterMenge(uebersetzt);
		if (JSON.stringify(vorher) !== JSON.stringify(nachher)) {
			verworfen.push({
				key: auftrag.key,
				grund: `Platzhalter verändert: ${vorher.join(',')} → ${nachher.join(',')}`
			});
			return;
		}

		if (auftrag.matchKey === undefined) {
			en[auftrag.key] = uebersetzt;
		} else {
			const variante = (en[auftrag.key] as { match: Record<string, string> }[])[0];
			variante.match[auftrag.matchKey] = uebersetzt;
		}
		geschrieben += 1;
		console.log(`  ${auftrag.key}${auftrag.matchKey ? ` [${auftrag.matchKey}]` : ''}`);
		console.log(`    DE: ${auftrag.quelle}`);
		console.log(`    EN: ${uebersetzt}`);
	});
	console.log(`— ${Math.min(i + BATCH, zuTun.length)}/${zuTun.length} —`);
}

if (verworfen.length > 0) {
	console.log(`\n${verworfen.length} VERWORFEN (unverändert deutsch gelassen):`);
	for (const { key, grund } of verworfen) console.log(`  ${key}: ${grund}`);
}

if (WRITE) {
	// Tab-Einrückung und abschließender Zeilenumbruch wie im Bestand — sonst
	// erzeugt Prettier beim nächsten Lauf einen Diff über die ganze Datei.
	writeFileSync(EN_PATH, `${JSON.stringify(en, null, '\t')}\n`, 'utf-8');
	console.log(`\n${geschrieben} Werte in ${EN_PATH} geschrieben.`);
	console.log('Jetzt zwingend: npm run i18n:compile && npm run check && npm run test:quick');
} else {
	console.log(`\nTrockenlauf — nichts geschrieben. Mit --write übernehmen.`);
}
