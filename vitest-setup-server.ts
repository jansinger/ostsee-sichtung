import { vi } from 'vitest';
import './src/tests/contract/helpers/specSetup';

// Set NODE_ENV to test to prevent automatic service initialization
process.env.NODE_ENV = 'test';

// Global mock for EmailService to prevent any real email sending during tests
vi.mock('$lib/server/services/emailService', () => ({
	EmailService: {
		sendNewSightingNotification: vi.fn().mockResolvedValue(true),
		sendTestEmail: vi.fn().mockResolvedValue(true),
		initialize: vi.fn().mockResolvedValue(undefined),
		clearTemplateCache: vi.fn(),
		// Static methods that might be called
		getEmailConfig: vi.fn().mockResolvedValue({
			enabled: false,
			recipient: '',
			sender: 'noreply@test.com',
			senderName: 'Test'
		})
	}
}));

// Prevent any SMTP connections during tests
vi.mock('nodemailer', () => ({
	createTransport: vi.fn(() => ({
		verify: vi.fn().mockResolvedValue(true),
		sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
	}))
}));

console.log('✅ Email services mocked for tests - no real emails will be sent');
