const isBrowser = typeof window !== 'undefined';
const isProd = import.meta.env.PROD;

export async function registerServiceWorker() {
  if (!isBrowser || !('serviceWorker' in navigator)) {
    return;
  }

  if (!isProd) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const swUrl = `${baseUrl}sw.js`;

  try {
    await navigator.serviceWorker.register(swUrl, { scope: baseUrl });
  } catch (error) {
    console.error('Falha ao registrar Service Worker:', error);
  }
}
