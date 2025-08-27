import { requireUserRole } from '$lib/server/auth/auth';
import { isAdminUser } from '$lib/utils/auth';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	requireUserRole(url, locals.user, ['admin']);
	return {
		user: locals.user,
		isAdmin: isAdminUser(locals.user)
	};
}) satisfies LayoutServerLoad;
