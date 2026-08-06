<script lang="ts">
	import DeadAnimal from './DeadAnimal.svelte';

	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import ReportKindFeedback from '$lib/report/components/ReportKindFeedback.svelte';
	import SectionCard from './SectionCard.svelte';
	import { isDeadFinding } from '$lib/report/formConfig';
	import { speciesQuestion } from '$lib/report/wording';

	let {
		adminMode = false,
		// Default-Noop wie an den übrigen `onchangekind`-Aufrufstellen:
		// `exactOptionalPropertyTypes` verbietet sonst das Weiterreichen als
		// `{onchangekind}` an `ReportKindFeedback`, dessen eigener Default
		// (`= () => {}`) den externen Proptyp auf `() => void` ohne `undefined`
		// verengt.
		onchangekind = () => {}
	}: { adminMode?: boolean; onchangekind?: () => void } = $props();

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
		<!-- Ausgelagert nach `ReportKindFeedback.svelte` (Abschlussreview B6):
		     dieselbe Rückmeldung steht seither auch am Kopf von Schritt 1
		     (`steps/Step1LocationTime.svelte`), damit ein Melder auch dort ohne
		     Umweg zurück zur Einstiegsseite kommt. -->
		<ReportKindFeedback {onchangekind} />
	{/if}

	<!-- Dead Animal Additional Fields — unmittelbar unter dem Schalter, nicht
	     mehr am Kartenende. isDeadFinding statt eines rohen Booleans, aus
	     demselben Grund wie an der Rückmeldung drei Zeilen darüber: `isDead`
	     kommt hier über dieselben drei Quellen an (Storage-String, DB-Zahl,
	     echter Boolean) — ein roher Ternär (`$form.isDead`) zeigte den Block
	     bei einem falsy-wirkenden String wie '0' trotzdem, während die
	     Rückmeldung darüber schon korrekt „lebend" auswies. -->
	{#if isDeadFinding($form.isDead)}
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
