import { redirect } from '@sveltejs/kit';
import { istTabellenUrl } from './tableRedirect';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Bookmarks der früheren Tabellen-URL (/admin?page=…) weiterleiten.
	if (istTabellenUrl(url)) {
		redirect(301, `/admin/sichtungen?${url.searchParams.toString()}`);
	}
	return {};
};
