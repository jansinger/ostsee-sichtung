import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// Die Karte lädt Daten dynamisch über API
	return {
		meta: {
			title: 'Sichtungskarte - Ostsee-Tiere',
			description: 'Interaktive Karte aller Meerestier-Sichtungen in der Ostsee'
		}
	};
};