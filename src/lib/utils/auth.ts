/**
 * @deprecated Client-side auth functions have been moved to server-only.
 * 
 * SECURITY NOTICE: Client-side role checking has been disabled to prevent
 * browser manipulation. All role checks now happen server-side only.
 * 
 * Use server-side functions from $lib/server/auth/auth.ts instead:
 * - isUserInRole()
 * - isAdminUser() 
 * - isSuperAdminUser()
 * 
 * This file is kept as a placeholder to prevent import errors,
 * but these functions should not be used in client code.
 */

// These functions are intentionally left empty to prevent client-side role checking
export const isUserInRole = (): boolean => {
	console.warn('⚠️  Client-side role checking is disabled for security. Use server-side checks instead.');
	return false;
};

export const isAdminUser = (): boolean => {
	console.warn('⚠️  Client-side admin checking is disabled for security. Use server-side checks instead.');
	return false;
};

export const isSuperAdminUser = (): boolean => {
	console.warn('⚠️  Client-side superadmin checking is disabled for security. Use server-side checks instead.');
	return false;
};
