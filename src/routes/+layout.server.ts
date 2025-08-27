import { isAdminUser } from '$lib/utils/auth';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	return {
		user: locals.user || null,
		isAdmin: isAdminUser(locals.user)
	};
}) satisfies LayoutServerLoad;
