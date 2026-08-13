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
 * Weil `tag_handling: 'xml'` den **ganzen** Quelltext als XML liest, werden
 * `&`, `<` und `>` vorher maskiert (`scripts/deeplXml.ts`). Ohne das bricht ein
 * einziges `Drag & Drop` oder `(< 1 km/h)` den gesamten Stapel von bis zu 50
 * Segmenten mit einem HTTP 400 ab — so geschehen am 2026-08-13 bei
 * `formoptions_windstrength_windstill`.
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
 * npx tsx scripts/deeplPretranslate.ts --filter routes_about_page  # gezielt
 * ```
 *
 * **Fachbegriffe.** DeepL kennt die Domäne nicht: Im ersten Trockenlauf wurde
 * „Sichtung" zu *review* und „Meldung" zu *message* — beides falsch und im
 * Widerspruch zu den von Hand übersetzten Botschaften. Ein DeepL-Glossar
 * (`GLOSSAR` unten) erzwingt die richtigen Begriffe; es wird pro Lauf angelegt
 * und danach wieder gelöscht.
 *
 * **Was das Skript NICHT abfängt** (im Diff selbst zu prüfen): DeepL setzt gern
 * typografische Anführungszeichen um Bezeichner (`latitude` → `‚latitude'`) und
 * ersetzt Bindestriche durch Halbgeviertstriche. Beides ist zulässiges Englisch
 * und maschinell nicht sicher von gewollter Zeichensetzung zu trennen.
 *
 * **Blockweise arbeiten — `--limit` gilt auch für `--write`.** Ein `--filter x
 * --write` schreibt ALLE Segmente der Klasse, auch die ungesehenen. Weil ein
 * geschriebener Schlüssel beim nächsten Lauf nicht mehr als unübersetzt gilt
 * (EN weicht dann von DE ab), lässt sich die Liste sicher in Blöcken abarbeiten:
 *
 * ```bash
 * … --filter sighting_ --limit 15          # Block ansehen
 * … --filter sighting_ --limit 15 --write  # genau diesen Block schreiben
 * … --filter sighting_ --limit 15          # der nächste Block rückt nach
 * ```
 *
 * **Pro Feldgruppe prüfen, nicht pro Segment.** Der teuerste Befund dieses
 * Werkzeugs (2026-08-13) war eine Terminologie-Spaltung über vier Segmente
 * hinweg — jedes für sich vertretbar übersetzt, zusammen zwei Begriffe für
 * dieselbe Sache im selben Formularfeld. Eine Stichprobe, die Segmente einzeln
 * bewertet, findet das nicht.
 *
 * Nach `--write` gehört zwingend gefahren: `npm run i18n:compile`,
 * `npm run check`, `npm run test:quick`. Und dann gelesen — Stichproben im
 * Diff, besonders bei kurzen Segmenten, die Teil eines größeren Satzes sind.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';
import { entferneSchutz, schuetzePlatzhalter } from './deeplXml';

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
/**
 * Teilmenge nach Schlüssel-Präfix, z. B. `--filter routes_about_page`.
 *
 * Ohne ihn zeigt `--limit` immer denselben Anfang der alphabetisch sortierten
 * Liste — das sind die `api_*`-Fehlermeldungen, also vollständige technische
 * Sätze. Sie sind der EINFACHSTE Fall und taugen nicht zur Qualitätsprüfung.
 * Die riskanten Segmente sind die Satzfragmente (`routes_about_page_hero_*`,
 * `*_feature_*`), die DeepL ohne ihr Markup und ohne den Rest des Satzes sieht.
 */
