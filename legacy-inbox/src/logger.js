/**
 * Zeilenweises JSON auf stdout. Passenger schreibt das in die Logdatei der
 * Domain; damit ist es ohne weitere Infrastruktur auswertbar.
 *
 * Nie den Payload protokollieren — er enthält Namen, E-Mail-Adressen und
 * Anschriften. Ins Protokoll gehören Kennzahlen, nicht Inhalte.
 */
export function protokolliere(stufe, ereignis, felder = {}) {
	process.stdout.write(
		JSON.stringify({ zeit: new Date().toISOString(), stufe, ereignis, ...felder }) + '\n'
	);
}
