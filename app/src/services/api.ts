import { ErrorApi } from './errores';
import { obtenerToken, olvidarSesion } from '@/composables/useAuth';
import router from '@/router';

const BASE_URL = import.meta.env.VITE_API_URL;
const TIEMPO_MAXIMO_MS = 10_000;

export interface OpcionesApi {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

export async function api<T = unknown>(
  ruta: string,
  opciones: OpcionesApi = {}
): Promise<T> {

  const url = new URL(BASE_URL.replace(/\/+$/, '') + ruta);

  for (const [clave, valor] of Object.entries(opciones.params ?? {})) {
    if (valor !== undefined && valor !== '') {
      url.searchParams.set(clave, String(valor));
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  const token = obtenerToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (opciones.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controlador = new AbortController();

  const tiempo = setTimeout(() => {
    controlador.abort();
  }, TIEMPO_MAXIMO_MS);

  try {
    const respuesta = await fetch(url.toString(), {
      method: opciones.method ?? 'GET',
      headers,
      body: opciones.body !== undefined
        ? JSON.stringify(opciones.body)
        : undefined,
      signal: controlador.signal
    });

    if (respuesta.status === 204) {
      return null as T;
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      if (respuesta.status === 401 && ruta !== '/login') {
        await olvidarSesion();
        await router.replace('/login');
      }

      throw new ErrorApi(respuesta.status, cuerpo);
    }

    return cuerpo as T;

  } catch (error) {
    if (error instanceof ErrorApi) {
      throw error;
    }

    throw new ErrorApi(0, {
      mensaje: 'No fue posible conectar con la API.'
    });

  } finally {
    clearTimeout(tiempo);
  }
}