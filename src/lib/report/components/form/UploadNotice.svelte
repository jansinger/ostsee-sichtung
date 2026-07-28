<script lang="ts">
	/**
	 * Transparenzhinweis an jeder Dropzone: Die Datei wird sofort übertragen,
	 * eine nicht abgeschickte Meldung wird befristet aufgeräumt, über die
	 * Veröffentlichung entscheidet der Melder gesondert.
	 *
	 * Wortlaut und Begründung: $lib/form/consent/uploadNotice
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { UPLOAD_NOTICE } from '$lib/form/consent/uploadNotice';
</script>

<div class="alert alert-info mb-4">
	<Icon icon="lucide:info" width="20" aria-hidden="true" />
	<span class="text-sm">{UPLOAD_NOTICE}</span>
</div>
