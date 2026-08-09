<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ExportModal from '$lib/components/admin/ExportModal.svelte';
	import { DEAD_FINDING_PRESENTATION, isDeadFinding } from '$lib/components/admin/deadFinding';
	import {
		deleteSighting,
		sendTestEmail,
		TEST_EMAIL_HINT
	} from '$lib/components/admin/sightingActions';
	import DeleteDialog from '$lib/components/ui/Dialog/DeleteDialog.svelte';
	import { createLogger } from '$lib/logger';
	import { SvelteSet } from 'svelte/reactivity';
	import { submitVerdict, type SightingVerdict } from '$lib/components/admin/sightingVerdict';
	import SightingStatusControl from '$lib/components/admin/SightingStatusControl.svelte';
	import {
		getSightingStatus,
		SIGHTING_STATUS_PRESENTATION,
		SIGHTING_STATUS_UNDO_MS,
		verdictToStatus,
		type SightingStatus
	} from '$lib/components/admin/sightingStatus';
	import { getAnimalBehaviorLabel } from '$lib/report/formOptions/animalBehavior';
	import { getDistanceLabel } from '$lib/report/formOptions/distance';
	import { getDistributionLabel } from '$lib/report/formOptions/distribution';
	import { getEntryChannelOptions } from '$lib/report/formOptions/entryChannel';
	import { getSeaStateLabel } from '$lib/report/formOptions/seaState';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import { getVisibilityLabel } from '$lib/report/formOptions/visibility';
	import { getWindStrengthLabel } from '$lib/report/formOptions/windStrength';
	import { toast } from '$lib/stores/toastState.svelte';
	import type { FrontendSighting, PageData } from '$lib/types';
	import type { SpamCheckResult } from '$lib/types/spam';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import Icon from '$lib/components/Icon.svelte';
	import {
		BALTIC_SEA_STATUS_PRESENTATION,
		getBalticSeaStatus
	} from '$lib/utils/geo/balticSeaStatus';
	import { MEDIA_UPLOAD_ANNOUNCED_MISSING } from '$lib/utils/media/photoAnnouncement';
	import { normalizeStatusParam } from '$lib/components/admin/sightingStatusFilter';
	import {
		COLUMN_PREFERENCES_STORAGE_KEY,
		loadColumnPreferences,
		serializeColumnPreferences
	} from './columnPreferences';
	import {
		addFilterPreset,
		capturePresetParams,
		FILTER_PRESETS_STORAGE_KEY,
		loadFilterPresets,
		matchesPreset,
		presetUrl,
		removeFilterPreset,
		renameFilterPreset,
		serializeFilterPresets,
		type FilterPreset
	} from './filterPresets';
	import { getHeaderState, isSameIdList, setAllSelected, toggleSelection } from './bulkSelection';
	import { paginationControls } from './paginationControls';
	import { buildBulkSummary, runBulkVerdict } from './bulkVerdict';

	const logger = createLogger('SichtungenPage');

	let { data }: { data: PageData } = $props();

	// Reaktive States mit Runes
	let sightings = $derived(data.sightings);
	let fromDate = $state(page.url.searchParams.get('fromDate') || '');
	let toDate = $state(page.url.searchParams.get('toDate') || '');
	/* `normalizeStatusParam`, nicht der Rohwert: Der Server versteht die alten
	   Aliase `verified=1`/`verified=0` weiterhin (Lesezeichen, verlinkte
	   Filteransichten), aber das `<select>` unten kennt nur `open`/`approved`/
	   `rejected` — ohne die Normalisierung kam die gefilterte Liste zurück,
	   während das Feld selbst leer stand. */
	let verified = $state(normalizeStatusParam(page.url.searchParams.get('verified')) ?? '');
	let selectedChannel = $state(page.url.searchParams.get('entryChannel') || 'all');
	let mediaUpload = $state(page.url.searchParams.get('mediaUpload') || '');
	let balticSea = $state(page.url.searchParams.get('balticSea') || '');
	let deadFinding = $state(page.url.searchParams.get('deadFinding') || '');
	let searchTerm = $state(page.url.searchParams.get('q') || '');
	let showDeleteDialog = $state(false);
	let sightingToDelete = $state<FrontendSighting | null>(null);
	let isFilterPanelOpen = $state(false);
	let showExportModal = $state(false);
	let showColumnDropdown = $state(false);

	/* Column visibility configuration
	   `email`, `distance` und `distribution` starten aus: Mit ihnen war die
	   Tabelle in der Default-Auswahl 1456 px breit, und aus dem Viewport liefen
	   ausgerechnet Status und Aktionen — die Spalten, wegen derer man die
	   Tabelle öffnet. Abgeschaltet sind sie nicht weg, sondern eine
	   Checkbox im „Spalten"-Dropdown entfernt.
	   Als eigene Konstante (statt inline in $state): `loadColumnPreferences`
	   merged einen gespeicherten Stand gegen genau diese Werte, siehe
	   `columnPreferences.ts`. */
	const DEFAULT_COLUMN_VISIBILITY = {
		referenceId: true,
		sightingDate: true,
		created: true,
		email: false,
		species: true,
		distance: false,
		totalCount: true,
		juvenileCount: true,
		distribution: false,
		behavior: false,
		seaState: false,
		wind: false,
		visibility: false,
		mediaUpload: true,
		spamScore: true,
		balticSea: true,
		verified: true,
		actions: true
	};
	/* SSR rendert immer mit dem Default — `localStorage` existiert dort nicht
	   (architecture.md: kein window-Zugriff beim SSR-Rendern). Der `$effect`
	   unten übernimmt den gespeicherten Stand direkt nach der Hydration; ein
	   kurzes Umspringen der Spaltenauswahl im ersten Frame im Browser ist dabei
	   bewusst in Kauf genommen.

	   Direkter `localStorage`-Zugriff statt `$lib/storage/localStorage`: Dessen
	   Helfer gehören zum Lebenszyklus des Meldeformulars — `STORAGE_KEYS` trägt
	   den `sichtungen_`-Namespace und `clearStorage()` räumt diese Schlüssel
	   beim Verwerfen des Formulars ab. Eine Admin-UI-Präferenz darf daran nicht
	   hängen; Versionierung und tolerantes Parsen kapselt hier stattdessen
	   `columnPreferences.ts`. */
	let columnVisibility = $state({ ...DEFAULT_COLUMN_VISIBILITY });
	let hatGespeicherteSpaltenGeladen = false;

	$effect(() => {
		if (typeof window === 'undefined') return;
		/* try/catch um beide Zugriffe: `localStorage` selbst kann werfen
		   (Storage per Policy deaktiviert → SecurityError) und `setItem`
		   ebenso (volle Quota, Safari im privaten Modus). Die Spaltenauswahl
		   ist eine Bequemlichkeit — ohne Storage läuft die Seite einfach ohne
		   Persistenz weiter, statt beim Hydratisieren zu crashen. */
		try {
			if (!hatGespeicherteSpaltenGeladen) {
				// Einmaliges Laden beim Mount. Kaputtes/altes JSON und unbekannte
				// Schlüssel fallen in `loadColumnPreferences` still auf den Default
				// zurück; neue Spalten erscheinen mit ihrem eigenen Default-Wert.
				columnVisibility = loadColumnPreferences(
					window.localStorage.getItem(COLUMN_PREFERENCES_STORAGE_KEY),
					DEFAULT_COLUMN_VISIBILITY
				);
				return; // Diesen Durchlauf nicht sofort wieder zurückschreiben.
			}
			// Jede weitere Änderung (Checkbox im „Spalten"-Dropdown) wird persistiert.
			window.localStorage.setItem(
				COLUMN_PREFERENCES_STORAGE_KEY,
				serializeColumnPreferences(columnVisibility)
			);
		} catch (err) {
			logger.warn(
				{ err },
				'Spaltenauswahl kann nicht gespeichert werden — Storage nicht verfügbar'
			);
		} finally {
			/* Im finally, damit auch ein geworfenes `getItem` den Lade-Versuch
			   abschließt — sonst überschriebe der nächste Durchlauf jede
			   Nutzerauswahl erneut mit dem (dann fehlgeschlagenen) Laden. */
			hatGespeicherteSpaltenGeladen = true;
		}
	});

	/* Gespeicherte Filteransichten (Spec B4). Persistenz wie bei der
	   Spaltenauswahl in `localStorage`, aber ohne Rückschreib-`$effect`:
	   Ansichten ändern sich nur durch eine ausdrückliche Bedienung (anlegen,
	   umbenennen, löschen), und jede dieser Funktionen speichert selbst. Ein
	   Effect müsste stattdessen einen ersten Durchlauf ausklammern, um den
	   geladenen Stand nicht sofort zurückzuschreiben — die Sonderregel, die bei
	   den Spalten nötig ist, weil dort jede Checkbox den State ändert. */
	let filterPresets = $state<FilterPreset[]>([]);
	/* Nicht per `bind:open` an ein `details`: Nach dem Speichern soll das
	   Formular zugehen, und dafür braucht es einen State, den der Handler
	   setzen kann. */
	let zeigeAnsichtFormular = $state(false);
	let neueAnsichtName = $state('');
	/* id der Ansicht, die gerade umbenannt wird — `null` heißt: keine. */
	let umbenennenId = $state<string | null>(null);
	let umbenennenName = $state('');
	/* Element-Referenzen, um den Fokus in die frisch eingeblendete Eingabezeile
	   zu setzen: Ohne das bliebe er am verschwundenen Auslöser hängen, und wer
	   per Tastatur arbeitet, müsste sich zurück zum Feld tabben. */
	let neueAnsichtFeld = $state<HTMLInputElement | null>(null);
	let umbenennenFeld = $state<HTMLInputElement | null>(null);

	/* Ohne Lade-Wächter: Der Effect liest keinen reaktiven Wert, läuft also
	   genau einmal. Ein `typeof window`-Guard entfällt aus demselben Grund —
	   Effects laufen im SSR-Durchlauf nicht.

	   try/catch aus demselben Grund wie bei der Spaltenauswahl: `localStorage`
	   kann per Browser-Policy werfen. Ohne Storage läuft die Seite dann ohne
	   gespeicherte Ansichten weiter, statt beim Hydratisieren zu crashen. */
	$effect(() => {
		try {
			filterPresets = loadFilterPresets(window.localStorage.getItem(FILTER_PRESETS_STORAGE_KEY));
		} catch (err) {
			logger.warn({ err }, 'Filteransichten können nicht gelesen werden — Storage nicht verfügbar');
		}
	});

	$effect(() => {
		neueAnsichtFeld?.focus();
	});

	$effect(() => {
		umbenennenFeld?.focus();
	});

	function speichereAnsichten(): void {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(
				FILTER_PRESETS_STORAGE_KEY,
				serializeFilterPresets(filterPresets)
			);
		} catch (err) {
			logger.warn(
				{ err },
				'Filteransichten können nicht gespeichert werden — Storage nicht verfügbar'
			);
			toast.error('Die Ansicht konnte nicht dauerhaft gespeichert werden.');
		}
	}

	/* Aktive Ansicht aus der URL abgeleitet, nicht als eigener State: Der
	   Filterzustand steht in der URL, und ein zweiter gemerkter „zuletzt
	   geklickter Chip" liefe bei jedem Filterwechsel, Zurück-Button oder
	   geteilten Link daneben. */
	let aktiveAnsichtId = $derived(
		filterPresets.find((preset) => matchesPreset(preset, page.url))?.id ?? null
	);

	function ansichtAnwenden(preset: FilterPreset): void {
		goto(presetUrl(preset, page.url));
	}

	function ansichtSpeichern(event: SubmitEvent): void {
		event.preventDefault();
		/* Aus der URL, nicht aus den Feld-States: Gespeichert gehört die Menge,
		   die die Tabelle gerade zeigt — nicht eine im Filter-Panel getippte,
		   aber nie angewendete. Derselbe Grund wie bei `currentFilters`. */
		const neu = addFilterPreset(filterPresets, neueAnsichtName, capturePresetParams(page.url));
		/* Unveränderte Liste heißt: Name schon vergeben. Der leere Name kann hier
		   nicht mehr ankommen — den fängt das `required` am Feld ab, samt
		   Browser-Meldung am Feld selbst. Ein stilles `return` wäre an beiden
		   Stellen falsch: Der Knopf täte dann sichtbar nichts. */
		if (neu === filterPresets) {
			toast.error(`Es gibt bereits eine Ansicht „${neueAnsichtName.trim()}".`);
			return;
		}
		filterPresets = neu;
		speichereAnsichten();
		neueAnsichtName = '';
		zeigeAnsichtFormular = false;
	}

	function umbenennenStarten(preset: FilterPreset): void {
		umbenennenId = preset.id;
		umbenennenName = preset.name;
	}

	function umbenennenBestaetigen(event: SubmitEvent): void {
		event.preventDefault();
		if (!umbenennenId) return;
		const neu = renameFilterPreset(filterPresets, umbenennenId, umbenennenName);
		// Gleiche Begründung wie beim Anlegen: unverändert = Name schon vergeben.
		if (neu === filterPresets) {
			toast.error(`Es gibt bereits eine Ansicht „${umbenennenName.trim()}".`);
			return;
		}
		filterPresets = neu;
		speichereAnsichten();
		umbenennenId = null;
	}

	function ansichtLoeschen(preset: FilterPreset): void {
		filterPresets = removeFilterPreset(filterPresets, preset.id);
		speichereAnsichten();
		if (umbenennenId === preset.id) umbenennenId = null;
	}

	// Available columns configuration
	const availableColumns = [
		{ key: 'referenceId', label: 'Referenz-ID', sortKey: null },
		{ key: 'sightingDate', label: 'Sichtungsdatum', sortKey: 'sightingDate' },
		{ key: 'created', label: 'Meldedatum', sortKey: 'created' },
		{ key: 'email', label: 'E-Mail', sortKey: 'email' },
		{ key: 'species', label: 'Tierart', sortKey: 'species' },
		{ key: 'distance', label: 'Entfernung', sortKey: 'distance' },
		{ key: 'totalCount', label: 'Anzahl', sortKey: 'totalCount' },
		{ key: 'juvenileCount', label: 'Jung', sortKey: 'juvenileCount' },
		{ key: 'distribution', label: 'Verteilung', sortKey: 'distribution' },
		{ key: 'behavior', label: 'Verhalten', sortKey: 'behavior' },
		{ key: 'seaState', label: 'Seegang', sortKey: 'seaState' },
		{ key: 'wind', label: 'Wind', sortKey: 'wind' },
		{ key: 'visibility', label: 'Sichtweite', sortKey: 'visibility' },
		// Kein Eintrag für den Totfund: Seine Kennzeichnung steht in einer festen
		// Spalte ganz links und ist bewusst nicht abschaltbar — als „Totfund
		// (Ja/Nein)"-Spalte am rechten Rand war sie genau dann weg, wenn man
		// viele Spalten eingeschaltet hatte und am wenigsten hinsah.
		{ key: 'mediaUpload', label: 'Aufnahme', sortKey: null },
		{ key: 'spamScore', label: 'Spam', sortKey: 'spamScore' },
		{ key: 'balticSea', label: 'Ostsee', sortKey: null },
		{ key: 'verified', label: 'Status', sortKey: null },
		{ key: 'actions', label: 'Aktionen', sortKey: null }
	];

	/* Gemessene Breite der Aktionsspalte — die Statusspalte rastet links davon
	   ein. Ein fester Wert ginge nicht: die Zahl der Aktions-Buttons hängt an
	   `isSuperAdmin`, und der Spaltenkopf trägt dieselbe Breite wie die Zellen
	   darunter (gleiche Tabellenspalte). */
	let actionsColumnWidth = $state(0);
	/* Ohne Aktionsspalte gehört die Statusspalte selbst an den Rand — sonst
	   bliebe die zuletzt gemessene Breite als Lücke stehen. */
	let stickyStatusRight = $derived(columnVisibility.actions ? actionsColumnWidth : 0);

	/* Zustand der Seiten-Navigation. Als `$derived` und nicht als `{@const}` im
	   Markup: Ein `{@const}` muss unmittelbares Kind eines Blocks sein, und die
	   Navigationsleiste steht in einem gewöhnlichen `<div>`. Begründung der
	   Rechnung selbst in `paginationControls.ts` (Leerfall `totalPages === 0`). */
	let seiten = $derived(paginationControls(data.pagination.page, data.pagination.totalPages));

	// Prüft ob irgendwelche Filter aktiv sind
	let hasActiveFilters = $derived(
		!!(
			fromDate ||
			toDate ||
			verified ||
			(selectedChannel && selectedChannel !== 'all') ||
			mediaUpload ||
			balticSea ||
			deadFinding ||
			searchTerm
		)
	);

	// Aktuelle Filter für Export-Modal
	let currentFilters = $derived.by(() => ({
		fromDate: fromDate || '',
		toDate: toDate || '',
		verified: verified || '',
		entryChannel: selectedChannel !== 'all' ? selectedChannel : '',
		mediaUpload: mediaUpload || '',
		balticSea: balticSea || '',
		deadFinding: deadFinding || '',
		/* Aus der URL, nicht aus dem Feld-State: Das Suchfeld steht dauerhaft im
		   Kopf, ein getippter, aber nicht abgeschickter Begriff ist damit leicht
		   stehengelassen. Aus dem Feld gelesen, exportierte der Dialog dann eine
		   Menge, die die sichtbare Tabelle gar nicht anwendet — und die Badges
		   versprächen sie obendrein. */
		q: page.url.searchParams.get('q') ?? ''
	}));

	function updateSort(column: string): void {
		const currentSort = page.url.searchParams.get('sort');
		const currentOrder = page.url.searchParams.get('order');

		const newOrder = currentSort === column && currentOrder === 'asc' ? 'desc' : 'asc';

		const url = new URL(page.url);
		url.searchParams.set('sort', column);
		url.searchParams.set('order', newOrder);
		goto(url);
	}

	function applyFilters(): void {
		const url = new URL(page.url);

		// Datum-Filter
		if (fromDate) url.searchParams.set('fromDate', fromDate);
		else url.searchParams.delete('fromDate');

		if (toDate) url.searchParams.set('toDate', toDate);
		else url.searchParams.delete('toDate');

		// Verified-Filter
		if (verified) url.searchParams.set('verified', verified);
		else url.searchParams.delete('verified');

		// Eingangskanal-Filter
		if (selectedChannel && selectedChannel !== 'all') {
			url.searchParams.set('entryChannel', selectedChannel);
		} else {
			url.searchParams.delete('entryChannel');
		}

		// Aufnahme-Filter
		if (mediaUpload) url.searchParams.set('mediaUpload', mediaUpload);
		else url.searchParams.delete('mediaUpload');

		// Ostsee-Status-Filter
		if (balticSea) url.searchParams.set('balticSea', balticSea);
		else url.searchParams.delete('balticSea');

		// Meldeart-Filter (Totfund/Lebendsichtung)
		if (deadFinding) url.searchParams.set('deadFinding', deadFinding);
		else url.searchParams.delete('deadFinding');

		// Freitext-Suche. Getrimmt, damit ein versehentliches Leerzeichen nicht
		// als aktive Suche in der URL stehen bleibt — der Server verwirft es
		// ohnehin (normalizeSearchTerm). Der getrimmte Wert geht zurück in den
		// State, nicht nur in die URL: Sonst zeigte das Feld nach dem Suchen
		// weiter die ungetrimmte Eingabe, und ein Feld aus lauter Leerzeichen
		// zählte in `hasActiveFilters` als aktiver Filter — die
		// Filter-Schaltfläche stünde markiert da, während die URL gar keine
		// Suche trägt.
		searchTerm = searchTerm.trim();
		if (searchTerm) url.searchParams.set('q', searchTerm);
		else url.searchParams.delete('q');

		url.searchParams.set('page', '1');
		goto(url);
	}

	/**
	 * Springt direkt zur Arbeitsliste „Foto angekündigt, fehlt noch"
	 * (siehe `$lib/utils/media/photoAnnouncement.ts`). Setzt nur den
	 * Aufnahme-Filter — andere aktive Filter bleiben erhalten, damit z. B. ein
	 * bereits gesetzter Datumsbereich nicht verloren geht.
	 */
	function showPendingPhotoAnnouncements(): void {
		mediaUpload = MEDIA_UPLOAD_ANNOUNCED_MISSING;
		isFilterPanelOpen = true;
		applyFilters();
	}

	/**
	 * Absenden der Suche. Läuft über `applyFilters()`, damit ein aktiver
	 * Filter erhalten bleibt und die Seitenzahl auf 1 zurückspringt — sonst
	 * stünde man mit einer frischen Suche auf einer leeren Seite 7.
	 */
	function submitSearch(event: SubmitEvent): void {
		event.preventDefault();
		applyFilters();
	}

	function resetFilters(): void {
		fromDate = '';
		toDate = '';
		verified = '';
		selectedChannel = 'all';
		mediaUpload = '';
		balticSea = '';
		deadFinding = '';
		searchTerm = '';

		const url = new URL(page.url);
		url.searchParams.delete('fromDate');
		url.searchParams.delete('toDate');
		url.searchParams.delete('verified');
		url.searchParams.delete('entryChannel');
		url.searchParams.delete('mediaUpload');
		url.searchParams.delete('balticSea');
		url.searchParams.delete('deadFinding');
		url.searchParams.delete('q');
		url.searchParams.set('page', '1');
		goto(url);
	}

	function changePage(newPage: number): void {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url);
	}

	function changeItemsPerPage(newPerPage: number): void {
		const url = new URL(page.url);
		url.searchParams.set('perPage', newPerPage.toString());
		url.searchParams.set('page', '1');
		goto(url);
	}

	function viewSightingDetails(sighting: FrontendSighting): void {
		// Preserve current filter parameters when navigating to detail view
		const currentParams = page.url.searchParams;
		const detailUrl = new URL(`/admin/${sighting.id}`, page.url.origin);

		// Copy current search parameters to maintain filters
		for (const [key, value] of currentParams.entries()) {
			detailUrl.searchParams.set(key, value);
		}

		goto(detailUrl.toString());
	}

	async function removeSighting(id: number): Promise<void> {
		if (await deleteSighting(id)) {
			// Reload data via SvelteKit's invalidation instead of full page reload
			await invalidateAll();
		}
	}

	let spamCheckModal = $state({
		open: false,
		loading: false,
		sightingId: null as number | null,
		result: null as SpamCheckResult | null,
		error: null as string | null
	});

	let spamCheckDialogElement = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!spamCheckDialogElement) return;
		if (spamCheckModal.open && !spamCheckDialogElement.open) {
			spamCheckDialogElement.showModal();
		} else if (!spamCheckModal.open && spamCheckDialogElement.open) {
			spamCheckDialogElement.close();
		}
	});

	async function checkSpam(sightingId: number): Promise<void> {
		spamCheckModal.open = true;
		spamCheckModal.loading = true;
		spamCheckModal.sightingId = sightingId;
		spamCheckModal.result = null;
		spamCheckModal.error = null;
		try {
			const response = await fetch(`/api/sightings/${sightingId}/spam-check`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			// Guard against race: discard response if user switched to a different sighting
			if (spamCheckModal.sightingId !== sightingId) return;
			const result = await response.json();
			// Second check: another switch may have occurred during json() parsing
			if (spamCheckModal.sightingId !== sightingId) return;
			spamCheckModal.result = result;
		} catch (err) {
			if (spamCheckModal.sightingId !== sightingId) return;
			logger.error({ err, sightingId }, 'Spam-Check fehlgeschlagen');
			spamCheckModal.error = 'Spam-Check fehlgeschlagen';
		} finally {
			if (spamCheckModal.sightingId === sightingId) {
				spamCheckModal.loading = false;
			}
		}
	}

	/**
	 * Die Zeilen, deren Statuswechsel gerade läuft — **je Zeile**, nicht global.
	 *
	 * Ein einzelner Wert vermischte zwei Zustände: Der Wächter wiese jeden
	 * weiteren Klick ab, während `disabled` nur am Control der laufenden Zeile
	 * hinge. Die übrigen sähen bedienbar aus und täten nichts — schlimmer als
	 * ein sichtbar gesperrtes Element, weil der Fehlschlag unsichtbar bleibt.
	 * Zwei verschiedene Zeilen dürfen gleichzeitig wechseln; zu verhindern ist
	 * allein der Doppelklick auf dieselbe.
	 */
	const statusPending = new SvelteSet<number>();

	async function changeStatus(
		id: number,
		verdict: SightingVerdict,
		previous: SightingStatus
	): Promise<void> {
		if (statusPending.has(id)) return;
		statusPending.add(id);
		/* `finally` statt eines Löschens direkt nach `submitVerdict`: Zwischen dem
		   Entsperren und dem Abschluss von `invalidateAll()` zeigte das Control
		   schon wieder bedienbar, aber noch die alten Daten — ein Klick in diesem
		   Fenster hätte `previous` aus einem veralteten Stand berechnet. Der
		   `finally`-Block deckt zugleich den Fehlerfall (`!ok`) ab, sonst bliebe
		   die Zeile nach einem gescheiterten Versuch dauerhaft gesperrt. */
		try {
			const ok = await submitVerdict(id, verdict);
			if (!ok) return;

			await invalidateAll();

			/* Kein Bestätigungsdialog, auch nicht beim Entzug einer Freigabe: Er
			   bremste jeden regulären Vorgang aus. Stattdessen ist der Fehlklick in
			   einem Klick geheilt. Dieselbe Dauer wie das Undo-Fenster der
			   Eingangsseite (`SIGHTING_STATUS_UNDO_MS`). */
			const nach = SIGHTING_STATUS_PRESENTATION[verdictToStatus(verdict)];
			toast.success(`Status: ${nach.label}`, {
				duration: SIGHTING_STATUS_UNDO_MS,
				action: {
					label: 'Rückgängig',
					onClick: () => {
						/* Ohne diese Prüfung griff bei einem Klick während eine andere
						   Aktion auf derselben Zeile noch läuft die `busy`-Wache am Anfang
						   dieser Funktion: Der Toast schloss sich, `changeStatus` kehrte
						   sofort zurück, und nichts geschah — ohne jede Rückmeldung. */
						if (statusPending.has(id)) {
							toast.error('Diese Zeile wird gerade noch bearbeitet — bitte kurz warten.', {
								title: 'Rückgängig nicht möglich',
								dismissible: true
							});
							return;
						}
						void changeStatus(
							id,
							SIGHTING_STATUS_PRESENTATION[previous].verdict,
							verdictToStatus(verdict)
						);
					}
				}
			});
		} finally {
			statusPending.delete(id);
		}
	}

	/* ---------------------------------------------------------------------- */
	/* Bulk-Aktionen (nur Desktop-Tabelle)                                      */
	/* ---------------------------------------------------------------------- */

	/**
	 * Die gewählten Zeilen — immer nur aus der **aktuell sichtbaren** Seite.
	 * Ein Cross-Page-Gedächtnis wäre gefährlich: „Freigeben" löste dann Zeilen
	 * aus, die niemand mehr vor sich hat. Die Rechenregeln stehen in
	 * `bulkSelection.ts`, hier liegt nur der Zustand.
	 */
	let selectedIds = $state<number[]>([]);
	let visibleIds = $derived(sightings.map((sighting) => sighting.id));
	let headerState = $derived(getHeaderState(selectedIds, visibleIds));

	/* Zuletzt gesehene Liste als einfache Variable und nicht als `$state`: Sie ist
	   nur Vergleichsgrundlage des Effekts unten; als reaktiver Wert löste ihr
	   Schreiben denselben Effekt erneut aus. */
	let zuletztGeseheneIds: number[] = [];
	$effect(() => {
		const ids = visibleIds;
		if (isSameIdList(zuletztGeseheneIds, ids)) return;
		// Seitenwechsel, Filterwechsel oder Neuladen nach einer Aktion — die
		// Auswahl gehört geleert, sie bezog sich auf eine andere Liste.
		zuletztGeseheneIds = ids;
		selectedIds = [];
	});

	/** Läuft gerade eine Bulk-Ausführung? Sperrt die Leiste hart (siehe unten). */
	let bulkPending = $state(false);
	let bulkProgress = $state<{ done: number; total: number } | null>(null);

	/* `indeterminate` ist eine reine DOM-Eigenschaft ohne HTML-Attribut — als
	   `indeterminate={…}` im Markup wäre nicht verlässlich, dass Svelte sie als
	   Property und nicht als Attribut setzt. Deshalb explizit über eine
	   Referenz. */
	let headerCheckbox = $state<HTMLInputElement | null>(null);
	$effect(() => {
		if (headerCheckbox) headerCheckbox.indeterminate = headerState === 'partial';
	});

	async function runBulkSequence(
		ids: number[],
		verdict: SightingVerdict,
		options: { skipped?: number; allowUndo: boolean }
	): Promise<void> {
		bulkPending = true;
		bulkProgress = { done: 0, total: ids.length };
		/* Die Zeilen für die Dauer der Schleife sperren — dieselbe Wache wie beim
		   Einzelwechsel. Sonst könnte ein Klick auf das Status-Control einer
		   gerade laufenden Zeile ein zweites Verdict hinterherschicken. */
		for (const id of ids) statusPending.add(id);
		try {
			const outcome = await runBulkVerdict(ids, verdict, {
				/* `silent`: Sonst käme ein Fehler-Toast pro Zeile — bei 40 Zeilen eine
				   Wand statt einer Rückmeldung. Gemeldet wird einmal, unten. */
				submit: (id, v) => submitVerdict(id, v, { silent: true }),
				onProgress: (done, total) => (bulkProgress = { done, total })
			});

			selectedIds = [];
			await invalidateAll();

			const summary = buildBulkSummary(outcome, verdict, options.skipped ?? 0);
			/* Ein Toast statt N — `warning` bei Teilfehlern, damit die Fehlerzahl
			   nicht in einem grünen Erfolgs-Toast untergeht. */
			const zeigeToast = summary.hasFailures ? toast.warning : toast.success;
			/* Die Aktion wird per Spread ergänzt statt als `action: … : undefined`
			   gesetzt: Unter `exactOptionalPropertyTypes` ist ein explizites
			   `undefined` nicht dasselbe wie ein fehlendes Feld. */
			const undoAktion =
				options.allowUndo && outcome.succeeded.length > 0
					? {
							label: 'Rückgängig',
							/* Nur die Erfolge: Ein `reset` auf eine Zeile, deren Wechsel nie
							   ankam, überschriebe einen fremden Zustand. */
							onClick: () => void undoBulk(outcome.succeeded)
						}
					: null;
			zeigeToast(summary.message, {
				duration: SIGHTING_STATUS_UNDO_MS,
				dismissible: true,
				...(undoAktion ? { action: undoAktion } : {})
			});
		} finally {
			for (const id of ids) statusPending.delete(id);
			bulkPending = false;
			bulkProgress = null;
		}
	}

	async function runBulk(verdict: SightingVerdict): Promise<void> {
		if (bulkPending) return;
		const auswahl = [...selectedIds];
		/* Zeilen mit laufender Einzelaktion bleiben außen vor: Ihr Vorgänger-Zustand
		   ist gerade in Bewegung, ein zweites Verdict darüber wäre ein Rennen. */
		const auszufuehren = auswahl.filter((id) => !statusPending.has(id));
		const uebersprungen = auswahl.length - auszufuehren.length;

		if (auszufuehren.length === 0) {
			toast.error('Die gewählten Zeilen werden gerade noch bearbeitet — bitte kurz warten.', {
				title: 'Aktion nicht möglich',
				dismissible: true
			});
			return;
		}

		await runBulkSequence(auszufuehren, verdict, { skipped: uebersprungen, allowUndo: true });
	}

	/** Das Rückgängig des Bulk-Toasts — kein eigenes Undo darauf, sonst pendelt es. */
	async function undoBulk(ids: number[]): Promise<void> {
		if (bulkPending) {
			toast.error('Es läuft noch eine Aktion — bitte kurz warten.', {
				title: 'Rückgängig nicht möglich',
				dismissible: true
			});
			return;
		}
		await runBulkSequence(ids, 'reset', { allowUndo: false });
	}
</script>

<svelte:head>
	<title>Sichtungen - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Admin-Dashboard zur Verwaltung aller Meerestier-Sichtungen. Überprüfung, Bearbeitung und Verwaltung der gemeldeten Sichtungen in der Ostsee."
	/>
	<meta
		name="keywords"
		content="Admin, Dashboard, Sichtungen, Verwaltung, Meerestiere, Ostsee, Moderation"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Sichtungsverwaltung - Admin - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Administrationsbereich zur Verwaltung und Überprüfung von Meerestier-Sichtungen"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtungsverwaltung - Admin - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Administrationsbereich zur Verwaltung und Überprüfung von Meerestier-Sichtungen"
	/>
</svelte:head>

<div class="pt-6">
	<!-- Page Header -->
	<div class="container mx-auto mb-6 px-4 sm:px-6">
		<!--
			Arbeitslisten-Hinweis „Foto angekündigt, fehlt noch"
			(siehe $lib/utils/media/photoAnnouncement.ts). Echter `btn btn-outline`
			statt eines mit `onclick` klickbar gemachten `badge`: Nur `.btn` bzw.
			`summary.btn` bekommen über app.css automatisch die 44px-Touch-Target-
			Mindestgröße (design-system.md „Feldmodus und Touch-Targets") — ein
			`badge` bleibt bei ~24px hoch und wäre auf der Mobile-Kartenansicht
			dieser Seite nicht zuverlässig zu treffen. `btn-outline` statt eines
			vollton-farbigen `btn-info`, weil Vollton-Sekundärbuttons neben der
			Primäraktion „Export" optisch mit ihr konkurrieren würden (Button-
			Hierarchie-Regel); die Statusfarbe trägt stattdessen nur das Icon
			(`text-info-strong`, AA-geprüft laut tokens.css).
		-->
		{#snippet pendingPhotoBadge()}
			<button
				type="button"
				class="btn btn-sm btn-outline"
				onclick={showPendingPhotoAnnouncements}
				title="Sichtungen mit angekündigtem, aber noch nicht eingetroffenem Foto anzeigen"
			>
				<Icon icon="lucide:camera" class="text-info-strong mr-1 h-4 w-4" aria-hidden="true" />
				{data.pendingPhotoAnnouncements} Foto{data.pendingPhotoAnnouncements === 1 ? '' : 's'} ausstehend
			</button>
		{/snippet}

		<!-- Mobile Layout -->
		<div class="block space-y-3 sm:hidden">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<button
						class="btn btn-sm flex-1 {isFilterPanelOpen
							? 'btn-accent'
							: hasActiveFilters
								? 'btn-primary'
								: 'btn-outline'}"
						onclick={() => (isFilterPanelOpen = !isFilterPanelOpen)}
						title="Filter ein-/ausblenden"
					>
						<Icon icon="lucide:filter" class="mr-1 h-4 w-4" />
						Filter
						{#if hasActiveFilters}
							<span class="badge badge-accent badge-sm ml-1">•</span>
						{/if}
					</button>
					<button
						class="btn btn-sm btn-primary flex-1"
						onclick={() => (showExportModal = true)}
						title="Sichtungen exportieren"
						disabled={!data.pagination?.total}
					>
						<Icon icon="lucide:download" class="mr-1 h-4 w-4" />
						Export
					</button>
				</div>
				{#if (data.pagination && data.pagination.total) || data.pendingPhotoAnnouncements}
					<div class="flex flex-wrap items-center justify-center gap-2">
						{#if data.pagination && data.pagination.total}
							<span class="badge badge-outline text-sm">{data.pagination.total} Ergebnisse</span>
						{/if}
						{#if data.pendingPhotoAnnouncements}
							{@render pendingPhotoBadge()}
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Desktop Layout -->
		<div class="hidden items-center justify-between sm:flex">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex items-center gap-2">
				<details
					class="dropdown dropdown-end"
					bind:open={showColumnDropdown}
					onblur={(e) => {
						// Close when focus leaves the details element entirely
						const related = (e as FocusEvent).relatedTarget as Element | null;
						if (related && !(e.currentTarget as Element).contains(related)) {
							showColumnDropdown = false;
						}
					}}
				>
					<summary class="btn btn-sm btn-outline" title="Spalten ein-/ausblenden">
						<Icon icon="lucide:columns" class="mr-1 h-4 w-4" />
						Spalten
					</summary>
					<div
						class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-raised shadow-floating mt-1 w-64 border p-2"
					>
						<div class="menu-title flex items-center justify-between pb-2">
							<span class="text-sm font-semibold">Spalten anzeigen</span>
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => (showColumnDropdown = false)}
								aria-label="Spalten-Dropdown schließen"
								title="Schließen"
							>
								<Icon icon="lucide:x" class="h-3 w-3" />
							</button>
						</div>
						<div class="max-h-80 overflow-y-auto">
							{#each availableColumns as column (column.key)}
								<label class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded p-1">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={columnVisibility[column.key as keyof typeof columnVisibility]}
									/>
									<span class="flex-1 text-sm">{column.label}</span>
								</label>
							{/each}
						</div>
					</div>
				</details>
				<button
					class="btn btn-sm {isFilterPanelOpen
						? 'btn-accent'
						: hasActiveFilters
							? 'btn-primary'
							: 'btn-outline'}"
					onclick={() => (isFilterPanelOpen = !isFilterPanelOpen)}
					title="Filter ein-/ausblenden"
				>
					<Icon icon="lucide:filter" class="mr-1 h-4 w-4" />
					Filter
					{#if hasActiveFilters}
						<span class="badge badge-accent badge-sm ml-1">•</span>
					{/if}
				</button>
				<button
					class="btn btn-sm btn-primary"
					onclick={() => (showExportModal = true)}
					title="Sichtungen exportieren"
					disabled={!data.pagination?.total}
				>
					<Icon icon="lucide:download" class="mr-1 h-4 w-4" />
					Export
				</button>
				{#if data.pendingPhotoAnnouncements}
					{@render pendingPhotoBadge()}
				{/if}
				{#if data.pagination && data.pagination.total}
					<span class="badge badge-outline whitespace-nowrap"
						>{data.pagination.total} Ergebnisse</span
					>
				{/if}
			</div>
		</div>

		<!--
			Die Freitext-Suche steht bewusst außerhalb des Filter-Panels — sie ist
			der Weg für eine hereinkommende Rückfrage („meine Meldung von gestern",
			eine weitergeleitete Bestätigungsmail) und soll ohne Aufklappen
			erreichbar sein. Serverseitig läuft sie über `sightingSearchFilter.ts`.

			Eigene Zeile unter beiden Kopf-Layouts statt zweier Kopien: Das Feld ist
			in jeder Breite gleich breit nützlich, und ein zweites Exemplar im DOM
			hätte zwei Elemente mit demselben Label (`getByRole('searchbox')` wäre
			mehrdeutig, und Screenreader läsen die Suche doppelt).
			`type="search"` statt `text`: liefert die Rolle `searchbox` und auf
			Mobilgeräten die passende Tastatur mit „Suchen"-Taste.
		-->
		<form class="mt-3 flex items-center gap-2" onsubmit={submitSearch} role="search">
			<label class="input input-sm flex flex-1 items-center gap-2">
				<Icon icon="lucide:search" class="h-4 w-4 opacity-70" aria-hidden="true" />
				<span class="sr-only">Suche nach Referenz-ID, E-Mail, Name oder Fahrwasser</span>
				<input
					type="search"
					class="grow"
					bind:value={searchTerm}
					placeholder="Referenz-ID, E-Mail, Name oder Fahrwasser"
				/>
			</label>
			<button type="submit" class="btn btn-sm btn-outline">Suchen</button>
		</form>

		<!--
			Gespeicherte Filteransichten (Spec B4). Über der Tabelle statt im
			Filter-Panel: Eine Ansicht anzuwenden ist ein Sprung, kein
			Filter-Detail — sie muss ohne Aufklappen erreichbar sein, wie die
			Freitext-Suche darüber.

			Echte `btn` statt klickbar gemachter `badge`: Nur `.btn` bekommt über
			app.css die 44px-Touch-Target-Mindestgröße (design-system.md
			„Feldmodus und Touch-Targets"); ein `badge` bliebe bei ~24px.
			Die aktive Ansicht trägt `btn-primary` — sie ist die einzige
			Vollton-Fläche der Leiste, alle übrigen sind `btn-outline`, damit
			„aktiv" nicht mit „auswählbar" verschwimmt (Button-Hierarchie).
			`aria-current="true"` sagt dasselbe für Screenreader, die die Farbe
			nicht sehen.
		-->
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span class="text-support text-base-content/70">Ansichten:</span>

			{#each filterPresets as preset (preset.id)}
				{#if umbenennenId === preset.id}
					<form class="flex items-center gap-1" onsubmit={umbenennenBestaetigen}>
						<label class="sr-only" for="ansicht-umbenennen">Ansicht umbenennen</label>
						<input
							id="ansicht-umbenennen"
							class="input input-sm w-40"
							bind:this={umbenennenFeld}
							bind:value={umbenennenName}
							maxlength="40"
							required
						/>
						<button type="submit" class="btn btn-sm btn-primary">Übernehmen</button>
						<button
							type="button"
							class="btn btn-sm btn-ghost"
							onclick={() => (umbenennenId = null)}
						>
							Abbrechen
						</button>
					</form>
				{:else}
					<div class="join">
						<button
							type="button"
							class="btn btn-sm join-item {aktiveAnsichtId === preset.id
								? 'btn-primary'
								: 'btn-outline'}"
							aria-current={aktiveAnsichtId === preset.id ? 'true' : undefined}
							onclick={() => ansichtAnwenden(preset)}
						>
							{preset.name}
						</button>
						<!-- Verwalten im Dropdown, nicht als zwei weitere Chips: Umbenennen und
						     Löschen sind seltene Aktionen und würden die Leiste sonst mit jeder
						     gespeicherten Ansicht verdreifachen. -->
						<details class="dropdown dropdown-end join-item">
							<summary
								class="btn btn-sm btn-outline join-item"
								aria-label="Ansicht „{preset.name}“ verwalten"
								title="Umbenennen oder löschen"
							>
								<Icon icon="lucide:ellipsis-vertical" class="h-4 w-4" aria-hidden="true" />
							</summary>
							<ul
								class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-raised shadow-floating mt-1 w-44 border p-2"
							>
								<li>
									<button type="button" onclick={() => umbenennenStarten(preset)}>
										<Icon icon="lucide:square-pen" class="h-4 w-4" aria-hidden="true" />
										Umbenennen
									</button>
								</li>
								<li>
									<button type="button" class="text-error" onclick={() => ansichtLoeschen(preset)}>
										<Icon icon="lucide:trash-2" class="h-4 w-4" aria-hidden="true" />
										Löschen
									</button>
								</li>
							</ul>
						</details>
					</div>
				{/if}
			{/each}

			{#if zeigeAnsichtFormular}
				<form class="flex items-center gap-1" onsubmit={ansichtSpeichern}>
					<label class="sr-only" for="ansicht-name">Name der Ansicht</label>
					<!-- `required` statt einer eigenen Prüfung: Die Browser-Constraint-
					     Validierung meldet den leeren Namen am Feld selbst, dort wo er
					     entsteht. Ohne sie täte der Speichern-Knopf sichtbar nichts. -->
					<input
						id="ansicht-name"
						class="input input-sm w-44"
						bind:this={neueAnsichtFeld}
						bind:value={neueAnsichtName}
						placeholder="z. B. Offene Totfunde"
						maxlength="40"
						required
					/>
					<button type="submit" class="btn btn-sm btn-primary">Speichern</button>
					<button
						type="button"
						class="btn btn-sm btn-ghost"
						onclick={() => {
							zeigeAnsichtFormular = false;
							neueAnsichtName = '';
						}}
					>
						Abbrechen
					</button>
				</form>
			{:else}
				<button
					type="button"
					class="btn btn-sm btn-ghost"
					onclick={() => (zeigeAnsichtFormular = true)}
					title="Aktuelle Filter als benannte Ansicht speichern"
				>
					<Icon icon="lucide:bookmark-plus" class="mr-1 h-4 w-4" aria-hidden="true" />
					Ansicht speichern
				</button>
			{/if}
		</div>
	</div>

	<!-- Filter Panel.

	     Hier stand `transition-all duration-300`. Das ist als einzige der 19
	     Dauer-Fundstellen NICHT auf ein Motion-Token gewandert, sondern
	     ersatzlos entfallen: Das Panel hängt an einem `{#if}` und wird ein- und
	     ausgehängt statt ein- und ausgeblendet — es gibt keinen Zustand, von
	     dem aus ein Übergang laufen könnte, und die Klasse hat nie gewirkt.
	     Ein `duration-panel` an ihrer Stelle sähe token-konform aus und täte
	     weiterhin nichts. Wer hier wirklich animieren will, braucht
	     `transition:slide` aus `svelte/transition` (design-system.md, „Keine
	     toten Utility-Klassen"). -->
	{#if isFilterPanelOpen}
		<div class="bg-base-200 shadow-raised container mx-auto mb-4 rounded-lg p-3 px-4 sm:px-6">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-base font-semibold">Filter</h2>
				<button
					class="btn btn-ghost btn-xs"
					onclick={() => (isFilterPanelOpen = false)}
					title="Filter ausblenden"
					aria-label="Filter ausblenden"
				>
					<Icon icon="lucide:x" class="h-4 w-4" />
				</button>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
				<div class="fieldset w-full">
					<label for="fromDate" class="label py-0">
						<span class="text-xs">Von</span>
					</label>
					<input
						type="date"
						id="fromDate"
						name="fromDate"
						class="input input-sm w-full"
						bind:value={fromDate}
					/>
				</div>
				<div class="fieldset w-full">
					<label for="toDate" class="label py-0">
						<span class="text-xs">Bis</span>
					</label>
					<input
						type="date"
						id="toDate"
						name="toDate"
						class="input input-sm w-full"
						bind:value={toDate}
					/>
				</div>
				<div class="fieldset w-full">
					<label for="verified" class="label py-0">
						<span class="text-xs">Status</span>
					</label>
					<select
						id="verified"
						name="verified"
						class="select select-sm w-full text-sm"
						bind:value={verified}
					>
						<option value="">Alle</option>
						<option value="open">Offen</option>
						<option value="approved">Freigegeben</option>
						<option value="rejected">Abgelehnt</option>
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="deadFinding" class="label py-0">
						<span class="text-xs">Meldeart</span>
					</label>
					<select
						id="deadFinding"
						name="deadFinding"
						class="select select-sm w-full text-sm"
						bind:value={deadFinding}
					>
						<option value="">Alle</option>
						<option value="1">{DEAD_FINDING_PRESENTATION.label}</option>
						<option value="0">Lebendsichtung</option>
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="entryChannel" class="label py-0">
						<span class="text-xs">Kanal</span>
					</label>
					<select
						id="entryChannel"
						name="entryChannel"
						class="select select-sm w-full text-sm"
						bind:value={selectedChannel}
					>
						<option value="all">Alle</option>
						{#each getEntryChannelOptions() as { value, label } (value)}
							<option value={String(value)}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="mediaUpload" class="label py-0">
						<span class="text-xs">Aufnahme</span>
					</label>
					<select
						id="mediaUpload"
						name="mediaUpload"
						class="select select-sm w-full text-sm"
						bind:value={mediaUpload}
					>
						<option value="">Alle</option>
						<option value="1">Mit</option>
						<option value="0">Ohne</option>
						<option value={MEDIA_UPLOAD_ANNOUNCED_MISSING}>Angekündigt, fehlt noch</option>
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="balticSea" class="label py-0">
						<span class="text-xs">Ostsee</span>
					</label>
					<select
						id="balticSea"
						name="balticSea"
						class="select select-sm w-full text-sm"
						bind:value={balticSea}
					>
						<option value="">Alle</option>
						{#each Object.entries(BALTIC_SEA_STATUS_PRESENTATION) as [value, presentation] (value)}
							<option {value}>{presentation.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
				<button class="btn btn-outline btn-sm sm:btn-xs" onclick={resetFilters}>Zurücksetzen</button
				>
				<button class="btn btn-primary btn-sm sm:btn-xs" onclick={applyFilters}>Anwenden</button>
			</div>
		</div>
	{/if}

	<!-- Mobile Card Layout -->
	<div class="container mx-auto block space-y-3 px-4 sm:px-6 md:hidden">
		{#each sightings as sighting (sighting.id)}
			{@const balticSea = BALTIC_SEA_STATUS_PRESENTATION[getBalticSeaStatus(sighting)]}
			{@const status = getSightingStatus({
				approvedAt: sighting.approvedAt,
				rejectedAt: sighting.rejectedAt
			})}
			<div class="bg-base-100 border-base-300 shadow-raised rounded-lg border p-4">
				<div class="mb-3 flex items-start justify-between">
					<div class="flex-1">
						<!-- Referenz und Kennzeichen als eigene Flex-Zeile: Nebeneinander,
						     solange der Platz reicht, und darunter, wenn nicht — ein
						     Inline-Badge mit `ml-2` stand nach dem Umbruch eingerückt da. -->
						<div class="flex flex-wrap items-center gap-2">
							{#if sighting.referenceId}
								<!-- `break-all`, weil `flex-wrap` nur zwischen Flex-Items umbricht und
								     eine Referenz-ID ein Wort ohne Umbruchgelegenheit ist: der Link hielt
								     ~202px Mindestbreite und schob die ganze Seite über den Viewport
								     (320px/375px, siehe admin-table-mobile-reference-overflow.spec.ts).
								     Nicht `truncate` — die Referenz-ID ist der Schlüssel zum Wiederfinden
								     einer Meldung und wäre abgeschnitten wertlos. -->
								<a
									href="/admin/ref/{sighting.referenceId}"
									class="link link-primary link-hover font-mono text-sm break-all"
								>
									{sighting.referenceId}
								</a>
							{:else}
								<span class="text-base-content/70 text-sm">Keine Referenz</span>
							{/if}
							<!-- In der Kopfzeile und nicht unten in der Badge-Reihe: Dort stand
							     der Totfund gleichrangig neben „Mit Aufnahme" und dem
							     Ostsee-Status und ging zwischen ihnen unter. Die Art der Meldung
							     ist keine Eigenschaft unter anderen. -->
							{#if isDeadFinding(sighting.isDead)}
								<span class="badge badge-sm {DEAD_FINDING_PRESENTATION.badgeClass} gap-1">
									<Icon
										icon={DEAD_FINDING_PRESENTATION.icon}
										class="h-3.5 w-3.5"
										aria-hidden="true"
									/>
									{DEAD_FINDING_PRESENTATION.label}
								</span>
							{/if}
						</div>
						<h3 class="mt-1 text-base font-semibold">{getSpeciesLabel(sighting.species)}</h3>
					</div>
					<div class="ml-2 flex gap-1">
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => viewSightingDetails(sighting)}
							title="Details anzeigen"
							aria-label="Details anzeigen"
						>
							<Icon icon="lucide:eye" class="h-4 w-4" />
						</button>
						<!-- Nur Superadmins: Der Klick erzeugt im Team-Postfach eine Mail, die
						     von einer echten Neu-Meldung nicht zu unterscheiden ist. Das Gate
						     steht zusätzlich am Endpunkt — hier verschwindet nur das Bedienelement. -->
						{#if data.isSuperAdmin}
							<button
								class="btn btn-ghost btn-sm"
								onclick={() => sendTestEmail(sighting.id)}
								title={TEST_EMAIL_HINT}
								aria-label="Benachrichtigung zu dieser Sichtung an das Team senden"
							>
								<Icon icon="lucide:mail" class="h-4 w-4" />
							</button>
						{/if}
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => checkSpam(sighting.id)}
							title="Spam-Check"
							aria-label="Spam-Check durchführen"
						>
							<Icon icon="lucide:shield-alert" class="h-4 w-4" />
						</button>
						<button
							class="btn text-error btn-ghost btn-sm"
							onclick={() => {
								sightingToDelete = sighting;
								showDeleteDialog = true;
							}}
							title="Eintrag löschen"
							aria-label="Eintrag löschen"
						>
							<Icon icon="lucide:trash-2" class="h-4 w-4" />
						</button>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<span class="text-base-content/70">Sichtung:</span>
						<span class="block">{formatLocalDateTime(sighting.sightingDate)}</span>
					</div>
					<div>
						<span class="text-base-content/70">Anzahl:</span>
						<span class="block">{sighting.totalCount}</span>
					</div>
					<div class="col-span-2">
						<span class="text-base-content/70">Email:</span>
						<a href="mailto:{sighting.email}" class="link link-primary link-hover block text-sm">
							{sighting.email}
						</a>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					{#if sighting.mediaUpload}
						<span class="badge badge-success badge-sm">Mit Aufnahme</span>
					{/if}
					<!-- Anders als die Aufnahme immer sichtbar: „außerhalb" und „ohne
					     Position" sind für die Triage genauso relevant wie „Ostsee", ein
					     fehlendes Badge wäre hier also keine Aussage. -->
					<span
						class="badge badge-sm {balticSea.badgeClass} whitespace-nowrap"
						title={balticSea.title}
					>
						{balticSea.label}
					</span>
				</div>

				<div class="mt-3 flex items-center justify-between">
					<span class="text-base-content/70 text-xs">
						Gemeldet: {formatLocalDateTime(sighting.created)}
					</span>
					<!-- size="sm" statt "md": Gemessen bei 320px/375px lief die Karte mit den
					     drei beschrifteten Segmenten (`.btn` hat `flex-shrink: 0`, DaisyUI kann
					     die Gruppe also nicht stauchen) um bis zu 155px horizontal über —
					     `e2e/admin-table-mobile-status-overflow.spec.ts` hält das als
					     Regressionstest fest. "sm" zeigt wie die Desktop-Spalte nur Icons; die
					     Bedeutung tragen dann Icon-Form und Füllung plus das `aria-label` am
					     Radio-Input (`SightingStatusControl.svelte`) — das erreicht auch
					     Screenreader. Der `title` am Segment ist eine Zugabe nur für die Maus,
					     er wirkt bei Tastatur- und Touch-Bedienung nicht.
					     `groupSuffix="-mobile"`: Ohne ihn teilt sich dieses Control den
					     Radio-`name` mit dem gleich benannten Control der Desktop-Tabelle
					     weiter unten — beide stehen für dieselbe Sichtung gleichzeitig im DOM,
					     nur per CSS getrennt, und HTML gruppiert Radios über den ganzen
					     Dokumentbaum, nicht pro `fieldset` (siehe `SightingStatusControl.svelte`). -->
					<SightingStatusControl
						{status}
						sightingId={sighting.id}
						size="sm"
						groupSuffix="-mobile"
						busy={statusPending.has(sighting.id)}
						onchange={(verdict) => changeStatus(sighting.id, verdict, status)}
					/>
				</div>
			</div>
		{/each}
	</div>

	<!-- Sortierbarer Spaltenkopf: <button> im <th> mit aria-sort für Screenreader -->
	{#snippet sortableTh(label: string, key: string)}
		{@const isActive = page.url.searchParams.get('sort') === key}
		{@const isDesc = page.url.searchParams.get('order') === 'desc'}
		<th class="p-0" aria-sort={isActive ? (isDesc ? 'descending' : 'ascending') : 'none'}>
			<button
				type="button"
				class="hover:bg-base-300 flex w-full items-center gap-1 px-4 py-3 text-left font-semibold"
				onclick={() => updateSort(key)}
			>
				{label}
				{#if isActive}
					<span aria-hidden="true">{isDesc ? '↓' : '↑'}</span>
				{/if}
			</button>
		</th>
	{/snippet}

	<!-- Desktop Table Layout -->
	<div class="hidden px-2 sm:px-4 md:block">
		<!--
			Aktionsleiste der Bulk-Auswahl. Sie erscheint nur bei Auswahl > 0 und steht
			über der Tabelle, nicht als schwebender Balken: Bezugspunkt sind die
			Checkboxen darunter, und ein Overlay verdeckte auf kurzen Listen die
			erste Zeile.
			„Freigeben" ist hier `btn-primary`, obwohl „Export" im Seitenkopf ebenfalls
			primär ist — die Leiste ist ein eigener, temporärer Handlungsbereich mit
			genau einer Primäraktion (Button-Hierarchie: eine pro Bereich). „Ablehnen"
			bleibt `btn-outline`, „Auswahl aufheben" als reine Rücknahme `btn-ghost`.
			`disabled` und nicht `aria-disabled` während des Laufs — mit offenem
			Vorbehalt: Der Lauf ist bei vielen Zeilen NICHT kurz, Tastaturnutzer
			verlieren für seine Dauer den Fokus. Trotzdem `disabled`, weil ein frei
			fokussierbarer Knopf während eines Laufs, der gerade dutzende Zeilen
			schreibt, Bedienbarkeit behauptete, die es nicht gibt (`runBulk` wiese
			den Klick nur still ab); den Zustand erklärt die aria-live-Fortschritts-
			anzeige daneben. Ein Doppelklick hätte hier echte Folgen.
		-->
		{#if selectedIds.length > 0}
			<div
				class="bg-base-200 border-base-300 mb-3 flex flex-wrap items-center gap-3 rounded-lg border p-3"
				role="group"
				aria-label="Aktionen für die ausgewählten Sichtungen"
			>
				<span class="font-semibold">{selectedIds.length} ausgewählt</span>
				{#if bulkProgress}
					<span class="text-base-content/70 flex items-center gap-2 text-sm" aria-live="polite">
						<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
						{bulkProgress.done}/{bulkProgress.total} verarbeitet
					</span>
				{/if}
				<div class="ml-auto flex flex-wrap items-center gap-2">
					<button
						class="btn btn-sm btn-primary"
						onclick={() => runBulk('approve')}
						disabled={bulkPending}
					>
						<Icon icon={SIGHTING_STATUS_PRESENTATION.approved.icon} class="mr-1 h-4 w-4" />
						Freigeben
					</button>
					<button
						class="btn btn-sm btn-outline"
						onclick={() => runBulk('reject')}
						disabled={bulkPending}
					>
						<Icon icon={SIGHTING_STATUS_PRESENTATION.rejected.icon} class="mr-1 h-4 w-4" />
						Ablehnen
					</button>
					<button
						class="btn btn-sm btn-ghost"
						onclick={() => (selectedIds = [])}
						disabled={bulkPending}
					>
						Auswahl aufheben
					</button>
				</div>
			</div>
		{/if}
		<div class="border-base-300 bg-base-100 shadow-raised w-full overflow-x-auto rounded-lg border">
			<table class="table-zebra table w-full">
				<thead class="bg-base-200 text-base-content">
					<tr>
						<!-- Auswahlspalte, ganz links und wie die Markerspalte daneben fest:
						     Sie steht bewusst nicht in `availableColumns`. Abschaltbar wäre die
						     Bulk-Funktion je nach gespeicherter Spaltenwahl unerreichbar — und
						     der gespeicherte Stand überlebt seit U2 den Reload.
						     Nicht `sticky-col`: Der fixierte Bereich liegt rechts (Status,
						     Aktionen); eine zweite fixierte Kante links stahl auf schmalen
						     Fenstern zusätzlich Platz vom scrollenden Mittelteil. -->
						<th class="w-px p-0">
							<label class="flex cursor-pointer items-center justify-center px-2">
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									bind:this={headerCheckbox}
									checked={headerState === 'all'}
									disabled={bulkPending}
									onchange={(e) =>
										(selectedIds = setAllSelected(visibleIds, e.currentTarget.checked))}
									aria-label="Alle Sichtungen auf dieser Seite auswählen"
								/>
							</label>
						</th>
						<!-- Feste Markerspalte, nicht in der Spaltenauswahl: Sie steht vor
						     allen konfigurierbaren Spalten und überlebt damit sowohl jede
						     Spaltenwahl als auch das horizontale Scrollen der Tabelle. -->
						<th class="w-px p-0"><span class="sr-only">Art der Meldung</span></th>
						<!-- Kein `hover:bg-base-300` an den nicht sortierbaren Köpfen: Die
						     Aufhellung unter dem Zeiger versprach eine Sortierung, die es hier
						     nicht gibt — sortierbare Köpfe tragen sie am <button> in `sortableTh`. -->
						{#if columnVisibility.referenceId}
							<th>Referenz-ID</th>
						{/if}
						{#if columnVisibility.sightingDate}
							{@render sortableTh('Sichtungsdatum', 'sightingDate')}
						{/if}
						{#if columnVisibility.created}
							{@render sortableTh('Meldedatum', 'created')}
						{/if}
						{#if columnVisibility.email}
							{@render sortableTh('E-Mail', 'email')}
						{/if}
						{#if columnVisibility.species}
							{@render sortableTh('Tierart', 'species')}
						{/if}
						{#if columnVisibility.distance}
							{@render sortableTh('Entfernung', 'distance')}
						{/if}
						{#if columnVisibility.totalCount}
							{@render sortableTh('Anzahl', 'totalCount')}
						{/if}
						{#if columnVisibility.juvenileCount}
							{@render sortableTh('Jung', 'juvenileCount')}
						{/if}
						{#if columnVisibility.distribution}
							{@render sortableTh('Verteilung', 'distribution')}
						{/if}
						{#if columnVisibility.behavior}
							{@render sortableTh('Verhalten', 'behavior')}
						{/if}
						{#if columnVisibility.seaState}
							{@render sortableTh('Seegang', 'seaState')}
						{/if}
						{#if columnVisibility.wind}
							{@render sortableTh('Wind', 'wind')}
						{/if}
						{#if columnVisibility.visibility}
							{@render sortableTh('Sichtweite', 'visibility')}
						{/if}
						{#if columnVisibility.mediaUpload}
							<th>Aufnahme</th>
						{/if}
						{#if columnVisibility.spamScore}
							{@render sortableTh('Spam', 'spamScore')}
						{/if}
						{#if columnVisibility.balticSea}
							<th>Ostsee</th>
						{/if}
						<!-- Status und Aktionen bleiben beim horizontalen Scrollen stehen: Sie
						     sind der Grund, aus dem die Tabelle geöffnet wird, standen aber bei
						     vielen aktiven Spalten außerhalb des Viewports. Die Trennkante an der
						     linken Sticky-Zelle macht sichtbar, dass hier ein fixierter Bereich
						     beginnt — ohne sie sieht der Durchlauf darunter nach einem Fehler aus. -->
						{#if columnVisibility.verified}
							<th class="sticky-col sticky-edge" style="right: {stickyStatusRight}px">Status</th>
						{/if}
						{#if columnVisibility.actions}
							<th
								class="sticky-col {columnVisibility.verified ? '' : 'sticky-edge'}"
								style="right: 0"
								bind:clientWidth={actionsColumnWidth}
							>
								Aktionen
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each sightings as sighting (sighting.id)}
						<tr class="hover:bg-base-200" data-sighting-id={sighting.id}>
							<!-- Auswahl-Checkbox, Gegenstück zur Kopfspalte oben. Das `aria-label`
							     nennt die Referenz-ID und nicht nur „Zeile 3": Beim Vorlesen ist
							     die Nummer der Meldung das, woran die Zeile erkennbar ist. -->
							<td class="w-px p-0">
								<label class="flex cursor-pointer items-center justify-center px-2">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={selectedIds.includes(sighting.id)}
										disabled={bulkPending}
										onchange={() => (selectedIds = toggleSelection(selectedIds, sighting.id))}
										aria-label="Sichtung {sighting.referenceId ?? sighting.id} auswählen"
									/>
								</label>
							</td>
							<!-- Kante und Icon zusammen: Die Kante wirkt beim Überfliegen, das
							     Icon trägt zusätzlich eine Form — Farbe allein wäre kein
							     Merkmal (WCAG 1.4.1). Der `sr-only`-Text benennt beides, sonst
							     bliebe die Zelle für Screenreader leer.
							     Die Kante steht an der Zelle und nicht am `<tr>`: unter
							     `border-collapse` entscheidet dort sonst die Konfliktauflösung
							     der Nachbarkanten, ob sie überhaupt gezeichnet wird. -->
							<td
								class="w-px p-0 {isDeadFinding(sighting.isDead) ? 'border-error border-l-4' : ''}"
							>
								{#if isDeadFinding(sighting.isDead)}
									<span class="flex items-center justify-center px-2">
										<Icon
											icon={DEAD_FINDING_PRESENTATION.icon}
											class="text-error h-4 w-4"
											aria-hidden="true"
										/>
										<span class="sr-only">{DEAD_FINDING_PRESENTATION.label}</span>
									</span>
								{/if}
							</td>
							{#if columnVisibility.referenceId}
								<td>
									{#if sighting.referenceId}
										<a
											href="/admin/ref/{sighting.referenceId}"
											class="link link-primary link-hover font-mono"
										>
											{sighting.referenceId}
										</a>
									{:else}
										<span class="text-base-content/70">—</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.sightingDate}
								<td>{formatLocalDateTime(sighting.sightingDate)}</td>
							{/if}
							{#if columnVisibility.created}
								<td>{formatLocalDateTime(sighting.created)}</td>
							{/if}
							{#if columnVisibility.email}
								<td>
									<a
										href="mailto:{sighting.email}"
										class="link link-primary link-hover block max-w-32 truncate"
									>
										{sighting.email}
									</a>
								</td>
							{/if}
							{#if columnVisibility.species}
								<td>{getSpeciesLabel(sighting.species)}</td>
							{/if}
							{#if columnVisibility.distance}
								<td>{getDistanceLabel(sighting.distance)}</td>
							{/if}
							{#if columnVisibility.totalCount}
								<td>{sighting.totalCount}</td>
							{/if}
							{#if columnVisibility.juvenileCount}
								<td>{sighting.juvenileCount || '—'}</td>
							{/if}
							{#if columnVisibility.distribution}
								<td>{getDistributionLabel(sighting.distribution)}</td>
							{/if}
							{#if columnVisibility.behavior}
								<td>{getAnimalBehaviorLabel(sighting.behavior) || '—'}</td>
							{/if}
							{#if columnVisibility.seaState}
								<td>{getSeaStateLabel(sighting.seaState) || '—'}</td>
							{/if}
							{#if columnVisibility.wind}
								<td
									>{getWindStrengthLabel(
										sighting.windForce ? Number(sighting.windForce) : undefined
									) || '—'}</td
								>
							{/if}
							{#if columnVisibility.visibility}
								<td>{getVisibilityLabel(sighting.visibility) || '—'}</td>
							{/if}
							{#if columnVisibility.mediaUpload}
								<td class="text-center">
									{#if sighting.mediaUpload}
										<span class="badge badge-success badge-sm">Ja</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Nein</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.spamScore}
								<td class="text-center">
									{#if sighting.spamScore == null}
										<!-- NULL heißt „nie bewertet" (Altbestand, Legacy-Eingang) —
										     bewusst kein Badge, sonst läse es sich wie „geprüft, sauber". -->
										<span class="text-base-content/70">—</span>
									{:else}
										<span
											class="badge badge-sm whitespace-nowrap {sighting.spamScore >= 5
												? 'badge-error'
												: sighting.spamScore >= 2
													? 'badge-warning'
													: 'badge-ghost'}"
											title={Array.isArray(sighting.spamIndicators) &&
											sighting.spamIndicators.length > 0
												? sighting.spamIndicators.join(', ')
												: 'Keine Auffälligkeiten'}
										>
											{sighting.spamScore}
											<!-- title ist nur per Maus erreichbar — derselbe Text
											     zusätzlich für Screenreader. -->
											<span class="sr-only">
												{Array.isArray(sighting.spamIndicators) &&
												sighting.spamIndicators.length > 0
													? `Spam-Indikatoren: ${sighting.spamIndicators.join(', ')}`
													: 'Keine Auffälligkeiten'}
											</span>
										</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.balticSea}
								{@const balticSea = BALTIC_SEA_STATUS_PRESENTATION[getBalticSeaStatus(sighting)]}
								<td class="text-center">
									<!-- whitespace-nowrap: „ohne Position" bricht in der schmalen Spalte sonst
									     um und läuft aus dem Badge heraus, der Rahmen schneidet durch den Text. -->
									<span
										class="badge badge-sm {balticSea.badgeClass} whitespace-nowrap"
										title={balticSea.title}
									>
										{balticSea.label}
									</span>
								</td>
							{/if}
							{#if columnVisibility.verified}
								{@const status = getSightingStatus({
									approvedAt: sighting.approvedAt,
									rejectedAt: sighting.rejectedAt
								})}
								<td class="sticky-col sticky-edge" style="right: {stickyStatusRight}px">
									<SightingStatusControl
										{status}
										sightingId={sighting.id}
										size="sm"
										busy={statusPending.has(sighting.id)}
										onchange={(verdict) => changeStatus(sighting.id, verdict, status)}
									/>
								</td>
							{/if}
							{#if columnVisibility.actions}
								<td
									class="sticky-col w-px whitespace-nowrap {columnVisibility.verified
										? ''
										: 'sticky-edge'}"
									style="right: 0"
								>
									<!-- flex-nowrap: sonst brechen die 44px hohen Buttons um und ziehen die Zeile auf -->
									<div class="flex flex-nowrap items-center gap-1">
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => viewSightingDetails(sighting)}
											title="Details anzeigen"
											aria-label="Details anzeigen"
										>
											<Icon icon="lucide:eye" class="h-4 w-4" />
										</button>
										<!-- Nur Superadmins — Begründung an der Kartenansicht weiter oben. -->
										{#if data.isSuperAdmin}
											<button
												class="btn btn-ghost btn-xs"
												onclick={() => sendTestEmail(sighting.id)}
												title={TEST_EMAIL_HINT}
												aria-label="Benachrichtigung zu dieser Sichtung an das Team senden"
											>
												<Icon icon="lucide:mail" class="h-4 w-4" />
											</button>
										{/if}
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => checkSpam(sighting.id)}
											title="Spam-Check"
											aria-label="Spam-Check durchführen"
										>
											<Icon icon="lucide:shield-alert" class="h-4 w-4" />
										</button>
										<button
											class="btn text-error btn-ghost btn-xs"
											onclick={() => {
												sightingToDelete = sighting;
												showDeleteDialog = true;
											}}
											title="Eintrag löschen"
											aria-label="Eintrag löschen"
										>
											<Icon icon="lucide:trash-2" class="h-4 w-4" />
										</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div
		class="container mx-auto mt-6 flex flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6"
	>
		<div class="flex items-center gap-2 text-center sm:text-left">
			<!-- Echtes `label[for]` statt eines `span` daneben: Ohne Verbindung las
			     ein Screenreader hier „Kombinationsfeld, 20" ohne jede Angabe,
			     worüber entschieden wird (WCAG 4.1.2). Es war die einzige Stelle im
			     Admin ohne zugänglichen Namen. -->
			<label class="text-sm font-medium" for="perPage">Einträge pro Seite:</label>
			<select
				id="perPage"
				name="perPage"
				class="select select-sm min-h-8 text-sm"
				onchange={(e) => changeItemsPerPage(Number(e.currentTarget.value))}
			>
				{#each [10, 20, 50, 100].filter((size) => size <= (data.pagination?.maxPerPage || 50)) as size (size)}
					<option value={size} selected={data.pagination.perPage === size}>{size}</option>
				{/each}
			</select>
		</div>

		<!-- Sperren und Seitenzahl kommen aus `seiten` (= `paginationControls`) und
		     nicht aus Ausdrücken hier: `totalPages` ist bei null Treffern 0, und
		     `page === totalPages` war dann `1 === 0` — „Nächste"/„Letzte" blieben
		     auf einer leeren Trefferliste bedienbar und führten auf Seite 2 bzw. 0.
		     Der Leerfall ist genau der, den man beim Bauen nicht vor sich hat;
		     abgesichert in `paginationControls.test.ts`.

		     `aria-label` an jeder Schaltfläche zusätzlich zum `title`: Die
		     Beschriftung ist nur ein Zeichen, und nach den Accessible-Name-Regeln
		     gewinnt der Inhalt eines Buttons gegen sein `title` — der zugängliche
		     Name war damit „«". Das `title` bleibt für den Maus-Tooltip stehen und
		     weil `e2e/design-tokens.spec.ts` seine renders-Sonde darüber selektiert.
		     Abgesichert in `paginationAccessibleNames.test.ts`. -->
		<nav class="join" aria-label="Seiten-Navigation">
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(1)}
				disabled={seiten.atFirst}
				title="Erste Seite"
				aria-label="Erste Seite"
			>
				«
			</button>
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page - 1)}
				disabled={seiten.atFirst}
				title="Vorherige Seite"
				aria-label="Vorherige Seite"
			>
				‹
			</button>

			<!-- Die Seitenanzeige war ein `<button>` ohne `onclick` — ein Bedienelement,
			     das nichts bewirkt, gehört entfernt (Button-Hierarchie). Als `<span>`
			     mit `.btn`-Optik bleibt das Aussehen der Leiste erhalten, ohne
			     Bedienbarkeit zu behaupten; `aria-current="page"` sagt Screenreadern,
			     wofür die Zahl steht. -->
			<span
				class="btn btn-active join-item btn-sm pointer-events-none min-w-32 text-xs sm:text-sm"
				aria-current="page"
			>
				{data.pagination.page} / {seiten.totalPages}
			</span>

			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page + 1)}
				disabled={seiten.atLast}
				title="Nächste Seite"
				aria-label="Nächste Seite"
			>
				›
			</button>
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(seiten.totalPages)}
				disabled={seiten.atLast}
				title="Letzte Seite"
				aria-label="Letzte Seite"
			>
				»
			</button>
		</nav>

		<div class="text-base-content/70 text-center text-sm sm:text-right">
			{data.pagination.total} Einträge
		</div>
	</div>

	<DeleteDialog
		bind:show={showDeleteDialog}
		onConfirm={() => {
			if (sightingToDelete) {
				removeSighting(sightingToDelete.id);
			}
		}}
		onCancel={() => {
			showDeleteDialog = false;
			sightingToDelete = null;
		}}
	/>

	<ExportModal
		bind:show={showExportModal}
		{currentFilters}
		totalRecords={data.pagination?.total || 0}
	/>
</div>

<!-- Native dialog element with showModal()/close() for proper focus management and ESC handling -->
<dialog
	bind:this={spamCheckDialogElement}
	class="modal"
	aria-labelledby="spam-check-modal-title"
	onclose={() => (spamCheckModal.open = false)}
>
	<div class="modal-box max-w-lg">
		<h3 id="spam-check-modal-title" class="text-lg font-bold">Spam-Analyse</h3>

		{#if spamCheckModal.loading}
			<div class="flex justify-center py-8">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if spamCheckModal.error}
			<div class="alert alert-error mt-4" role="alert">
				<Icon icon="lucide:circle-alert" class="shrink-0" aria-hidden="true" />
				<span>{spamCheckModal.error}</span>
			</div>
		{:else if spamCheckModal.result}
			<!-- Score badges -->
			<div class="mt-4 flex flex-wrap gap-2">
				<span
					class="badge {spamCheckModal.result.isHighRisk
						? 'badge-error'
						: spamCheckModal.result.score >= 2
							? 'badge-warning'
							: 'badge-success'}"
				>
					Heuristik-Score: {spamCheckModal.result.score}
				</span>
				{#if spamCheckModal.result.isHighRisk}
					<span class="badge badge-error">Hochrisiko</span>
				{:else}
					<span class="badge badge-success">Kein Hochrisiko</span>
				{/if}
			</div>
			<!-- Indicators list -->
			{#if spamCheckModal.result.indicators.length > 0}
				<p class="mt-4 font-semibold">Indikatoren:</p>
				<ul class="mt-1 list-inside list-disc text-sm">
					{#each spamCheckModal.result.indicators as indicator (indicator)}
						<li>{indicator}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-success-strong mt-4 text-sm">Keine Indikatoren gefunden.</p>
			{/if}
		{/if}

		<div class="modal-action">
			<button class="btn" onclick={() => (spamCheckModal.open = false)}>Schließen</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="Modal schließen" onclick={() => (spamCheckModal.open = false)}>
			<span class="sr-only">Modal schließen</span>
		</button>
	</form>
</dialog>

<style>
	/* Fixierte Spalten (Status, Aktionen) im horizontal scrollenden Container.
	   Warum die Hintergründe hier von Hand stehen: `table-zebra` und der
	   Zeilen-Hover färben das <tr>, nicht die Zellen — eine sticky-Zelle bliebe
	   damit durchsichtig, und der wegscrollende Inhalt liefe sichtbar darunter
	   durch. DaisyUIs Tabellenregeln setzen an `:where(th, td)` keinen
	   Hintergrund und stehen zudem in `:where()` ohne Spezifität; diese
	   ungelayerten Regeln gewinnen also. Farben nur als Theme-Token. */
	.sticky-col {
		position: sticky;
		background-color: var(--color-base-100);
	}

	/* Zebra: `tbody tr:nth-child(even)` trägt base-200 — die fixierte Zelle muss
	   dieselbe Fläche mitbringen, sonst blitzt sie beim Scrollen heller auf. */
	tbody tr:nth-child(even) .sticky-col {
		background-color: var(--color-base-200);
	}

	/* Zeilen-Hover (`hover:bg-base-200` am <tr>) — deckungsgleich für gerade und
	   ungerade Zeilen, weil beide Zustände auf base-200 laufen. */
	tbody tr:hover .sticky-col {
		background-color: var(--color-base-200);
	}

	/* Der Tabellenkopf steht auf `bg-base-200` (am <thead>, nicht an den Zellen). */
	thead .sticky-col {
		background-color: var(--color-base-200);
	}

	/* Trennkante an der linken Kante des fixierten Bereichs. */
	.sticky-edge {
		border-left: var(--border, 1px) solid var(--color-base-300);
	}
</style>
