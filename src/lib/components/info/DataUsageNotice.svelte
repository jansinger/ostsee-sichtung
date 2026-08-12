<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Icon from '$lib/components/Icon.svelte';
	import { infoStyles, type InfoVariant } from '$lib/components/info/variant';

	let { variant = 'inline' }: { variant?: InfoVariant } = $props();

	const styles = $derived(infoStyles(variant));
</script>

<!--
	Nennt zwei fremde Gremien namentlich (HELCOM, ASCOBANS). Genau deshalb geteilt
	statt kopiert: eine zweite Fassung könnte still von der ersten abweichen und
	eine Zusage machen, die die Plattform nicht hält.
-->
<div class="alert alert-info">
	<Icon icon="lucide:info" width={styles.iconWidth} class="shrink-0" aria-hidden="true" />
	<div>
		<svelte:element this={styles.headingTag} class={styles.headingClass}>
			{m.components_info_datausagenotice_text_wofuer_die_daten_gebraucht_werden()}
		</svelte:element>
		<p class={styles.bodyClass}>
			Ihre Meldung wird vom Deutschen Meeresmuseum wissenschaftlich ausgewertet und direkt an die
			internationalen Gremien für den Schutz der Ostsee-Schweinswale weitergegeben: an
			<strong>HELCOM</strong>, die Helsinki-Kommission zum Schutz der Ostsee, und an
			<strong>ASCOBANS</strong>, das internationale Abkommen zum Schutz der Kleinwale. So trägt Ihre
			Beobachtung zum Bild von Verbreitung und Vorkommen der Tiere bei.
		</p>
	</div>
</div>
