import { createRouter, createWebHistory } from 'vue-router'
import { refreshSession } from '../services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/services' },
    {
      path: '/services',
      name: 'services',
      component: () => import('../views/ServicesView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      meta: { requiresAuth: true, role: 'admin' },
      component: () => import('../views/AdminView.vue'),
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('../views/ForbiddenView.vue'),
    },
    // Load the workshop booking page when this URL is selected.
    {
      path: '/workshops/basic-repair',
      name: 'basic-repair',
      component: () => import('../views/WorkshopView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const user = refreshSession()
  if (to.meta.requiresAuth && !user) {
    return { name: 'login', query: { redirect: to.path } }
  }
  if (to.meta.role && user?.role !== to.meta.role) {
    return { name: 'forbidden' }
  }
})

export default router
