import { isValidDateParam } from '../../../admin/dateParam';
import { between, eq } from 'drizzle-orm';
import { sightings as sightingsTable } from '$lib/server/db/schema';

export type ExportFilterParams = {
	fromDate: string;
	toDate: string;
	verified: string | null;
	entryChannel: string | null;
	mediaUpload: string | null;
};

type ValidationError = { field: 'fromDate' | 'toDate'; message: string };
export type ParseExportFilterResult = { params: ExportFilterParams } | { error: ValidationError };

export function parseExportFilterParams(url: URL): ParseExportFilterResult {
	const fromDate = url.searchParams.get('fromDate') || '';
	const toDate = url.searchParams.get('toDate') || '';
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	if (fromDate && !isValidDateParam(fromDate)) {
		return {
			error: { field: 'fromDate', message: 'Ungültiges fromDate-Format. Erwartet: YYYY-MM-DD' }
		};
	}
	if (toDate && !isValidDateParam(toDate)) {
		return {
			error: { field: 'toDate', message: 'Ungültiges toDate-Format. Erwartet: YYYY-MM-DD' }
		};
	}

	return { params: { fromDate, toDate, verified, entryChannel, mediaUpload } };
}

export function buildExportConditions(params: ExportFilterParams) {
	const { fromDate, toDate, verified, entryChannel, mediaUpload } = params;
	const conditions = [];

	if (isValidDateParam(fromDate) && isValidDateParam(toDate)) {
		conditions.push(between(sightingsTable.sightingDate, new Date(fromDate), new Date(toDate)));
	}
	if (verified === '1') {
		conditions.push(eq(sightingsTable.verified, 1));
	} else if (verified === '0') {
		conditions.push(eq(sightingsTable.verified, 0));
	}
	if (entryChannel && entryChannel !== 'all') {
		const channelId = parseInt(entryChannel, 10);
		if (!isNaN(channelId)) {
			conditions.push(eq(sightingsTable.entryChannel, channelId));
		}
	}
	if (mediaUpload === '1') {
		conditions.push(eq(sightingsTable.mediaUpload, 1));
	} else if (mediaUpload === '0') {
		conditions.push(eq(sightingsTable.mediaUpload, 0));
	}

	return conditions;
}
