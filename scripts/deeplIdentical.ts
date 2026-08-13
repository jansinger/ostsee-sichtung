/**
 * Botschaften, deren englische Fassung bewusst mit der deutschen übereinstimmt.
 *
 * `deeplPretranslate.ts` entscheidet „schon übersetzt" allein am Vergleich
 * `de !== en`. Eine Botschaft, die im Englischen genauso heißt wie im
 * Deutschen, kann diesen Test nie bestehen — sie gilt bei jedem Lauf wieder als
 * offen. Am 2026-08-13 hat das vier Entscheidungen aus früheren Blöcken
 * rückgängig gemacht: `Land` wurde erneut zu „Country", `Start` zu „Home", die
 * Domain `Meeresmuseum.de` zu „Oceanographic Museum.de", und
 * `max. {imageMB} MB` verlor wieder seine Leerzeichen. Wer das nicht bemerkt,
 * korrigiert dieselben Stellen bei jedem Lauf neu.
 *
 * Dieses Register ist deshalb kein Filter, sondern ein **Entscheidungsprotokoll**:
 * Hier steht, wofür eine Gleichheit geprüft und gewollt ist. Es wächst mit jeder
 * weiteren solchen Entscheidung. `deeplIdentical.test.ts` rechnet nach, dass
 * jeder Eintrag existiert und in beiden Katalogen wirklich gleich ist — ein
 * Eintrag, der später doch übersetzt wird, fällt damit auf, statt still zu
 * schützen, was keinen Schutz mehr braucht.
 *
 * Nicht aufgenommen sind Botschaften, die zufällig gleich zurückkommen, weil
 * DeepL sie ohnehin nicht anfasst (`Beluga`, `HELCOM`, `GPS`). Die kosten pro
 * Lauf eine Anfrage, aber sie gehen nicht kaputt — und ein Register, das alles
 * enthält, sagt nichts mehr darüber aus, was jemand tatsächlich entschieden hat.
 */
export const BEWUSST_GLEICH: ReadonlySet<string> = new Set([
	// „Land" als Beobachtungsort — englisch dasselbe Wort. DeepL liest es
	// sonst als Staat und liefert „Country".
	'formoptions_sightingfrom_land',
	// Anfang eines Zeitraums. DeepL liest es als Navigationsziel („Home").
	'components_map_panel_dualrangeslider_text_start',
	// Eine Domain ist kein Text.
	'routes_about_page_text_meeresmuseum_de',
	// Zahl, Einheit und die Leerzeichen dazwischen. DeepL zieht sie zusammen.
	'report_components_sections_media_text_max_imagemb_mb'
]);
