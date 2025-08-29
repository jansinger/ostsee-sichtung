import { requireUserRole } from '$lib/server/auth/auth';
import type { PublicUser } from '$lib/types/User';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	requireUserRole(url, locals.user, ['admin']);
	
	// Security: Only send minimal admin user data to frontend
	const adminUser: PublicUser | null = locals.user ? {
		sub: locals.user.sub,
		email: locals.user.email,
		name: locals.user.name,
		picture: locals.user.picture,
		nickname: locals.user.nickname,
		// REMOVED: roles - not needed in admin frontend since access is already verified
	} : null;
	
	return {
		user: adminUser,
		// Server-computed admin status - no client-side role checking needed
		isAdmin: true // We know user is admin since requireUserRole passed
	};
}) satisfies LayoutServerLoad;
