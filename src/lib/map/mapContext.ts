import { getContext, setContext } from 'svelte';
import type { MapCountManager } from './countManager';

/**
 * Svelte context key for the map count manager.
 * Uses Symbol to avoid key collisions (same pattern as formContext.ts).
 */
export const MAP_COUNT_MANAGER_KEY = Symbol('map-count-manager');

export function getMapCountManager(): MapCountManager | undefined {
	return getContext<MapCountManager | undefined>(MAP_COUNT_MANAGER_KEY);
}

export function setMapCountManager(manager: MapCountManager): void {
	setContext(MAP_COUNT_MANAGER_KEY, manager);
}
