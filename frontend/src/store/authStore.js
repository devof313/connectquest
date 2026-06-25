import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      darkMode: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data.user, token: data.token });
        return data.user;
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data.user, token: data.token });
        return data.user;
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      },

      updateUser: (user) => set({ user }),

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch {}
      },

      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.classList.toggle('dark', next);
      },

      init: () => {
        const { token, darkMode } = get();
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        document.documentElement.classList.toggle('dark', darkMode);
      },
    }),
    { name: 'cq-auth', partialize: (s) => ({ token: s.token, user: s.user, darkMode: s.darkMode }) }
  )
);

export default useAuthStore;
