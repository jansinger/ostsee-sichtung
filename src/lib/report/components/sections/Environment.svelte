<script lang="ts">
	import WeatherDataFetcher from '$lib/components/weather/WeatherDataFetcher.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import type {
		WeatherData,
		WeatherFormFields,
		OpenMeteoRawData
	} from '$lib/services/weatherService';
	import { convertToStoredWeatherData } from '$lib/services/weatherService';
	import { berlinCalendarDayIso } from '$lib/utils/format/dateTime';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form, handleChange } = getFormContext();

	let latitude: number | null | undefined = $derived($form.latitude);
	let longitude: number | null | undefined = $derived($form.longitude);
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
		// (NIEDRIG: Berlin-Datum statt UTC — läuft im Browser, kein Server-Import).
		const today = berlinCalendarDayIso();
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
<SectionCard title="Umweltbedingungen" icon="lucide:waves">
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

	<!-- `windDirection` wird hier bewusst nicht mehr abgefragt (Wunsch des
	     Deutschen Meeresmuseums), geht aber nicht verloren: `applyWeatherData`
	     im WeatherDataFetcher unten schreibt `windForce`, `windDirection`,
	     `seaState` und `visibility` gemeinsam ins Formular
	     (`WeatherFormFields`) — `windDirection` fährt also mit den drei
	     Feldern mit, die hier weiterhin stehen.

	     Genauer als in der Analyse notiert: Die Wetterdaten werden zwar
	     automatisch GEHOLT (`autoFetch`), ins Formular übernommen werden sie
	     aber erst mit „Daten übernehmen". Ohne diesen Klick blieb auch vorher
	     schon keines der vier Felder gefüllt — die Windrichtung verliert durch
	     das Ausblenden also nichts, was sie vorher gehabt hätte. Im Browser
	     gegengeprüft: nach dem Klick steht `windDirection` im Formular-State,
	     obwohl das Feld nicht mehr gerendert wird.

	     Schema-Eintrag und DB-Spalte `windrichtung` bleiben unverändert. -->
	<div class="mt-4 grid grid-cols-1 gap-4">
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
</SectionCard>
