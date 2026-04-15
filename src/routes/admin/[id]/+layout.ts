import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = async ({ params, fetch }) => {
	const { id } = params;
	let sighting = null;
	if (!id || isNaN(Number(id))) {
		throw error(400, 'Keine valide Sichtungs-ID angegeben');
	}

	let response;
	try {
		response = await fetch(`/api/sightings/${id}`);
		sighting = await response.json();
	} catch (err) {
		console.error('Fehler beim Laden der Sichtung', err);
		throw error(500, 'Fehler beim Laden der Sichtung');
	}
	if (!response.ok) {
		throw error(404, 'Sichtung nicht gefunden');
	}

	return { sighting };
};
