import { describe, expect, it } from 'vitest';
import {
	MAX_AGGREGATE_ERRORS,
	MAX_CAUSE_DEPTH,
	MAX_MESSAGE_LENGTH,
	buildErrorLogFields,
	describeErrorCauses,
	redactSecrets,
	serializeErrorChain,
	type SerializedError
} from '$lib/server/utils/errorChain';

/**
 * Ein Glied der Kette, das es geben MUSS — wirft sonst mit klarer Meldung.
 * (`noUncheckedIndexedAccess` ist aktiv, ein direkter Index wäre `| undefined`.)
 */
function entryAt(error: unknown, index: number): SerializedError {
	const entry = serializeErrorChain(error)[index];
	if (!entry) throw new Error(`Kein Ketten-Eintrag an Position ${index}`);
	return entry;
}

describe('serializeErrorChain', () => {
	it('serialisiert einen Fehler ohne cause als einzelnen Eintrag', () => {
		const chain = serializeErrorChain(new TypeError('kaputt'));

		expect(chain).toEqual([{ name: 'TypeError', message: 'kaputt' }]);
	});

	it('folgt der cause-Kette rekursiv über mehrere Ebenen', () => {
		const root = new Error('CONNECTION_ENDED');
		const middle = new Error('connection closed', { cause: root });
		const top = new Error('Failed query: select 1', { cause: middle });

		const chain = serializeErrorChain(top);

		expect(chain.map((entry) => entry.message)).toEqual([
			'Failed query: select 1',
			'connection closed',
			'CONNECTION_ENDED'
		]);
	});

	it('übernimmt code, errno, syscall, severity und routine von Postgres-Fehlern', () => {
		const pgError = Object.assign(new Error('too many connections for role "ostsee_app"'), {
			code: '53300',
			errno: -61,
			syscall: 'connect',
			severity: 'FATAL',
			routine: 'InitializeSessionUserId'
		});

		const entry = entryAt(pgError, 0);

		expect(entry).toMatchObject({
			name: 'Error',
			code: '53300',
			errno: -61,
			syscall: 'connect',
			severity: 'FATAL',
			routine: 'InitializeSessionUserId'
		});
	});

	it('lässt nicht freigegebene Felder weg — auch solche mit Verbindungsdaten', () => {
		const pgError = Object.assign(new Error('connect ECONNREFUSED'), {
			code: 'ECONNREFUSED',
			connectionString: 'postgresql://ostsee_app:s3cr3t@localhost:5432/ostsee',
			detail: 'Key (email)=(person@example.com) already exists.',
			query: 'select * from sichtungen',
			parameters: ['geheim']
		});

		const entry = entryAt(pgError, 0);

		expect(Object.keys(entry).sort()).toEqual(['code', 'message', 'name']);
	});

	it('redigiert Zugangsdaten in Verbindungsstrings, behält aber Host und Datenbank', () => {
		const error = new Error(
			'getaddrinfo ENOTFOUND für postgresql://ostsee_app:s3cr3t@db.example.com:5432/ostsee'
		);

		const entry = entryAt(error, 0);

		expect(entry.message).not.toContain('s3cr3t');
		expect(entry.message).not.toContain('ostsee_app');
		expect(entry.message).toContain('db.example.com:5432/ostsee');
	});

	it('redigiert Zugangsdaten auch ohne Passwort-Teil', () => {
		const entry = entryAt(new Error('postgres://ostsee_app@localhost:5432/ostsee'), 0);

		expect(entry.message).not.toContain('ostsee_app');
		expect(entry.message).toContain('localhost:5432/ostsee');
	});

	it('redigiert Schlüssel-Wert-Paare mit Passwörtern und Tokens', () => {
		const error = new Error(
			'env: PGPASSWORD=hunter2 password: "abc def" SESSION_SECRET=xyz api_key=123'
		);

		const entry = entryAt(error, 0);

		expect(entry.message).not.toMatch(/hunter2|abc def|xyz|123/);
		expect(entry.message).toContain('PGPASSWORD');
	});

	it('redigiert auch in der cause-Kette', () => {
		const cause = new Error('auth failed for postgresql://app:s3cr3t@localhost/ostsee');
		const entry = entryAt(new Error('Failed query', { cause }), 1);

		expect(entry.message).not.toContain('s3cr3t');
	});

	it('kürzt überlange Meldungen', () => {
		const long = 'x'.repeat(MAX_MESSAGE_LENGTH + 100);

		const entry = entryAt(new Error(long), 0);

		expect(entry.message.length).toBeLessThan(long.length);
		expect(entry.message).toMatch(/gekürzt/);
	});

	it('begrenzt die Tiefe und meldet die Kürzung', () => {
		let error = new Error('ebene-0');
		for (let i = 1; i <= MAX_CAUSE_DEPTH + 3; i++) {
			error = new Error(`ebene-${i}`, { cause: error });
		}

		const chain = serializeErrorChain(error);

		// Wurzel + MAX_CAUSE_DEPTH Ursachen + Kürzungs-Eintrag
		expect(chain).toHaveLength(MAX_CAUSE_DEPTH + 2);
		expect(chain.at(-1)?.name).toBe('CauseChainTruncated');
		expect(chain.at(-1)?.message).toContain(String(MAX_CAUSE_DEPTH));
	});

	it('respektiert ein eigenes Tiefenlimit', () => {
		const inner = new Error('innen');
		const outer = new Error('aussen', { cause: inner });

		const chain = serializeErrorChain(outer, 1);

		expect(chain.map((entry) => entry.name)).toEqual(['Error', 'Error']);
		expect(chain.map((entry) => entry.message)).toEqual(['aussen', 'innen']);
	});

	it('bricht bei einer zyklischen cause-Kette ab, statt endlos zu laufen', () => {
		const a: Error & { cause?: unknown } = new Error('a');
		const b = new Error('b', { cause: a });
		a.cause = b;

		const chain = serializeErrorChain(a);

		// Jedes Glied genau einmal, danach Abbruch — und der Zyklus wird als eigener
		// Eintrag sichtbar gemacht, nicht still geschluckt.
		expect(chain.map((entry) => entry.message)).toEqual([
			'a',
			'b',
			'Zyklische cause-Kette — Abbruch'
		]);
		expect(chain.at(-1)?.name).toBe('CauseChainCycle');
	});

	it('verarbeitet einen String als cause', () => {
		const chain = serializeErrorChain(new Error('oben', { cause: 'CONNECTION_ENDED' }));

		expect(chain[1]).toEqual({ name: 'string', message: 'CONNECTION_ENDED' });
	});

	it('verarbeitet ein einfaches Objekt als cause', () => {
		const chain = serializeErrorChain(
			new Error('oben', { cause: { message: 'timeout', code: 'ETIMEDOUT' } })
		);

		expect(chain[1]).toMatchObject({ message: 'timeout', code: 'ETIMEDOUT' });
	});

	it('verarbeitet Nicht-Fehler-Werte an der Wurzel', () => {
		expect(serializeErrorChain('nur ein String')).toEqual([
			{ name: 'string', message: 'nur ein String' }
		]);
		expect(serializeErrorChain(null)).toEqual([{ name: 'null', message: 'null' }]);
		expect(serializeErrorChain(undefined)).toEqual([{ name: 'undefined', message: 'undefined' }]);
	});

	it('ignoriert eine null-cause', () => {
		expect(serializeErrorChain(new Error('oben', { cause: null }))).toHaveLength(1);
	});
});

