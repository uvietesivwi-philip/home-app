import { APP_CONFIG } from './config.js';

let analytics;
let perf;

async function loadFirebaseSdk() {
  if (APP_CONFIG.USE_MOCK_DATA) return;
  const cfg = APP_CONFIG.FIREBASE;
  const hasCoreConfig = cfg.apiKey && cfg.projectId && cfg.appId;
  if (!hasCoreConfig) {
    console.warn('Firebase observability disabled: missing Firebase config values.');
    return;
  }

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
  const app = initializeApp(cfg);

  if (APP_CONFIG.OBSERVABILITY.ENABLE_ANALYTICS && cfg.measurementId) {
    const { isSupported, getAnalytics } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js');
    if (await isSupported()) analytics = getAnalytics(app);
  }

  if (APP_CONFIG.OBSERVABILITY.ENABLE_PERFORMANCE) {
    const { getPerformance } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-performance.js');
    perf = getPerformance(app);
  }
}

export async function initObservability() {
  await loadFirebaseSdk();

  if (!APP_CONFIG.OBSERVABILITY.ENABLE_CRASH_CAPTURE) return;

  window.addEventListener('error', (event) => {
    trackEvent('app_exception', {
      source: 'window.onerror',
      message: event.message || 'unknown_error'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackEvent('app_exception', {
      source: 'unhandledrejection',
      message: String(event.reason || 'unknown_rejection')
    });
  });
}

export function trackEvent(name, params = {}) {
  if (!analytics) return;
  import('https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js').then(({ logEvent }) => {
    logEvent(analytics, name, params);
  });
}

export async function withTrace(traceName, fn) {
  if (!perf) return fn();
  const { trace } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-performance.js');
  const metric = trace(perf, traceName);
  metric.start();
  try {
    return await fn();
  } finally {
    metric.stop();
  }
}
