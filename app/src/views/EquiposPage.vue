<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Equipos</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/equipos/nuevo" aria-label="Nuevo equipo">
            <ion-icon slot="icon-only" :icon="add" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar>
        <ion-searchbar
          v-model="q"
          :debounce="400"
          placeholder="Buscar por código o nombre"
          @ion-input="buscar"
        />
      </ion-toolbar>

      <!-- YA IMPLEMENTADO: depende de useConexion() [M7] -->
      <ion-toolbar v-if="!conectado" color="warning">
        <ion-title size="small">
          Sin conexión: los datos pueden estar desactualizados
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <ion-refresher slot="fixed" @ion-refresh="refrescar">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list v-if="cargando && equipos.length === 0">
        <ion-item v-for="n in 6" :key="n">
          <ion-label>
            <ion-skeleton-text animated style="width: 80%" />
            <ion-skeleton-text animated style="width: 50%" />
          </ion-label>
        </ion-item>
      </ion-list>

      <div v-else-if="error" class="estado-vacio">
        <ion-icon :icon="cloudOfflineOutline" />
        <p>{{ error }}</p>

        <ion-button @click="cargar(true)">
          Reintentar
        </ion-button>
      </div>

      <div v-else-if="equipos.length === 0" class="estado-vacio">
        <ion-icon :icon="searchOutline" />
        <p>No se encontraron equipos.</p>
      </div>

      <ion-list v-else>
        <ion-item-sliding
          v-for="equipo in equipos"
          :key="equipo.id"
        >
          <ion-item
            :router-link="`/tabs/equipos/${equipo.id}/editar`"
          >
            <ion-label>
              <h2>{{ equipo.nombre }}</h2>
              <p>{{ equipo.codigo }} · {{ equipo.categoria.nombre }}</p>
            </ion-label>

            <ion-badge
              slot="end"
              :color="colorEstado[equipo.estado]"
            >
              {{ equipo.estado }}
            </ion-badge>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option
              color="danger"
              @click="confirmarEliminacion(equipo, $event)"
            >
              <ion-icon slot="start" :icon="trashOutline" />
              Eliminar
            </ion-item-option>
          </ion-item-options>

        </ion-item-sliding>
      </ion-list>

      <ion-infinite-scroll
        :disabled="!hayMas || !!error"
        @ion-infinite="cargarMas"
      >
        <ion-infinite-scroll-content
          loading-text="Cargando equipos..."
        />
      </ion-infinite-scroll>

      <!-- TODO [M6]: eliminación mediante ion-item-sliding -->

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonButton, IonIcon, IonSearchbar, IonContent,
  IonRefresher, IonRefresherContent, IonList, IonItem,
  IonLabel, IonSkeletonText, IonBadge,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonInfiniteScroll, IonInfiniteScrollContent,
  alertController, onIonViewWillEnter,
} from '@ionic/vue';

import type {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent
} from '@ionic/vue';

import {
  add, cloudOfflineOutline, searchOutline, trashOutline
} from 'ionicons/icons';

import {
  eliminar, listar, type Equipo, type Estado
} from '@/services/equipos';

import { ErrorApi } from '@/services/errores';
import { mostrarToast } from '@/services/avisos';
import { useConexion, vibrar } from '@/composables/useConexion';

const colorEstado: Record<Estado, string> = {
  disponible: 'success',
  prestado: 'warning',
  mantenimiento: 'medium'
};

const { conectado } = useConexion();

const equipos = ref<Equipo[]>([]);
const pagina = ref(0);
const ultimaPagina = ref(1);
const q = ref('');
const cargando = ref(false);
const error = ref('');

const hayMas = computed(
  () => pagina.value < ultimaPagina.value
);

let solicitudActual = 0;

// M4: Cargar equipos y manejar la paginación.
async function cargar(reiniciar = false) {
  if (!reiniciar && (cargando.value || !hayMas.value)) {
    return;
  }

  const solicitud = ++solicitudActual;

  cargando.value = true;
  error.value = '';

  const paginaSolicitada = reiniciar
    ? 1
    : pagina.value + 1;

  if (reiniciar) {
    equipos.value = [];
    pagina.value = 0;
    ultimaPagina.value = 1;
  }

  try {
    const respuesta = await listar(
      paginaSolicitada,
      q.value.trim()
    );

    if (solicitud !== solicitudActual) {
      return;
    }

    if (reiniciar) {
      equipos.value = respuesta.data;
    } else {
      equipos.value.push(...respuesta.data);
    }

    pagina.value = respuesta.meta.current_page;
    ultimaPagina.value = respuesta.meta.last_page;

  } catch (e) {
    if (solicitud !== solicitudActual) {
      return;
    }

    if (e instanceof ErrorApi) {
      if (e.status !== 401) {
        error.value = e.message;
      }
    } else {
      error.value = 'No se pudieron cargar los equipos.';
    }

  } finally {
    if (solicitud === solicitudActual) {
      cargando.value = false;
    }
  }
}

// Recargar cada vez que se ingresa a la pantalla.
onIonViewWillEnter(() => {
  cargar(true);
});

// Buscar equipos desde la primera página.
const buscar = () => cargar(true);

// Actualizar deslizando hacia abajo.
async function refrescar(evento: RefresherCustomEvent) {
  try {
    await cargar(true);
  } finally {
    await evento.target.complete();
  }
}

// Cargar la siguiente página.
async function cargarMas(evento: InfiniteScrollCustomEvent) {
  try {
    await cargar(false);
  } finally {
    await evento.target.complete();
  }
}

async function confirmarEliminacion(
  equipo: Equipo,
  evento: Event
) {
  const elemento = evento.currentTarget as HTMLElement | null;
  const sliding = elemento?.closest('ion-item-sliding');

  if (sliding) {
    await sliding.close();
  }

  const alerta = await alertController.create({
    header: 'Eliminar equipo',
    message: `¿Desea eliminar ${equipo.nombre}?`,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Eliminar',
        role: 'destructive'
      }
    ]
  });

  await alerta.present();

  const { role } = await alerta.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  try {
    await eliminar(equipo.id);

    equipos.value = equipos.value.filter(
      e => e.id !== equipo.id
    );

    await vibrar();
    await mostrarToast('Equipo eliminado.', 'success');

  } catch (error) {
    if (error instanceof ErrorApi) {

      if (error.status === 409) {
        await mostrarToast(error.message, 'warning');

      } else if (error.status === 404) {
        equipos.value = equipos.value.filter(
          e => e.id !== equipo.id
        );

        await mostrarToast(
          'El equipo ya no existe.',
          'warning'
        );

      } else if (error.status !== 401) {
        await mostrarToast(
          'No se pudo eliminar el equipo.',
          'danger'
        );
      }

    } else {
      await mostrarToast(
        'Ocurrió un error al eliminar el equipo.',
        'danger'
      );
    }
  }
}
</script>