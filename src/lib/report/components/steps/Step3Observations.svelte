<!--
  Step 2: Behavioral Observations and Environmental Conditions
  Optional detailed information that enhances research value
-->
<script lang="ts">
	import Behavior from '$lib/report/components/sections/Behavior.svelte';

	import Environment from '$lib/report/components/sections/Environment.svelte';

	import Media from '$lib/report/components/sections/Media.svelte';

	import { Activity } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import OptionalSightingDetails from '../sections/OptionalSightingDetails.svelte';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
				<Icon src={Activity} size="24" class="text-primary" />
			</div>
		</div>
		<h2 class="text-base-content text-2xl font-bold">Zusätzliche Beobachtungen</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl">
			Diese Details sind <strong>optional, aber extrem wertvoll</strong> für die Forschung!
			Verhaltensinformationen, Umweltbedingungen und <strong>Fotos/Videos</strong> helfen bei der Artbestimmung
			und dem Verständnis der Meerestiere.
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-secondary text-center min-h-fit h-auto py-2 px-3 whitespace-normal sm:whitespace-nowrap max-w-xs sm:max-w-none">
				Schritt 3 von 4 - Optional, aber sehr hilfreich
			</div>
		</div>
	</div>

	<Media></Media>

	<OptionalSightingDetails></OptionalSightingDetails>

	<Behavior></Behavior>

	<Environment></Environment>
</div>
