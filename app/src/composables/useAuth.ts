import { computed, ref } from 'vue';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Device } from '@capacitor/device';
import { api } from '@/services/api';

export interface Usuario {
  id: number;
  nombre: string;
}

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

// Estado compartido por toda la aplicación.
const token = ref<string | null>(null);
const usuario = ref<Usuario | null>(null);
let tokenCargado = false;

export const obtenerToken = () => token.value;

export async function olvidarSesion() {
  token.value = null;
  usuario.value = null;

  await Promise.allSettled([
    SecureStorage.remove(CLAVE_TOKEN),
    SecureStorage.remove(CLAVE_USUARIO)
  ]);
}

export function useAuth() {
  const estaAutenticado = computed(() => token.value !== null);

  async function login(email: string, password: string) {
    const info = await Device.getInfo();

    const device_name = `${info.platform} ${info.model}`.slice(0, 60);

    const respuesta = await api<{
      token: string;
      usuario: Usuario;
    }>('/login', {
      method: 'POST',
      body: {
        email,
        password,
        device_name
      }
    });

    try {
      await SecureStorage.set(CLAVE_TOKEN, respuesta.token);
      await SecureStorage.set(CLAVE_USUARIO, { ...respuesta.usuario });

      token.value = respuesta.token;
      usuario.value = respuesta.usuario;
    } catch (error) {
      await olvidarSesion();
      throw error;
    }
  }

  async function cargarToken() {
    if (tokenCargado) {
      return;
    }

    tokenCargado = true;

    try {
      const tokenGuardado = await SecureStorage.get(CLAVE_TOKEN);
      const usuarioGuardado = await SecureStorage.get(CLAVE_USUARIO);

      if (typeof tokenGuardado === 'string' && usuarioGuardado) {
        token.value = tokenGuardado;
        usuario.value = usuarioGuardado as unknown as Usuario;
      } else {
        await olvidarSesion();
      }
    } catch {
      await olvidarSesion();
    }
  }

  async function cerrarSesion() {
    try {
      await api('/logout', {
        method: 'POST'
      });
    } catch {
      // Aunque falle la API, se elimina la sesión local.
    } finally {
      await olvidarSesion();
    }
  }

  return {
    usuario,
    estaAutenticado,
    login,
    cargarToken,
    cerrarSesion
  };
}