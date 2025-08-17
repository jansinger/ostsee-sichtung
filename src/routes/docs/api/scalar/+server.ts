import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

const configuration = {
	spec: {
		url: '/openapi.yml'
	},
	theme: 'default' as const
};

export const GET: RequestHandler = ScalarApiReference(configuration);