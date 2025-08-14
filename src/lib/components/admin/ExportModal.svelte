<script lang="ts">
	import { createToast } from '$lib/stores/toastStore';
	import { createLogger } from '$lib/logger';
	import { downloadHandlers, createTimestampedFilename } from '$lib/utils/download';
	import type { FrontendSighting } from '$lib/types';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { CheckCircleOutline, ExclamationCircleOutline, DownloadOutline, CloseOutline } from 'flowbite-svelte-icons';

	const logger = createLogger('ExportModal');

	let {
		show = $bindable(false),
		currentFilters,
		totalRecords
	}: {
		show: boolean;
		currentFilters: Record<string, string | boolean>;
		totalRecords: number;
	} = $props();

	let selectedFormat = $state('csv');
	let isLoading = $state(false);
	let loadedSightings = $state<FrontendSighting[]>([]);
	let error = $state<string | null>(null);

	// Format-spezifische Informationen
	const formatInfo = {
		csv: {
			name: 'CSV',
			description: 'Comma-separated values für Excel, Google Sheets',
			mimeType: 'text/csv',
			icon: '📊'
		},
		json: {
			name: 'JSON', 
			description: 'JavaScript Object Notation für Entwicklungszwecke',
			mimeType: 'application/json',
			icon: '🔧'
		},
		xml: {
			name: 'XML',
			description: 'Extensible Markup Language für Datenauswertungen',
			mimeType: 'application/xml',
			icon: '📋'
		},
		kml: {
			name: 'KML',
			description: 'Keyhole Markup Language für Google Earth, Kartenprogramme',
			mimeType: 'application/vnd.google-earth.kml+xml',
			icon: '🗺️'
		}
	};

	// Geschätzte Dateigröße berechnen (grober Richtwert)
	function estimateFileSize(format: string, recordCount: number): number {
		const bytesPerRecord = {
			csv: 300,    // ~300 bytes pro Zeile CSV
			json: 800,   // ~800 bytes pro JSON-Objekt (mehr Metadaten)
			xml: 1200,   // ~1.2KB pro XML-Element (viele Tags)
			kml: 600     // ~600 bytes pro KML-Placemark
		};

		return recordCount * (bytesPerRecord[format as keyof typeof bytesPerRecord] || 500);
	}

	// Aktive Filter als lesbare Strings formatieren
	function getActiveFiltersDisplay(): string[] {
		const filterDisplays: string[] = [];

		if (currentFilters.dateFrom) {
			filterDisplays.push(`Von: ${new Date(currentFilters.dateFrom as string).toLocaleDateString('de-DE')}`);
		}
		if (currentFilters.dateTo) {
			filterDisplays.push(`Bis: ${new Date(currentFilters.dateTo as string).toLocaleDateString('de-DE')}`);
		}
		if (currentFilters.verified === '1') {
			filterDisplays.push('Nur geprüfte Sichtungen');
		} else if (currentFilters.verified === '0') {
			filterDisplays.push('Nur ungeprüfte Sichtungen');
		}
		if (currentFilters.entryChannel && currentFilters.entryChannel !== 'all') {
			filterDisplays.push(`Kanal: ${currentFilters.entryChannel}`);
		}
		if (currentFilters.mediaUpload === '1') {
			filterDisplays.push('Nur mit Aufnahmen');
		} else if (currentFilters.mediaUpload === '0') {
			filterDisplays.push('Nur ohne Aufnahmen');
		}

		return filterDisplays.length > 0 ? filterDisplays : ['Keine Filter aktiv'];
	}

	// Export-Daten laden mit aktuellen Filtern
	async function loadExportData() {
		isLoading = true;
		error = null;

		try {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const params = new URLSearchParams();

			// Alle aktuellen Filter zu API-Parametern hinzufügen
			Object.entries(currentFilters).forEach(([key, value]) => {
				if (value && value !== 'all' && value !== '') {
					params.set(key, String(value));
				}
			});

			const response = await fetch(`/api/sightings/export?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`Fehler beim Laden der Export-Daten: ${response.statusText}`);
			}

			const data = await response.json();
			loadedSightings = data.sightings;

			logger.info({ 
				recordCount: loadedSightings.length, 
				filters: currentFilters 
			}, 'Export data loaded successfully');

		} catch (err) {
			logger.error(err, 'Failed to load export data');
			error = err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Export-Daten';
		} finally {
			isLoading = false;
		}
	}

	// Download ausführen
	async function performDownload() {
		if (loadedSightings.length === 0) {
			createToast('error', 'Keine Daten zum Exportieren vorhanden');
			return;
		}

		try {
			// Generiere Server-Export für das gewählte Format
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const params = new URLSearchParams();
			Object.entries(currentFilters).forEach(([key, value]) => {
				if (value && value !== 'all' && value !== '') {
					params.set(key, String(value));
				}
			});
			params.set('format', selectedFormat);

			const response = await fetch(`/api/sightings/export/${selectedFormat}?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`Export fehlgeschlagen: ${response.statusText}`);
			}

			const exportData = await response.text();
			const filename = createTimestampedFilename('sichtungen-export', selectedFormat);

			// Download mit den entsprechenden Handlers ausführen
			downloadHandlers[selectedFormat as keyof typeof downloadHandlers](exportData, filename);

			createToast('success', `${formatInfo[selectedFormat as keyof typeof formatInfo].name}-Export erfolgreich heruntergeladen!`);

			// Modal schließen nach erfolgreichem Download
			show = false;

			logger.info({ 
				format: selectedFormat, 
				filename, 
				recordCount: loadedSightings.length 
			}, 'Export download completed');

		} catch (err) {
			logger.error(err, 'Export download failed');
			error = err instanceof Error ? err.message : 'Fehler beim Download';
		}
	}

	// Beim Öffnen des Modals Export-Daten laden
	$effect(() => {
		if (show && totalRecords > 0) {
			loadExportData();
		}
	});

	function closeModal() {
		show = false;
		error = null;
		loadedSightings = [];
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-base-300">
				<h3 class="text-lg font-semibold">Sichtungen exportieren</h3>
				<button
					class="btn btn-ghost btn-sm btn-circle"
					onclick={closeModal}
					aria-label="Modal schließen"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<div class="p-6 space-y-6">
				<!-- Filter-Info -->
				<div class="bg-base-200 rounded-lg p-4">
					<h4 class="text-sm font-medium mb-2">Aktuelle Filter:</h4>
					<div class="flex flex-wrap gap-2">
						{#each getActiveFiltersDisplay() as filter, index (index)}
							<span class="badge badge-outline badge-sm">{filter}</span>
						{/each}
					</div>
					<div class="text-sm text-base-content/70 mt-2">
						{totalRecords} Datensatz{totalRecords !== 1 ? 'e' : ''} gefunden
					</div>
				</div>

				<!-- Format-Auswahl -->
				<div>
					<h4 class="text-sm font-medium mb-3">Export-Format wählen:</h4>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each Object.entries(formatInfo) as [format, info] (format)}
							<label class="cursor-pointer">
								<input 
									type="radio" 
									bind:group={selectedFormat} 
									value={format}
									class="sr-only peer"
								>
								<div class="border-2 border-base-300 rounded-lg p-4 peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors">
									<div class="flex items-start gap-3">
										<span class="text-2xl">{info.icon}</span>
										<div class="flex-1 min-w-0">
											<div class="font-medium">{info.name}</div>
											<div class="text-xs text-base-content/70 mt-1">{info.description}</div>
											<div class="text-xs text-base-content/50 mt-1">
												~{formatFileSize(estimateFileSize(format, totalRecords))}
											</div>
										</div>
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Loading/Status -->
				{#if isLoading}
					<div class="flex items-center justify-center py-8">
						<div class="loading loading-spinner loading-lg"></div>
						<span class="ml-3">Lade Export-Daten...</span>
					</div>
				{:else if error}
					<div class="alert alert-error">
						<ExclamationCircleOutline class="h-6 w-6 shrink-0" />
						<span>{error}</span>
					</div>
				{:else if loadedSightings.length > 0}
					<div class="alert alert-success">
						<CheckCircleOutline class="h-6 w-6 shrink-0" />
						<span>{loadedSightings.length} Datensätze bereit zum Export</span>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-3 p-6 border-t border-base-300">
				<button class="btn btn-ghost" onclick={closeModal}>
					Abbrechen
				</button>
				<button 
					class="btn btn-primary"
					onclick={performDownload}
					disabled={isLoading || loadedSightings.length === 0}
				>
					<DownloadOutline class="h-4 w-4 mr-2" />
					{formatInfo[selectedFormat as keyof typeof formatInfo].name} herunterladen
				</button>
			</div>
		</div>
	</div>
{/if}