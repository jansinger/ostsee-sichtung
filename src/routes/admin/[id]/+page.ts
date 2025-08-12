import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const { id } = params;
	let sighting = null;
	if (!id || isNaN(Number(id))) {
		return error(400, 'Keine valide Sichtungs-ID angegeben');
	}

	let response;
	try {
		response = await fetch(`/api/sightings/${id}`);
		sighting = await response.json();
	} catch (err) {
		return error(500, 'Fehler beim Laden der Sichtung: ' + err);
	}
	if (!response.ok) {
		return error(404, 'Sichtung nicht gefunden');
	}

	return { sighting };
};
