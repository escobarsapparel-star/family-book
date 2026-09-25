// GitHub-hosted bundles; no Capgo account or subscription required.
export function validateManifest(m, runtime, currentVersion) {
  if (!m || m.schema !== 1 || m.appId !== 'com.familybook.app' || m.runtime !== runtime) return false;
  if (!/^web-[0-9a-f]{40}$/.test(m.version) || m.version === currentVersion) return false;
  if (!/^[0-9a-f]{64}$/.test(m.checksum)) return false;
  const expected = `https://github.com/escobarsapparel-star/family-book/releases/download/android-web-${runtime}/${m.version}.zip`;
  return m.url === expected;
}

export async function checkForUpdate({ updater, http, runtime, bundledVersion, onStatus = () => {} }) {
  const current = await updater.current();
  const version = current.bundle.id === 'builtin' ? bundledVersion : current.bundle.version;
  const url = `https://github.com/escobarsapparel-star/family-book/releases/download/android-web-${runtime}/latest.json?t=${Date.now()}`;
  const response = await http.get({ url, responseType: 'json', connectTimeout: 10000, readTimeout: 15000 });
  if (response.status !== 200) return 'unavailable';

  const manifest = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  if (!validateManifest(manifest, runtime, version)) return 'unchanged';

  const { bundles } = await updater.list();
  // Failed bundles remain recorded so a rollback does not create a download loop.
  if (bundles.some(b => b.version === manifest.version && b.status === 'error')) return 'rejected';

  const pending = await updater.getNextBundle();
  if (pending?.version === manifest.version) return 'pending';

  const cached = bundles.find(b => b.version === manifest.version && ['success', 'pending'].includes(b.status));
  let bundle = cached;
  if (!bundle) {
    onStatus('downloading', { version: manifest.version });
    bundle = await updater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum
    });
    onStatus('downloaded', { version: manifest.version });
  }

  // Never reload an active form, camera session or upload.
  await updater.setMultiDelay({ delayConditions: [{ kind: 'kill' }] });
  await updater.next({ id: bundle.id });
  return 'staged';
}

export function startUpdates({ Capacitor, updater, App, http, runtime, bundledVersion }) {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('CapacitorUpdater')) return null;

  let lastCheck = 0;
  let activeCheck = null;

  const emit = (status, extra = {}) => {
    window.dispatchEvent(new CustomEvent('familybook:update-status', {
      detail: { status, ...extra, checkedAt: Date.now() }
    }));
  };

  const check = ({ force = false } = {}) => {
    if (activeCheck) return activeCheck;
    if (!force && Date.now() - lastCheck < 5 * 60 * 1000) return Promise.resolve('throttled');

    lastCheck = Date.now();
    activeCheck = (async () => {
      emit('checking');
      try {
        const status = await checkForUpdate({
          updater,
          http,
          runtime,
          bundledVersion,
          onStatus: (status, detail) => emit(status, detail)
        });
        emit(status);
        return status;
      } catch (error) {
        // Offline/failed download: keep using the current working bundle.
        console.warn('Family Book update check:', error?.message || error);
        emit('error', { message: error?.message || 'Update check failed.' });
        return 'error';
      } finally {
        activeCheck = null;
      }
    })();
    return activeCheck;
  };

  const getInfo = async () => {
    const [appInfo, current, pending] = await Promise.all([
      App.getInfo().catch(() => ({ name: 'Family Book', version: '', build: '' })),
      updater.current(),
      updater.getNextBundle().catch(() => null)
    ]);
    const currentVersion = current?.bundle?.id === 'builtin'
      ? bundledVersion
      : (current?.bundle?.version || bundledVersion);
    return {
      appVersion: appInfo?.version || '',
      buildNumber: appInfo?.build || '',
      interfaceVersion: currentVersion || '',
      pendingVersion: pending?.version || '',
      runtime
    };
  };

  // A rendered login/home screen plus core APIs is the health check. Do not depend
  // on a successful network login; offline launches must remain possible.
  let fatal = false;
  window.addEventListener('error', event => {
    if (event.filename && /\/(app|auth|family-data)\.js(?:\?|$)/.test(event.filename)) fatal = true;
  });
  const started = Date.now();
  const timer = setInterval(async () => {
    const ready = document.querySelector('#app')?.children.length && window.FB_AUTH &&
      window.FB_FAMILY_DATA && typeof window.go === 'function';
    if (Date.now() - started > 50000 || fatal) { clearInterval(timer); return; }
    if (!ready || Date.now() - started < 1500) return;
    clearInterval(timer);
    try {
      // If a bundle was already downloaded/staged during the previous session,
      // activate it now. Android can keep the process alive after the user
      // "closes" the app, so relying only on a native kill event can leave the
      // UI stuck on "update already downloaded" indefinitely.
      const pending = await updater.getNextBundle().catch(() => null);
      if (pending?.id) {
        emit('applying', { version: pending.version || '' });
        await updater.reload();
        return;
      }

      await updater.notifyAppReady();
      await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void check(); });
      window.addEventListener('online', () => { lastCheck = 0; void check(); });
      void check();
    } catch (error) { console.warn('Family Book updater startup:', error); }
  }, 250);

  return {
    checkNow: () => check({ force: true }),
    getInfo
  };
}