/*
 * Drizzle baut seine Meldung als `Failed query: ${query}\nparams: ${params}`
 * (belegt in node_modules/drizzle-orm/errors.js:12). Die Parameter sind in dieser
 * Anwendung E-Mail, Name, Anschrift und Freitext einer Sichtung — sie dürfen nicht
 * ins Log. Das SQL selbst bleibt erhalten, es ist der diagnostische Wert.
 */
describe('Redigierung von Query-Parametern', () => {
	const drizzleMessage =
		'Failed query: select "email", "name" from "sichtungen" where "id" = $1\n' +
		'params: melder@example.com,Max Mustermann,Musterweg 3';

	it('entfernt den params-Block, behält aber das SQL', () => {
		const redacted = redactSecrets(drizzleMessage);

		expect(redacted).not.toMatch(/melder@example\.com|Max Mustermann|Musterweg/);
		expect(redacted).toContain('select "email", "name" from "sichtungen" where "id" = $1');
	});

	it('greift auch, wenn der Fehler serialisiert wird', () => {
		const entry = entryAt(new Error(drizzleMessage), 0);

		expect(entry.message).not.toContain('melder@example.com');
	});

	it('lässt Meldungen ohne params-Block unverändert', () => {
		expect(redactSecrets('Failed query: select 1')).toBe('Failed query: select 1');
	});
});

/*
 * Ist die Datenbank nicht erreichbar, wirft Node einen AggregateError: message ist
 * leer, `cause` fehlt, und die einzige Information (Host, Port, Adressfamilie) steckt
 * in `errors`. Ohne diesen Zweig endet die Kette bei einem leeren Eintrag — also
 * genau in dem Szenario, für das dieses Modul gebaut wurde.
 */
