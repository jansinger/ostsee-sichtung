<script lang="ts">
	import { downloadCsv } from '$lib/export/csvExport';
	import { downloadJson } from '$lib/export/jsonExport';
	import { downloadXml } from '$lib/export/xmlExport';
	import { downloadKml } from '$lib/export/kmlExport';
	import type { Sighting } from '$lib/types/types';
	import { onMount } from 'svelte';
	import { ExclamationCircleOutline, CheckCircleOutline, InfoCircleOutline } from 'flowbite-svelte-icons';

	// Aktuelles Jahr für die Filterkriterien
	const currentYear = new Date().getFullYear();
	const startOfYear = `${currentYear}-01-01`;
	const endOfYear = `${currentYear}-12-31`;

	// Standardwerte für die Filter
	let fromDate = $state(startOfYear);
	let toDate = $state(endOfYear);
	let onlyVerified = $state(false);
	let sightings = $state<Sighting[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Laden der Sichtungen basierend auf Filterkriterien
	async function loadSightings() {
		isLoading = true;
		error = null;

		try {
			// Filterparameter erstellen
			const params = new URLSearchParams({
				fromDate,
				toDate,
				verified: onlyVerified ? '1' : '0'
			});

			// API-Anfrage an den Server
			const response = await fetch(`/api/sightings/export?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`Fehler beim Laden der Daten: ${response.statusText}`);
			}

			const data = await response.json();
			sightings = data.sightings;

			// Sichtungen wurden geladen
		} catch (err) {
			console.error('Fehler beim Laden der Sichtungen:', err);
			error = err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Daten';
		} finally {
			isLoading = false;
		}
	}

	// Export-Funktionen
	function exportCsv() {
		if (sightings.length === 0) {
			alert('Bitte laden Sie zuerst Sichtungen.');
			return;
		}

		const filename = `sichtungen-export-${formatDateForFilename(fromDate)}-${formatDateForFilename(toDate)}.csv`;
		downloadCsv(sightings, filename);
	}

	function exportJson() {
		if (sightings.length === 0) {
			alert('Bitte laden Sie zuerst Sichtungen.');
			return;
		}

		const filename = `sichtungen-export-${formatDateForFilename(fromDate)}-${formatDateForFilename(toDate)}.json`;
		downloadJson(sightings, filename);
	}

	function exportXml() {
		if (sightings.length === 0) {
			alert('Bitte laden Sie zuerst Sichtungen.');
			return;
		}

		const filename = `sichtungen-export-${formatDateForFilename(fromDate)}-${formatDateForFilename(toDate)}.xml`;
		downloadXml(sightings, filename);
	}

	function exportKml() {
		if (sightings.length === 0) {
			alert('Bitte laden Sie zuerst Sichtungen.');
			return;
		}

		const filename = `sichtungen-export-${formatDateForFilename(fromDate)}-${formatDateForFilename(toDate)}.kml`;
		downloadKml(sightings, filename);
	}

	// Hilfsfunktion für Dateinamen
	function formatDateForFilename(dateString: string): string {
		return dateString.replace(/-/g, '');
	}

	// Beim ersten Laden der Komponente
	onMount(() => {
		// Hier könnten wir automatisch Daten laden, wenn gewünscht
	});
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Sichtungen exportieren</h1>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<!-- CSV Export -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">CSV Export</h2>
				<p>
					Exportieren Sie alle Sichtungsdaten als CSV-Datei für die Verwendung in Excel, Google
					Sheets oder anderen Tabellenkalkulationen.
				</p>
				<div class="card-actions mt-4 justify-end">
					<button class="btn btn-primary" onclick={exportCsv}>CSV herunterladen</button>
				</div>
			</div>
		</div>

		<!-- JSON Export -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">JSON Export</h2>
				<p>
					Exportieren Sie alle Sichtungsdaten im JSON-Format für die Verwendung in anderen
					Anwendungen oder für Entwicklungszwecke.
				</p>
				<div class="card-actions mt-4 justify-end">
					<button class="btn btn-primary" onclick={exportJson}>JSON herunterladen</button>
				</div>
			</div>
		</div>

		<!-- XML Export -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">XML Export</h2>
				<p>
					Exportieren Sie alle Sichtungsdaten im XML-Format für die Verwendung in anderen
					Anwendungen oder für Datenauswertungen.
				</p>
				<div class="card-actions mt-4 justify-end">
					<button class="btn btn-primary" onclick={exportXml}>XML herunterladen</button>
				</div>
			</div>
		</div>

		<!-- KML Export -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">KML Export</h2>
				<p>
					Exportieren Sie alle Sichtungsdaten im KML-Format für die Anzeige in Google Earth oder
					anderen Kartenprogrammen.
				</p>
				<div class="card-actions mt-4 justify-end">
					<button class="btn btn-primary" onclick={exportKml}>KML herunterladen</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Filteroptionen -->
	<div class="card bg-base-100 mt-6 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Filteroptionen</h2>
			<p>Wählen Sie die Filterkriterien für den Export aus.</p>

			<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<div class="form-control w-full">
					<label class="label" for="fromDate">
						<span class="label-text">Von Datum</span>
					</label>
					<input
						name="fromDate"
						type="date"
						class="input-bordered input w-full"
						bind:value={fromDate}
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="toDate">
						<span class="label-text">Bis Datum</span>
					</label>
					<input
						name="toDate"
						type="date"
						class="input-bordered input w-full"
						bind:value={toDate}
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="onlyVerified">
						<span class="label-text">Nur verifizierte Sichtungen</span>
					</label>
					<div class="flex h-12 items-center">
						<input
							name="onlyVerified"
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={onlyVerified}
						/>
					</div>
				</div>
			</div>

			<div class="card-actions mt-4 justify-end">
				<button class="btn btn-primary" onclick={loadSightings} disabled={isLoading}>
					{#if isLoading}
						<span class="loading loading-spinner"></span>
					{/if}
					Sichtungen laden
				</button>
			</div>

			{#if error}
				<div class="alert alert-error mt-4">
					<ExclamationCircleOutline class="h-6 w-6 shrink-0" />
					<span>{error}</span>
				</div>
			{/if}

			{#if sightings.length > 0}
				<div class="alert alert-success mt-4">
					<CheckCircleOutline class="h-6 w-6 shrink-0" />
					<span>{sightings.length} Sichtungen geladen und bereit zum Export.</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Informationstext -->
	<div class="alert alert-info mt-8">
		<InfoCircleOutline class="h-6 w-6 shrink-0" />
		<span
			>Die Filterkriterien sind standardmäßig auf das aktuelle Jahr ({currentYear}) voreingestellt.
			Bitte laden Sie die Sichtungen vor dem Export.</span
		>
	</div>
</div>
