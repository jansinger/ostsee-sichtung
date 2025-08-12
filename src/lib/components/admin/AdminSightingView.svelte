<script lang="ts">
	import DataTableRow from '$lib/components/admin/DataTableRow.svelte';
	import OLMap from '$lib/components/map/OLMap.svelte';
	import MediaGallery from '$lib/components/media/MediaGallery.svelte';
	import ImageDebugger from '$lib/components/debug/ImageDebugger.svelte';
	import { getAnimalBehaviorLabel } from '$lib/report/formOptions/animalBehavior';
	import { getAnimalConditionLabel } from '$lib/report/formOptions/animalCondition';
	import { getBoatDriveLabel } from '$lib/report/formOptions/boatDrive';
	import { getDistanceLabel } from '$lib/report/formOptions/distance';
	import { getDistributionLabel } from '$lib/report/formOptions/distribution';
	import { getEntryChannelLabel } from '$lib/report/formOptions/entryChannel';
	import { getSeaStateLabel } from '$lib/report/formOptions/seaState';
	import { getSexLabel } from '$lib/report/formOptions/sex';
	import { getSightingFromLabel } from '$lib/report/formOptions/sightingFrom';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import { getVisibilityLabel } from '$lib/report/formOptions/visibility';
	import { getWindDirectionLabel } from '$lib/report/formOptions/windDirection';
	import { getWindStrengthLabel } from '$lib/report/formOptions/windStrength';
	import type { Sighting } from '$lib/types/types';
	import { formatDate } from '$lib/utils/format/FormatDate';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import {
		Activity,
		Anchor,
		Calendar,
		Camera,
		Eye,
		FileText,
		MapPin,
		MessageSquare,
		Settings,
		TriangleAlert,
		User,
		Waves
	} from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	// Definiere die Struktur einer Datenzeile
	interface DataRowType {
		label: string;
		value: string;
		isBoolean?: boolean;
		booleanValue?: boolean;
	}

	let { sighting } = $props<{
		sighting: Sighting;
	}>();

	/**
	 * Hilfsfunktion, um zu prüfen, ob ein Wert existiert
	 * @param value - Der zu prüfende Wert
	 * @returns true, wenn der Wert existiert und nicht leer ist
	 */
	function hasValue(value: unknown): boolean {
		return value !== null && value !== undefined && value !== '';
	}

	/**
	 * Rendert eine Zeile mit Beschriftung und Wert
	 * @param label - Die Beschriftung
	 * @param value - Der anzuzeigende Wert
	 * @param condition - Optionale Bedingung, ob die Zeile angezeigt werden soll
	 * @returns Ein DataRowType Objekt oder undefined, wenn die Zeile nicht angezeigt werden soll
	 */
	function DataRow(
		label: string,
		value: string | number | null | undefined,
		condition: boolean = true
	): DataRowType | undefined {
		if (!condition || !hasValue(value)) return undefined;

		return {
			label,
			value: String(value)
		};
	}

	/**
	 * Rendert eine Zeile für Boolean-Werte mit Status-Badge
	 * @param label - Die Beschriftung
	 * @param value - Der Boolean-Wert
	 * @param condition - Optionale Bedingung, ob die Zeile angezeigt werden soll
	 * @returns Ein DataRowType Objekt oder undefined, wenn die Zeile nicht angezeigt werden soll
	 */
	function BooleanDataRow(
		label: string,
		value: boolean | null | undefined,
		condition: boolean = true
	): DataRowType | undefined {
		if (!condition) return undefined;

		return {
			label,
			value: '', // Wird nicht verwendet, da wir eine Status-Komponente rendern
			isBoolean: true,
			booleanValue: Boolean(value)
		};
	}

	// Datum & Zeit
	const dateTimeRows: DataRowType[] = [
		DataRow('Sichtung', formatDate(sighting.sightingDate)),
		DataRow('Gemeldet', formatDate(sighting.created)),
		DataRow('Freigegeben am', formatDate(sighting.approvedAt), hasValue(sighting.approvedAt))
	].filter((row): row is DataRowType => row !== undefined);

	// Tierinformationen
	const animalRows: DataRowType[] = [
		DataRow('Tierart', getSpeciesLabel(sighting.species)),
		DataRow('Anzahl Gesamt', sighting.totalCount),
		DataRow('Anzahl Jungtiere', sighting.juvenileCount, hasValue(sighting.juvenileCount)),
		DataRow(
			'Verteilung',
			getDistributionLabel(sighting.distribution),
			hasValue(sighting.distribution)
		),
		DataRow(
			'Verteilung (Details)',
			sighting.distributionText,
			hasValue(sighting.distributionText) && hasValue(sighting.distribution)
		)
	].filter((row): row is DataRowType => row !== undefined);

	// Totfund
	const deadAnimalRows: DataRowType[] = [
		BooleanDataRow('Totfund', sighting.isDead),
		...(sighting.isDead
			? [
					DataRow(
						'Zustand',
						getAnimalConditionLabel(sighting.deadCondition),
						hasValue(sighting.deadCondition)
					),
					DataRow('Geschlecht', getSexLabel(sighting.deadSex), hasValue(sighting.deadSex)),
					DataRow('Größe', `${sighting.deadSize} cm`, hasValue(sighting.deadSize)),
					BooleanDataRow('Telefonischer Kontakt', sighting.deadPhoneContact)
				]
			: [])
	].filter((row): row is DataRowType => row !== undefined);

	// Sichtungsdetails
	const sightingDetailRows: DataRowType[] = [
		DataRow(
			'Sichtung von',
			getSightingFromLabel(sighting.sightingFrom),
			hasValue(sighting.sightingFrom)
		),
		DataRow(
			'Sichtung von (Details)',
			sighting.sightingFromText,
			hasValue(sighting.sightingFromText) && sighting.sightingFrom === 4
		),
		DataRow('Entfernung', getDistanceLabel(sighting.distance), hasValue(sighting.distance)),
		DataRow('Verhalten', getAnimalBehaviorLabel(sighting.behavior), hasValue(sighting.behavior)),
		DataRow(
			'Verhalten (Details)',
			sighting.behaviorText,
			hasValue(sighting.behaviorText) && sighting.behavior === 3
		),
		DataRow('Reaktion auf Boot', sighting.reaction, hasValue(sighting.reaction))
	].filter((row): row is DataRowType => row !== undefined);

	// Umweltbedingungen
	const environmentRows: DataRowType[] = [
		DataRow('Seegang', getSeaStateLabel(sighting.seaState), hasValue(sighting.seaState)),
		DataRow('Sichtweite', getVisibilityLabel(sighting.visibility), hasValue(sighting.visibility)),
		DataRow(
			'Windrichtung',
			getWindDirectionLabel(sighting.windDirection),
			hasValue(sighting.windDirection)
		),
		DataRow('Windstärke', getWindStrengthLabel(sighting.windForce), hasValue(sighting.windForce))
	].filter((row): row is DataRowType => row !== undefined);

	// Schiffs-/Bootsangaben
	const shipRows: DataRowType[] = [
		DataRow('Schiffsname', sighting.shipName, hasValue(sighting.shipName)),
		DataRow('Heimathafen', sighting.homePort, hasValue(sighting.homePort)),
		DataRow('Bootstyp', sighting.boatType, hasValue(sighting.boatType)),
		DataRow('Bootsantrieb', getBoatDriveLabel(sighting.boatDrive), hasValue(sighting.boatDrive)),
		DataRow(
			'Bootsantrieb (Details)',
			sighting.boatDriveText,
			hasValue(sighting.boatDriveText) && sighting.boatDrive === 4
		),
		DataRow('Anzahl Schiffe', sighting.shipCount, hasValue(sighting.shipCount))
	].filter((row): row is DataRowType => row !== undefined);

	// Kontakt
	const contactName =
		sighting.firstName || sighting.lastName
			? `${sighting.firstName ?? ''} ${sighting.lastName ?? ''}`.trim()
			: 'Nicht angegeben';

	const addressParts = [
		sighting.street,
		hasValue(sighting.zipCode) || hasValue(sighting.city)
			? `${sighting.zipCode || ''} ${sighting.city || ''}`.trim()
			: null
	]
		.filter(Boolean)
		.join(', ');

	const contactRows: DataRowType[] = [
		DataRow('Email', sighting.email, hasValue(sighting.email)),
		DataRow('Name', contactName),
		DataRow('Telefon', sighting.phone, hasValue(sighting.phone)),
		DataRow('Fax', sighting.fax, hasValue(sighting.fax)),
		DataRow('Adresse', addressParts || 'Nicht angegeben', Boolean(addressParts))
	].filter((row): row is DataRowType => row !== undefined);

	// Status
	const statusRows: DataRowType[] = [
		BooleanDataRow('Namensnennung', sighting.nameConsent),
		BooleanDataRow('Schiffsnennung', sighting.shipNameConsent),
		BooleanDataRow('Geprüft', sighting.verified),
		DataRow('Eingangskanal', getEntryChannelLabel(sighting.entryChannel))
	].filter((row): row is DataRowType => row !== undefined);

	// Medien
	const mediaRows: DataRowType[] = [
		DataRow('Aufnahme', sighting.mediaFile, hasValue(sighting.mediaFile)),
		BooleanDataRow('Upload', sighting.mediaUpload, hasValue(sighting.mediaUpload))
	].filter((row): row is DataRowType => row !== undefined);

	// Bemerkungen
	const noteRows: DataRowType[] = [
		DataRow('Bemerkungen', sighting.notes, hasValue(sighting.notes)),
		DataRow(
			'Sonstige Auffälligkeiten',
			sighting.otherObservations,
			hasValue(sighting.otherObservations)
		)
	].filter((row): row is DataRowType => row !== undefined);

	// Ortsangaben
	const locationRows: DataRowType[] = [
		DataRow('Position', formatLocation(sighting.longitude, sighting.latitude)),
		DataRow('Fahrwasser', sighting.waterway, hasValue(sighting.waterway)),
		DataRow('Seezeichen', sighting.seaMark, hasValue(sighting.seaMark)),
		BooleanDataRow('In der Ostsee', sighting.inBalticSea),
		BooleanDataRow('In der Ostsee (geo)', sighting.inBalticSeaGeo)
	].filter((row): row is DataRowType => row !== undefined);

	// Technische Informationen
	const techRows: DataRowType[] = [DataRow('Datensatz ID', sighting.id)].filter(
		(row): row is DataRowType => row !== undefined
	);

	// Prüfen, ob Koordinaten für die Karte vorhanden sind
	const hasCoordinates = hasValue(sighting.latitude) && hasValue(sighting.longitude);
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div class="space-y-4">
		<!-- Datum & Zeit -->
		<div class="card bg-base-200 shadow-sm">
			<div class="card-body">
				<h3 class="card-title flex items-center gap-2 text-lg">
					<Icon src={Calendar} size="20" class="text-primary" />
					Datum & Zeit
				</h3>
				<div class="overflow-x-auto">
					<table class="table-zebra table-sm table w-full">
						<tbody>
							{#each dateTimeRows as row (row.label)}
								<DataTableRow {...row} />
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Tierinformationen -->
		<div class="card bg-base-200 shadow-sm">
			<div class="card-body">
				<h3 class="card-title flex items-center gap-2 text-lg">
					<Icon src={Eye} size="20" class="text-primary" />
					Tierinformationen
				</h3>
				<div class="overflow-x-auto">
					<table class="table-zebra table-sm table w-full">
						<tbody>
							{#each animalRows as row (row.label)}
								<DataTableRow {...row} />
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Totfund-Details -->
		{#if deadAnimalRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={TriangleAlert} size="20" class="text-primary" />
						Totfund
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each deadAnimalRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Sichtungsdetails -->
		{#if sightingDetailRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Activity} size="20" class="text-primary" />
						Sichtungsdetails
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each sightingDetailRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Umweltbedingungen -->
		{#if environmentRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Waves} size="20" class="text-primary" />
						Umweltbedingungen
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each environmentRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Kontakt -->
		{#if contactRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={User} size="20" class="text-primary" />
						Kontakt
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each contactRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div class="space-y-4">
		<!-- Karte, falls Koordinaten vorhanden -->
		{#if hasCoordinates}
			<div class="card bg-base-200 overflow-hidden shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={MapPin} size="20" class="text-primary" />
						Karte
					</h3>
					<div class="relative mt-2 h-[400px] w-full">
						<div class="absolute inset-0">
							<OLMap latitude={sighting.latitude} longitude={sighting.longitude} readonly={true} />
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Ortsangaben -->
		{#if locationRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={MapPin} size="20" class="text-primary" />
						Ortsangaben
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each locationRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Schiffs-/Bootsangaben -->
		{#if shipRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Anchor} size="20" class="text-primary" />
						Schiffs-/Bootsangaben
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each shipRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Status -->
		{#if statusRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Settings} size="20" class="text-primary" />
						Status
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each statusRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Medien-Gallerie -->
		{#if sighting.files && sighting.files.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Camera} size="20" class="text-primary" />
						Medien-Gallerie
					</h3>
					
					<!-- Debug information for each file -->
					{#each sighting.files as file (file.filePath)}
						{#if file.mimeType.startsWith('image/')}
							<ImageDebugger {file} />
						{/if}
					{/each}
					
					<MediaGallery files={sighting.files} showTitle={false} />
				</div>
			</div>
		{:else if mediaRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Camera} size="20" class="text-primary" />
						Medien (Legacy)
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each mediaRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Bemerkungen, falls vorhanden -->
		{#if noteRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={MessageSquare} size="20" class="text-primary" />
						Bemerkungen
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each noteRows as row (row.label)}
									<DataTableRow {...row} isPreformatted={true} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Interner Kommentar, falls vorhanden -->
		{#if hasValue(sighting.internalComment)}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={Settings} size="20" class="text-primary" />
						Interner Kommentar
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								<DataTableRow
									label="Kommentar"
									value={sighting.internalComment}
									isPreformatted={true}
								/>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Technische Informationen -->
		{#if techRows.length > 0}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<Icon src={FileText} size="20" class="text-primary" />
						Technische Informationen
					</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table-sm table w-full">
							<tbody>
								{#each techRows as row (row.label)}
									<DataTableRow {...row} />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
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
