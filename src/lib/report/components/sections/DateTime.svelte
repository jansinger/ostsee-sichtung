<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
	import { dateSectionIntro, dateSectionTitle } from '$lib/report/wording';

	const { form } = getFormContext();

	const title = $derived(dateSectionTitle($form.isDead));
	const intro = $derived(dateSectionIntro($form.isDead));
</script>

<!-- Date & Time Section -->
<SectionCard {title} icon="lucide:calendar">
	<!-- Nur beim Totfund: die Karte hatte vorher keine Einleitungszeile, und für
	     die Sichtung soll keine neu entstehen (`dateSectionIntro` liefert dafür `null`). -->
	{#if intro}
		<p class="text-base-content/70 mb-4 text-sm">{intro}</p>
	{/if}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField name="sightingDate" />
		<FormField name="sightingTime" />
	</div>
</SectionCard>
