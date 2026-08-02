import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
	DEV_IDENTITY_PATH,
	assertServerIdentity,
	createNodeIdentityFetch,
	describePortOwner,
	devServerIdentity,
	devTrustAnchors,
	worktreeDevPort
} from './dev-server-identity';

/**
 * Stellt ein selbstsigniertes Zertifikat aus, dem kein lokaler Anker traut.
 * Gibt `null` zurück, wenn kein `openssl` verfügbar ist — dann entfällt die Gegenprobe,
 * statt sie vorzutäuschen.
 */
function selfSignedCert(): { cert: Buffer; key: Buffer } | null {
	const dir = mkdtempSync(path.join(tmpdir(), 'dsi-cert-'));
	const certFile = path.join(dir, 'cert.pem');
	const keyFile = path.join(dir, 'key.pem');
	const result = spawnSync(
		'openssl',
		// prettier-ignore
		['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
		 '-subj', '/CN=localhost', '-keyout', keyFile, '-out', certFile],
		{ encoding: 'utf8' }
	);
	if (result.status !== 0 || !existsSync(certFile)) return null;
	return { cert: readFileSync(certFile), key: readFileSync(keyFile) };
}

const MAIN_REPO = '/Users/dev/Code/ostsee-sichtung';
const WORKTREE_A = '/Users/dev/Code/ostsee-sichtung/.claude/worktrees/hopeful-curie-90f94e';
const WORKTREE_B = '/Users/dev/Code/ostsee-sichtung/.claude/worktrees/auth0-prod-settings-499d2e';

describe('worktreeDevPort', () => {
	it('liefert für dasselbe Verzeichnis immer denselben Port', () => {
		expect(worktreeDevPort(WORKTREE_A)).toBe(worktreeDevPort(WORKTREE_A));
	});

	it('trennt Haupt-Repo und Worktrees', () => {
		// Stichprobe auf realistischen Pfaden, keine Zusicherung: Der Hash bildet auf ein
		// endliches Fenster ab, Kollisionen sind möglich. Was hier abgesichert wird, ist
		// der grobe Fehler — etwa ein Port, der gar nicht vom Pfad abhängt.
		const ports = [MAIN_REPO, WORKTREE_A, WORKTREE_B].map(worktreeDevPort);
		expect(new Set(ports).size).toBe(3);
	});

	it('streut breit genug, dass Kollisionen selten bleiben', () => {
		// Die eigentlich zugesicherte Eigenschaft: gute Streuung, nicht Eindeutigkeit.
		// Bei 200 Pfaden auf 4000 Plätzen sind ~5 Kollisionen zu erwarten; ein Hash, der
		// etwa nur die Pfadlänge auswertete, fiele hier klar durch.
		const ports = Array.from({ length: 200 }, (_, i) => worktreeDevPort(`${WORKTREE_A}-${i}`));
		expect(new Set(ports).size).toBeGreaterThanOrEqual(185);
	});

	it('ignoriert einen abschließenden Schrägstrich', () => {
		expect(worktreeDevPort(`${WORKTREE_A}/`)).toBe(worktreeDevPort(WORKTREE_A));
	});

	it('bleibt im reservierten Bereich und meidet 4000/4001', () => {
		// Auch über viele synthetische Pfade darf nie der Dev-Port getroffen werden.
		for (let i = 0; i < 500; i++) {
			const port = worktreeDevPort(`${WORKTREE_A}-${i}`);
			expect(port).toBeGreaterThanOrEqual(41_000);
			expect(port).toBeLessThanOrEqual(44_999);
		}
	});
});

describe('assertServerIdentity', () => {
	const okResponse = (root: string) => ({ ok: true, json: async () => ({ root }) });

	it('akzeptiert einen Server aus demselben Verzeichnis', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(okResponse(WORKTREE_B));

		await expect(
			assertServerIdentity({ url: 'https://localhost:4123', expectedRoot: WORKTREE_B, fetchImpl })
		).resolves.toBeUndefined();

		expect(fetchImpl).toHaveBeenCalledWith(
			`https://localhost:4123${DEV_IDENTITY_PATH}`,
			expect.anything()
		);
	});

	it('akzeptiert Pfade, die sich nur im abschließenden Schrägstrich unterscheiden', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(okResponse(`${WORKTREE_B}/`));

		await expect(
			assertServerIdentity({ url: 'https://localhost:4123', expectedRoot: WORKTREE_B, fetchImpl })
		).resolves.toBeUndefined();
	});

	it('bricht ab, wenn der Server aus einem fremden Worktree ausliefert', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(okResponse(WORKTREE_A));

		const error = await assertServerIdentity({
			url: 'https://localhost:4001',
			expectedRoot: WORKTREE_B,
			fetchImpl
		}).catch((e: Error) => e);

		expect(error).toBeInstanceOf(Error);
		// Beide Verzeichnisse müssen in der Meldung stehen — sonst ist nicht
		// erkennbar, wessen Code gerade getestet worden wäre.
		expect((error as Error).message).toContain(WORKTREE_A);
		expect((error as Error).message).toContain(WORKTREE_B);
		expect((error as Error).message).toContain('https://localhost:4001');
	});

	it('bricht ab, wenn auf dem Port etwas anderes als der Dev-Server antwortet', async () => {
		const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

		await expect(
			assertServerIdentity({ url: 'https://localhost:4123', expectedRoot: WORKTREE_B, fetchImpl })
		).rejects.toThrow(/identifiziert sich nicht/i);
	});

	it('bricht ab, wenn die Antwort kein Wurzelverzeichnis enthält', async () => {
		const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

		await expect(
			assertServerIdentity({ url: 'https://localhost:4123', expectedRoot: WORKTREE_B, fetchImpl })
		).rejects.toThrow(/identifiziert sich nicht/i);
	});

	it('bricht ab, wenn der Server nicht erreichbar ist', async () => {
		const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

		await expect(
			assertServerIdentity({ url: 'https://localhost:4123', expectedRoot: WORKTREE_B, fetchImpl })
		).rejects.toThrow(/nicht erreichbar/i);
	});
});

