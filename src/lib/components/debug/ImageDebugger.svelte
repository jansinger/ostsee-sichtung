<script lang="ts">
	import type { UploadedFileInfo } from '$lib/types/types';

	let { file }: { file: UploadedFileInfo } = $props();

	let imageLoadStatus = $state<'loading' | 'success' | 'error'>('loading');
	let errorMessage = $state<string>('');
	let actualUrl = $state<string>('');

	async function testImageUrl() {
		const url = file.url;
		try {
			const response = await fetch(url);
			actualUrl = response.url; // Will show the redirected URL

			if (response.ok) {
				imageLoadStatus = 'success';
			} else {
				imageLoadStatus = 'error';
				errorMessage = `HTTP ${response.status}: ${response.statusText}`;
			}
		} catch (error) {
			imageLoadStatus = 'error';
			errorMessage = error instanceof Error ? error.message : 'Unknown error';
		}
	}

	// Test URL when component mounts
	$effect(() => {
		testImageUrl();
	});
</script>

<div class="card bg-base-200 mb-4 p-4 shadow-sm">
	<h4 class="mb-2 font-semibold">🔍 Image Debug Info</h4>

	<div class="space-y-2 text-sm">
		<div><strong>Original Name:</strong> {file.originalName}</div>
		<div><strong>File Path:</strong> {file.filePath}</div>
		<div><strong>MIME Type:</strong> {file.mimeType}</div>
		<div><strong>Size:</strong> {(file.size / 1024).toFixed(1)} KB</div>

		<div><strong>Request URL:</strong> <code>{file.url}</code></div>
		<div><strong>Actual URL:</strong> <code>{actualUrl}</code></div>

		<div>
			<strong>Load Status:</strong>
			{#if imageLoadStatus === 'loading'}
				<span class="badge badge-warning">Loading...</span>
			{:else if imageLoadStatus === 'success'}
				<span class="badge badge-success">Success</span>
			{:else}
				<span class="badge badge-error">Error: {errorMessage}</span>
			{/if}
		</div>

		{#if file.exifData}
			<div class="mt-3">
				<strong>📸 EXIF-Daten:</strong>
				<div class="pl-4 mt-1">
					{#if file.exifData.latitude && file.exifData.longitude}
						<div>GPS: {file.exifData.latitude.toFixed(6)}, {file.exifData.longitude.toFixed(6)}</div>
					{/if}
					{#if file.exifData.dateTimeOriginal}
						<div>Aufnahmedatum: {new Date(file.exifData.dateTimeOriginal).toLocaleString('de-DE')}</div>
					{/if}
					{#if file.exifData.make || file.exifData.model}
						<div>Kamera: {file.exifData.make} {file.exifData.model}</div>
					{/if}
					{#if file.exifData.width && file.exifData.height}
						<div>Auflösung: {file.exifData.width} × {file.exifData.height}</div>
					{/if}
					{#if file.exifData.iso}
						<div>ISO: {file.exifData.iso}</div>
					{/if}
					{#if file.exifData.fNumber}
						<div>Blende: f/{file.exifData.fNumber}</div>
					{/if}
					{#if file.exifData.exposureTime}
						<div>Belichtungszeit: {file.exifData.exposureTime}</div>
					{/if}
					{#if file.exifData.focalLength}
						<div>Brennweite: {file.exifData.focalLength}mm</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Test image loading -->
	<div class="mt-4">
		<h5 class="mb-2 font-medium">Test Image:</h5>
		<img
			src={file.url}
			alt={file.originalName}
			class="border-base-300 max-h-[200px] max-w-[200px] border object-contain"
			onload={() => console.log('Image loaded successfully:', file.filePath)}
			onerror={(e) => console.error('Image failed to load:', file.filePath, e)}
		/>
	</div>
</div>
