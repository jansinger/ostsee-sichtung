<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let year = $state(new Date().getFullYear());

	function fetchSightings() {
		goto(`?year=${year}`);
	}

	// Aktuelles Jahr aus URL holen
	$effect(() => {
		const urlYear = $page.url.searchParams.get('year');
		if (urlYear) {
			year = parseInt(urlYear);
		}
	});
</script>

<div class="mx-auto max-w-4xl p-8">
	<h1 class="mb-6 text-2xl font-bold">Sichtungen API</h1>

	<div class="mb-6">
		<p class="mb-4">
			Diese API stellt Schweinswal-Sichtungen im JSON-Format bereit. Sie können Sichtungen für ein
			bestimmtes Jahr abfragen.
		</p>

		<div class="mb-4 flex items-end gap-4">
			<div>
				<label for="year" class="mb-1 block text-sm font-medium">Jahr auswählen:</label>
				<input
					id="year"
					type="number"
					bind:value={year}
					min="2000"
					max={new Date().getFullYear()}
					class="sb-input sb-input-bordered w-32"
				/>
			</div>
			<button class="sb-button sb-button-primary" onclick={fetchSightings}> Anzeigen </button>
		</div>

		<div class="mb-6 rounded-md bg-gray-100 p-4">
			<h2 class="mb-2 font-semibold">API-Endpunkt:</h2>
			<code class="block rounded bg-gray-200 p-2">
				/api/sightings?year={year}
			</code>
		</div>

		<h2 class="mb-2 font-semibold">Verfügbare Parameter:</h2>
		<ul class="mb-6 list-disc pl-5">
			<li><code>year</code> - Jahr der Sichtungen (Standard: aktuelles Jahr)</li>
		</ul>

		<h2 class="mb-2 font-semibold">Antwortformat:</h2>
		<ul class="mb-6 list-disc pl-5">
			<li><code>ts</code> - Timestamp der Erstellung</li>
			<li><code>id</code> - ID der Sichtung</li>
			<li><code>dt</code> - Datum der Sichtung (Format: DD.MM.YYYY)</li>
			<li><code>ti</code> - Uhrzeit der Sichtung (Format: HH:MM)</li>
			<li><code>lat</code> - Breitengrad</li>
			<li><code>lon</code> - Längengrad</li>
			<li><code>ct</code> - Anzahl der Tiere</li>
			<li><code>yo</code> - Anzahl der Jungtiere</li>
			<li><code>ta</code> - Art des Tieres (Schlüssel)</li>
			<li><code>tf</code> - Totfund (1 = ja, 0 = nein)</li>
			<li><code>na</code> - Name des Melders (nur wenn Namensfreigabe erteilt)</li>
			<li><code>ar</code> - Gebiet</li>
			<li><code>sh</code> - Schiffsname (nur wenn Freigabe erteilt)</li>
		</ul>
	</div>

	<div>
		<h2 class="mb-2 font-semibold">Test der API:</h2>
		<p>
			<a href="/api/sightings?year={year}" target="_blank" class="text-blue-600 hover:underline">
				/api/sightings?year={year} öffnen
			</a>
		</p>
	</div>
</div>
