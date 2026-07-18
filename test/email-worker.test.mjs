import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { DONATE_FORWARD_TO } from '../worker/index.js';

// Builds a fake ForwardableEmailMessage that records forward()/setReject() calls.
function mockMessage({ failFor = [], subject = 'LAHS PAB BTS Donation: Test' } = {}) {
  const forwarded = [];
  let rejectedWith = null;
  return {
    from: 'noreply@jotform.com',
    to: 'donate@lahsperformingartsboosters.org',
    rawSize: 2048,
    headers: new Map([
      ['subject', subject],
      ['message-id', '<test@jotform>'],
    ]),
    forwarded,
    get rejectedWith() {
      return rejectedWith;
    },
    async forward(addr) {
      if (failFor.includes(addr)) throw new Error(`unverified: ${addr}`);
      forwarded.push(addr);
    },
    setReject(reason) {
      rejectedWith = reason;
    },
  };
}

// Runs worker.email() while capturing console.log lines it emits.
async function emailWithLogs(msg) {
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(line);
  try {
    await worker.email(msg);
  } finally {
    console.log = original;
  }
  return lines;
}

test('email handler forwards donate@ to every recipient', async () => {
  const msg = mockMessage();
  await worker.email(msg);
  assert.deepEqual([...msg.forwarded].sort(), [...DONATE_FORWARD_TO].sort());
  assert.equal(msg.rejectedWith, null, 'must not reject when forwards succeed');
});

test('recipient list is non-empty and every entry looks like an email', () => {
  assert.ok(DONATE_FORWARD_TO.length > 0, 'recipient list must not be empty');
  for (const a of DONATE_FORWARD_TO) {
    assert.match(a, /^[^@\s]+@[^@\s]+\.[^@\s]+$/, `not an email: ${a}`);
  }
});

test('one failing recipient does not block the others', async () => {
  const msg = mockMessage({ failFor: [DONATE_FORWARD_TO[0]] });
  await worker.email(msg);
  const expected = DONATE_FORWARD_TO.slice(1).sort();
  assert.deepEqual([...msg.forwarded].sort(), expected);
  assert.equal(msg.rejectedWith, null, 'partial success must not reject');
});

test('message is rejected only when all recipients fail', async () => {
  const msg = mockMessage({ failFor: [...DONATE_FORWARD_TO] });
  await worker.email(msg);
  assert.equal(msg.forwarded.length, 0);
  assert.match(msg.rejectedWith ?? '', /could not be delivered/);
});

test('logs one structured, queryable delivery record per message', async () => {
  const lines = await emailWithLogs(mockMessage());
  const rec = JSON.parse(lines.at(-1));
  assert.equal(rec.event, 'donate_email', 'stable event key for querying');
  assert.equal(rec.from, 'noreply@jotform.com');
  assert.equal(rec.to, 'donate@lahsperformingartsboosters.org');
  assert.equal(rec.subject, 'LAHS PAB BTS Donation: Test');
  assert.equal(rec.delivery.length, DONATE_FORWARD_TO.length);
  assert.ok(rec.delivery.every((d) => d.forwarded && d.error === null));
  assert.equal(rec.allFailed, false);
});

test('log records per-recipient failure detail', async () => {
  const failed = DONATE_FORWARD_TO[0];
  const lines = await emailWithLogs(mockMessage({ failFor: [failed] }));
  const rec = JSON.parse(lines.at(-1));
  const bad = rec.delivery.find((d) => d.to === failed);
  assert.equal(bad.forwarded, false);
  assert.match(bad.error, /unverified/);
  assert.equal(rec.allFailed, false, 'partial failure is not allFailed');
});
