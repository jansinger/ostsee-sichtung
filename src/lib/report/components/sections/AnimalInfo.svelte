<script lang="ts">
	import DeadAnimal from './DeadAnimal.svelte';

	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
	import { isDeadFinding } from '$lib/report/formConfig';
	import { speciesQuestion } from '$lib/report/wording';

	let { adminMode = false, onchangekind }: { adminMode?: boolean; onchangekind?: () => void } =
		$props();

	const { form } = getFormContext();

	// Beim Totfund fragt das Artfeld nach dem, was gefunden wurde (Wunsch des
	// Museums). Über den `label`-Override an `FormField` — derselbe Weg, den PR 4
	// für den Bootsantrieb gebaut hat: Eine Schema-Spalte, in zwei Zuständen
	// unterschiedlich gefragt, ohne das `.label()` des Schemas anzufassen.
	const speciesLabel = $derived(speciesQuestion($form.isDead));
</script>

<!-- Animal Information Section -->
<SectionCard title="Tierinformationen" icon="lucide:eye">
	{#if adminMode}
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
		     Beschriftung aus der Feld-Pipeline — beides gehört nicht hierher.

		     Nur in der Admin-Maske: Hier korrigiert eine Bearbeiterin einen
		     bestehenden Datensatz, es gibt keine vorgeschaltete Einstiegsseite. Im
		     Meldeformular beantwortet die Einstiegsseite „Was möchten Sie melden?"
		     dieselbe Frage bereits — der Schalter entfällt dort zugunsten der
		     Rückmeldung im else-Zweig, damit die beiden Antworten nicht
		     auseinanderlaufen können. -->
		<div
			class="bg-base-100 border-base-300 rounded-lg border p-4"
			style="box-shadow: var(--shadow-raised)"
		>
			<FormField name="isDead" />
		</div>
	{:else}
		<!-- isDeadFinding statt eines rohen Booleans: `isDead` kommt beim
		     Wiederaufsetzen aus dem Storage als String und in der Admin-Maske als
		     Zahl aus der DB. Ein roher Ternär (`$form.isDead ? … : …`) träfe bei
		     einem falsy-wirkenden, aber nicht-leeren String wie '0' die falsche
		     Antwort — die Rückmeldung würde dann vom Totfund-Zweig abweichen, den
		     der Rest des Formulars tatsächlich fährt. -->
		<p class="text-base-content/70 text-support mb-4">
			Sie melden:
			<strong class="text-base-content">
				{isDeadFinding($form.isDead)
					? 'Fund eines toten Tieres'
					: 'Beobachtung eines lebenden Tieres'}
			</strong>
			<button
				type="button"
				class="btn btn-ghost btn-sm"
				onclick={onchangekind}
				aria-label="Art der Meldung ändern"
			>
				Ändern
			</button>
		</p>
	{/if}

	<!-- Dead Animal Additional Fields — unmittelbar unter dem Schalter, nicht
	     mehr am Kartenende. -->
	{#if $form.isDead}
		<DeadAnimal {adminMode} />
	{/if}

	<!-- Species Selection -->
	<div class="mt-4">
		<FormField name="species" label={speciesLabel} />
	</div>

	<!-- Animal Count -->
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField name="totalCount" />
		<FormField name="juvenileCount" />
	</div>
</SectionCard>
