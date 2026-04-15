import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';

const logger = createLogger('audit');

export type AuditAction =
	| 'sighting.approve'
	| 'sighting.reject'
	| 'sighting.edit'
	| 'sighting.delete'
	| 'sighting.verify'
	| 'file.delete'
	| 'config.update'
	| 'config.delete'
	| 'auth.login_success'
	| 'auth.login_failure'
	| 'export.download';

export type ResourceType = 'sighting' | 'file' | 'config' | 'auth' | 'export';

export interface AuditEvent {
	action: AuditAction;
	resourceType: ResourceType;
	resourceId?: string;
	userEmail?: string;
	ipAddress?: string;
	details?: Record<string, unknown>;
	status?: 'success' | 'failure';
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
	try {
		await db.insert(auditLogs).values({
			action: event.action,
			resourceType: event.resourceType,
			resourceId: event.resourceId ?? null,
			userEmail: event.userEmail ?? null,
			ipAddress: event.ipAddress ?? null,
			details: event.details ?? null,
			status: event.status ?? 'success'
		});
	} catch (err) {
		// Audit failures must never block the main operation
		logger.error({ err, event }, 'audit_log_write_failed');
	}
}
