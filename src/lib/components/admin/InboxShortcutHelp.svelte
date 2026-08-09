<script lang="ts">
	import { INBOX_SHORTCUTS } from './adminTriageShortcuts';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let box = $state<HTMLDivElement | null>(null);

	/* Der Fokus muss in das Overlay wandern, und zwar aus zwei Gründen: Wer mit
	   dem Screenreader arbeitet, erfährt sonst nicht, dass sich etwas geöffnet
	   hat — und die Tastensperre der Seite erkennt den offenen Dialog daran, dass
	   der Fokus darin steht (`resolveInboxShortcut`). Ohne das würde ein „a" im
	   offenen Overlay die Meldung dahinter freigeben. */
	$effect(() => {
		box?.focus();
	});
</script>

<div class="modal modal-open">
	<div
		class="modal-box"
		role="dialog"
		aria-modal="true"
		aria-labelledby="inbox-shortcut-help-title"
		tabindex="-1"
		bind:this={box}
	>
		<h2 id="inbox-shortcut-help-title" class="text-lg font-semibold">Tastaturkürzel</h2>
		<!-- Der Satz nennt nur das Eingabefeld und nicht mehr „kein Dialog": Esc und
		     ? wirken auch hier im Overlay, sonst ließe es sich per Tastatur nicht
		     schließen. Die frühere Fassung beschrieb damit eine Sperre, die für die
		     zwei Tasten, die man gerade braucht, nicht gilt. -->
		<p class="text-base-content/70 mt-1 text-sm">
			Gültig, solange kein Eingabefeld den Fokus hat. Esc und ? wirken auch hier.
		</p>

		<dl class="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
			{#each INBOX_SHORTCUTS as eintrag (eintrag.description)}
				<dt class="flex gap-1">
					{#each eintrag.keys as key (key)}
						<kbd class="kbd kbd-sm">{key}</kbd>
					{/each}
				</dt>
				<dd class="text-sm">{eintrag.description}</dd>
			{/each}
		</dl>

		<div class="modal-action">
			<button type="button" class="btn btn-primary btn-sm" onclick={onClose}>Schließen</button>
		</div>
	</div>
	<!-- Der Klick daneben schließt, wie bei jedem Dialog im Projekt. Als Button
	     und nicht als div, damit er ohne Maus erreichbar bleibt; Escape tut
	     dasselbe und ist in der Liste oben aufgeführt. -->
	<button
		type="button"
		class="modal-backdrop"
		aria-label="Übersicht der Tastaturkürzel schließen"
		onclick={onClose}
	></button>
</div>
