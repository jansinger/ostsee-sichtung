<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
</script>

<!-- Administrative Section -->
<SectionCard title="Administratives" icon="lucide:settings">
	<!-- Kein Feld für "verified": Der Prüfstatus wird ausschließlich über den
	     Toggle "Geprüft" in der Sichtungsliste gesetzt, damit `geprueft` und
	     `freigegeben_am` gemeinsam geschrieben werden. -->
	<FormField name="entryChannel" />

	<FormField name="internalComment" />
</SectionCard>
