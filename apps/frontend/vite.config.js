import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
        port: 5173,
        host: true,
    },
    build: {
        outDir: 'dist',
        // Для Telegram WebView: старые движки, нужна сборка без современного ESM
        target: 'es2015',
        sourcemap: true,
        // Упростим отладку проблем вида "Unexpected token export"
        minify: false,
    },
    envPrefix: 'VITE_',
});
