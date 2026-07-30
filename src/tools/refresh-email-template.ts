#!/usr/bin/env node

/**
 * @fileoverview Zieht die geseedete Benachrichtigungs-Vorlage in `app_config` nach
 *
 * **Warum es dieses Werkzeug gibt:** Die Vorlage wird beim ersten Start nach
 * `app_config` geschrieben (`initializeDefaultConfigurations()` →
 * `insertManyIfAbsent`), und `emailService` liest sie von dort:
 * `ConfigRepository.getString('notification.email.template', getDefaultTemplate())`.
 * Der DB-Wert gewinnt, der Code-Default ist nur Fallback. Eine Änderung am
 * Default wirkt deshalb auf **keine** bestehende Installation — der Seed muss
 * ausdrücklich nachgezogen werden.
 *
 * **Was es nicht tut:** einen angepassten Kundentext überschreiben. Der
 * gespeicherte Wert wird nur ersetzt, wenn sein SHA-256 in
 * `PREVIOUS_SHIPPED_TEMPLATE_HASHES` steht, also nachweislich ein unveränderter
 * Seed ist. Jeder andere Wert wird gemeldet und bleibt liegen; `--force` gibt es
 * für den Fall, dass die Anpassung bewusst verworfen werden soll.
 *
 * `resetToDefaultConfigurations()` wäre der falsche Weg: es überschreibt **alle**
 * Schlüssel, also auch Empfänger und SMTP-Zugang.
 *
 * Verwendung:
 *   npm run config:refresh-email-template:dry-run
 *   npm run config:refresh-email-template
 *   node src/tools/refresh-email-template.ts [--dry-run] [--force]
 *
 * (Node 24 entfernt die Typen selbst — kein `--experimental-strip-types` nötig,
 * gleiches Aufrufmuster wie `cleanup-orphaned-uploads.ts`.)
 *
 * Parameter:
 *   --dry-run    Zeigt nur, was geschehen würde
 *   --force      Überschreibt auch einen angepassten Text (verwirft ihn!)
 *
 * Exit-Codes:
 *   0  nichts zu tun, oder erfolgreich nachgezogen
 *   1  der gespeicherte Wert ist angepasst und wurde nicht angefasst
 *   2  Fehler (keine Verbindung, Schlüssel fehlt in der Tabelle, …)
 */

import { createHash } from 'crypto';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import postgres from 'postgres';
import { maskConnection, resolveConnectionString } from './dbConnection.ts';
import {
	NOTIFICATION_EMAIL_DEFAULT_TEMPLATE,
	PREVIOUS_SHIPPED_TEMPLATE_HASHES
} from '../lib/server/templates/notificationEmailDefault.ts';

/** Was mit dem gespeicherten Wert geschehen soll. */
export type RefreshDecision = 'already-current' | 'refresh' | 'customised';

/**
 * Die Entscheidung als reine Funktion — der riskante Teil dieses Werkzeugs ist
 * nicht die SQL-Anweisung, sondern die Frage, *wann* überschrieben werden darf.
 * Hier ist sie ohne Datenbank testbar (`refresh-email-template.test.ts`).
 */
