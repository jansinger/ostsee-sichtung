/**
 * `id` der Offline-Fläche aus `SubmitStatus.svelte`.
 *
 * Sie wird seit dem UX-Review-Nachgang (2026-08-06) von außen referenziert:
 * `StepNavigation.svelte` hängt sie bei gesperrtem Absenden als
 * `aria-describedby` an den Absenden-Knopf und springt bei einem Klick darauf
 * dorthin. Ein Literal auf beiden Seiten wäre ein stiller Bruch — ein
 * `aria-describedby` ins Leere meldet niemand.
 *
 * **Warum eine eigene Datei und nicht der `<script module>`-Block von
 * `SubmitStatus.svelte`:** Dort stünde sie fachlich am richtigen Ort (der Typ
 * `SubmitState` liegt genau da), aber `npm run type-check` fährt `tsc --noEmit`,
 * und für `tsc` ist jede `.svelte`-Datei die Ambient-Deklaration `*.svelte` mit
 * ausschließlich einem Default-Export. Eine `.ts`-Datei — hier
 * `SubmitStatus.svelte.test.ts` — kann von dort deshalb keinen benannten Export
 * beziehen (TS2614), auch wenn `svelte-check` es klaglos auflöst. Der
 * `SubmitState`-Import in `ModernReportForm.svelte` fällt nicht darunter: Das
 * ist selbst eine `.svelte`-Datei und wird nur von `svelte-check` geprüft.
 */
export const SUBMIT_STATUS_OFFLINE_ID = 'submit-status-offline';
