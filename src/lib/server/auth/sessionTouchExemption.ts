/**
 * @fileoverview Pfade, deren Requests die Session NICHT verlängern.
 *
 * Einzige Stelle mit dieser Ausnahmeliste — `hooks.server.ts` fragt nur hier ab,
 * statt die Entscheidung über die Datei verstreut zu treffen.
 *
 * Grund für die Ausnahme: `resolveSessionUser` verlängert bei jedem Request das
 * Inaktivitätsfenster fort, sobald seit dem letzten Mal mindestens
 * `SESSION_TOUCH_THRESHOLD_SECONDS` (60 s) vergangen sind. Der Poller hinter dem
 * Admin-Eingang (`inboxPoller.ts`) fragt exakt im selben Takt nach — praktisch
 * jeder Poll träfe die Schwelle und verlängerte die Sitzung um eine weitere
 * Stunde. Ein sichtbar offener `/admin`-Tab liefe damit nie mehr in den
 * 1-Stunden-Leerlauf-Ablauf, den `SESSION_IDLE_SECONDS` in sessionRepository.ts
 * bewusst vorsieht — und genau den Fall, den dieses Feature erzeugt (Bearbeiter
 * geht weg, Tab bleibt offen), soll der Leerlauf-Ablauf gerade abdecken.
 */
const PFADE_OHNE_SESSION_VERLAENGERUNG = new Set(['/api/admin/inbox-status']);

/** Soll ein Request auf `pathname` das Inaktivitätsfenster fortschreiben? */
export function verlaengertSession(pathname: string): boolean {
	return !PFADE_OHNE_SESSION_VERLAENGERUNG.has(pathname);
}