export function decideTemplateRefresh({
	storedHash,
	targetHash,
	knownHashes,
	force = false
}: {
	storedHash: string;
	targetHash: string;
	knownHashes: readonly string[];
	force?: boolean;
}): RefreshDecision {
	if (storedHash === targetHash) {
		return 'already-current';
	}

	// Ein bekannter Stand ist ein unveränderter Seed — der darf nachgezogen
	// werden. Alles andere hat jemand angepasst.
	if (knownHashes.includes(storedHash)) {
		return 'refresh';
	}

	return force ? 'refresh' : 'customised';
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

const CONFIG_KEY = 'notification.email.template';

function sha256(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Verbindung erst beim Lauf aufbauen, nicht beim Import: `refresh-email-template.test.ts`
 * importiert `decideTemplateRefresh` aus dieser Datei und soll dabei weder eine
 * `.env` lesen noch einen Verbindungspool anlegen.
 */
async function main(): Promise<number> {
	config();

	// Kein Fallback auf eine Standardverbindung — dieses Werkzeug schreibt und
	// darf die Zieldatenbank nie raten. Im Git-Worktree fehlt die `.env`
	// regelmäßig; genau dort ginge ein geratener Wert auf die falsche Datenbank.
	const connectionString = resolveConnectionString(process.env);
	const sql = postgres(connectionString);

	try {
		return await run(sql, connectionString);
	} finally {
		await sql.end();
	}
}

async function run(sql: postgres.Sql, connectionString: string): Promise<number> {
	console.log(`🔗 Datenbank: ${maskConnection(connectionString)}`);

	const rows = await sql<{ stored: string | null; updatedBy: string | null }[]>`
		SELECT value #>> '{}' AS stored, updated_by AS "updatedBy"
		FROM app_config
		WHERE key = ${CONFIG_KEY}
	`;

	const row = rows[0];

	if (!row) {
		// Kein Seed vorhanden — der nächste Start schreibt den aktuellen Default.
		console.log(`ℹ️  Kein Eintrag für "${CONFIG_KEY}" — nichts nachzuziehen.`);
		console.log('   Der Wert entsteht beim nächsten Start (initializeDefaultConfigurations).');
		return 0;
	}

	const stored = row.stored ?? '';
	const storedHash = sha256(stored);
	const targetHash = sha256(NOTIFICATION_EMAIL_DEFAULT_TEMPLATE);

	console.log(
		`   gespeichert: ${storedHash} (${stored.length} Zeichen, updated_by=${row.updatedBy})`
	);
	console.log(
		`   Code-Default: ${targetHash} (${NOTIFICATION_EMAIL_DEFAULT_TEMPLATE.length} Zeichen)`
	);

	const knownHashes = PREVIOUS_SHIPPED_TEMPLATE_HASHES as readonly string[];
	const decision = decideTemplateRefresh({ storedHash, targetHash, knownHashes, force: isForce });

	if (decision === 'already-current') {
		console.log('✅ Der gespeicherte Wert ist bereits der aktuelle Default.');
		return 0;
	}

	if (decision === 'customised') {
		console.error('');
		console.error('⚠️  Der gespeicherte Wert ist KEIN bekannter Seed — er wurde angepasst.');
		console.error('    Er wird nicht überschrieben. Bekannte Stände:');
		for (const hash of PREVIOUS_SHIPPED_TEMPLATE_HASHES) {
			console.error(`      ${hash}`);
		}
		console.error('');
		console.error('    Der angepasste Text muss von Hand nachgezogen werden. Zu ändern ist');
		console.error('    der Ostsee-Block: statt über die Rohflags zu verzweigen');
		console.error('      {{#if sighting.inBalticSeaGeo}} … {{#if sighting.inBalticSea}} …');
		console.error('    verzweigt die Vorlage über den vorberechneten Status:');
		console.error('      {{sighting.balticSea.label}}   — Badge-Text');
		console.error('      {{sighting.balticSea.surface}} — Badge-Fläche (sRGB-Hex)');
		console.error('      {{#if sighting.balticSea.needsAttention}} … {{/if}}');
		console.error('        └ Hinweiskasten mit {{sighting.balticSea.title}}');
		console.error('');
		console.error('    Solange das nicht geschieht, weist die Mail eine Meldung in der');
		console.error('    Bounding Box (z. B. Hamburger Hafen) weiterhin als Ostsee aus.');
		console.error('    Details: docs/OSTSEE_FLAGS.md (Fehler 4)');
		console.error('');
		console.error('    Bewusst verwerfen: erneut mit --force aufrufen.');
		return 1;
	}

	// Nur warnen, wenn tatsächlich etwas verloren geht: bei --dry-run wird nichts
	// geschrieben, die Warnung wäre dort schlicht falsch.
	const discardsCustomText = isForce && !knownHashes.includes(storedHash);

	if (isDryRun) {
		console.log(
			discardsCustomText
				? '🔍 --dry-run: würde den angepassten Text verwerfen und den Default setzen.'
				: '🔍 --dry-run: würde den Wert auf den aktuellen Default setzen.'
		);
		return 0;
	}

	if (discardsCustomText) {
		console.warn('⚠️  --force: ein angepasster Text wird überschrieben.');
	}

	await sql`
		UPDATE app_config
		SET value = ${sql.json(NOTIFICATION_EMAIL_DEFAULT_TEMPLATE)},
			updated_by = 'refresh-email-template',
			updated_at = NOW()
		WHERE key = ${CONFIG_KEY}
	`;

	console.log('✅ Vorlage nachgezogen.');
	// ConfigRepository cached 5 Minuten im Prozess — ein laufender Server sieht
	// den neuen Wert erst danach (oder nach einem Neustart).
	console.log('   Hinweis: laufende Instanzen halten den alten Wert bis zu 5 Minuten im Cache.');
	return 0;
}

// `pathToFileURL` statt Zeichenkettenbau — gleiches Muster wie in
// cleanup-orphaned-uploads.ts: nur bei direktem Aufruf laufen, damit der Test
// die reine Entscheidungsfunktion importieren kann, ohne eine DB-Verbindung
// aufzubauen.
const isDirectRun =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	// `sql.end()` liegt im finally von main() — hier gibt es keine Verbindung
	// mehr zu schließen, auch nicht im Fehlerfall (etwa wenn schon
	// resolveConnectionString wirft, bevor ein Pool existiert).
	main()
		.then((code) => process.exit(code))
		.catch((error: unknown) => {
			console.error('❌ Fehler:', error instanceof Error ? error.message : error);
			process.exit(2);
		});
}
