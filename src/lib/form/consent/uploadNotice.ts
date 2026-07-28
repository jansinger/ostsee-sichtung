import { ORPHAN_RETENTION_HOURS } from '$lib/constants/uploadRetention';

/**
 * Hinweis an der Dropzone.
 *
 * Aufnahmen werden sofort beim Ablegen übertragen — also bevor feststeht, ob
 * die Meldung überhaupt abgeschickt wird. Das ist zulässig, weil Upload und
 * fachliche Prüfung Teil der Meldung sind und von `privacyConsent` gedeckt
 * werden (Entscheidung des Museums, 2026-07-28). Die Gegenleistung dafür ist
 * Transparenz und eine Befristung — beides steht in diesem Satz.
 *
 * Die Frist kommt aus `ORPHAN_RETENTION_HOURS`, damit Zusage und tatsächlicher
 * Aufräum-Lauf nicht auseinanderlaufen können (`uploadNotice.test.ts`).
 *
 * ACHTUNG: Wortlaut noch nicht vom Museum freigegeben — vor Inbetriebnahme
 * juristisch abnehmen lassen. Siehe
 * docs/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Abschnitt 6.
 */
export const UPLOAD_NOTICE =
	`Ihre Aufnahme wird beim Ablegen zu uns übertragen und dient der fachlichen ` +
	`Prüfung Ihrer Meldung. Senden Sie die Meldung nicht ab, löschen wir sie nach ` +
	`${ORPHAN_RETENTION_HOURS} Stunden automatisch. Über eine Veröffentlichung ` +
	`entscheiden Sie später selbst.`;
