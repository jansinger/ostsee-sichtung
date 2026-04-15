import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/server/db/sightingFilesRepository', () => ({
	saveUploadedFile: vi.fn().mockResolvedValue({ id: 1 })
}));

vi.mock('$lib/server/media/exifUtils', () => ({
	readImageExifData: vi.fn().mockResolvedValue(null)
}));

vi.mock('$lib/server/storage/factory', () => ({
	getStorageProvider: () => ({
		upload: vi.fn().mockResolvedValue({
			uid: 'test-uid',
			filePath: '/uploads/test.jpg',
			originalName: 'test.jpg',
			fileName: 'abc123.jpg',
			mimeType: 'image/jpeg',
			size: 1024,
			url: '/uploads/test.jpg'
		})
	})
}));

vi.mock('$lib/services/configService', () => ({
	ServerConfigService: {
		getUploadConfig: vi.fn().mockResolvedValue({
			allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
			maxFileSizeBytes: 30 * 1024 * 1024,
			maxFiles: 10
		})
	}
}));

vi.mock('$lib/server/validation/magicBytes', () => ({
	validateMagicBytes: vi.fn().mockReturnValue({ isValid: true }),
	isDangerousFileType: vi.fn().mockReturnValue(false)
}));

// Valid CUID for testing
const VALID_CUID = 'clh4z9z0b0000356gkzfh6a2i';
const VALID_UID = 'clh4z9z0b0001356gkzfh6a2j';

function createMockRequest(
	overrides: {
		contentType?: string;
		file?: File | null;
		referenceId?: string;
		uid?: string;
	} = {}
) {
	const file =
		overrides.file !== undefined
			? overrides.file
			: new File(['test-content'], 'test.jpg', { type: 'image/jpeg' });

	const formData = new FormData();
	if (file) formData.append('file', file);
	if (overrides.referenceId !== undefined) formData.append('referenceId', overrides.referenceId);
	else formData.append('referenceId', VALID_CUID);
	if (overrides.uid !== undefined) formData.append('uid', overrides.uid);
	else formData.append('uid', VALID_UID);

	return {
		request: {
			headers: {
				get: vi.fn((name: string) => {
					if (name === 'content-type')
						return overrides.contentType ?? 'multipart/form-data; boundary=----';
					if (name === 'x-forwarded-for') return '127.0.0.1';
					if (name === 'x-real-ip') return '127.0.0.1';
					if (name === 'user-agent') return 'vitest';
					return null;
				})
			},
			formData: async () => formData
		} as unknown as Request,
		locals: { user: { sub: 'test-user' } },
		params: {},
		route: { id: '/api/files/upload' },
		url: new URL('http://localhost/api/files/upload'),
		setHeaders: vi.fn(),
		cookies: {} as any,
		fetch: fetch,
		getClientAddress: () => '127.0.0.1',
		platform: undefined,
		isDataRequest: false,
		isSubRequest: false,
		isRemoteRequest: false
	} as any;
}

describe('/api/files/upload POST', () => {
	it('weist Request ohne multipart/form-data ab', async () => {
		const event = createMockRequest({ contentType: 'application/json' });

		await expect(POST(event)).rejects.toMatchObject({
			status: 400
		});
	});

	it('weist Request ohne Datei ab', async () => {
		const event = createMockRequest({ file: null });

		await expect(POST(event)).rejects.toMatchObject({
			status: 400
		});
	});

	it('weist ungültige referenceId ab', async () => {
		const event = createMockRequest({ referenceId: 'not-a-cuid' });

		await expect(POST(event)).rejects.toMatchObject({
			status: 400
		});
	});

	it('weist ungültige uid ab', async () => {
		const event = createMockRequest({ uid: 'not-a-cuid' });

		await expect(POST(event)).rejects.toMatchObject({
			status: 400
		});
	});

	it('weist leere referenceId ab', async () => {
		const event = createMockRequest({ referenceId: '' });

		await expect(POST(event)).rejects.toMatchObject({
			status: 400
		});
	});
});
