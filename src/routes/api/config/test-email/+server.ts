import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';
import { EmailService } from '$lib/server/services/emailService';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config:test-email');

export const POST: RequestHandler = async ({ locals, request, url }: RequestEvent) => {
	try {
		// SECURITY: Require admin or superadmin role to send test email
		requireUserRole(url, locals.user, ['admin', 'superadmin']);

		const body = await request.json();
		const { recipient } = body;

		// Send test email
		const success = await EmailService.sendTestEmail(recipient);

		if (success) {
			logger.info({ recipient, userId: locals.user!.sub }, 'Test email sent successfully'); // Safe after requireUserRole check
			return json({ 
				success: true, 
				message: 'Test-E-Mail wurde erfolgreich gesendet' 
			});
		} else {
			return json({ 
				success: false, 
				message: 'Test-E-Mail konnte nicht gesendet werden. Prüfen Sie die SMTP-Konfiguration.' 
			}, { status: 500 });
		}

	} catch (error) {
		logger.error({ error }, 'Failed to send test email');
		return json({ 
			success: false, 
			message: 'Fehler beim Senden der Test-E-Mail' 
		}, { status: 500 });
	}
};