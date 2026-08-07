/**
 * Mechanischer Guard: `geprueft` (`verified`) darf nirgends mehr **gelesen**
 * werden. Geschrieben wird die Spalte weiterhin — vom Verify-Endpunkt und vom
 * Insert-Pfad, damit ein etwaiger Leser im Altsystem konsistente Daten sieht.
 *
 * Nötig, weil die Rückkehr schleichend passiert: Ein `sighting.verified` in
 * einer neuen Zelle sieht harmlos aus und weicht doch von dem ab, was die
 * Öffentlichkeit sieht (31 abweichende Zeilen im Bestand, 2026-08-07).
 * Ein Review fängt das nicht zuverlässig — bei `freigegeben_am` hat es
 * monatelang nicht gegriffen (PR #701).
 *
 * Die Dateisuche ist wörtlich aus `src/lib/server/db/approvalPredicateScan.test.ts`
 * übernommen (rekursives `readdirSync`/`statSync`/`join`, kein `globSync`) — ein
 * zweites Suchverfahren im selben Repo würde getrennt altern.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ERLAUBT = [
	'src/lib/server/db/schema.ts',
	'src/routes/api/sightings/[id]/verify/+server.ts',
	'src/lib/server/db/mapFormToSighting.ts',
	'src/lib/server/db/sightingRepository.ts',
	'src/lib/form/validation/sightingSchema.ts',
	'src/lib/components/admin/verifiedReadScan.test.ts',
	'src/lib/components/admin/sightingStatus.ts',
	'src/lib/components/admin/sightingStatus.test.ts'
];

const SOURCE_ROOT = 'src';

/** Rekursiv alle Dateien unter `SOURCE_ROOT` — dieselbe Bauart wie in approvalPredicateScan.test.ts. */
function alleQuelldateien(): string[] {
	const files: string[] = [];

	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir).sort()) {
			const path = join(dir, entry);
			if (statSync(path).isDirectory()) {
				walk(path);
				continue;
			}
			files.push(path.replaceAll('\\', '/'));
		}
	};

	walk(SOURCE_ROOT);
	return files;
}

describe('verified/geprueft wird nirgends gelesen', () => {
	it('findet keine neue Lesestelle', () => {
		const treffer: string[] = [];
		for (const datei of alleQuelldateien()) {
			if (ERLAUBT.some((e) => datei.endsWith(e))) continue;
			const inhalt = readFileSync(datei, 'utf8');
			// `email_verified` (Auth0-Claim) ist etwas anderes und bleibt erlaubt.
			const zeilen = inhalt
				.split('\n')
				// Kommentaranteil abschneiden: ein Trailing-Kommentar, der die Spalte
				// nur ERWÄHNT, ist keine Lesestelle. Genau daran wäre dieser Guard
				// sonst an Task 6 gescheitert.
				.map((z) => z.split('//')[0] ?? '')
				.filter((z) => /\bsightings?\.verified\b|\bgeprueft\b|\.verified\s*\?/.test(z))
				.filter((z) => !z.includes('email_verified'))
				.filter((z) => !z.trimStart().startsWith('*'));
			if (zeilen[0] !== undefined) treffer.push(`${datei}: ${zeilen[0].trim()}`);
		}
		expect(
			treffer,
			`Statt \`verified\` gehört \`getSightingStatus()\` gelesen:\n${treffer.join('\n')}`
		).toEqual([]);
	});
});
