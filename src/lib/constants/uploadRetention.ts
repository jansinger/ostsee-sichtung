/**
 * Aufbewahrungsfrist für verwaiste Uploads — Dateien, die übertragen, aber nie
 * mit einer abgeschickten Sichtung verknüpft wurden.
 *
 * Steht bewusst **nicht** unter `$lib/server`: Der Hinweis an der Dropzone
 * (`$lib/form/consent/uploadNotice`) nennt dieselbe Zahl, läuft aber im
 * Browser. Nur so können Zusage und tatsächlicher Aufräum-Lauf
 * (`$lib/server/media/orphanCleanup`) nicht auseinanderlaufen.
 */
export const ORPHAN_RETENTION_HOURS = 24;
