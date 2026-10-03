// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Active le nouveau JSX transform (React 17+)
      jsxRuntime: 'automatic',
      // Utilise le JSX import source par défaut
      jsxImportSource: 'react',
    }),
  ],

  // Optimisation du serveur de développement
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: true,
    hmr: {
      overlay: true,
    },
  },

  // Optimisation du build
  build: {
    // Minification avec esbuild (plus rapide que terser)
    minify: 'esbuild',
    // Activer le source map seulement en développement
    sourcemap: false,
    // Taille cible des chunks
    chunkSizeWarningLimit: 1000,
    // Options de rollup
    rollupOptions: {
      output: {
        // Séparation manuelle des chunks pour un meilleur caching
        manualChunks: {
          // Vendors principaux
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'chart-vendor': ['chart.js/auto'],
          'lucide-vendor': ['lucide-react'],
        },
      },
    },
    // Cible des navigateurs
    target: 'es2020',
    // Réduire la taille du bundle
    cssCodeSplit: true,
  },

  // Optimisation des dépendances
  optimizeDeps: {
    // Pré-bundle des dépendances lourdes
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@supabase/supabase-js',
      'chart.js/auto',
      'lucide-react',
    ],
  },

  // Résolution des modules
  resolve: {
    alias: {
      // Alias pour simplifier les imports
      '@': '/src',
      '@components': '/src/components',
      '@hooks': '/src/hooks',
      '@lib': '/src/lib',
      '@utils': '/src/utils',
      '@types': '/src/types',
    },
  },

  // Configuration CSS (sans PostCSS plugins ici)
  css: {
    devSourcemap: true,
  },

  // ESBuild configuration
  //esbuild: {
  // Support du JSX - injection automatique de React
  //jsxInject: `import React from 'react'`,
  // Cible ES
  //target: 'es2020',
  // Supprimer les console.log en production
  //drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  //},

  // Configuration du preview
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
  },
});
