<script lang="ts">
	import DeadAnimal from './DeadAnimal.svelte';

	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	let { adminMode = false }: { adminMode?: boolean } = $props();

	const { form } = getFormContext();
</script>

<!-- Animal Information Section -->
<SectionCard title="Tierinformationen" icon="lucide:eye">
	<!-- Die Totfund-Frage steht ganz oben, weil das Museum sie am Kartenende für
	     übersehbar hielt. Sie entscheidet außerdem, ob der Detailblock darunter
	     erscheint — als letztes Feld stand der Auslöser hinter seiner Wirkung.

	     Hervorgehoben wird über Position und Erhebung, NICHT über den
	     Warn-Tint: Der gehört dem Totfund-Block in DeadAnimal.svelte, der
	     unmittelbar darunter sitzt. Zwei gleich aussehende Warnflächen
	     übereinander hätten die untere entwertet — und im Regelfall (lebendes
	     Tier) sähe jede Meldung nach Warnung aus, obwohl nichts zu warnen ist.
	     Eine hellere Platte auf der base-200-Karte trägt hier weiter als Farbe.

	     Das Totenkopf-Icon am Schalter kommt aus dem Schema (`meta.icon`), die
	     Beschriftung aus der Feld-Pipeline — beides gehört nicht hierher. -->
	<div
		class="bg-base-100 border-base-300 rounded-lg border p-4"
		style="box-shadow: var(--shadow-raised)"
	>
		<FormField name="isDead" />
	</div>

	<!-- Dead Animal Additional Fields — unmittelbar unter dem Schalter, nicht
	     mehr am Kartenende. -->
	{#if $form.isDead}
		<DeadAnimal {adminMode} />
	{/if}

	<!-- Species Selection -->
	<div class="mt-4">
		<FormField name="species" />
	</div>

	<!-- Animal Count -->
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField name="totalCount" />
		<FormField name="juvenileCount" />
	</div>
</SectionCard>
