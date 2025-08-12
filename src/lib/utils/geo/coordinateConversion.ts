/**
 * Konvertiert Grad, Minuten und Sekunden in Dezimalgrad
 * @param deg Grad
 * @param min Minuten
 * @param sec Sekunden
 * @param sign Vorzeichen (1 für positiv, -1 für negativ)
 * @returns Dezimalgrad
 */
export function dmsToDd(deg: number, min: number, sec: number, sign: 1 | -1): number {
	// Sicherstellen, dass die Werte gültig sind
	deg = !isNaN(deg) ? deg : 0;
	min = !isNaN(min) ? min : 0;
	sec = !isNaN(sec) ? sec : 0;
	return Number((sign * (Math.abs(deg) + min / 60 + sec / 3600)).toFixed(4));
}

/**
 * Konvertiert Grad und Dezimalminuten in Dezimalgrad
 * @param deg Grad
 * @param min Dezimalminuten
 * @param sign Vorzeichen (1 für positiv, -1 für negativ)
 * @returns Dezimalgrad
 */
export function dmToDd(deg: number, min: number, sign: 1 | -1): number {
	// Sicherstellen, dass die Werte gültig sind
	deg = !isNaN(deg) ? deg : 0;
	min = !isNaN(min) ? min : 0;
	return Number((sign * (Math.abs(deg) + min / 60)).toFixed(4));
}

/**
 * Konvertiert Dezimalgrad in Grad, Minuten und Sekunden
 * @param dd Dezimalgrad
 * @returns Objekt mit Grad, Minuten und Sekunden
 */
export function ddToDms(dd: number): { deg: number; min: number; sec: number } {
	if (isNaN(dd)) dd = 0;
	const sign = dd < 0 ? -1 : 1;
	const abs = Math.abs(dd);
	const deg = Math.floor(abs);
	const minFloat = (abs - deg) * 60;
	const min = Math.floor(minFloat);
	const sec = Math.round((minFloat - min) * 60);
	return {
		deg: Number((sign * deg).toFixed(0)),
		min: Number(min.toFixed(0)),
		sec: Number(sec.toFixed(0))
	};
}

/**
 * Konvertiert Dezimalgrad in Grad und Dezimalminuten
 * @param dd Dezimalgrad
 * @returns Objekt mit Grad und Dezimalminuten
 */
export function ddToDm(dd: number): { deg: number; min: number } {
	if (isNaN(dd)) dd = 0;
	const sign = dd < 0 ? -1 : 1;
	const abs = Math.abs(dd);
	const deg = Math.floor(abs);
	const min = (abs - deg) * 60;
	return { deg: Number((sign * deg).toFixed(0)), min: Number(min.toFixed(2)) };
}
