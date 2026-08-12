<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { formatEntryDate, type SightingListEntry } from '$lib/map/listViewUtils';

	// Barrierefreie Tabellen-Alternative zur Kartendarstellung (Befund K3).
	// Zeigt exakt die aktuell auf der Karte sichtbaren Sichtungen.
	let { entries, year }: { entries: SightingListEntry[]; year: number } = $props();
</script>

{#if entries.length === 0}
	<p role="status" class="text-base-content p-6 text-center text-sm font-medium">
		{m.components_map_sightingslistview_text_keine_sichtungen_fuer_die_aktuelle()}
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
					<th scope="col">{m.components_map_sightingslistview_text_datum()}</th>
					<th scope="col">{m.components_map_sightingslistview_text_tierart()}</th>
					<th scope="col">{m.components_map_sightingslistview_text_anzahl()}</th>
					<th scope="col">{m.components_map_sightingslistview_text_totfund()}</th>
					<th scope="col">{m.components_map_sightingslistview_text_fahrwasser()}</th>
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
