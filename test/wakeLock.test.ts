import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { wakeLockManager } from '../lib/wakeLock.ts';

describe('Wake lock request flag (INT-4)', () => {
  it('clears the requested flag on release so hidden-tab show does not reacquire while idle', async () => {
    await wakeLockManager.request();
    assert.equal(wakeLockManager.getIsRequested(), true);

    await wakeLockManager.release();
    assert.equal(wakeLockManager.getIsRequested(), false);
    assert.equal(wakeLockManager.getIsActive(), false);
  });

  it('requestForPlayback in eco mode releases instead of holding the lock', async () => {
    await wakeLockManager.request();
    assert.equal(wakeLockManager.getIsRequested(), true);

    const held = await wakeLockManager.requestForPlayback(true);
    assert.equal(held, false);
    assert.equal(wakeLockManager.getIsRequested(), false);
  });
});
