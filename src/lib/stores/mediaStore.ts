import type { FileMetadata } from '$lib/utils/exifUtils';
import { writable } from 'svelte/store';

export interface MediaFile {
	file: File;
	metadata: FileMetadata;
	isFromPositionStep?: boolean;
}

export interface MediaStore {
	files: MediaFile[];
}

function createMediaStore() {
	const { subscribe, update, set } = writable<MediaStore>({ files: [] });

	return {
		subscribe,

		/**
		 * Add a file from the position step (will be marked as first media file)
		 */
		addFromPositionStep: (file: File, metadata: FileMetadata) => {
			update((store) => ({
				...store,
				files: [
					{
						file,
						metadata,
						isFromPositionStep: true
					},
					...store.files.filter((f) => !f.isFromPositionStep)
				]
			}));
		},

		/**
		 * Add additional media files
		 */
		addFiles: (newFiles: { file: File; metadata: FileMetadata }[]) => {
			update((store) => ({
				...store,
				files: [
					...store.files,
					...newFiles.map(({ file, metadata }) => ({
						file,
						metadata,
						isFromPositionStep: false
					}))
				]
			}));
		},

		/**
		 * Remove a specific file by index (only removes from UI, server deletion handled elsewhere)
		 */
		removeFile: (index: number) => {
			update((store) => ({
				...store,
				files: store.files.filter((_, i) => i !== index)
			}));
		},

		/**
		 * Clear all files (only clears UI, server deletion handled elsewhere)
		 */
		clear: () => {
			set({ files: [] });
		}
	};
}

export const mediaStore = createMediaStore();
