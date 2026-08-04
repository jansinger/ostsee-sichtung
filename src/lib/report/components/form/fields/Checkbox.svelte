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

<div class="w-full">
	<label class="flex cursor-pointer items-start gap-2 {labelClass}">
		<input
			id={name}
			type="checkbox"
			{name}
			{checked}
			{disabled}
			class="toggle toggle-success mt-1"
			{...props}
		/>
		<div class="min-w-0 flex-1 text-left">
			<span
				class="font-medium"
				style="overflow-wrap: anywhere; hyphens: auto;"
			>
				{label}
			</span>
			{#if helpText}
				<p
					class="text-base-content/60 mt-1 text-left text-xs"
					style="overflow-wrap: anywhere; hyphens: auto;"
				>
					{helpText}
				</p>
			{/if}
		</div>
	</label>
</div>
