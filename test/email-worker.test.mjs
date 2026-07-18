import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { DONATE_FORWARD_TO } from '../worker/index.js';

// Builds a fake ForwardableEmailMessage that records forward()/setReject() calls.
function mockMessage({ failFor = [] } = {}) {
  const forwarded = [];
  let rejectedWith = null;
  return {
    to: 'donate@lahsperformingartsboosters.org',
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
