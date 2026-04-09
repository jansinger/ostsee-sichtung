<script lang="ts">
	import WeatherDataFetcher from '$lib/components/weather/WeatherDataFetcher.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import type { WeatherData, WeatherFormFields, OpenMeteoRawData } from '$lib/services/weatherService';
	import { convertToStoredWeatherData } from '$lib/services/weatherService';
	import Icon from '$lib/components/Icon.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const { form, handleChange } = getFormContext();

	let latitude: number | null = $derived($form.latitude);
	let longitude: number | null = $derived($form.longitude);
	let sightingDate: string | null = $derived($form.sightingDate);
	let sightingTime: string | undefined | null = $derived($form.sightingTime);

	// Handle weather data
	function handleWeatherData(weatherFields: WeatherFormFields) {
		// Update form fields with weather data
		Object.entries(weatherFields).forEach(([field, value]) => {
			handleChange({
				target: { name: field, value }
			} as unknown as Event);
		});
	}

	// Handle full weather data storage
	function handleFullWeatherData(weatherData: WeatherData) {
		// Bestimme automatisch den data_type basierend auf dem Sichtungsdatum
		const today = new Date().toISOString().split('T')[0] || '';
		const sightingDateStr = sightingDate || '';
		const dataType = sightingDateStr >= today ? 'forecast' : 'historical';
		
		// Convert to StoredWeatherData format for database storage
		const storedWeatherData = convertToStoredWeatherData(
			weatherData,
			weatherData as OpenMeteoRawData, // Use weatherData as rawData fallback
			dataType, // Automatische Erkennung: forecast für heutige/zukünftige, historical für vergangene Daten
			Number(latitude) || 0,
			Number(longitude) || 0
		);

		// Store in form
		handleChange({
			target: { name: 'weatherData', value: storedWeatherData }
		} as unknown as Event);
	}
</script>

<!-- Environmental Conditions Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon icon="lucide:waves" width="20" class="text-primary" />
			Umweltbedingungen
		</h3>
		<p class="text-base-content/70 mb-4 text-sm">
			Wetter- und Seebedingungen beeinflussen sowohl die Sichtbarkeit als auch das Tierverhalten
		</p>

		<!-- Optionaler Hinweis für User Experience -->
		<p class="text-base-content/60 mb-2 text-xs">
			Sobald Position und Datum gesetzt sind, werden Wetterdaten automatisch vorgeschlagen.
		</p>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Sea State -->
			<FormField name="seaState" />

			<!-- Visibility -->
			<FormField name="visibility" />
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Wind Direction -->
			<FormField name="windDirection" />

			<!-- Wind Force -->
			<FormField name="windForce" />
		</div>

		<!-- Weather Data Fetcher - Auto-fetch when environment section is visible -->
		{#if latitude && longitude && sightingDate}
			<div class="border-base-300 mt-6 border-t pt-4">
				<WeatherDataFetcher
					{latitude}
					{longitude}
					date={sightingDate}
					time={sightingTime ?? null}
					onWeatherFetched={handleWeatherData}
					onWeatherDataFetched={handleFullWeatherData}
					autoFetch={true}
					showInCard={false}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>
