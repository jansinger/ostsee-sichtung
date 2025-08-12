<script lang="ts">
	import { browser } from '$app/environment';
	import { CircleAlert, CircleCheck } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	import { SvelteMap } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';

	interface BalticSeaResult {
		inBaltic: boolean;
		inChartArea: boolean;
		longitude?: number;
		latitude?: number;
	}

	let {
		longitude = $bindable(13.5),
		latitude = $bindable(54.5)
	}: {
		longitude?: number;
		latitude?: number;
	} = $props();

	let isLoading = $state(false);
	let error = $state<string | undefined>(undefined);
	let currentResult = $state<BalticSeaResult | undefined>(undefined);

	// Cache for avoiding duplicate requests
	let requestCache = new SvelteMap<string, Promise<BalticSeaResult>>();

	// Coordinates as derived value for reactivity
	let coordinates = $derived(`${Number(longitude)},${Number(latitude)}`);

	async function checkBalticSeaAPI(lon: number, lat: number): Promise<BalticSeaResult> {
		const response = await fetch(`/api/geo/inBaltic?longitude=${lon}&latitude=${lat}`);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
			throw new Error(errorData.message || `HTTP ${response.status}`);
		}
		
		return await response.json();
	}

	// Effect to handle coordinate changes
	$effect(() => {
		if (!browser) return;

		const lon = Number(longitude);
		const lat = Number(latitude);
		const cacheKey = `${lon},${lat}`;

		// Check if we already have this request cached
		if (requestCache.has(cacheKey)) {
			return;
		}

		// Start loading
		isLoading = true;
		error = undefined;

		const fetchPromise = checkBalticSeaAPI(lon, lat)
			.then((result) => {
				// Only update if this is still the current request
				if (coordinates === cacheKey) {
					currentResult = result;
					isLoading = false;
					error = undefined;
				}
				return result;
			})
			.catch((checkError) => {
				// Only update if this is still the current request
				if (coordinates === cacheKey) {
					const errorMessage =
						checkError instanceof Error ? checkError.message : 'Unknown error occurred';
					console.error('Failed to check Baltic Sea location:', checkError);
					error = errorMessage;
					isLoading = false;

					const fallbackResult: BalticSeaResult = {
						inBaltic: false,
						inChartArea: false,
						longitude: lon,
						latitude: lat
					};
					currentResult = fallbackResult;
				}
				throw checkError; // Re-throw for cache cleanup
			});

		// Cache the promise
		requestCache.set(cacheKey, fetchPromise);

		// Clean up cache on error
		fetchPromise.catch(() => {
			requestCache.delete(cacheKey);
		});
	});
</script>

<div class="min-h-[6rem]">
	{#if browser && isLoading}
		<!-- Loading state -->
		<div class="alert mt-0 mb-4" transition:slide>
			<span class="loading loading-spinner loading-sm"></span>
			<span>Prüfe Position in der Ostsee...</span>
		</div>
	{:else if error}
		<!-- Error state -->
		<div class="alert alert-error mt-0 mb-4" transition:slide>
			<Icon src={CircleAlert} class="h-6 w-6 shrink-0" />
			<span>Fehler beim Prüfen der Position: {error}</span>
		</div>
	{:else if currentResult}
		<!-- Result state -->
		<div transition:slide>
			{#if currentResult.inBaltic}
				<!-- In Baltic Sea -->
				<div class="alert alert-success mt-0 mb-4">
					<Icon src={CircleCheck} class="h-6 w-6 shrink-0" />
					<span>Die Koordinaten liegen innerhalb der Ostsee.</span>
				</div>
			{:else if browser}
				<!-- Outside Baltic Sea (only show in browser) -->
				<div class="alert alert-warning mt-0 mb-4">
					<Icon src={CircleAlert} class="h-6 w-6 shrink-0" />
					<span>
						Die Koordinaten liegen scheinbar außerhalb der Ostsee. Bitte prüfen Sie die Position.
						Bei Sichtungen von Land und küstennahen Sichtungen kann dieser Hinweis erscheinen, die
						Daten werden trotzdem gespeichert.
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
