/**
 * Adresse für Medien, die zu groß für den Upload sind.
 *
 * Vom Museum am 2026-07-31 bestätigt; sie steht (verschleiert) auch auf
 * meeresmuseum.de. Bewusst eine Konstante: Fehlertext, Bestätigungsseite und
 * Formularhinweis nennen sie, und drei Kopien laufen erfahrungsgemäß
 * auseinander.
 */
export const MEDIA_FALLBACK_EMAIL = 'sichtungen@meeresmuseum.de';

/**
 * Feedback-Kontakt der Erklärung zur Barrierefreiheit (`/barrierefreiheit`).
 *
 * Bewusst dieselbe Adresse wie der Medien-Fallback — das Museum führt genau
 * ein Sichtungs-Postfach. Der eigene Name macht die zweite Rolle sichtbar:
 * Bekommt eine der beiden Aufgaben später eine eigene Adresse, ändert sich
 * die andere nicht still mit.
 */
export const ACCESSIBILITY_FEEDBACK_EMAIL = MEDIA_FALLBACK_EMAIL;
