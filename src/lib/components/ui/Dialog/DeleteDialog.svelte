<script lang="ts">
	let { show = $bindable(false), onConfirm, onCancel } = $props<{
		show?: boolean;
		onConfirm?: () => void;
		onCancel?: () => void;
	}>();

	function confirm() {
		onConfirm?.();
		show = false;
	}

	function cancel() {
		onCancel?.();
		show = false;
	}
</script>

{#if show}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
		<div class="bg-base-100 w-96 rounded-lg p-6">
			<h3 class="mb-4 text-lg font-bold">Sichtung löschen</h3>
			<p class="mb-4">
				Sind Sie sicher, dass Sie diese Sichtung löschen möchten? Diese Aktion kann nicht rückgängig
				gemacht werden.
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn" onclick={cancel}>Abbrechen</button>
				<button class="btn btn-error" onclick={confirm}>Löschen</button>
			</div>
		</div>
	</div>
{/if}
