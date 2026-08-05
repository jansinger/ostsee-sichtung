<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/Icon.svelte';
	import { outsideBalticNotice, outsideBalticSeverity } from '$lib/report/wording';

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
		latitude = $bindable(54.5),
		noticeOverride = undefined,
		severityOverride = undefined
	}: {
		longitude?: number;
		latitude?: number;
		/**
		 * Überschreibt den Text des Ostsee-Hinweises. Ohne Wert bleibt der
		 * bisherige Sichtungs-Wortlaut — Admin-Maske und Admin-Ansicht ändern
		 * sich dadurch nicht (dasselbe Muster wie `OLMap`s `hintOverride`).
		 */
		noticeOverride?: string;
		/** Überschreibt die Dringlichkeit des Hinweises (`alert-warning`/`alert-info`). */
		severityOverride?: 'info' | 'warning';
	} = $props();

	// Am Strand ist eine Position außerhalb der Ostsee der Normalfall (Totfund) —
	// nur der Bürger-Aufrufer (`PositionPanel.svelte`) übergibt die Overrides und
	// fällt dort auf `info` zurück. Ohne Override (Admin-Pfad, `Location.svelte`)
	// bleibt es beim bisherigen Sichtungs-Wortlaut: `outsideBalticNotice(false)`/
	// `outsideBalticSeverity(false)` liefern genau den Text und die Farbe, die
	// diese Komponente vor Task 6 fest codiert hatte — hier mit fixem `false`
	// aufgerufen, nicht aus dem Formular-Kontext, damit kein zweiter isDead-Zweig
	// entsteht.
	const outsideNoticeText = $derived(noticeOverride ?? outsideBalticNotice(false));
	const outsideNoticeSeverity = $derived(severityOverride ?? outsideBalticSeverity(false));

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
			// Resolve cached promise to update currentResult (coordinates may have changed back)
			requestCache.get(cacheKey)!.then(
				(result) => {
					if (coordinates === cacheKey) {
						currentResult = result;
						isLoading = false;
						error = undefined;
					}
				},
				(checkError) => {
					if (coordinates === cacheKey) {
						const errorMessage =
							checkError instanceof Error ? checkError.message : 'Ein Fehler ist aufgetreten.';
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
				}
			);
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
						checkError instanceof Error ? checkError.message : 'Ein Fehler ist aufgetreten.';
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

<div class="mt-2 min-h-[6rem]">
	{#if coordinates}
		{#if isLoading}
			<!-- Loading state -->
			<div class="alert mt-0 mb-4" transition:slide>
				<span class="loading loading-spinner loading-sm"></span>
				<span>Prüfe Position in der Ostsee...</span>
			</div>
		{:else if error}
			<!-- Error state -->
			<div
				class="alert alert-error mt-0 mb-4"
				data-testid="verify-location-failed"
				transition:slide
			>
				<Icon icon="lucide:circle-alert" class="h-6 w-6 shrink-0" />
				<span>Fehler beim Prüfen der Position: {error}</span>
			</div>
		{:else if currentResult}
			<!-- Result state -->
			<div transition:slide>
				{#if currentResult.inBaltic}
					<!-- In Baltic Sea -->
					<div class="alert alert-success mt-0 mb-4" data-testid="verify-location-inside">
						<Icon icon="lucide:circle-check" class="h-6 w-6 shrink-0" />
						<span>Die Koordinaten liegen innerhalb der Ostsee.</span>
					</div>
				{:else if currentResult.inChartArea}
					<!-- Outside Baltic Sea (only show in browser). Klasse und Text kommen aus
					     `noticeOverride`/`severityOverride` (Props, s.o.) — ohne sie bleibt es
					     beim bisherigen Sichtungs-Wortlaut in `alert-warning`. -->
					{#if outsideNoticeSeverity === 'info'}
						<!-- `lucide:info`, nicht `circle-alert`: Die Alerts sind auf Soft-Style
						     umgestellt (Text in `base-content`), die Bedeutung trägt deshalb das
						     Icon (`.claude/rules/daisyui.md`). `alert-warning` daneben nutzt
						     weiterhin `circle-alert` — beide Varianten mit demselben Zeichen waren
						     sonst praktisch ununterscheidbar (Review Task 6, Befund 3). `OLMap.svelte`
						     hält für seinen eigenen `alert-info` dieselbe Zuordnung. -->
						<div class="alert alert-info mt-0 mb-4" data-testid="verify-location-outside">
							<Icon icon="lucide:info" class="h-6 w-6 shrink-0" />
							<span>{outsideNoticeText}</span>
						</div>
					{:else}
						<div class="alert alert-warning mt-0 mb-4" data-testid="verify-location-outside">
							<Icon icon="lucide:circle-alert" class="h-6 w-6 shrink-0" />
							<span>{outsideNoticeText}</span>
						</div>
					{/if}
				{:else}
					<!-- Invalid coordinates -->
					<div class="alert alert-error mt-0 mb-4" data-testid="verify-location-invalid">
						<Icon icon="lucide:circle-alert" class="h-6 w-6 shrink-0" />
						<span
							>Die Koordinaten liegen außerhalb des gültigen Bereichs oder sind ungültig. Bitte
							überprüfen Sie die Eingabe.</span
						>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
