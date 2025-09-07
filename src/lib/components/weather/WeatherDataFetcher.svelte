<script lang="ts">
	import { Cloud } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { WeatherData } from '$lib/services/weatherService';
	import { kmhToMs } from '$lib/services/weatherService';

	// Calculate Beaufort scale from wind speed
	function windSpeedToBeaufort(speedKmh: number): number {
		if (speedKmh < 2) return 0;
		if (speedKmh < 6) return 1;
		if (speedKmh < 12) return 2;
		if (speedKmh < 20) return 3;
		if (speedKmh < 29) return 4;
		if (speedKmh < 39) return 5;
		if (speedKmh < 50) return 6;
		if (speedKmh < 62) return 7;
		if (speedKmh < 75) return 8;
		if (speedKmh < 89) return 9;
		if (speedKmh < 103) return 10;
		if (speedKmh < 118) return 11;
		return 12;
	}

	interface Props {
		latitude: number | null;
		longitude: number | null;
		date: string | null;
		time: string | null;
		onWeatherFetched: (formFields: Record<string, string>) => void;
		autoFetch?: boolean;
		buttonText?: string;
		showInCard?: boolean;
	}

	let {
		latitude,
		longitude,
		date,
		time,
		onWeatherFetched,
		autoFetch = false,
		buttonText = 'Wetterdaten abrufen',
		showInCard = true
	}: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let weatherData = $state<WeatherData | null>(null);
	let showSuggestions = $state(false);
	let lastFetchKey = $state<string>('');

	// Check if we can fetch weather
	const canFetch = $derived(
		latitude !== null && 
		longitude !== null && 
		date !== null && 
		date !== ''
	);

	// Create a key for current fetch params
	const fetchKey = $derived(
		`${latitude}-${longitude}-${date}-${time || ''}`
	);

	// Auto-fetch when params change
	$effect(() => {
		if (autoFetch && canFetch && fetchKey !== lastFetchKey) {
			fetchWeather();
		}
	});

	async function fetchWeather() {
		if (!canFetch) return;

		isLoading = true;
		error = null;
		weatherData = null;
		showSuggestions = false;
		lastFetchKey = fetchKey;

		try {
			const params = new URLSearchParams({
				lat: latitude!.toString(),
				lng: longitude!.toString(),
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

			weatherData = data.weather;
			showSuggestions = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isLoading = false;
		}
	}

	function applyWeatherData() {
		if (!weatherData) return;

		const formFields: Record<string, string> = {
			windForce: weatherData.seaState?.toString() || '',
			windDirection: weatherData.windDirectionCardinal
		};

		onWeatherFetched(formFields);
		showSuggestions = false;
	}

	function dismissSuggestions() {
		showSuggestions = false;
		weatherData = null;
	}
</script>

<div class="weather-fetcher">
	{#if canFetch}
		<button
			type="button"
			onclick={fetchWeather}
			disabled={isLoading}
			class="btn btn-sm btn-outline btn-primary gap-2"
			title="Wetterdaten für den angegebenen Zeitpunkt und Ort abrufen"
		>
			<Icon src={Cloud} class="h-4 w-4" />
			{isLoading ? 'Lade...' : buttonText}
		</button>
	{/if}

	{#if error}
		<div class="alert alert-error mt-2">
			<span>{error}</span>
		</div>
	{/if}

	{#if showSuggestions && weatherData}
		<div class="{showInCard ? 'card bg-base-200 mt-3 p-4' : 'mt-3'}">
			<h4 class="font-semibold mb-2 text-base">Historische Wetterdaten</h4>
			<div class="text-sm space-y-2">
				<p class="flex items-center gap-2">
					<span class="text-lg">🌡️</span> 
					<span>Temperatur: <strong>{weatherData.temperature}°C</strong></span>
				</p>
				<p class="flex items-center gap-2">
					<span class="text-lg">🌤️</span> 
					<span>Wetter: <strong>{weatherData.weatherDescription}</strong></span>
				</p>
				<p class="flex items-center gap-2">
					<span class="text-lg">💨</span> 
					<span>Wind: <strong>Beaufort {windSpeedToBeaufort(weatherData.windSpeed)}</strong> ({kmhToMs(weatherData.windSpeed)} m/s) aus <strong>{weatherData.windDirectionCardinal}</strong></span>
				</p>
				<p class="flex items-center gap-2">
					<span class="text-lg">🌊</span> 
					<span>Seegang: <strong>Stufe {weatherData.seaState}</strong> (Douglas-Skala)</span>
				</p>
				<p class="flex items-center gap-2">
					<span class="text-lg">👁️</span> 
					<span>Sichtweite: <strong>{Math.round(weatherData.visibility / 1000)} km</strong></span>
				</p>
				{#if weatherData.pressure}
				<p class="flex items-center gap-2">
					<span class="text-lg">📊</span> 
					<span>Luftdruck: <strong>{weatherData.pressure} hPa</strong></span>
				</p>
				{/if}
			</div>
			
			<div class="flex gap-2 mt-3">
				<button
					type="button"
					onclick={applyWeatherData}
					class="btn btn-sm btn-primary"
				>
					Daten übernehmen
				</button>
				<button
					type="button"
					onclick={dismissSuggestions}
					class="btn btn-sm btn-ghost"
				>
					Verwerfen
				</button>
			</div>
			
			<p class="text-xs text-base-content/60 mt-2">
				Quelle: Open-Meteo Historical Weather API
			</p>
		</div>
	{/if}
</div>

<style>
	.weather-fetcher {
		margin-top: 0.5rem;
	}
</style>