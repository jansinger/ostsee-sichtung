<script lang="ts">
	import type { UploadedFileInfo } from '$lib/types/types';

	let { file }: { file: UploadedFileInfo } = $props();

	let imageLoadStatus = $state<'loading' | 'success' | 'error'>('loading');
	let errorMessage = $state<string>('');
	let actualUrl = $state<string>('');

	async function testImageUrl() {
		const url = `/uploads/${file.filePath}`;
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

		<div><strong>Request URL:</strong> <code>/uploads/{file.filePath}</code></div>
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
	</div>

	<!-- Test image loading -->
	<div class="mt-4">
		<h5 class="mb-2 font-medium">Test Image:</h5>
		<img
			src={`/uploads/${file.filePath}`}
			alt={file.originalName}
			class="border-base-300 max-h-[200px] max-w-[200px] border object-contain"
			onload={() => console.log('Image loaded successfully:', file.filePath)}
			onerror={(e) => console.error('Image failed to load:', file.filePath, e)}
		/>
	</div>
</div>
