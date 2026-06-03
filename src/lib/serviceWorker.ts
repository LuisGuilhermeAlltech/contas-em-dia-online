const withTrailingSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

export const registerServiceWorker = async (): Promise<void> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  const basePath = withTrailingSlash(import.meta.env.BASE_URL || '/');
  const serviceWorkerUrl = `${basePath}sw.js`;

  try {
    await navigator.serviceWorker.register(serviceWorkerUrl, { scope: basePath });
  } catch (error) {
    console.warn('Falha ao registrar service worker:', error);
  }
};
