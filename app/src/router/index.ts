import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsPage from '@/views/TabsPage.vue';
import { useAuth } from '@/composables/useAuth';

// YA IMPLEMENTADO — rutas.
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/equipos' },
  {
    path: '/login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { soloInvitados: true }
  },
  {
    path: '/tabs/',
    component: TabsPage,
    meta: { requiereSesion: true },
    children: [
      { path: '', redirect: '/tabs/equipos' },
      { path: 'equipos', component: () => import('@/views/EquiposPage.vue') },
      { path: 'equipos/nuevo', component: () => import('@/views/EquipoFormPage.vue') },
      { path: 'equipos/:id/editar', component: () => import('@/views/EquipoFormPage.vue'), props: true },
      { path: 'perfil', component: () => import('@/views/PerfilPage.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  const { cargarToken, estaAutenticado } = useAuth();

  await cargarToken();

  const requiereSesion = to.matched.some(
    ruta => ruta.meta.requiereSesion
  );

  if (requiereSesion && !estaAutenticado.value) {
    return '/login';
  }

  if (to.meta.soloInvitados && estaAutenticado.value) {
    return '/tabs/equipos';
  }

  return true;
});

export default router;