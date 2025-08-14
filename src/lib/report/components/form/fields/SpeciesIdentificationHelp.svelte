<script lang="ts">
	import { SpeciesEnum, speciesGroups } from '$lib/report/formOptions/species';
	import type { SightingFormData } from '$lib/types';
	import { ChevronDown, ChevronRight, CircleHelp } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let {
		currentValue = undefined
	}: {
		currentValue?: SightingFormData[keyof SightingFormData];
	} = $props();

	let isExpanded = $state(false);
	let modalImageSrc = $state<string | null>(null);
	let modalImageAlt = $state<string>('');
	let modalImageCopyright = $state<string | null>(null);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function openImageModal(src: string, alt: string, copyright: string | null = null) {
		modalImageSrc = src;
		modalImageAlt = alt;
		modalImageCopyright = copyright;
		// Show DaisyUI modal
		const modal = document.getElementById('species-image-modal') as HTMLDialogElement;
		if (modal) {
			modal.showModal();
		}
	}

	function closeImageModal() {
		modalImageSrc = null;
		modalImageAlt = '';
		modalImageCopyright = null;
		const modal = document.getElementById('species-image-modal') as HTMLDialogElement;
		if (modal) {
			modal.close();
		}
	}

	// Identifikationsdaten für jede Tierart
	const identificationData = {
		[SpeciesEnum.HARBOR_PORPOISE]: {
			name: 'Schweinswal',
			size: '1,5-2 m',
			weight: '50-70 kg',
			distinguishing: [
				'Kleine, dreieckige Rückenflosse',
				'Kurze, stumpfe Schnauze',
				'Dunkelgrauer bis schwarzer Rücken',
				'Helle Bauchseite',
				'Oft einzeln oder in kleinen Gruppen'
			],
			behavior: ['Kurze Tauchgänge (1-2 Min.)', 'Scheue Tiere', 'Atmen alle 2-4 Sekunden'],
			images: [
				{
					src: '/species/harbor-porpoise.png',
					alt: 'Schweinswal Seitenansicht',
					copyright:
						'© <a href="https://commons.wikimedia.org/wiki/File:Daan_Close_Up.PNG">AVampireTear</a>, <a href="http://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, via Wikimedia Commons'
				}
			]
		},
		[SpeciesEnum.GREY_SEAL]: {
			name: 'Kegelrobbe',
			size: 'Männchen: bis 3 m, Weibchen: bis 2 m',
			weight: 'Männchen: bis 300 kg, Weibchen: bis 150 kg',
			distinguishing: [
				'Langer, kegelförmiger Kopf',
				'Große, weit auseinanderstehende Nasenlöcher',
				'Grau mit dunklen Flecken',
				'Deutlicher Geschlechtsdimorphismus',
				'Männchen deutlich größer'
			],
			behavior: [
				'Robuste Schwimmer',
				'Tauchen bis zu 100 m tief',
				'Leben oft in Kolonien',
				'Sehr neugierig'
			],
			images: [
				{
					src: '/species/Two_seals_in_the_water.jpg',
					alt: 'Kegelrobben im Wasser - Kopfform gut erkennbar',
					copyright:
						'© <a href="https://commons.wikimedia.org/wiki/File:Two_seals_in_the_water.jpg">Lucc77</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, via Wikimedia Commons'
				},
				{
					src: '/species/karsten-madsen-unsplash.jpg',
					alt: 'Kegelrobbe Kopfdetail - charakteristische Nasenlöcher',
					copyright: '© Foto von Karsten Madsen auf Unsplash'
				}
			]
		},
		[SpeciesEnum.HARBOR_SEAL]: {
			name: 'Seehund',
			size: '1,2-1,8 m',
			weight: '50-100 kg',
			distinguishing: [
				'Rundlicher Kopf mit kurzer Schnauze',
				'V-förmig zusammenlaufende Nasenlöcher',
				'Graubraun mit dunklen Flecken',
				'Relativ kleine Augen',
				'Gedrungener Körperbau'
			],
			behavior: [
				'Neugierig, nähern sich oft Booten',
				'Leben in Gruppen',
				'Ruhen gern auf Sandbänken',
				'Tauchen meist 2-5 Minuten'
			],
			images: [
				{
					src: '/species/1080px-Common_Seal_Phoca_vitulina.jpg',
					alt: 'Seehund Seitenansicht - rundlicher Kopf',
					copyright:
						'© By <a rel="nofollow" class="external text" href="http://photo-natur.de/">Andreas Trepte</a> - <span class="int-own-work" lang="en">Own work</span>, <a href="https://creativecommons.org/licenses/by-sa/2.5" title="Creative Commons Attribution-Share Alike 2.5">CC BY-SA 2.5</a>, <a href="https://commons.wikimedia.org/w/index.php?curid=21012232">Link</a>'
				}
			]
		},
		[SpeciesEnum.RINGED_SEAL]: {
			name: 'Ringelrobbe',
			size: '1-1,5 m',
			weight: '50-70 kg',
			distinguishing: [
				'Kleinste Robbenart in der Ostsee',
				'Charakteristische helle Ringe auf dunklem Fell',
				'Rundlicher Kopf',
				'Kurze Schnauze',
				'Relativ große Augen'
			],
			behavior: ['Sehr scheu', 'Einzelgänger', 'Bevorzugen eisige Gewässer', 'Seltene Sichtungen'],
			images: [
				{
					src: '/species/ringed-seal.jpg',
					alt: 'Ringelrobbe mit charakteristischen Ringen',
					copyright:
						'© By <a href="//commons.wikimedia.org/w/index.php?title=User:Kirill.uyutnov&amp;action=edit&amp;redlink=1" class="new" title="User:Kirill.uyutnov (page does not exist)">Кирилл Уютнов</a> - <span class="int-own-work" lang="en">Own work</span>, <a href="https://creativecommons.org/licenses/by-sa/4.0" title="Creative Commons Attribution-Share Alike 4.0">CC BY-SA 4.0</a>, <a href="https://commons.wikimedia.org/w/index.php?curid=99756242">Link</a>'
				}
			]
		},
		[SpeciesEnum.DOLPHIN]: {
			name: 'Delphin',
			size: '2-4 m (je nach Art)',
			weight: '150-500 kg',
			distinguishing: [
				'Längliche Schnauze (Rostrum)',
				'Sichelförmige Rückenflosse',
				'Stromlinienförmiger Körper',
				'Meist grau mit hellerer Bauchseite',
				'Leben in Schulen'
			],
			behavior: [
				'Sehr aktive Schwimmer',
				'Springen oft aus dem Wasser',
				'Soziale Tiere in Gruppen',
				'Neugierig gegenüber Booten'
			],
			images: [
				{
					src: '/species/974px-Tursiops_truncatus_01-cropped.jpg',
					alt: 'Delphin beim Sprung - sichelförmige Rückenflosse',
					copyright:
						'© By NASA - <a rel="nofollow" class="external free" href="https://images.nasa.gov/details/KSC-04pd0178">https://images.nasa.gov/details/KSC-04pd0178</a><a rel="nofollow" class="external text" href="https://web.archive.org/web/20051113140743/http://mediaarchive.ksc.nasa.gov/detail.cfm?mediaid=21807">http://mediaarchive.ksc.nasa.gov/detail.cfm?mediaid=21807 on the Wayback Machine</a> at the <span lang="en" dir="ltr"><a href="https://en.wikipedia.org/wiki/Wayback_Machine" class="extiw" title="en:Wayback Machine"><span lang="en" dir="ltr">Wayback Machine</span></a></span>, Public Domain, <a href="https://commons.wikimedia.org/w/index.php?curid=37679800">Link</a>'
				}
			]
		},
		[SpeciesEnum.BELUGA]: {
			name: 'Beluga (Weißwal)',
			size: '3-5 m',
			weight: '400-1500 kg',
			distinguishing: [
				'Charakteristische weiße Färbung (adult)',
				'Rundlicher, flexibler Kopf (Melon)',
				'Keine Rückenflosse',
				'Breite, paddelförmige Brustflossen',
				'Jungtiere grau'
			],
			behavior: [
				'Leben in Familienverbänden',
				'Sehr soziale Tiere',
				'Langsame Schwimmer',
				'Seltene Gäste in der Ostsee'
			],
			images: [
				{
					src: '/species/mendar-bouchali-djtZXyJkTU4-unsplash.jpg',
					alt: 'Erwachsene Beluga - charakteristisch weiß',
					copyright:
						'Foto von <a href="https://unsplash.com/de/@mendarb?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Mendar Bouchali</a> auf <a href="https://unsplash.com/de/fotos/weisses-unterwassertier-djtZXyJkTU4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>'
				}
			]
		},
		[SpeciesEnum.MINKE_WHALE]: {
			name: 'Zwergwal',
			size: '7-10 m',
			weight: '5-10 Tonnen',
			distinguishing: [
				'Kleinster Bartenwal',
				'Spitzer Kopf',
				'Weißes Band an den Brustflossen',
				'Sichelförmige Rückenflosse',
				'Dunkler Rücken, heller Bauch'
			],
			behavior: [
				'Schnelle Schwimmer',
				'Meist einzeln oder paarweise',
				'Neugierig gegenüber Booten',
				'Kurze Tauchgänge'
			],
			images: [
				{
					src: '/species/minke-whale.svg',
					alt: 'Zwergwal mit charakteristischen weißen Bändern',
					copyright: '© '
				}
			]
		},
		[SpeciesEnum.FIN_WHALE]: {
			name: 'Finnwal',
			size: '18-24 m',
			weight: '40-70 Tonnen',
			distinguishing: [
				'Zweitgrößter Wal der Welt',
				'Asymmetrische Kopffärbung',
				'Hohe, sichelförmige Rückenflosse',
				'V-förmiger Kopf von oben',
				'Lange, schlanke Körperform'
			],
			behavior: [
				'Sehr schnelle Schwimmer (bis 40 km/h)',
				'Meist einzeln',
				'Tiefe Tauchgänge',
				'Seltene Sichtungen in der Ostsee'
			],
			images: [
				{
					src: '/species/fin-whale.svg',
					alt: 'Finnwal - asymmetrische Kopffärbung sichtbar',
					copyright: '© '
				}
			]
		},
		[SpeciesEnum.HUMPBACK_WHALE]: {
			name: 'Buckelwal',
			size: '12-16 m',
			weight: '25-30 Tonnen',
			distinguishing: [
				'Sehr lange Brustflossen (bis 5 m)',
				'Höcker auf dem Rücken',
				'Warzen am Kopf',
				'Kleine Rückenflosse auf Höcker',
				'Komplexe Schwarz-Weiß-Muster'
			],
			behavior: [
				'Spektakuläre Sprünge',
				'Komplexe Gesänge',
				'Lange Wanderungen',
				'Sehr seltene Gäste in der Ostsee'
			],
			images: [
				{
					src: '/species/1066px-Humpback_whales_in_singing_position.jpg',
					alt: 'Buckelwal unter Wasser',
					copyright:
						'© By Dr. Louis M. Herman. - <a rel="nofollow" class="external text" href="https://www.flickr.com/people/51647007@N08">NOAA Photo Library</a>: <a rel="nofollow" class="external text" href="https://www.flickr.com/photos/noaaphotolib/5077889241/">sanc0602</a>, Public Domain, <a href="https://commons.wikimedia.org/w/index.php?curid=79946">Link</a>'
				}
			]
		},
		[SpeciesEnum.UNKNOWN_WHALE]: {
			name: 'Unbekannte Walart',
			size: 'Variabel',
			weight: 'Variabel',
			distinguishing: [
				'Wenn Artbestimmung nicht sicher möglich',
				'Allgemeine Walmerkmale beachten',
				'Größe und Körperform dokumentieren',
				'Besondere Merkmale notieren'
			],
			behavior: ['Verhalten dokumentieren', 'Fotos wenn möglich', 'Genaue Ortsangabe wichtig'],
			images: [
				{
					src: '/species/unknown-whale.svg',
					alt: 'Unbekannte Walart - Platzhalter',
					copyright: null
				}
			]
		},
		[SpeciesEnum.UNKNOWN_SEAL]: {
			name: 'Unbekannte Robbenart',
			size: 'Variabel',
			weight: 'Variabel',
			distinguishing: [
				'Wenn Artbestimmung nicht sicher möglich',
				'Kopfform und Nasenlöcher beachten',
				'Größe schätzen',
				'Fellmuster dokumentieren'
			],
			behavior: ['Verhalten beobachten', 'Fotos wenn möglich', 'Mit Bestimmungshilfe vergleichen'],
			images: [
				{
					src: '/species/unknown-seal.svg',
					alt: 'Unbekannte Robbenart - Platzhalter',
					copyright: null
				}
			]
		}
	};

	// Gruppierte Daten für die Anzeige
	const groupedData = Object.entries(speciesGroups).map(([groupName, species]) => ({
		groupName,
		species: species
			.filter((s) => s in identificationData)
			.map((s) => ({ enum: s, ...identificationData[s as keyof typeof identificationData] }))
	}));
