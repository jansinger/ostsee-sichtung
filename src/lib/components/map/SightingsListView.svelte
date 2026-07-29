<script lang="ts">
	import { formatEntryDate, type SightingListEntry } from '$lib/map/listViewUtils';

	// Barrierefreie Tabellen-Alternative zur Kartendarstellung (Befund K3).
	// Zeigt exakt die aktuell auf der Karte sichtbaren Sichtungen.
	let { entries, year }: { entries: SightingListEntry[]; year: number } = $props();
</script>

{#if entries.length === 0}
	<p role="status" class="text-base-content p-6 text-center text-sm font-medium">
		Keine Sichtungen für die aktuelle Auswahl vorhanden.
	</p>
{:else}
	<div class="overflow-x-auto">
		<table class="table-zebra table">
			<caption class="text-base-content p-3 text-left text-sm font-semibold">
				Sichtungen {year} – {entries.length}
				{entries.length === 1 ? 'Eintrag' : 'Einträge'}
			</caption>
			<thead>
				<tr>
					<th scope="col">Datum</th>
					<th scope="col">Tierart</th>
					<th scope="col">Anzahl</th>
					<th scope="col">Totfund</th>
					<th scope="col">Fahrwasser</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.id)}
					<tr>
						<td>{formatEntryDate(entry.ts)}</td>
						<td>{entry.speciesName}</td>
						<td>
							{entry.count}{entry.juveniles > 0
								? ` (davon ${entry.juveniles} Jungtier${entry.juveniles > 1 ? 'e' : ''})`
								: ''}
						</td>
						<td>{entry.isDead ? 'Ja' : 'Nein'}</td>
						<td>{entry.waterway ?? '–'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
