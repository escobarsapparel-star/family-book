import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Android memory upload quality override is guarded before high-resolution processing', async () => {
  const source = await readFile(new URL('../../js/memory-upload-quality.js', import.meta.url), 'utf8');

  assert.equal(source.includes('\\n'), false, 'memory-upload-quality.js must not contain literal \\n sequences');
  const guard = 'if(window.Capacitor?.isNativePlatform?.() || /Android/i.test(navigator.userAgent))return;';
  const guardIndex = source.indexOf(guard);
  const overrideIndex = source.indexOf('window.__fbMemoryUploadQuality=true;');

  assert.ok(guardIndex >= 0, 'Android early-return guard must exist');
  assert.ok(overrideIndex >= 0, 'upload-quality override marker must exist');
  assert.ok(guardIndex < overrideIndex, 'Android guard must run before enabling the high-resolution override');
});
