import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EmailService } from '$lib/server/services/emailService';
import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';

const logger = createLogger('api:test-email');

export const POST: RequestHandler = async ({ request, locals, url }) => {
	// SECURITY: Must be outside try/catch so redirect(302) propagates correctly
	requireUserRole(url, locals.user, ['admin']);

	try {
		logger.debug(
			{
				user: locals.user?.sub,
				roles: locals.user?.roles
			},
			'Admin user sending test email'
		);

		const body = await request.json();
		const { sightingId, recipient, testType = 'sighting' } = body;

		// Validate input
		if (testType === 'sighting') {
			if (!sightingId || typeof sightingId !== 'number') {
				return json({ success: false, error: 'Invalid sighting ID' }, { status: 400 });
			}

			// Send test email with sighting data using existing notification method
			// Note: recipient override is not supported by sendNewSightingNotification
			const success = await EmailService.sendNewSightingNotification(sightingId);

			if (success) {
				logger.info({ sightingId }, 'Test sighting email sent successfully');
				return json({
					success: true,
					message: `Test-E-Mail für Sichtung ${sightingId} wurde erfolgreich gesendet`
				});
			} else {
				return json(
					{
						success: false,
						error: 'E-Mail konnte nicht gesendet werden. Bitte prüfen Sie die Konfiguration.'
					},
					{ status: 500 }
				);
			}
		} else {
			// Send simple test email
			const success = await EmailService.sendTestEmail(recipient);

			if (success) {
				logger.info(
					{ recipient: recipient || 'configured' },
					'Simple test email sent successfully'
				);
				return json({
					success: true,
					message: 'Test-E-Mail wurde erfolgreich gesendet'
				});
			} else {
				return json(
					{
						success: false,
						error: 'E-Mail konnte nicht gesendet werden. Bitte prüfen Sie die Konfiguration.'
					},
					{ status: 500 }
				);
			}
		}
	} catch (error) {
		logger.error({ error }, 'Error sending test email');
		return json(
			{
				success: false,
				error: 'Interner Fehler beim Senden der Test-E-Mail'
			},
			{ status: 500 }
		);
	}
};