</script>

<div class="mt-2">
	<!-- Toggle Button -->
	<button
		type="button"
		class="btn btn-ghost btn-sm flex w-full justify-start gap-2 text-left"
		onclick={toggleExpanded}
		aria-expanded={isExpanded}
		aria-controls="species-help-content"
	>
		<Icon src={isExpanded ? ChevronDown : ChevronRight} size="16" />
		<Icon src={CircleHelp} size="16" class="text-info" />
		<span>Hilfe bei der Tiererkennung</span>
	</button>

	<!-- Expandable Content -->
	{#if isExpanded}
		<div
			id="species-help-content"
			class="animate-in slide-in-from-top-2 bg-base-100 border-base-300 mt-2 rounded-lg border p-4 duration-200"
		>
			<div class="mb-4">
				<h4 class="text-base-content mb-2 text-sm font-semibold">
					Bestimmungshilfe für Meerestiere
				</h4>
				<p class="text-base-content/70 text-xs">
					Klicken Sie auf eine Tierart um detaillierte Erkennungsmerkmale zu sehen.
				</p>
			</div>

			{#each groupedData as group (group.groupName)}
				<div class="mb-4">
					<h5 class="text-primary mb-2 text-sm font-medium">{group.groupName}</h5>
					<div class="grid grid-cols-1 gap-2">
						{#each group.species as species (species.enum)}
							<details class="collapse-arrow border-base-300 bg-base-50 collapse border">
								<summary class="collapse-title min-h-0 py-2 text-sm font-medium">
									<div class="flex items-center gap-2">
										{#if species.images && species.images.length > 0 && species.images[0]}
											<div class="avatar">
												<div class="mask h-6 w-6 mask-circle">
													<img
														src={species.images[0].src}
														alt={species.images[0].alt}
														class="object-cover"
														loading="lazy"
													/>
												</div>
											</div>
										{/if}
										<span class={currentValue == species.enum ? 'text-primary font-semibold' : ''}>
											{species.name}
										</span>
									</div>
								</summary>
								<div class="collapse-content px-4 pb-3">
									<div class="space-y-3">
										<!-- Bilder (klickbar für Vollbildansicht) -->
										{#if species.images && species.images.length > 0}
											<div class="space-y-3">
												{#if species.images.length === 1}
													<!-- Einzelnes Bild zentriert -->
													<div class="flex justify-center">
														<div class="text-center">
															<button
																type="button"
																class="group relative overflow-hidden rounded-lg shadow-sm transition-all hover:scale-105 hover:shadow-md"
																onclick={() =>
																	openImageModal(
																		species.images?.[0]?.src || '',
																		species.images?.[0]?.alt || species.name,
																		species.images?.[0]?.copyright || null
																	)}
																aria-label={`${species.images?.[0]?.alt || species.name} in Originalgröße anzeigen`}
															>
																<img
																	src={species.images?.[0]?.src || ''}
																	alt={species.images?.[0]?.alt || species.name}
																	class="h-32 w-auto object-cover transition-all group-hover:brightness-110"
																	loading="lazy"
																/>
																<!-- Hover-Overlay mit Vergrößerungs-Icon -->
																<div
																	class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
																>
																	<svg
																		class="h-6 w-6 text-white"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
																		></path>
																	</svg>
																</div>
															</button>
															<!-- Copyright unter dem Bild -->
															{#if species.images?.[0]?.copyright}
																<p class="text-base-content/50 mt-1 text-xs">
																	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
																	{@html species.images[0].copyright}
																</p>
															{/if}
														</div>
													</div>
												{:else}
													<!-- Mehrere Bilder in Grid -->
													<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
														{#each species.images as image (image.src)}
															<div class="text-center">
																<button
																	type="button"
																	class="group relative overflow-hidden rounded-lg shadow-sm transition-all hover:scale-105 hover:shadow-md"
																	onclick={() =>
																		openImageModal(image.src, image.alt, image.copyright || null)}
																	aria-label={`${image.alt} in Originalgröße anzeigen`}
																>
																	<img
																		src={image.src}
																		alt={image.alt}
																		class="h-28 w-full object-cover transition-all group-hover:brightness-110 sm:h-24"
																		loading="lazy"
																	/>
																	<!-- Hover-Overlay mit Vergrößerungs-Icon -->
																	<div
																		class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
																	>
																		<svg
																			class="h-5 w-5 text-white"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
																			></path>
																		</svg>
																	</div>
																</button>
																<!-- Copyright unter dem Bild -->
																{#if image.copyright}
																	<p class="text-base-content/50 mt-1 text-xs">
																		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
																		{@html image.copyright}
																	</p>
																{/if}
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/if}

										<!-- Grunddaten -->
										<div class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
											<div>
												<span class="text-base-content/60 font-medium">Größe:</span>
												<span class="text-base-content ml-1">{species.size}</span>
											</div>
											<div>
												<span class="text-base-content/60 font-medium">Gewicht:</span>
												<span class="text-base-content ml-1">{species.weight}</span>
											</div>
										</div>

										<!-- Erkennungsmerkmale -->
										<div>
											<h6 class="text-base-content mb-1 text-xs font-medium">
												Erkennungsmerkmale:
											</h6>
											<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
												{#each species.distinguishing as feature (feature)}
													<li>{feature}</li>
												{/each}
											</ul>
										</div>

										<!-- Verhalten -->
										<div>
											<h6 class="text-base-content mb-1 text-xs font-medium">
												Typisches Verhalten:
											</h6>
											<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
												{#each species.behavior as behaviorItem (behaviorItem)}
													<li>{behaviorItem}</li>
												{/each}
											</ul>
										</div>
									</div>
								</div>
							</details>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Zusätzliche Hinweise -->
			<div class="bg-info/10 rounded-lg p-3">
				<h6 class="text-info mb-1 flex items-center gap-1 text-xs font-medium">
					<Icon src={CircleHelp} size="14" />
					Wichtige Unterscheidungshilfe für Robben:
				</h6>
				<div class="text-base-content/80 space-y-1 text-xs">
					<p><strong>Kegelrobbe:</strong> Langer, kegelförmiger Kopf, große Nasenlöcher</p>
					<p><strong>Seehund:</strong> Rundlicher Kopf, V-förmige Nasenlöcher</p>
					<p><strong>Ringelrobbe:</strong> Kleinste Art, charakteristische helle Ringe</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Image Modal für Vollbildansicht -->
<dialog id="species-image-modal" class="modal">
	<div class="modal-box w-11/12 max-w-5xl p-0">
		{#if modalImageSrc}
			<div class="relative">
				<!-- Modal Header -->
				<div class="bg-base-200 flex items-center justify-between p-4">
					<h3 class="text-base-content text-lg font-bold">{modalImageAlt}</h3>
					<button
						type="button"
						class="btn btn-circle btn-ghost btn-sm"
						onclick={closeImageModal}
						aria-label="Schließen"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				</div>

				<!-- Modal Image -->
				<div class="flex flex-col items-center p-4">
					<img
						src={modalImageSrc}
						alt={modalImageAlt}
						class="max-h-[70vh] max-w-full object-contain"
						loading="lazy"
					/>
					<!-- Copyright unter dem vergrößerten Bild -->
					{#if modalImageCopyright}
						<p class="text-base-content/60 mt-3 text-sm">
							{modalImageCopyright}
						</p>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="bg-base-200 p-4 text-center">
					<p class="text-base-content/70 text-sm">
						Klicken Sie außerhalb des Bildes oder drücken Sie Escape zum Schließen
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Backdrop - click to close -->
	<form method="dialog" class="modal-backdrop">
		<button onclick={closeImageModal} aria-label="Modal schließen">close</button>
	</form>
</dialog>

<style>
	/* Enhanced collapse animation */
	.collapse-content {
		transition: all 0.2s ease-in-out;
	}

	/* Improved image styling */
	.avatar .mask {
		transition: transform 0.2s ease;
	}

	.avatar:hover .mask {
		transform: scale(1.05);
	}

	/* Clickable image button styling */
	:global(.group button) {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
	}

	:global(.group:hover img) {
		transform: scale(1.02);
	}

	/* Modal styling improvements */
	:global(.modal-box) {
		box-shadow:
			0 20px 25px -5px rgb(0 0 0 / 0.1),
			0 10px 10px -5px rgb(0 0 0 / 0.04);
	}

	:global(.modal-backdrop) {
		backdrop-filter: blur(4px);
		background-color: rgba(0, 0, 0, 0.6);
	}

	/* Image modal specific styling */
	.modal img {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	/* Copyright link styling */
	:global(.text-base-content\/50 a, .text-base-content\/60 a) {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: opacity 0.2s ease;
	}

	:global(.text-base-content\/50 a:hover, .text-base-content\/60 a:hover) {
		opacity: 0.8;
	}

	/* Better mobile responsiveness */
	@media (max-width: 640px) {
		.collapse-title {
			font-size: 0.875rem;
		}

		.collapse-content {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		/* Mobile modal adjustments */
		:global(.modal-box) {
			width: 95%;
			max-width: 95%;
		}

		.modal img {
			max-height: 60vh;
		}
	}

	/* Accessibility improvements */
	@media (prefers-reduced-motion: reduce) {
		.collapse-content,
		.avatar .mask,
		.group img,
		button {
			transition: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.group:hover {
			outline: 2px solid;
		}

		:global(.modal-box) {
			border: 2px solid;
		}
	}
</style>
