import { browser } from '$app/environment';

export const isNotIFrame =
	browser && window && typeof window !== 'undefined' && window === window.top;
