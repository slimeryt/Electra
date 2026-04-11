import './styles/globals.css';

async function boot() {
  const [{ hydrateAuthFromDisk }, native] = await Promise.all([
    import('./lib/electronAuthPersist'),
    import('./lib/nativePreferences'),
  ]);
  await hydrateAuthFromDisk();
  await native.hydrateNativeSession();
  await native.hydrateNativeTheme();

  const React = await import('react');
  const ReactDOM = await import('react-dom/client');
  const { default: App } = await import('./App');

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();
