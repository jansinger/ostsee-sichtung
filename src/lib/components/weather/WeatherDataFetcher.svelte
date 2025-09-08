<script lang="ts">
	import { getSeaStateLabel } from '$lib/report/formOptions/seaState';
	import { getVisibilityLabel } from '$lib/report/formOptions/visibility';
	import { getWindStrengthLabel } from '$lib/report/formOptions/windStrength';
	import type { WeatherData, WeatherFormFields } from '$lib/services/weatherService';
	import type { WeatherDataWithMetadata } from '$lib/types';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { Calendar, Eye, Gauge, MapPin, Thermometer, Waves, Wind } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	interface Props {
		latitude: number | null;
		longitude: number | null;
		date: string | null;
		time: string | null;
		onWeatherFetched: (formFields: WeatherFormFields) => void;
		onWeatherDataFetched?: (weatherData: WeatherData) => void;
		autoFetch?: boolean;
		showInCard?: boolean;
	}

	let {
		latitude,
		longitude,
		date,
		time,
		onWeatherFetched,
		onWeatherDataFetched,
		autoFetch = false,
		showInCard = true
	}: Props = $props();

	let error = $state<string | null>(null);
	let weatherData = $state<WeatherDataWithMetadata | null>(null);
	let formFields = $state<WeatherFormFields>({} as WeatherFormFields);
	let showSuggestions = $state(false);
	let lastFetchKey = $state<string>('');
	let loading = $state(false);

	// Check if we can fetch weather
	const canFetch = $derived(
		latitude !== null && longitude !== null && date !== null && date !== ''
	);

	// Create a key for current fetch params
	const fetchKey = $derived(`${latitude}-${longitude}-${date}-${time || ''}`);

	// Auto-fetch when params change
	$effect(() => {
		if (autoFetch && canFetch && fetchKey !== lastFetchKey) {
			fetchWeather();
		}
	});

	// Returns a valid weather icon class or a fallback if unsupported
	function getWeatherIconClass(code: number | undefined): string {
		const supportedCodes = [
			0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85,
			86, 95, 96, 99
		];
		if (typeof code === 'number' && supportedCodes.includes(code)) {
			return `wi-wmo4680-${code}`;
		}
		return 'wi-na'; // fallback icon class
	}

	async function fetchWeather() {
		if (!canFetch) return;

		error = null;
		weatherData = null;
		formFields = {} as WeatherFormFields;
		showSuggestions = false;
		loading = true;
		lastFetchKey = fetchKey;

		try {
			const params = new SvelteURLSearchParams({
				lat: String(latitude),
				lng: String(longitude),
				date: date!
			});

			if (time) {
				params.append('time', time);
			}

			const response = await fetch(`/api/weather/historical?${params}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Fehler beim Abrufen der Wetterdaten');
			}

			if (!data.weather) {
				error =
					'Für diese Kombination aus Ort und Datum konnten keine Wetterdaten gefunden werden.';
				loading = false;
				return;
			}

			weatherData = data.weather;
			formFields = data.formFields;
			showSuggestions = true;

			// Store metadata about the weather data source
			if (weatherData) {
				weatherData._metadata = data.metadata;
			}

			// Automatically store full weather data in form if callback provided
			if (weatherData && onWeatherDataFetched) {
				onWeatherDataFetched(weatherData);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			loading = false;
		}
	}

	function applyWeatherData() {
		if (!formFields) return;
		onWeatherFetched(formFields as WeatherFormFields);
		
		// Also store the full weather data when applying manually
		if (weatherData && onWeatherDataFetched) {
			onWeatherDataFetched(weatherData);
		}
	}
</script>

<div class="weather-fetcher">
	{#if error}
		<div class="alert alert-error mt-2" role="alert">
			<span>{error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="mt-2 flex items-center gap-2" aria-live="polite">
			<span class="loading loading-spinner loading-sm"></span>
			<span>Lade Wetterdaten...</span>
		</div>
	{/if}

	{#if showSuggestions && weatherData}
		<div class={showInCard ? 'card bg-base-200 mt-3 p-4' : 'mt-3'}>
			<h4 class="mb-2 text-base font-semibold">
				Vorgeschlagene Wetterdaten für die angegebene Position
			</h4>
			<div class="text-base-content/70 mb-3 flex items-center gap-4 text-sm">
				<span class="flex items-center gap-1">
					<Icon src={MapPin} size="16" class="text-primary" />
					{formatLocation(longitude, latitude)}
				</span>
				<span class="flex items-center gap-1">
					<Icon src={Calendar} size="16" class="text-primary" />
					{formatLocalDateTime(weatherData.time)}
				</span>
			</div>
			<div class="space-y-2 text-sm">
				<p class="flex items-center gap-2">
					<Icon src={Thermometer} size="18" class="text-primary" />
					<span>Temperatur: <strong>{weatherData.temperature}°C</strong></span>
				</p>
				<p class="flex items-center gap-2">
					<i
						class="wi {getWeatherIconClass(weatherData.weatherCode)} text-primary"
						style="font-size: 18px;"
					></i>
					<span>Wetter: <strong>{weatherData.weatherDescription}</strong></span>
				</p>
				<p class="flex items-center gap-2">
					<Icon src={Wind} size="18" class="text-primary" />
					<span
						>Wind: <strong>Beaufort {getWindStrengthLabel(Number(formFields.windForce))}</strong>
						- {weatherData.windSpeed} km/h</span
					>
				</p>
				<p class="flex items-center gap-2">
					<i
						class="wi wi-wind wi-from-{formFields.windDirection
							? String(formFields.windDirection).toLowerCase()
							: ''} text-primary"
						style="font-size: 18px;"
					></i>
					<span
						>Windrichtung: <strong>{formFields.windDirection}</strong> - {weatherData.windDirection}°</span
					>
				</p>

				<p class="flex items-center gap-2">
					<Icon src={Waves} size="18" class="text-primary" />
					<span
						>Seegang: <strong>{getSeaStateLabel(Number(formFields.seaState))}</strong> - Stufe {weatherData.seaState}</span
					>
				</p>
				<p class="flex items-center gap-2">
					<Icon src={Eye} size="18" class="text-primary" />
					<span
						>Sichtweite: <strong>{getVisibilityLabel(Number(formFields.visibility))}</strong>
						- {Math.round(weatherData.visibility / 1000)} km</span
					>
				</p>
				{#if weatherData.pressure}
					<p class="flex items-center gap-2">
						<Icon src={Gauge} size="18" class="text-primary" />
						<span>Luftdruck: <strong>{weatherData.pressure} hPa</strong></span>
					</p>
				{/if}
			</div>

			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={applyWeatherData}
					class="btn btn-sm btn-primary"
					aria-label="Wetterdaten ins Formular übernehmen"
				>
					Daten übernehmen
				</button>
			</div>

			<div class="text-base-content/60 mt-2 text-xs space-y-1">
				<p>
					Quelle: {weatherData._metadata?.source || 'Open-Meteo Weather API'}
					{#if weatherData._metadata?.cached}
						<span class="badge badge-xs badge-info ml-2">aus Cache</span>
					{/if}
				</p>
				{#if weatherData._metadata?.dataType === 'forecast'}
					<p class="text-warning">
						⚠️ Prognosedaten für heutige Sichtung (aktualisiert sich mehrmals täglich)
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.weather-fetcher {
		margin-top: 0.5rem;
	}
</style>
