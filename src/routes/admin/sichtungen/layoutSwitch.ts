/**
 * Die eine Grenze, an der `/admin/sichtungen` zwischen kompakt und weit
 * umschaltet.
 *
 * **Warum als Konstanten und nicht als Klassen im Markup:** Die Seite hat vier
 * Umschaltpunkte — kompakter Kopf, weiter Kopf, Kartenliste, Tabelle. Sie
 * standen als einzelne Utility-Klassen nebeneinander im Markup und liefen
 * auseinander: Der Kopf schaltete bei `sm` (640px), die Inhaltsfläche bei `md`
 * (768px). Zwischen 640 und 767 Pixeln stand damit der weite Kopf mit
 * Spalten-Dropdown und Bulk-Kontext über einer Kartenliste, die weder Spalten
 * noch Bulk-Auswahl kennt (Admin-Review, Befund 12). Über einen gemeinsamen
 * Namen ist die Grenze nur noch an einer Stelle änderbar.
 *
 * **`md` und nicht `sm`:** `design-system.md` („Breakpoint-Vertrag") kennt
 * genau zwei Grenzen — `md` (768px) schaltet alles Inhaltliche, `lg` (1024px)
 * ausschließlich die Navigation. `sm` ist keine Layout-Grenze.
 *
 * **Vollständige Klassennamen, keine Interpolation:** Tailwind erzeugt eine
 * Utility nur, wenn ihr Name als ganzer String im gescannten Quelltext steht
 * (`daisyui.md`, „Content-Detection"). Diese Datei liegt unter `src/` und wird
 * mitgescannt; `` `hidden ${bp}:block` `` wäre dagegen tot.
 *
 * Abgesichert durch `e2e/admin-table-breakpoint.spec.ts` — der Test misst die
 * Wirkung bei 700px und 900px, nicht die Klassennamen.
 */

/** Nur unterhalb der Grenze sichtbar (Kartenliste, kompakter Kopf). */
export const NUR_KOMPAKT = 'block md:hidden';

/** Nur ab der Grenze sichtbar, als Block (Tabelle). */
export const NUR_WEIT_BLOCK = 'hidden md:block';

/** Nur ab der Grenze sichtbar, als Flex-Zeile (weiter Kopf). */
export const NUR_WEIT_FLEX = 'hidden md:flex';
