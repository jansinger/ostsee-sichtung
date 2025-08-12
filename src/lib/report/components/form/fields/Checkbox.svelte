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
		<div class="flex-1 text-wrap">
			<span class="font-medium">{label}</span>
			{#if helpText}
				<p class="mt-1 text-xs break-words text-gray-600">
					{helpText}
				</p>
			{/if}
		</div>
	</label>
</div>