describe('AggregateError', () => {
	function connectionRefused(): AggregateError {
		return Object.assign(
			new AggregateError(
				[
					new Error('connect ECONNREFUSED ::1:5432'),
					new Error('connect ECONNREFUSED 127.0.0.1:5432')
				],
				''
			),
			{ code: 'ECONNREFUSED' }
		);
	}

	it('serialisiert die Einzelfehler aus errors', () => {
		const entry = entryAt(connectionRefused(), 0);

		expect(entry.code).toBe('ECONNREFUSED');
		expect(entry.errors?.map((e) => e.message)).toEqual([
			'connect ECONNREFUSED ::1:5432',
			'connect ECONNREFUSED 127.0.0.1:5432'
		]);
	});

	it('findet einen AggregateError auch als cause', () => {
		const top = new Error('Failed query: select 1', { cause: connectionRefused() });
		const entry = entryAt(top, 1);

		expect(entry.errors).toHaveLength(2);
	});

	it('redigiert auch innerhalb von errors', () => {
		const aggregate = new AggregateError(
			[new Error('auth failed for postgresql://app:s3cr3t@localhost/ostsee')],
			''
		);

		expect(entryAt(aggregate, 0).errors?.[0]?.message).not.toContain('s3cr3t');
	});

	it('begrenzt die Anzahl und meldet die Kürzung', () => {
		const many = Array.from({ length: MAX_AGGREGATE_ERRORS + 3 }, (_, i) => new Error(`e${i}`));
		const entry = entryAt(new AggregateError(many, ''), 0);

		expect(entry.errors).toHaveLength(MAX_AGGREGATE_ERRORS + 1);
		expect(entry.errors?.at(-1)?.name).toBe('AggregateErrorsTruncated');
	});

	it('lässt errors weg, wenn die Liste leer ist', () => {
		expect(entryAt(new AggregateError([], 'leer'), 0).errors).toBeUndefined();
	});
});

describe('describeErrorCauses', () => {
	it('gibt undefined zurück, wenn es keine cause gibt', () => {
		expect(describeErrorCauses(new Error('allein'))).toBeUndefined();
		expect(describeErrorCauses('kein Fehler')).toBeUndefined();
	});

	it('gibt nur die Ursachen zurück, ohne den bereits geloggten Wurzelfehler', () => {
		const root = new Error('CONNECTION_ENDED');
		const top = new Error('Failed query: select 1', { cause: root });

		expect(describeErrorCauses(top)).toEqual([{ name: 'Error', message: 'CONNECTION_ENDED' }]);
	});
});

/*
 * `buildErrorLogFields` ist der einzige Ort, an dem die Log-Felder entstehen — damit
 * die Redigierung nicht nur für `causes` gilt, sondern auch für `error` und `stack`.
 * Vorher baute `hooks.server.ts` diese beiden Felder von Hand und umging sie dabei.
 */
describe('buildErrorLogFields', () => {
	it('redigiert die Wurzel-Meldung, nicht nur die Ursachen', () => {
		const error = new Error('Failed query: select 1\nparams: melder@example.com', {
			cause: new Error('CONNECTION_ENDED')
		});

		const fields = buildErrorLogFields(error);

		expect(JSON.stringify(fields)).not.toContain('melder@example.com');
		expect(fields.error).toContain('Failed query: select 1');
		expect(fields.causes).toEqual([{ name: 'Error', message: 'CONNECTION_ENDED' }]);
	});

	it('redigiert auch den Stack — dessen erste Zeile enthält die Meldung', () => {
		const fields = buildErrorLogFields(new Error('boom\nparams: melder@example.com'));

		expect(fields.stack).toBeDefined();
		expect(fields.stack).not.toContain('melder@example.com');
	});

	/* Das SQL kann länger sein als MAX_MESSAGE_LENGTH. Für die Kettenglieder ist die
	   Kürzung ein sinnvolles Netz, für die Wurzel wäre sie ein Diagnoseverlust. */
	it('kürzt die Wurzel-Meldung nicht', () => {
		const long = `Failed query: ${'x'.repeat(MAX_MESSAGE_LENGTH + 100)}`;

		expect(buildErrorLogFields(new Error(long)).error).toBe(long);
	});

	it('kommt mit Nicht-Fehler-Werten zurecht', () => {
		expect(buildErrorLogFields('kaputt')).toEqual({ error: 'kaputt' });
		expect(buildErrorLogFields(null)).toEqual({ error: 'null' });
	});

	it('lässt stack und causes weg, wenn es sie nicht gibt', () => {
		const fields = buildErrorLogFields('nur ein String');

		expect(fields.stack).toBeUndefined();
		expect(fields.causes).toBeUndefined();
	});
});
