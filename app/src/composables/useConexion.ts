import { ref, onMounted, onUnmounted } from 'vue';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useConexion() {
  const conectado = ref(true);
  const tipo = ref('unknown');

  let oyente: PluginListenerHandle | undefined;
  let destruido = false;

  onMounted(async () => {
    try {
      const estado = await Network.getStatus();

      if (destruido) {
        return;
      }

      conectado.value = estado.connected;
      tipo.value = estado.connectionType;

      oyente = await Network.addListener(
        'networkStatusChange',
        estado => {
          conectado.value = estado.connected;
          tipo.value = estado.connectionType;
        }
      );

      if (destruido) {
        await oyente.remove();
      }

    } catch (error) {
      console.error('Error al consultar la conexión:', error);
    }
  });

  onUnmounted(async () => {
    destruido = true;

    if (oyente) {
      await oyente.remove();
    }
  });

  return { conectado, tipo };
}

export async function vibrar() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({
        style: ImpactStyle.Light
      });
    } catch (error) {
      console.error('No se pudo realizar la vibración:', error);
    }
  }
}