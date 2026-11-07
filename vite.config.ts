import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs keep assets working under GitHub Pages /REPOSITORY/.
  base: "./",
  build: {
    rollupOptions: {
      // Duas páginas: o painel (index.html) e o script de fundo (background.html).
      input: {
        main: "index.html",
        background: "background.html"
      }
    }
  }
});
