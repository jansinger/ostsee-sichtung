/**
 * Vorläufig durchlässig — die Zähler folgen in Aufgabe 6.
 */
export function erstelleRateLimit() {
	return { pruefeIp: () => true, pruefeGlobal: () => true };
}