const FILTER = (() => {
	const i = args.indexOf('--filter');
	return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
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

/**
 * Fachbegriffe, die DeepL ohne Kontext falsch trifft — belegt am Trockenlauf
 * vom 2026-08-13: „Sichtung" wurde zu *review*, „Meldung" zu *message*. Beides
 * ist in dieser Domäne falsch und weicht von den ~170 bereits von Hand
 * übersetzten Botschaften ab (dort durchgängig *sighting* und *report*).
 *
 * Ein Glossar erzwingt die Ersetzung — deshalb stehen hier nur Begriffe, die im
 * Projekt **eindeutig** sind. „Aufnahme" etwa fehlt bewusst: mal Foto/Video,
 * mal die Tonaufnahme-Bedeutung; eine erzwungene Ersetzung träfe hier daneben.
 * Wer erweitert, prüft die Eindeutigkeit an den bestehenden Übersetzungen.
 */
const GLOSSAR: Record<string, string> = {
	Meldung: 'report',
	Meldungen: 'reports',
	Sichtung: 'sighting',
	Sichtungen: 'sightings',
	Melder: 'reporter',
	Tierart: 'species',
	Schweinswal: 'harbour porpoise',
	Kegelrobbe: 'grey seal',
	Seehund: 'harbour seal',
	Robbe: 'seal',
	Robben: 'seals',
	Totfund: 'dead animal find',
	Meeresmuseum: 'Oceanographic Museum',
	// Aus dem Trockenlauf `--filter sighting_` (2026-08-13): „Antrieb" bekam
	// drei Übersetzungen — *propulsion* im Label, *drive system* im Hilfetext
	// direkt darunter, *drive systems* (Numerus falsch) im Freitext-Label.
	// Für ein Formularfeld ist das der schlimmste Fall: zwei Begriffe für
	// dieselbe Sache, sichtbar untereinander.
	Antrieb: 'propulsion',
	Bootsantrieb: 'boat propulsion',
	Antriebsart: 'propulsion type'
};

/**
 * Legt ein temporäres DeepL-Glossar an und gibt seine Id zurück.
 *
 * Bewusst pro Lauf neu statt einmal dauerhaft: Ein dauerhaftes Glossar wäre
 * Zustand außerhalb des Repos, der still von `GLOSSAR` hier abweichen kann.
 * Es wird am Ende wieder gelöscht (`finally`).
 */
async function erzeugeGlossar(): Promise<string> {
	const basis = endpoint.replace('/v2/translate', '/v2/glossaries');
	const response = await fetch(basis, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: `ostsee-tiere-${Date.now()}`,
			source_lang: 'de',
			target_lang: 'en',
			entries: Object.entries(GLOSSAR)
				.map(([de_, en_]) => `${de_}\t${en_}`)
				.join('\n'),
			entries_format: 'tsv'
		})
	});
	if (!response.ok) {
		throw new Error(`DeepL-Glossar ${response.status}: ${await response.text()}`);
	}
	return ((await response.json()) as { glossary_id: string }).glossary_id;
}

async function loescheGlossar(id: string): Promise<void> {
	const basis = endpoint.replace('/v2/translate', '/v2/glossaries');
	await fetch(`${basis}/${id}`, {
		method: 'DELETE',
		headers: { Authorization: `DeepL-Auth-Key ${apiKey}` }
	});
}

const PLACEHOLDER = /\{[^}]+\}/g;
function platzhalterMenge(text: string): string[] {
	return (text.match(PLACEHOLDER) ?? []).sort();
}

/**
 * Gleicht den Anfangsbuchstaben an die Quelle an.
 *
 * Ein Glossar ist case-sensitiv und kontextblind: Der Eintrag
 * `Bootsantrieb → boat propulsion` ist für die Satzmitte richtig („select the
 * boat propulsion system"), macht aus dem alleinstehenden Feldlabel aber
 * „boat propulsion" statt „Boat propulsion". Beobachtet am Trockenlauf vom
 * 2026-08-13 — und zwar als Regression, die erst der Glossar-Eintrag erzeugt
 * hat; ohne ihn übersetzte DeepL das Label korrekt groß.
 *
 * Die Regel ist deterministisch und deckt die ganze Klasse ab: Beginnt die
 * deutsche Quelle mit einem Großbuchstaben und die Übersetzung mit einem
 * Kleinbuchstaben, wird großgeschrieben. Fragmente, die im Deutschen klein
 * oder mit Satzzeichen beginnen (`, ihre Sichtungen …`), bleiben unberührt —
 * genau richtig, denn sie stehen als Satzteil im Markup.
 */
