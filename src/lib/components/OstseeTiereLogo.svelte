<script lang="ts">
	let { 
		size = 'md',
		showText = true,
		linkToHome = true,
		className = ''
	}: {
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		showText?: boolean;
		linkToHome?: boolean;
		className?: string;
	} = $props();

	// Größen-Definitionen
	const sizeMap = {
		xs: { logo: 32, text: 'text-sm' },      // 32px - Mini
		sm: { logo: 48, text: 'text-base' },    // 48px - Klein (Admin Nav)
		md: { logo: 64, text: 'text-lg' },      // 64px - Medium
		lg: { logo: 96, text: 'text-xl' },      // 96px - Groß
		xl: { logo: 128, text: 'text-2xl' }     // 128px - Extra groß
	};

	const currentSize = $derived(sizeMap[size]);
	
	// WebP-Support für moderne Browser
	const supportsWebP = typeof window !== 'undefined' && 
		window.document?.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
	
	// Dynamische Bildquelle basierend auf Größe und Format
	const imageSrc = $derived(
		supportsWebP && currentSize.logo <= 128
			? `/ostsee-tiere-${currentSize.logo}.webp`
			: `/ostsee-tiere-${currentSize.logo}.png`
	);
</script>

{#if linkToHome}
	<a 
		href="/" 
		class="inline-flex items-center gap-2 hover:opacity-90 transition-opacity {className}"
		aria-label="Ostsee-Tiere Startseite"
	>
		<img 
			src={imageSrc}
			alt="Ostsee-Tiere Logo - Springender Delfin über Wellen"
			width={currentSize.logo}
			height={currentSize.logo}
			class="object-contain"
		/>
		{#if showText}
			<div class="flex flex-col">
				<span class="font-bold {currentSize.text} text-primary leading-tight">
					OSTSEE-TIERE.DE
				</span>
			</div>
		{/if}
	</a>
{:else}
	<div class="inline-flex items-center gap-2 {className}">
		<img 
			src={imageSrc}
			alt="Ostsee-Tiere Logo - Springender Delfin über Wellen"
			width={currentSize.logo}
			height={currentSize.logo}
			class="object-contain"
		/>
		{#if showText}
			<div class="flex flex-col">
				<span class="font-bold {currentSize.text} text-primary leading-tight">
					OSTSEE-TIERE.DE
				</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Optimierte Bilddarstellung */
	img {
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}
</style>