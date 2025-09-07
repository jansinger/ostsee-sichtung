<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import WeatherDataFetcher from '$lib/components/weather/WeatherDataFetcher.svelte';
	import { Waves } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';

	const { form, handleChange } = getFormContext();

	// Handle weather data
	function handleWeatherData(weatherFields: Record<string, string>) {
		// Update form fields with weather data
		Object.entries(weatherFields).forEach(([field, value]) => {
			handleChange({
				target: { name: field, value }
			} as unknown as Event);
		});
	}
</script>

<!-- Environmental Conditions Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Waves} size="20" class="text-primary" />
			Umweltbedingungen
		</h3>
		<p class="text-base-content/70 mb-4 text-sm">
			Wetter- und Seebedingungen beeinflussen sowohl die Sichtbarkeit als auch das Tierverhalten
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
		{#if $form.latitude && $form.longitude && $form.sightingDate}
			<div class="mt-6 pt-4 border-t border-base-300">
				<WeatherDataFetcher
					latitude={$form.latitude}
					longitude={$form.longitude}
					date={$form.sightingDate}
					time={$form.sightingTime || null}
					onWeatherFetched={handleWeatherData}
					autoFetch={true}
					buttonText="Wetterdaten aktualisieren"
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
