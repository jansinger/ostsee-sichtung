import type { User } from '$lib/types';

export const isUserInRole = (user: User | null | undefined, requiredRoles?: string[]): boolean => {
	// If no roles are required, any authenticated user has access
	if (!requiredRoles || requiredRoles.length === 0) {
		return !!user;
	}
	
	// Check if user has at least one of the required roles
	if (user && requiredRoles.length > 0) {
		return requiredRoles.some((role) => user.roles?.includes(role));
	}
	
	return false;
};

export const isAdminUser = (user: User | null | undefined): boolean => {
	return isUserInRole(user, ['admin']);
};