describe('describePortOwner', () => {
	it('nennt das ausliefernde Verzeichnis', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ root: WORKTREE_A }) });

		await expect(describePortOwner('https://localhost:4001', fetchImpl)).resolves.toBe(WORKTREE_A);
	});

	it('gibt null zurück, wenn dort kein Dev-Server dieses Projekts läuft', async () => {
		const notOurs = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
		const unreachable = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

		await expect(describePortOwner('https://localhost:4001', notOurs)).resolves.toBeNull();
		await expect(describePortOwner('https://localhost:4001', unreachable)).resolves.toBeNull();
	});
});

/**
 * Diese Tests machen echtes Netz-I/O (TLS-Handshake, Socket-Auf- und Abbau). Unter der
 * Last der vollen Suite reichen die 5 s Default nicht: gemessen fiel der HTTPS-Test in
 * 1 von 3 Gesamtläufen in den Timeout, isoliert nie. Die Arbeit ist echt, nicht hängend —
 * deshalb mehr Zeit statt Test entschärfen.
 */
const IO_TIMEOUT = 20_000;

describe('createNodeIdentityFetch', () => {
	/**
	 * Das einzige Stück mit echtem I/O — deshalb gegen einen echten Server geprüft.
	 * Port 0 lässt den Kernel wählen; die tatsächliche Nummer wird zurückgelesen, statt
	 * eine feste anzunehmen (vgl. die Port-Kollision aus den legacy-inbox-Tests).
	 */
	async function withServer(
		handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
		run: (origin: string) => Promise<void>
	) {
		const server = http.createServer(handler);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const address = server.address() as AddressInfo;
		try {
			await run(`http://127.0.0.1:${address.port}`);
		} finally {
			await new Promise((resolve) => server.close(resolve));
		}
	}

	it(
		'liest JSON über http und meldet ok',
		async () => {
			await withServer(
				(_req, res) => res.end(JSON.stringify({ root: '/irgendwo' })),
				async (origin) => {
					const response = await createNodeIdentityFetch()(`${origin}${DEV_IDENTITY_PATH}`);
					expect(response.ok).toBe(true);
					await expect(response.json()).resolves.toEqual({ root: '/irgendwo' });
				}
			);
		},
		IO_TIMEOUT
	);

	it(
		'meldet ok=false für Status außerhalb 2xx',
		async () => {
			await withServer(
				(_req, res) => {
					res.statusCode = 404;
					res.end('not found');
				},
				async (origin) => {
					const response = await createNodeIdentityFetch()(`${origin}${DEV_IDENTITY_PATH}`);
					expect(response.ok).toBe(false);
				}
			);
		},
		IO_TIMEOUT
	);

	it(
		'lässt json() scheitern, wenn die Antwort kein JSON ist',
		async () => {
			// Genau der Fall „auf dem Port läuft etwas ganz anderes": HTML statt JSON.
			await withServer(
				(_req, res) => res.end('<!doctype html><h1>fremder Dienst</h1>'),
				async (origin) => {
					const response = await createNodeIdentityFetch()(`${origin}${DEV_IDENTITY_PATH}`);
					await expect(response.json()).rejects.toThrow();
				}
			);
		},
		IO_TIMEOUT
	);

	it(
		'bricht bei einem hängenden Server nach dem Timeout ab',
		async () => {
			await withServer(
				() => {
					/* antwortet absichtlich nie */
				},
				async (origin) => {
					await expect(
						createNodeIdentityFetch(150)(`${origin}${DEV_IDENTITY_PATH}`)
					).rejects.toThrow(/Zeitüberschreitung/);
				}
			);
		},
		IO_TIMEOUT
	);

	it(
		'spricht mit einem echten HTTPS-Dev-Zertifikat — mit aktiver Prüfung',
		async () => {
			/**
			 * Bewusst das `basic-ssl`-Zertifikat und nicht das von mkcert: Die mkcert-CA
			 * liegt im System-Store, den Node ab 24 in seinen Default-Store mischt — der
			 * Test liefe dort auch ohne die Anker durch und bewiese nichts. Das
			 * selbstsignierte `basic-ssl`-Zertifikat kennt kein Store; es geht
			 * ausschließlich über `devTrustAnchors()` durch. (Verifiziert per
			 * Mutationsprobe: ohne Anker schlägt dieser Test fehl.)
			 *
			 * Die Datei enthält Schlüssel und Zertifikat in einem PEM. Fehlt sie — etwa in
			 * CI, wo nie ein Dev-Server lief —, entfällt der Test, statt etwas anderes zu
			 * prüfen als draufsteht.
			 */
			const pem = path.join(process.cwd(), 'certs', 'basic-ssl', '_cert.pem');
			if (!existsSync(pem) || devTrustAnchors().length === 0) return;
			const material = readFileSync(pem);

			const server = https.createServer({ cert: material, key: material }, (_req, res) =>
				res.end(JSON.stringify({ root: '/irgendwo' }))
			);
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			const { port } = server.address() as AddressInfo;
			try {
				// Über `localhost`, nicht 127.0.0.1: Der Hostname wird mitgeprüft.
				const response = await createNodeIdentityFetch()(
					`https://localhost:${port}${DEV_IDENTITY_PATH}`
				);
				expect(response.ok).toBe(true);
				await expect(response.json()).resolves.toEqual({ root: '/irgendwo' });
			} finally {
				await new Promise((resolve) => server.close(resolve));
			}
		},
		IO_TIMEOUT
	);

	it(
		'weist ein Zertifikat zurück, dem kein Anker deckt',
		async () => {
			// Gegenprobe zum vorigen Test: Ein fremdes, selbstsigniertes Zertifikat darf
			// nicht durchgehen — sonst wäre die Prüfung faktisch abgeschaltet.
			const material = selfSignedCert();
			if (!material || devTrustAnchors().length === 0) return;

			const server = https.createServer(material, (_req, res) => res.end('{}'));
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			const { port } = server.address() as AddressInfo;
			try {
				await expect(
					createNodeIdentityFetch(2000)(`https://localhost:${port}${DEV_IDENTITY_PATH}`)
				).rejects.toThrow();
			} finally {
				await new Promise((resolve) => server.close(resolve));
			}
		},
		IO_TIMEOUT
	);

	it(
		'meldet einen freien Port als Fehler statt zu hängen',
		async () => {
			// Erst einen Port belegen, dann freigeben — so ist er sicher unbenutzt.
			const probe = http.createServer();
			await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
			const { port } = probe.address() as AddressInfo;
			await new Promise((resolve) => probe.close(resolve));

			await expect(
				createNodeIdentityFetch(1000)(`http://127.0.0.1:${port}${DEV_IDENTITY_PATH}`)
			).rejects.toThrow();
		},
		IO_TIMEOUT
	);
});

