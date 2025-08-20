import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
	base64URLEncode,
	getPKCEVerifier,
	sha256,
	getPKCEChallengeData,
	encrypt,
	decrypt
} from './crypto';

describe('crypto utilities', () => {
	describe('base64URLEncode', () => {
		it('should encode a buffer to base64url format', () => {
			const input = Buffer.from('hello world');
			const result = base64URLEncode(input);
			
			expect(result).toBe('aGVsbG8gd29ybGQ');
			expect(result).not.toContain('+');
			expect(result).not.toContain('/');
			expect(result).not.toContain('=');
		});

		it('should handle empty buffer', () => {
			const input = Buffer.from('');
			const result = base64URLEncode(input);
			
			expect(result).toBe('');
		});

		it('should replace URL-unsafe characters', () => {
			// Create a buffer that would contain + and / in base64
			const input = Buffer.from('?>');
			const result = base64URLEncode(input);
			
			expect(result).not.toContain('+');
			expect(result).not.toContain('/');
		});

		it('should remove padding characters', () => {
			const input = Buffer.from('sure.');
			const result = base64URLEncode(input);
			
			expect(result).not.toContain('=');
		});
	});

	describe('getPKCEVerifier', () => {
		it('should generate a random base64url string', () => {
			const verifier = getPKCEVerifier();
			
			expect(typeof verifier).toBe('string');
			expect(verifier.length).toBeGreaterThan(0);
			expect(verifier).not.toContain('+');
			expect(verifier).not.toContain('/');
			expect(verifier).not.toContain('=');
		});

		it('should generate different verifiers on each call', () => {
			const verifier1 = getPKCEVerifier();
			const verifier2 = getPKCEVerifier();
			
			expect(verifier1).not.toBe(verifier2);
		});

		it('should generate verifiers of consistent length', () => {
			const verifier1 = getPKCEVerifier();
			const verifier2 = getPKCEVerifier();
			
			expect(verifier1.length).toBe(verifier2.length);
		});

		it('should generate verifiers based on 32 random bytes', () => {
			const verifier = getPKCEVerifier();
			// Base64url encoding of 32 bytes should be 43 characters (no padding)
			expect(verifier.length).toBe(43);
		});
	});

	describe('sha256', () => {
		it('should generate a SHA-256 hash', () => {
			const input = 'hello world';
			const result = sha256(input);
			
			expect(Buffer.isBuffer(result)).toBe(true);
			expect(result.length).toBe(32); // SHA-256 produces 32-byte hash
		});

		it('should produce consistent hashes for same input', () => {
			const input = 'test string';
			const hash1 = sha256(input);
			const hash2 = sha256(input);
			
			expect(hash1.equals(hash2)).toBe(true);
		});

		it('should produce different hashes for different inputs', () => {
			const hash1 = sha256('input1');
			const hash2 = sha256('input2');
			
			expect(hash1.equals(hash2)).toBe(false);
		});

		it('should produce known hash for known input', () => {
			const input = 'hello';
			const result = sha256(input);
			const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
			
			expect(result.toString('hex')).toBe(expected);
		});

		it('should handle empty string', () => {
			const result = sha256('');
			
			expect(Buffer.isBuffer(result)).toBe(true);
			expect(result.length).toBe(32);
		});
	});

	describe('getPKCEChallengeData', () => {
		it('should return both verifier and challenge', () => {
			const result = getPKCEChallengeData();
			
			expect(result).toHaveProperty('verifier');
			expect(result).toHaveProperty('challenge');
			expect(typeof result.verifier).toBe('string');
			expect(typeof result.challenge).toBe('string');
		});

		it('should generate different data on each call', () => {
			const data1 = getPKCEChallengeData();
			const data2 = getPKCEChallengeData();
			
			expect(data1.verifier).not.toBe(data2.verifier);
			expect(data1.challenge).not.toBe(data2.challenge);
		});

		it('should generate challenge from verifier hash', () => {
			const { verifier, challenge } = getPKCEChallengeData();
			
			// Manually compute expected challenge
			const hash = sha256(verifier);
			const expectedChallenge = base64URLEncode(hash);
			
			expect(challenge).toBe(expectedChallenge);
		});

		it('should generate valid PKCE data format', () => {
			const { verifier, challenge } = getPKCEChallengeData();
			
			// Both should be base64url strings
			expect(verifier).not.toContain('+');
			expect(verifier).not.toContain('/');
			expect(verifier).not.toContain('=');
			expect(challenge).not.toContain('+');
			expect(challenge).not.toContain('/');
			expect(challenge).not.toContain('=');
		});
	});

	describe('encrypt and decrypt', () => {
		const testKey = crypto.randomBytes(32);
		
		it('should encrypt and decrypt text successfully', () => {
			const plaintext = 'sensitive data';
			const encrypted = encrypt(plaintext, testKey);
			const decrypted = decrypt(encrypted.encryptedData, testKey, encrypted.iv, encrypted.tag);
			
			expect(decrypted).toBe(plaintext);
		});

		it('should return encryption components as buffers', () => {
			const plaintext = 'test data';
			const result = encrypt(plaintext, testKey);
			
			expect(Buffer.isBuffer(result.iv)).toBe(true);
			expect(Buffer.isBuffer(result.encryptedData)).toBe(true);
			expect(Buffer.isBuffer(result.tag)).toBe(true);
		});

		it('should generate different IVs for each encryption', () => {
			const plaintext = 'same data';
			const encrypted1 = encrypt(plaintext, testKey);
			const encrypted2 = encrypt(plaintext, testKey);
			
			expect(encrypted1.iv.equals(encrypted2.iv)).toBe(false);
			expect(encrypted1.encryptedData.equals(encrypted2.encryptedData)).toBe(false);
		});

		it('should generate 16-byte IV', () => {
			const encrypted = encrypt('test', testKey);
			expect(encrypted.iv.length).toBe(16);
		});

		it('should generate 16-byte authentication tag', () => {
			const encrypted = encrypt('test', testKey);
			expect(encrypted.tag.length).toBe(16);
		});

		it('should fail decryption with wrong key', () => {
			const plaintext = 'secret message';
			const wrongKey = crypto.randomBytes(32);
			const encrypted = encrypt(plaintext, testKey);
			
			expect(() => {
				decrypt(encrypted.encryptedData, wrongKey, encrypted.iv, encrypted.tag);
			}).toThrow();
		});

		it('should fail decryption with wrong IV', () => {
			const plaintext = 'secret message';
			const wrongIV = crypto.randomBytes(16);
			const encrypted = encrypt(plaintext, testKey);
			
			expect(() => {
				decrypt(encrypted.encryptedData, testKey, wrongIV, encrypted.tag);
			}).toThrow();
		});

		it('should fail decryption with wrong tag', () => {
			const plaintext = 'secret message';
			const wrongTag = crypto.randomBytes(16);
			const encrypted = encrypt(plaintext, testKey);
			
			expect(() => {
				decrypt(encrypted.encryptedData, testKey, encrypted.iv, wrongTag);
			}).toThrow();
		});

		it('should handle empty string encryption', () => {
			const plaintext = '';
			const encrypted = encrypt(plaintext, testKey);
			const decrypted = decrypt(encrypted.encryptedData, testKey, encrypted.iv, encrypted.tag);
			
			expect(decrypted).toBe('');
		});

		it('should handle long text encryption', () => {
			const plaintext = 'This is a very long text that should be encrypted and decrypted successfully even though it contains many characters and spans multiple lines and paragraphs.';
			const encrypted = encrypt(plaintext, testKey);
			const decrypted = decrypt(encrypted.encryptedData, testKey, encrypted.iv, encrypted.tag);
			
			expect(decrypted).toBe(plaintext);
		});

		it('should handle special characters and unicode', () => {
			const plaintext = 'Special chars: äöü ñ € 🚀 ∑ ∆';
			const encrypted = encrypt(plaintext, testKey);
			const decrypted = decrypt(encrypted.encryptedData, testKey, encrypted.iv, encrypted.tag);
			
			expect(decrypted).toBe(plaintext);
		});

		it('should provide authenticated encryption (tamper detection)', () => {
			const plaintext = 'important data';
			const encrypted = encrypt(plaintext, testKey);
			
			// Tamper with encrypted data
			const tamperedData = Buffer.from(encrypted.encryptedData);
			const firstByte = tamperedData[0];
			if (firstByte !== undefined) {
				tamperedData[0] = firstByte ^ 0xFF; // Flip all bits in first byte
			}
			
			expect(() => {
				decrypt(tamperedData, testKey, encrypted.iv, encrypted.tag);
			}).toThrow();
		});
	});

	describe('integration tests', () => {
		it('should work in a complete PKCE flow simulation', () => {
			const { verifier, challenge } = getPKCEChallengeData();
			
			// Simulate sending challenge to auth server
			expect(challenge).toBeTruthy();
			
			// Simulate server verification
			const serverHash = sha256(verifier);
			const serverChallenge = base64URLEncode(serverHash);
			
			expect(serverChallenge).toBe(challenge);
		});

		it('should work in a complete encryption flow simulation', () => {
			const key = crypto.randomBytes(32);
			const sensitiveData = 'oauth_verifier_12345';
			
			// Encrypt for storage
			const encrypted = encrypt(sensitiveData, key);
			const cookieValue = `${encrypted.iv.toString('hex')}:${encrypted.encryptedData.toString('hex')}:${encrypted.tag.toString('hex')}`;
			
			// Simulate cookie retrieval and parsing
			const parts = cookieValue.split(':');
			expect(parts.length).toBe(3);
			
			const [ivHex, encryptedDataHex, tagHex] = parts;
			const iv = Buffer.from(ivHex!, 'hex');
			const encryptedData = Buffer.from(encryptedDataHex!, 'hex');
			const tag = Buffer.from(tagHex!, 'hex');
			
			// Decrypt retrieved data
			const decrypted = decrypt(encryptedData, key, iv, tag);
			
			expect(decrypted).toBe(sensitiveData);
		});
	});
});