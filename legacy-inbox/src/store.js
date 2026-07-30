import { open, mkdir, readdir, rename, access, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const VERZEICHNISSE = ['posteingang', 'abgewiesen', 'importiert'];

/**
 * Schreibt Umschläge atomar und dauerhaft auf die Platte.
 *
 * Kennt bewusst kein HTTP: Diese Datei ist einzeln testbar und hat genau
 * eine Aufgabe — dafür zu sorgen, dass nichts verloren geht.
 */
export async function erstelleStore({ datenVerzeichnis }) {
	let naechsteNummer = 1;
	// Serialisiert die Nummernvergabe: zwei gleichzeitige Requests dürfen
	// nie dieselbe Nummer bekommen.
	let warteschlange = Promise.resolve();

	async function initialisiere() {
		for (const unter of VERZEICHNISSE) {
			await mkdir(path.join(datenVerzeichnis, unter), { recursive: true, mode: 0o700 });
		}
		naechsteNummer = (await hoechsteVorhandeneNummer()) + 1;
	}

	/**
	 * Ermittelt die höchste vergebene Nummer aus den Dateinamen statt aus einer
	 * eigenen Zählerdatei. Eine solche Datei könnte von den Sichtungsdateien
	 * abweichen und wäre dann eine zweite Wahrheit.
	 */
	async function hoechsteVorhandeneNummer() {
		let hoechste = 0;
		for (const unter of VERZEICHNISSE) {
			const dateien = await readdir(path.join(datenVerzeichnis, unter)).catch(() => []);
			for (const datei of dateien) {
				const treffer = /^(\d+)__/.exec(datei);
				if (treffer) {
					hoechste = Math.max(hoechste, Number(treffer[1]));
				}
			}
		}
		return hoechste;
	}

	async function istBeschreibbar() {
		try {
			for (const unter of VERZEICHNISSE) {
				await access(path.join(datenVerzeichnis, unter), constants.W_OK);
			}
			return true;
		} catch {
			return false;
		}
	}

	async function schreibe(umschlag, ziel) {
		const lfdNr = await naechsteNummerHolen();
		const vollstaendig = { ...umschlag, lfd_nr: lfdNr };

		const zeitstempel = umschlag.empfangen_am.replace(/[:.]/g, '-');
		const name = `${String(lfdNr).padStart(6, '0')}__${zeitstempel}.json`;
		const pfad = path.join(datenVerzeichnis, ziel, name);
		const tmpPfad = `${pfad}.tmp`;

		const inhalt = JSON.stringify(vollstaendig, null, '\t');

		let griff;
		try {
			griff = await open(tmpPfad, 'wx', 0o600);
			await griff.writeFile(inhalt, 'utf8');
			// Erst der Dateiinhalt …
			await griff.sync();
			await griff.close();
			griff = null;

			await rename(tmpPfad, pfad);
		} catch (fehler) {
			if (griff) await griff.close().catch(() => {});
			await unlink(tmpPfad).catch(() => {});
			throw fehler;
		}

		// … dann der Verzeichniseintrag. Ohne diesen zweiten sync kann der
		// rename einen Stromausfall nicht überleben, obwohl die Datei
		// geschrieben war — die Datei wäre nach dem Neustart verschwunden.
		// Scheitert dieser sync, ist die Datei aber bereits unter ihrem
		// endgültigen Namen auf der Platte, also wird hier nur protokolliert
		// statt einen erfolgreichen Schreibvorgang als Fehler zu melden.
		try {
			const verzeichnisGriff = await open(path.join(datenVerzeichnis, ziel), 'r');
			try {
				await verzeichnisGriff.sync();
			} finally {
				await verzeichnisGriff.close().catch(() => {});
			}
		} catch (fehler) {
			console.error('Verzeichnis-fsync nach rename fehlgeschlagen:', fehler);
		}

		return { lfdNr, pfad };
	}

	function naechsteNummerHolen() {
		const ergebnis = warteschlange.then(() => naechsteNummer++);
		warteschlange = ergebnis.then(
			() => undefined,
			() => undefined
		);
		return ergebnis;
	}

	return { initialisiere, istBeschreibbar, schreibe };
}
