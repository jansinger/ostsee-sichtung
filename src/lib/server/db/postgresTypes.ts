/**
 * Treiber-Typen für `postgres.js`, damit Zeitstempel nicht an der Zeitzone des
 * Prozesses hängen.
 *
 * **Worum es geht.** Die Spalten der Sichtungstabelle sind `timestamp without
 * time zone` und halten laut Konvention echte UTC-Zeitpunkte
 * (`docs/ENVIRONMENT.md`, Abschnitt `TZ`). Drizzle pinnt beide Richtungen —
 * `toISOString()` beim Schreiben, angehängtes `+0000` beim Lesen. Der Lesweg
 * greift aber nur, wenn der Treiber einen **String** übergibt:
 *
 * ```js
 * // drizzle-orm/pg-core/columns/timestamp.js
 * mapFromDriverValue(value) {
 *   if (typeof value === 'string') return new Date(value + '+0000');
 *   return value;   // ← postgres.js landet hier
 * }
 * ```
 *
 * `postgres.js` parst den Wert nämlich selbst, und zwar als **Ortszeit** des
 * Prozesses. Nachgemessen mit einem eigenständigen Client unter
 * `TZ=Europe/Berlin`: Die Spalte enthält `2026-08-02 12:30:00`, zurück kommt ein
 * `Date` auf `10:30Z`. Die Zusicherung „unabhängig von `TZ`" hängt damit allein
 * am gepinnten `TZ=UTC` — und nicht am Code, wie die Dokumentation nahelegt.
 *
 * **Was nicht gilt:** Ein Fehlverhalten der laufenden Anwendung. Gemessen am
 * 2026-08-02 liest sie Sommer- wie Winterzeitpunkte korrekt, auch ohne diesen
 * Override, weil ihr Prozess in UTC läuft. Dieser Override ist deshalb eine
 * zweite Sicherung, kein reparierter Fehler: Er nimmt der Zusicherung die
 * Abhängigkeit von einer Umgebungsvariablen.
 *
 * **Bewusst nur 1114.** `timestamptz` (1184) trägt den Offset auf der Leitung
 * und wird von `postgres.js` korrekt geparst; die Session-Spalten hängen daran.
 * `date` (1082) bleibt ebenfalls unberührt — dort gibt es keine Uhrzeit, die
 * verrutschen könnte.
 */

/** Postgres-OID von `timestamp without time zone`. */
export const TIMESTAMP_OID = 1114;

/**
 * Reicht `timestamp`-Werte unverändert als Text durch.
 *
 * `to`/`serialize` sind Pflichtfelder der `types`-Option von `postgres.js`,
 * kommen hier aber nie zum Zug: Sie greifen nur, wenn ein Wert ausdrücklich über
 * `sql.typed.…` geschrieben wird. Geschrieben wird weiterhin über Drizzle, das
 * `toISOString()` als gewöhnlichen Parameter schickt.
 */
export const TIMESTAMP_AS_TEXT = {
	to: TIMESTAMP_OID,
	from: [TIMESTAMP_OID],
	serialize: (value: unknown): unknown => value,
	parse: (value: string): string => value
};
