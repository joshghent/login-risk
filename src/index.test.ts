import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreLogin } from './index.ts';

// Geolocated by the bundled database: two in Newmarket, UK, one in Seattle.
const UK = '81.2.69.142';
const UK_OTHER = '81.2.69.160';
const SEATTLE = '5.62.56.1';
const DOCS_RANGE = '203.0.113.7'; // RFC 5737, no location

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const now = new Date();

test('a first login scores 0', () => {
  assert.deepEqual(scoreLogin({ ip: UK, at: now }, []), {
    score: 0,
    codes: [],
    country: 'GB'
  });
});

test('the same IP again scores 0', () => {
  const result = scoreLogin({ ip: UK, at: now }, [{ ip: UK, at: hoursAgo(24) }]);
  assert.equal(result.score, 0);
});

test('a new IP in a known country flags only the IP', () => {
  const result = scoreLogin({ ip: UK_OTHER, at: now }, [{ ip: UK, at: hoursAgo(2) }]);
  assert.deepEqual(result.codes, ['ip_address_not_used_before']);
  assert.equal(result.score, 2);
});

test('a new country a week later is new, not impossible', () => {
  const result = scoreLogin({ ip: SEATTLE, at: now }, [{ ip: UK, at: hoursAgo(24 * 7) }]);
  assert.deepEqual(result.codes, ['ip_address_not_used_before', 'new_login_location']);
});

test('UK to Seattle in two hours is impossible travel', () => {
  const result = scoreLogin({ ip: SEATTLE, at: now }, [{ ip: UK, at: hoursAgo(2) }]);
  assert.deepEqual(result.codes, [
    'ip_address_not_used_before',
    'new_login_location',
    'impossible_travel_detected'
  ]);
  assert.equal(result.score, 7);
});

test('compares travel against the most recent login, not the first', () => {
  const result = scoreLogin({ ip: SEATTLE, at: now }, [
    { ip: SEATTLE, at: hoursAgo(1) },
    { ip: UK, at: hoursAgo(30) }
  ]);
  assert.equal(result.score, 0);
});

test('an IP with no location only counts as new', () => {
  const result = scoreLogin({ ip: DOCS_RANGE, at: now }, [{ ip: UK, at: hoursAgo(1) }]);
  assert.deepEqual(result.codes, ['ip_address_not_used_before']);
  assert.equal(result.country, undefined);
});
