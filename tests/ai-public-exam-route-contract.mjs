import assert from 'node:assert/strict';
import { __test } from '../worker/src/entry-hardened.mjs';

assert.equal(__test.requiresAccessToken('/v1/exam'), false, 'Rise exam delivery must not require a frontend bearer token');
assert.equal(__test.requiresAccessToken('/v1/reading'), true, 'English reading route remains protected');
assert.equal(__test.requiresAccessToken('/v1/verify'), true, 'Verifier route remains protected');
assert.equal(__test.requiresAccessToken('/v1/status'), true, 'Status route remains protected');

console.log('Rise public exam auth contract OK: /v1/exam is tokenless for the allowed Rise origin; protected routes still require server access auth.');
