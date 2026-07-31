<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
</script>

<!-- Sighting Details Section -->
<SectionCard title="Weitere Sichtungsdetails" icon="lucide:activity">
	<!-- Distribution -->
	<FormField name="distribution" />

	<!-- `shipCount` steht jetzt in `BoatInfo.svelte`: Die Anzahl umliegender
	     Schiffe gehört zu den Boot-/Schiffsangaben, nicht zwischen die
	     Beobachtungsdetails. -->
</SectionCard>
