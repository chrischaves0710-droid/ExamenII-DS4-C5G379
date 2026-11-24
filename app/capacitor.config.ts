import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cr.ac.ucr.if0009.c5g379',
  appName: 'Préstamos Lascarez',
  webDir: 'dist',
  android: {
    // Permite la comunicación con la API local del examen.
    allowMixedContent: true,
  },
};

export default config;