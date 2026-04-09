import type { BrowserFileMetadata, ExifData, UploadedFileInfo } from '$lib/types';
import { createId } from '@paralleldrive/cuid2';
import { analyzeClientFile } from '$lib/utils/client/fileAnalysis';
import { uploadFileDirect } from '$lib/utils/uploadUtils';

export class MediaFile {
	uid: string;
	referenceId: string;
	file: File | undefined;
	size: number = 0;
	thumbnail: string | undefined;
	fileName: string;
	exifData: ExifData | null | undefined = undefined;
	metadata: Promise<BrowserFileMetadata>;
	uploadedFile: Promise<UploadedFileInfo>;
	isFromPositionStep: boolean = false;
	isUploading: boolean = true;
	isDeleting: boolean = false;
	timestamp: Date | null = null;

	constructor(
		uid: string,
		fileName: string,
		referenceId: string,
		uploadedFile: Promise<UploadedFileInfo>,
		metadata: Promise<BrowserFileMetadata>
	) {
		this.uid = uid;
		this.referenceId = referenceId;
		this.uploadedFile = uploadedFile;
		this.metadata = metadata;
		this.fileName = fileName;
	}

	static createMediaFile(referenceId: string, file: File, isFromPositionStep?: boolean) {
		const uid = createId();
		const mediaFile = new MediaFile(
			uid,
			file.name,
			referenceId,
			uploadFileDirect(file, referenceId, uid),
			analyzeClientFile(file)
		);
		mediaFile.file = file;
		mediaFile.size = file.size;
		mediaFile.isFromPositionStep = isFromPositionStep ?? false;
		mediaFile.metadata.then((data) => {
			mediaFile.exifData = mediaFile.exifData ?? data.exifData;
			mediaFile.thumbnail = mediaFile.thumbnail ?? data.thumbnail;
			mediaFile.timestamp = data.exifData?.dateTimeOriginal ?? null;
		});
		mediaFile.uploadedFile.then((fileInfo) => {
			mediaFile.isUploading = false;
			mediaFile.exifData = mediaFile.exifData ?? fileInfo.exifData;
		});
		return mediaFile;
	}

	static fromUploadedFile(fileInfo: UploadedFileInfo, referenceId: string) {
		const fileName = fileInfo.originalName ?? fileInfo.fileName;
		const mediaFile = new MediaFile(
			fileInfo.uid,
			fileName,
			referenceId,
			Promise.resolve(fileInfo),
			Promise.resolve({
				fileName: fileName,
				size: fileInfo.size,
				mimeType: fileInfo.mimeType,
				exifData: fileInfo.exifData
			})
		);
		const mockFile = new File([''], fileInfo.originalName, {
			type: fileInfo.mimeType
		});

		mediaFile.file = mockFile;
		mediaFile.size = fileInfo.size;
		mediaFile.exifData = fileInfo.exifData as ExifData | null | undefined;
		mediaFile.thumbnail = `/uploads/${fileInfo.filePath}`;
		mediaFile.timestamp = mediaFile.exifData?.dateTimeOriginal
			? new Date(mediaFile.exifData.dateTimeOriginal)
			: null;
		return mediaFile;
	}

	hasPosition = (): boolean => {
		return !!(this.exifData?.latitude && this.exifData?.longitude);
	};
}

export type MediaStore = {
	mediaFiles: MediaFile[];
};