describe('devServerIdentity plugin', () => {
	/** Ruft die registrierte Middleware auf und gibt aus, was sie geschrieben hat. */
	async function callMiddleware(url: string) {
		const plugin = devServerIdentity();
		let handler!: (req: unknown, res: unknown, next: () => void) => void;
		const server = {
			middlewares: { use: (fn: typeof handler) => (handler = fn) },
			// Vollständig genug, dass der Test nicht davon abhängt, ob die
			// VITEST-Guard vor dem Zugriff aussteigt.
			config: { server: { port: 4123, https: undefined }, logger: { warn: vi.fn() } }
		};

		// configureServer ist im Vite-Typ eine Objekt-oder-Funktion-Union; der Fake deckt
		// nur die hier benutzten Felder ab, daher der Umweg über `unknown`.
		await (plugin.configureServer as unknown as (s: typeof server) => Promise<void>)(server);

		const res = { setHeader: vi.fn(), end: vi.fn() };
		const next = vi.fn();
		handler({ url }, res, next);
		return { res, next, server };
	}

	it('beantwortet den Identitäts-Pfad mit dem eigenen Wurzelverzeichnis', async () => {
		const { res, next } = await callMiddleware(DEV_IDENTITY_PATH);

		expect(next).not.toHaveBeenCalled();
		expect(res.end).toHaveBeenCalledWith(JSON.stringify({ root: process.cwd() }));
	});

	it('warnt unter Vitest nicht über belegte Ports', async () => {
		// Der Vite-Server von Vitest bindet den Port gar nicht — eine Meldung wäre
		// dort immer ein Fehlalarm.
		const { server } = await callMiddleware(DEV_IDENTITY_PATH);

		expect(server.config.logger.warn).not.toHaveBeenCalled();
	});

	it('reicht alle anderen Anfragen durch', async () => {
		const { res, next } = await callMiddleware('/api/sightings');

		expect(next).toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
	});
});
