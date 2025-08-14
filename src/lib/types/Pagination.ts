/**
 * Pagination and page data interfaces
 */

import type { FrontendSighting } from './FrontendSighting.js';

export interface Pagination {
	page: number;
	perPage: number;
	totalPages: number;
	total: number;
}

export interface PageData {
	sightings: FrontendSighting[];
	pagination: Pagination;
}