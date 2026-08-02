<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import DataUsageNotice from '$lib/components/info/DataUsageNotice.svelte';
	import DeadFindingNotice from '$lib/components/info/DeadFindingNotice.svelte';
	import SpeciesIdentificationHelp from '$lib/report/components/form/fields/SpeciesIdentificationHelp.svelte';

	const title = 'Bestimmungshilfe: Wale und Robben der Ostsee erkennen';
	const description =
		'Schweinswal oder Robbe? Kegelrobbe oder Seehund? Erkennungsmerkmale, Artfotos und Verwechslungsgefahren für alle Meeressäuger der Ostsee — sortiert danach, was bei einer echten Sichtung auf dem Wasser überhaupt zu sehen ist.';
</script>

<svelte:head>
	<title>{title} - Ostsee-Tiere</title>
	<meta name="description" content={description} />
	<meta
		name="keywords"
		content="Bestimmungshilfe, Schweinswal erkennen, Kegelrobbe, Seehund, Robbe oder Wal, Ostsee, Meeressäuger, Artbestimmung, Sichtung melden"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="{title} - Ostsee-Tiere" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="article" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="{title} - Ostsee-Tiere" />
	<meta name="twitter:description" content={description} />
</svelte:head>

<div class="mx-auto max-w-5xl p-6">
	<div class="mb-10">
		<h1 class="text-primary mb-4 text-4xl font-bold tracking-tight">
			Bestimmungshilfe für Meerestiere
		</h1>
		<p class="text-base-content/80 mb-4 text-xl leading-relaxed">
			Welches Tier war das? Diese Seite hilft bei der Artbestimmung von Walen und Robben in der
			Ostsee — mit Fotos, Erkennungsmerkmalen und den Verwechslungen, die am häufigsten vorkommen.
		</p>
		<p class="text-base-content/70 leading-relaxed">
			Klicken Sie auf eine Tierart, um ihre Merkmale zu sehen. Die Merkmale sind danach
			gekennzeichnet, ob sie bei einer echten Sichtung überhaupt zu erkennen sind — auf Entfernung,
			erst aus der Nähe oder nur mit Hintergrundwissen.
		</p>
	</div>

	<SpeciesIdentificationHelp variant="page" />

	<div class="mt-10 space-y-6">
		<DeadFindingNotice variant="page" />
		<DataUsageNotice variant="page" />
	</div>

	<!-- Rückweg zum Formular: Wer hier landet, hat in aller Regel gerade etwas
	     gesehen und will es melden. -->
	<div class="border-base-300 mt-12 flex flex-wrap justify-center gap-4 border-t pt-10">
		<a href="/" class="btn btn-primary btn-lg">
			<Icon icon="custom:porpoise" width="20" height="20" aria-hidden="true" />
			Sichtung melden
		</a>
		<a href="/map" class="btn btn-outline btn-lg">
			<Icon icon="lucide:map" width="20" height="20" aria-hidden="true" />
			Sichtungskarte ansehen
		</a>
	</div>
</div>
