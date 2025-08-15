import { requireUserRole } from '$lib/server/auth/auth';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	requireUserRole(url, locals.user, ['admin']);
	return {
		user: locals.user
	};
}) satisfies LayoutServerLoad;