function gleicheAnfangsbuchstabenAn(quelle: string, uebersetzt: string): string {
	const quelleGross = quelle[0] !== undefined && quelle[0] === quelle[0].toUpperCase();
	const zielKlein = uebersetzt[0] !== undefined && uebersetzt[0] === uebersetzt[0].toLowerCase();
	if (quelleGross && zielKlein && /\p{L}/u.test(quelle[0] ?? '')) {
		return uebersetzt[0]!.toUpperCase() + uebersetzt.slice(1);
	}
	return uebersetzt;
}

/* Wird unten vor dem ersten `uebersetze`-Aufruf gesetzt. Die Deklaration steht
   hier, weil `uebersetze` sie liest — der Aufruf erfolgt erst danach. */
let glossarId: string | undefined; // eslint-disable-line prefer-const

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
			ignore_tags: ['x'],
			...(glossarId ? { glossary_id: glossarId } : {})
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
	// `$schema` ist der JSON-Schema-Verweis der Datei, keine Botschaft. Ohne
	// diese Zeile schickt das Skript die Schema-URL an DeepL — im Trockenlauf
	// vom 2026-08-13 kam sie zufällig unverändert zurück, aber darauf ist kein
	// Verlass. Jeder `$`-Schlüssel ist Metadaten des Formats, kein Text.
	if (key.startsWith('$')) continue;
	if (FILTER && !key.startsWith(FILTER)) continue;
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

glossarId = await erzeugeGlossar();
console.log(`Glossar aktiv (${Object.keys(GLOSSAR).length} Begriffe): ${glossarId}\n`);

try {
	for (let i = 0; i < zuTun.length; i += BATCH) {
		const stapel = zuTun.slice(i, i + BATCH);
		const ergebnisse = await uebersetze(stapel.map((a) => a.quelle));

		stapel.forEach((auftrag, index) => {
			const roh = ergebnisse[index];
			const uebersetzt =
				roh === undefined ? undefined : gleicheAnfangsbuchstabenAn(auftrag.quelle, roh);
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
} finally {
	// Auch nach einem Abbruch: kein verwaistes Glossar im DeepL-Konto.
	await loescheGlossar(glossarId);
}

if (verworfen.length > 0) {
	console.log(`\n${verworfen.length} VERWORFEN (unverändert deutsch gelassen):`);
	for (const { key, grund } of verworfen) console.log(`  ${key}: ${grund}`);
}

if (WRITE) {
	// Durch Prettier, nicht bloß mit Tab-Einrückung: `JSON.stringify` klappt
	// **jedes** Array auf, Prettier faltet kurze wieder zusammen. Der Lauf vom
	// 2026-08-13 hinterließ so 57 Zeilen Drift in den Plural-Deklarationen —
	// Formatierungsrauschen mitten im Übersetzungs-Diff, das erst beim nächsten
	// Commit auffiel. Die Projekt-Konfiguration wird dabei aufgelöst, damit
	// hier und `npm run lint` dasselbe Ergebnis liefern.
	const roh = `${JSON.stringify(en, null, '\t')}\n`;
	const konfig = await prettier.resolveConfig(EN_PATH);
	writeFileSync(EN_PATH, await prettier.format(roh, { ...konfig, filepath: EN_PATH }), 'utf-8');
	console.log(`\n${geschrieben} Werte in ${EN_PATH} geschrieben.`);
	console.log('Jetzt zwingend: npm run i18n:compile && npm run check && npm run test:quick');
} else {
	console.log(`\nTrockenlauf — nichts geschrieben. Mit --write übernehmen.`);
}
