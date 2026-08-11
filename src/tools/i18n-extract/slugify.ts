/**
 * `lower_snake`-Schlüssel aus beliebigem Text bauen — Umlaut-Transliteration
 * inklusive.
 *
 * Ursprünglich Teil von `i18n-inventory.ts` (dem 30-KB-Altwerkzeug, das dieses
 * neue Werkzeug mittelfristig ablösen soll). Hierher verschoben, damit
 * `i18n-extract/messageKey.ts` nicht am Altwerkzeug hängt. `i18n-inventory.ts`
 * importiert `slugify` von hier und exportiert es unverändert weiter, damit
 * sein eigener Test und seine CLI unangetastet bleiben.
 */

const UMLAUT_MAP: Record<string, string> = {
	ä: 'ae',
	ö: 'oe',
	ü: 'ue',
	ß: 'ss',
	Ä: 'Ae',
	Ö: 'Oe',
	Ü: 'Ue'
};

function transliterate(input: string): string {
	return input.replace(/[äöüßÄÖÜ]/g, (ch) => UMLAUT_MAP[ch] ?? ch);
}

/** Baut ein `lower_snake`-Segment aus beliebigem Text, auf maximal `maxLength` gekürzt. */
export function slugify(input: string, maxLength = 40): string {
	const transliterated = transliterate(input);
	const slug = transliterated
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
	return slug.slice(0, maxLength).replace(/_+$/g, '') || 'text';
}
