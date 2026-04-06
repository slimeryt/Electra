export const isElectron = typeof window !== 'undefined' && typeof (window as any).electraBridge !== 'undefined';
export const bridge = isElectron ? (window as any).electraBridge : null;

export const platform = isElectron ? bridge?.platform : 'web';
