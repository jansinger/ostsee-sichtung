<script lang="ts">
	import { ddToDm, ddToDms, dmsToDd, dmToDd } from '$lib/utils/geo/coordinateConversion';

	import OLMap from '$lib/components/map/OLMap.svelte';

	let {
		mode = 'dd',
		latitude = $bindable(13.5),
		longitude = $bindable(54.5),
		onchange = () => {}
	} = $props<{
		mode?: 'dms' | 'dm' | 'dd';
		latitude: number;
		longitude: number;
		onchange?: EventListener | null;
	}>();

	let dms: {
		latitude: { deg: number; min: number; sec: number };
		longitude: { deg: number; min: number; sec: number };
	} = $state({ latitude: { deg: 0, min: 0, sec: 0 }, longitude: { deg: 0, min: 0, sec: 0 } });
	let dm: { latitude: { deg: number; min: number }; longitude: { deg: number; min: number } } =
		$state({ latitude: { deg: 0, min: 0 }, longitude: { deg: 0, min: 0 } });

	$effect(() => {
		dms.longitude = ddToDms(longitude);
		dms.latitude = ddToDms(latitude);
		dm.longitude = ddToDm(longitude);
		dm.latitude = ddToDm(latitude);
	});

	// svelte-ignore non_reactive_update
	let latitudeInput: HTMLInputElement;
	// svelte-ignore non_reactive_update
	let longitudeInput: HTMLInputElement;

	function updateFromFields() {
		try {
			if (mode === 'dms') {
				latitude = dmsToDd(
					dms.latitude.deg,
					dms.latitude.min,
					dms.latitude.sec,
					dms.latitude.deg >= 0 ? 1 : -1
				);
				longitude = dmsToDd(
					dms.longitude.deg,
					dms.longitude.min,
					dms.longitude.sec,
					dms.longitude.deg >= 0 ? 1 : -1
				);
			} else if (mode === 'dm') {
				latitude = dmToDd(dm.latitude.deg, dm.latitude.min, dm.latitude.deg >= 0 ? 1 : -1);
				longitude = dmToDd(dm.longitude.deg, dm.longitude.min, dm.longitude.deg >= 0 ? 1 : -1);
			}
		} catch (error) {
			console.error('Fehler beim Aktualisieren der Felder:', error);
		}
		onMapChange();
	}

	function onMapChange() {
		setTimeout(() => {
			longitudeInput?.dispatchEvent(new Event('change', { bubbles: true }));
			latitudeInput?.dispatchEvent(new Event('change', { bubbles: true }));
		}, 0);
	}
</script>

<div class="form-control w-full">
	<div class="border-base-300 mb-4 overflow-hidden rounded-lg border">
		<OLMap bind:latitude bind:longitude readonly={false} enableGPS={true} onchange={onMapChange} />
	</div>

	<div class="mb-4 flex items-center justify-between">
		<label class="label" for="gps-format">GPS-Eingabeformat</label>
		<select id="gps-format" class="select-bordered select ml-auto w-auto" bind:value={mode}>
			<option value="dd">Dezimalgrad (z.B. 54.5042° N)</option>
			<option value="dm">Grad, Dezimalminute (z.B. 54° 30.25' N)</option>
			<option value="dms">Grad, Minute, Sekunde (z.B. 54° 30' 15" N)</option>
		</select>
	</div>

	{#if mode === 'dms'}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="dms-lat-deg">Breite (N)</label>
				<div class="flex gap-2">
					<div class="form-control">
						<input
							id="dms-lat-deg"
							class="input-bordered input w-16"
							type="number"
							min="0"
							max="90"
							placeholder="Grad"
							bind:value={dms.latitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input-bordered input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Min"
						bind:value={dms.latitude.min}
						onchange={updateFromFields}
					/>
					<input
						class="input-bordered input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Sek"
						bind:value={dms.latitude.sec}
						onchange={updateFromFields}
					/>
				</div>
			</div>
			<div>
				<label class="label" for="dms-lon-deg">Länge (E)</label>
				<div class="flex gap-2">
					<div class="form-control">
						<input
							id="dms-lon-deg"
							class="input-bordered input w-16"
							type="number"
							min="0"
							max="180"
							placeholder="Grad"
							bind:value={dms.longitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input-bordered input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Min"
						bind:value={dms.longitude.min}
						onchange={updateFromFields}
					/>
					<input
						class="input-bordered input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Sek"
						bind:value={dms.longitude.sec}
						onchange={updateFromFields}
					/>
				</div>
			</div>
		</div>
	{:else if mode === 'dm'}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="dm-lat-deg">Breite (N)</label>
				<div class="flex gap-2">
					<div class="form-control">
						<input
							id="dm-lat-deg"
							class="input-bordered input w-16"
							type="number"
							min="0"
							max="90"
							placeholder="Grad"
							bind:value={dm.latitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input-bordered input w-24"
						type="number"
						min="0"
						max="59.9999"
						step="0.01"
						placeholder="Dezimalmin"
						bind:value={dm.latitude.min}
						onchange={updateFromFields}
					/>
				</div>
			</div>
			<div>
				<label class="label" for="dm-lon-deg">Länge (E)</label>
				<div class="flex gap-2">
					<div class="form-control">
						<input
							id="dm-lon-deg"
							class="input-bordered input w-16"
							type="number"
							min="0"
							max="180"
							placeholder="Grad"
							bind:value={dm.longitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input-bordered input w-24"
						type="number"
						min="0"
						max="59.9999"
						step="0.01"
						placeholder="Dezimalmin"
						bind:value={dm.longitude.min}
						onchange={updateFromFields}
					/>
				</div>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="dd-latitude">Breite (N)</label>
				<input
					id="latitude"
					class="input-bordered input w-full"
					type="number"
					min="-90"
					max="90"
					step="0.0001"
					placeholder="Dezimalgrad"
					bind:value={latitude}
					{onchange}
					bind:this={latitudeInput}
				/>
			</div>
			<div>
				<label class="label" for="longitude">Länge (E)</label>
				<input
					id="longitude"
					class="input-bordered input w-full"
					type="number"
					min="-180"
					max="180"
					step="0.0001"
					placeholder="Dezimalgrad"
					bind:value={longitude}
					{onchange}
					bind:this={longitudeInput}
				/>
			</div>
		</div>
	{/if}
</div>
