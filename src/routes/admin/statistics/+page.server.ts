import { createLogger } from '$lib/logger.server';
import { db } from '$lib/server/db';
import { approvedOnly, openOnly } from '$lib/server/db/approvalFilter';
import { sightings } from '$lib/server/db/schema';
import { berlinCalendarDate, berlinDatePart } from '$lib/server/db/sqlTimeZone';
import { and, isNotNull, ne, sql, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const logger = createLogger('admin:statistics:page');

/**
 * Kennzahlen eines Freigabestatus — nie über beide Status summiert.
 *
 * `verifiedSightings` ist hier 2026-07-30 entfallen. Die Kennzahl zählte
 * innerhalb der freigegebenen Menge noch einmal `geprueft = 1` und war damit
 * tautologisch (gemessen 19.253 von 19.262 = 99,95 %). Sie widersprach außerdem
 * der Invariante des Projekts: eine Sichtung ist ungeprüft **oder** geprüft, und
 * geprüft heißt veröffentlicht (siehe CLAUDE.md und `.claude/rules/api.md`) — ein
 * eigener „verifiziert"-Anteil innerhalb der Veröffentlichten suggeriert eine
 * Qualitätsdimension, die es nach diesem Modell nicht gibt. Die 9 Zeilen, die
 * tatsächlich abweichen (`freigegeben_am` gesetzt, `geprueft = 0`), sind
 * Inkonsistenzen aus dem Altsystem und gehören in eine Datenprüfung, nicht in
 * eine Übersichtskennzahl.
 */
export interface AdminBasicStats {
	totalSightings: number;
	avgGroupSize: number;
	maxGroupSize: number;
	deadAnimals: number;
	withMedia: number;
}

const EMPTY_BASIC_STATS: AdminBasicStats = {
	totalSightings: 0,
	avgGroupSize: 0,
	maxGroupSize: 0,
	deadAnimals: 0,
	withMedia: 0
};

/**
 * Basis-Kennzahlen für **eine** Grundmenge
 *
 * Vorgabe des Meeresmuseums: Nicht freigegebene Sichtungen dürfen in der
 * Admin-Statistik vorkommen, aber niemals mit freigegebenen zu einer Zahl
 * verschmelzen. Zwei getrennte Läufe statt einer Abfrage über die ganze
 * Tabelle machen eine vermischte Summe strukturell unmöglich.
 *
 * Die Grundmenge kommt als fertiges Prädikat herein statt als Scope-Name: Diese
 * Seite fährt seit 2026-08-08 `approvedOnly()` gegen `openOnly()` und damit
 * keine der beiden Hälften von `approvalFilter()` (Begründung an der
 * Aufrufstelle in `load()`).
 */
async function loadBasicStats(grundmenge: SQL): Promise<AdminBasicStats> {
	const [row] = await db
		.select({
			totalSightings: sql<number>`COUNT(*)::integer`,
			avgGroupSize: sql<number>`COALESCE(AVG(${sightings.totalCount})::numeric, 0)`,
			maxGroupSize: sql<number>`COALESCE(MAX(${sightings.totalCount})::integer, 0)`,
			deadAnimals: sql<number>`COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END)::integer`,
			withMedia: sql<number>`COUNT(CASE WHEN ${sightings.mediaUpload} != 0 THEN 1 END)::integer`
		})
		.from(sightings)
		.where(grundmenge);

	return row ?? EMPTY_BASIC_STATS;
}

export const load: PageServerLoad = async () => {
	try {
		// Basis-Kennzahlen getrennt nach Grundmenge: freigegeben und offen.
		//
		// Die zweite Menge lief bis 2026-08-08 über `pendingOnly()` („nicht
		// freigegeben") und zählte damit die abgelehnten Sichtungen mit, obwohl die
		// Anzeige sie an jeder Stelle „noch offen" nennt. Der Eingang (`/admin`)
		// zählt seit der Rejection-Triage über `openOnly()` — beide Seiten wichen
		// dadurch sichtbar voneinander ab (gemessen 663 hier gegen 657 dort, die
		// Differenz waren die 6 Abgelehnten). Abgelehnt ist erledigt, nicht offen.
		//
		// `approvalFilter()` bleibt davon unberührt: Sein `'pending'` meint weiter
		// „nicht freigegeben" und ist die Gegenmenge der öffentlichen Statistik
		// (`getSightingStatistics`) — dort wäre der Ausschluss der Abgelehnten
		// falsch, weil er eine dritte Menge neben freigegeben/nicht freigegeben
		// aufmachte. Deshalb ändert sich hier die Aufrufstelle und nicht das
		// gemeinsame Prädikat.
		const [approvedStats, openStats] = await Promise.all([
			loadBasicStats(approvedOnly()),
			loadBasicStats(openOnly())
		]);
		const basicStats = { approved: approvedStats, open: openStats };

		// Species distribution
		const speciesStats = await db
			.select({
				species: sightings.species,
				count: sql<number>`COUNT(*)::integer`,
				percentage: sql<number>`ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2)::numeric`,
				avgGroupSize: sql<number>`AVG(${sightings.totalCount})::numeric`,
				deadCount: sql<number>`COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END)::integer`,
				deadPercentage: sql<number>`ROUND(COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END) * 100.0 / COUNT(*), 2)::numeric`
			})
			.from(sightings)
			.where(approvedOnly())
			.groupBy(sightings.species)
			.orderBy(sql`COUNT(*) DESC`);

		// Jahr und Monat in deutscher Ortszeit gruppieren: `sichtungsdatum` hält
		// seit der UTC-Migration echte Zeitpunkte. Eine Sichtung am 01.01. um 00:30
		// Ortszeit steht darin als 31.12. 23:30 UTC und gehört trotzdem ins neue Jahr.
		// Yearly trends (excluding obvious data errors)
		const yearlyStats = await db
			.select({
				year: sql<number>`${berlinDatePart('year', sightings.sightingDate)}`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(and(isNotNull(sightings.sightingDate), approvedOnly()))
			.groupBy(berlinDatePart('year', sightings.sightingDate))
			.orderBy(berlinDatePart('year', sightings.sightingDate));

		// Monthly distribution (last 10 years)
		const monthlyStats = await db
			.select({
				month: sql<number>`${berlinDatePart('month', sightings.sightingDate)}`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(and(isNotNull(sightings.sightingDate), approvedOnly()))
			.groupBy(berlinDatePart('month', sightings.sightingDate))
			.orderBy(berlinDatePart('month', sightings.sightingDate));

		// Recent activity (last 30 days)
		const recentActivity = await db
			.select({
				date: sql<string>`${berlinCalendarDate(sightings.created)}`,
				count: sql<number>`COUNT(*)`
			})
			.from(sightings)
			// `created` ist naives timestamp mit UTC-Inhalt. Der Vergleich gegen das
			// timestamptz von NOW() würde sonst über die DB-Session-Zeitzone gecastet,
			// die die Anwendung nirgends pinnt.
			//
			// N3 (bewusst so belassen): Die Fenstergrenze ist ein UTC-Instant, die
			// Gruppierung darunter aber Berlin-Kalendertage (`berlinCalendarDate`).
			// Das verschiebt höchstens den ältesten der 30 angezeigten Tage um bis zu
			// 2 h (Sommerzeit) — kein Tag *innerhalb* des Fensters bekommt dadurch
			// falsche Werte, nur der Rand zeigt ggf. 29 statt 30 volle Tage. Eine
			// exakte Berlin-Mitternacht-Grenze bräuchte mehrere verkettete
			// `AT TIME ZONE`-Hops (Berlin-Tag → Instant → UTC-naiv), die sich ohne
			// Postgres-Semantiktest (siehe sqlTimeZone.test.ts-Lücke im Review) nicht
			// zuverlässig verifizieren lassen — das Risiko eines neuen, unbemerkten
			// Zeitzonenfehlers wiegt hier schwerer als der kosmetische Rand-Tag einer
			// „letzte 30 Tage"-Trendanzeige.
			// Freigabebezug wie überall sonst auf dieser Seite: vorher war dies die
			// einzige Abfrage ohne Filter und zählte damit als Einzige die gesamte
			// Tabelle inklusive noch offener Meldungen (Vorgabe 3 in approvalFilter.ts).
			.where(
				and(
					approvedOnly(),
					sql`${sightings.created} >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '30 days'`
				)
			)
			.groupBy(berlinCalendarDate(sightings.created))
			.orderBy(sql`${berlinCalendarDate(sightings.created)} DESC`)
			.limit(30);

		// User engagement statistics - simple version
		const [userCount] = await db
			.select({
				uniqueUsers: sql<number>`COUNT(DISTINCT email)::integer`
			})
			.from(sightings)
			.where(and(sql`email IS NOT NULL AND email != ''`, approvedOnly()));

		// Repeat users count - safe subquery approach
		const repeatUsers = await db
			.select({
				email: sql<string>`email`,
				count: sql<number>`COUNT(*)::integer`
			})
			.from(sightings)
			.where(and(sql`email IS NOT NULL AND email != ''`, approvedOnly()))
			.groupBy(sql`email`)
			.having(sql`COUNT(*) > 1`);

		const userStats = {
			uniqueUsers: userCount?.uniqueUsers || 0,
			repeatUsers: repeatUsers.length,
			repeatUserPercentage:
				(userCount?.uniqueUsers || 0) > 0
					? (repeatUsers.length / (userCount?.uniqueUsers || 1)) * 100
					: 0
		};

		// Ship name statistics - safe version
		const [shipCount] = await db
			.select({
				uniqueShips: sql<number>`COUNT(DISTINCT schiffsname)::integer`,
				totalWithShipName: sql<number>`COUNT(*)::integer`
			})
			.from(sightings)
			.where(and(sql`schiffsname IS NOT NULL AND schiffsname != ''`, approvedOnly()));

		const shipStats = [
			{
				uniqueShips: shipCount?.uniqueShips || 0,
				totalWithShipName: shipCount?.totalWithShipName || 0
			}
		];

		// Top observers - admin view with email addresses
		const topObservers = await db
			.select({
				email: sightings.email,
				sightingCount: sql<number>`COUNT(*)::integer`,
				// Berlin-Kalendertag statt naivem UTC-Cast (M1) — sonst rutscht eine
				// Sichtung um 00:30 Ortszeit auf den UTC-Vortag.
				firstSighting: sql<string>`${berlinCalendarDate(sql`MIN(${sightings.created})`)}`,
				lastSighting: sql<string>`${berlinCalendarDate(sql`MAX(${sightings.created})`)}`,
				avgGroupSize: sql<number>`AVG(${sightings.totalCount})::numeric`
			})
			.from(sightings)
			.where(
				and(
					sql`${sightings.email} IS NOT NULL AND ${sightings.email} != '' AND ${sightings.email} NOT LIKE '%@meeresmuseum.de'`,
					approvedOnly()
				)
			)
			.groupBy(sightings.email)
			.having(sql`COUNT(*) > 1`)
			.orderBy(sql`COUNT(*) DESC`)
			.limit(10);

		// Data quality statistics - step-by-step safe approach
		const [totalVerified] = await db
			.select({ total: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(approvedOnly());

		const [coordVerified] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(and(approvedOnly(), isNotNull(sightings.latitude), isNotNull(sightings.longitude)));

		const [behaviorVerified] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(and(approvedOnly(), isNotNull(sightings.behavior), ne(sightings.behavior, 0)));

		const qualityStats = [
			{
				withCoordinates: Number(coordVerified?.count) || 0,
				withBehavior: Number(behaviorVerified?.count) || 0,
				total: Number(totalVerified?.total) || 0
			}
		];

		// Die frühere `geographicStats`-Abfrage ist hier ersatzlos entfallen.
		//
		// Sie wurde bei jedem Seitenaufruf über die gesamte Tabelle ausgeführt, aber
		// von `+page.svelte` nie gerendert — reine Last ohne Abnehmer. Ihre Logik war
		// zudem doppelt falsch: gezählt wurde die Spalte `ostsee_geo` (die grobe
		// Bounding Box) unter dem Feldnamen `inBalticSea`, und das mit `= 1`, während
		// der überwiegende Teil der Altdaten den Wert `2` trägt (Stand 2026-07-30:
		// 15.070 von 19.253 geprüften Zeilen).
		//
		// Eine wiederbelebte Kennzahl zählt `ostsee` (das Polygon) und geht über
		// `getBalticSeaStatus()` aus `$lib/utils/geo/balticSeaStatus.ts` — dieselbe
		// Funktion, an der Übersicht, Detailansicht und Benachrichtigungs-Mail
		// hängen. Sie muss außerdem die vier Zustände abbilden statt zweier: ohne
		// Koordinaten ist auch `ostsee = 1` keine Aussage.

		return {
			basicStats,
			speciesStats,
			yearlyStats,
			monthlyStats,
			recentActivity,
			userStats,
			shipStats: shipStats[0] || { uniqueShips: 0, totalWithShipName: 0 },
			topObservers,
			qualityStats: qualityStats[0] || {
				withCoordinates: 0,
				withDate: 0,
				withBehavior: 0,
				withMedia: 0,
				total: 0
			}
		};
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Error loading statistics'
		);
		throw error;
	}
};
