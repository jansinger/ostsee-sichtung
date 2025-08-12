import { toStringHDMS } from 'ol/coordinate';

export function formatLocation(
	lon: number | undefined | null,
	lat: number | undefined | null
): string {
	if (lon === null || lon === undefined || lat === null || lat === undefined || 
		isNaN(Number(lon)) || isNaN(Number(lat))) {
		return '-';
	}

	return toStringHDMS([Number(lon), Number(lat)]);
}
