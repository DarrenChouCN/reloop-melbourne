import { createRouter, createWebHistory } from 'vue-router'
import { authReady, refreshSession } from '../services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: 'Home' },
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/reuse-guide',
      name: 'reuse-guide',
      meta: { title: 'Reuse Guide' },
      component: () => import('../views/ReuseGuideView.vue'),
    },
    {
      path: '/services',
      name: 'services',
      meta: { title: 'Repair Services' },
      component: () => import('../views/ServicesView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      meta: { title: 'Your Account' },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      meta: { title: 'Admin Dashboard', requiresAuth: true, role: 'admin' },
      component: () => import('../views/AdminView.vue'),
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      meta: { title: 'Access Denied' },
      component: () => import('../views/ForbiddenView.vue'),
    },
    {
      path: '/workshops/basic-repair',
      name: 'basic-repair',
      meta: { title: 'Workshop Bookings' },
      component: () => import('../views/WorkshopView.vue'),
    },
    ...['about', 'accessibility', 'privacy'].map((name) => ({
      path: `/${name}`,
      name,
      meta: {
        title: { about: 'About & Contact', accessibility: 'Accessibility', privacy: 'Privacy' }[
          name
        ],
      },
      component: () => import('../views/InformationView.vue'),
    })),
    {
      path: '/:pathMatch(.*)*',
      meta: { title: 'Page Unavailable' },
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

// Wait for Firebase before checking protected pages.
router.beforeEach(async (to) => {
  await authReady
  const user = refreshSession()
  if (to.meta.requiresAuth && !user) {
    return { name: 'login', query: { redirect: to.path } }
  }
  if (to.meta.role && user?.role !== to.meta.role) {
    return { name: 'forbidden' }
  }
})

router.afterEach((to, from, failure) => {
  if (!failure) document.title = `${to.meta.title} | ReLoop Melbourne`
})

export default router
