<script lang="ts">
	import { CloudIcon } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { WeatherData } from '$lib/services/weatherService';

	interface Props {
		latitude: number | null;
		longitude: number | null;
		date: string | null;
		time: string | null;
		onWeatherFetched: (formFields: Record<string, string>) => void;
	}

	let {
		latitude,
		longitude,
		date,
		time,
		onWeatherFetched
	}: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let weatherData = $state<WeatherData | null>(null);
	let showSuggestions = $state(false);

	// Check if we can fetch weather
	const canFetch = $derived(
		latitude !== null && 
		longitude !== null && 
		date !== null && 
		date !== ''
	);

	async function fetchWeather() {
		if (!canFetch) return;

		isLoading = true;
		error = null;
		weatherData = null;
		showSuggestions = false;

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
			windStrength: weatherData.seaState?.toString() || '',
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
			<Icon src={CloudIcon} class="h-4 w-4" />
			{isLoading ? 'Lade...' : 'Wetterdaten abrufen'}
		</button>
	{/if}

	{#if error}
		<div class="alert alert-error mt-2">
			<span>{error}</span>
		</div>
	{/if}

	{#if showSuggestions && weatherData}
		<div class="card bg-base-200 mt-3 p-4">
			<h4 class="font-semibold mb-2">Wetterdaten-Vorschlag</h4>
			<div class="text-sm space-y-1">
				<p>🌡️ Temperatur: {weatherData.temperature}°C</p>
				<p>💨 Wind: {weatherData.windSpeed} km/h aus {weatherData.windDirectionCardinal}</p>
				<p>🌊 Seegang: Beaufort {weatherData.seaState}</p>
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