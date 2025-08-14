<script lang="ts">
	// Definiere Props mit Standardwerten im Runes-Stil
	const {
		label,
		name,
		checked = $bindable(false),
		disabled = false,
		helpText = '',
		labelClass = '',
		...props
	} = $props();
</script>

<div class="form-control w-full">
	<label class="label cursor-pointer items-start gap-2 {labelClass}">
		<input
			id={name}
			type="checkbox"
			{name}
			{checked}
			{disabled}
			class="toggle toggle-success mt-1"
			{...props}
		/>
		<div class="flex-1 min-w-0 text-left">
			<span class="font-medium" style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">
				{label}
			</span>
			{#if helpText}
				<p class="mt-1 text-xs text-gray-600 text-left" style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">
					{helpText}
				</p>
			{/if}
		</div>
	</label>
</div>
