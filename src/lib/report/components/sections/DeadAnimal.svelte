<script lang="ts">
	import { TriangleAlert } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
</script>

<div class="bg-warning/10 border-warning/20 mt-6 rounded-lg border p-4">
	<h4 class="text-warning-content mb-3 font-semibold">
		<Icon src={TriangleAlert} size="16" class="text-warning" /> Zusätzliche Informationen für Totfund
	</h4>
	<div class="mb-4 text-sm text-warning-content/80">
		<p class="font-medium mb-2">⚠️ Totfunde sind besonders wertvoll für die Wissenschaft!</p>
		<ul class="list-disc list-inside space-y-1 text-xs">
			<li><strong>Todesursachen:</strong> Helfen bei der Identifikation von Bedrohungen</li>
			<li><strong>Gesundheitszustand:</strong> Wichtig für Populationsanalysen</li>
			<li><strong>Nicht berühren:</strong> Sicherheitsrisiko und Störung der Untersuchung</li>
			<li><strong>Behörden informieren:</strong> Wasserschutzpolizei, Nationalparkamt kontaktieren</li>
		</ul>
	</div>

	<!-- These fields will be loaded from constants in the future -->
	<div class="space-y-4">
		<FormField name="deadCondition" />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="deadSex" />
			<FormField name="deadSize" />
		</div>

		<FormField name="informedAuthorities" />
	</div>
</div>
