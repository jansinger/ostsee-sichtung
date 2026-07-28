/**
 * @fileoverview Berlin-Kalendertagsgrenzen als UTC-Instants.
 *
 * Die Zeitstempelspalten halten echte UTC-Zeitpunkte, Datumsfilter meinen aber
 * deutsche Kalendertage: „Sichtungen vom 01.06. bis 30.06." heißt „ab 01.06.
 * 00:00 deutscher Zeit bis vor 01.07. 00:00 deutscher Zeit". Naive
 * `new Date('YYYY-MM-DD')`-Grenzen (UTC-Mitternacht) verlieren dagegen die
 * Randstunden — und mit einer inklusiven 00:00-Obergrenze den ganzen letzten Tag.
 *
 * Gleiche Grenzsemantik wie `getYearRange` in `src/lib/legacy-api/date-utils.ts`:
 * halboffenes Intervall `[start, endExclusive)`, prozesszonen-unabhängig.
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BERLIN_TIME_ZONE = 'Europe/Berlin';

/**
 * UTC-Zeitpunkt von 00:00 deutscher Ortszeit des angegebenen Kalendertags.
 *
 * Fixpunkt-Iteration über den Offset: Der erste Schätzwert liest den Offset am
 * UTC-Mitternachts-Instant ab. Am Tag der Winterzeit-Umstellung liegt dieser
 * Instant bereits hinter der Umstellung (02:00 MEZ) und liefert den falschen
 * Offset — die zweite Ablesung am korrigierten Kandidaten konvergiert.
 * Berlin-Mitternacht selbst liegt nie in einer Umstellungslücke (die Umstellung
 * passiert um 02:00/03:00), zwei Iterationen genügen daher immer.
 *
 * @param isoDate - Kalendertag im Format `YYYY-MM-DD` (deutsche Ortszeit)
 * @returns UTC-Instant der Berliner Mitternacht dieses Tages
 * @throws {TypeError} wenn `isoDate` nicht dem Format `YYYY-MM-DD` entspricht
 */
export function berlinMidnightUtc(isoDate: string): Date {
	const match = ISO_DATE_PATTERN.exec(isoDate);
	if (!match) {
		throw new TypeError(`Erwartet YYYY-MM-DD, erhalten: "${isoDate}"`);
	}

	const [, year, month, day] = match;
	const alsUtcGelesen = Date.UTC(Number(year), Number(month) - 1, Number(day));

	let kandidat = alsUtcGelesen - berlinOffsetMs(new Date(alsUtcGelesen));
	kandidat = alsUtcGelesen - berlinOffsetMs(new Date(kandidat));

	return new Date(kandidat);
}

/**
 * Halboffenes UTC-Intervall über Berliner Kalendertage: `[start, endExclusive)`.
 *
 * `endExclusive` ist die Berliner Mitternacht des Folgetags von `toIsoDate` —
 * der letzte Tag gehört damit vollständig zum Intervall. Abfragen müssen
 * `>= start AND < endExclusive` verwenden (kein `BETWEEN`).
 *
 * @param fromIsoDate - erster Kalendertag (`YYYY-MM-DD`, inklusiv)
 * @param toIsoDate - letzter Kalendertag (`YYYY-MM-DD`, inklusiv)
 */
export function berlinDayRangeUtc(
	fromIsoDate: string,
	toIsoDate: string
): { start: Date; endExclusive: Date } {
	return {
		start: berlinMidnightUtc(fromIsoDate),
		endExclusive: berlinMidnightUtc(naechsterKalendertag(toIsoDate))
	};
}

/** Folgetag eines `YYYY-MM-DD`-Strings, über UTC-Arithmetik zonenneutral. */
function naechsterKalendertag(isoDate: string): string {
	const match = ISO_DATE_PATTERN.exec(isoDate);
	if (!match) {
		throw new TypeError(`Erwartet YYYY-MM-DD, erhalten: "${isoDate}"`);
	}
	const [, year, month, day] = match;
	const folgetag = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));

	return folgetag.toISOString().slice(0, 10);
}

/** Offset von `Europe/Berlin` gegenüber UTC zum gegebenen Zeitpunkt, in Millisekunden. */
function berlinOffsetMs(instant: Date): number {
	// sv-SE liefert "YYYY-MM-DD HH:MM:SS" — als UTC gelesen ergibt die Differenz den Offset.
	const abgelesen = new Date(
		`${instant.toLocaleString('sv-SE', { timeZone: BERLIN_TIME_ZONE }).replace(' ', 'T')}Z`
	);

	return abgelesen.getTime() - instant.getTime();
}
