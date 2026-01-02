import { version } from '../../../package.json';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		version
	};
};
