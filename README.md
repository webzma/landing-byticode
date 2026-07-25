## Landing page de Byticode

Este proyecto es la **landing page oficial de Byticode**, construida con [Astro](https://astro.build) y pensada para ser rápida, ligera y fácil de mantener.

La landing está enfocada en:
- **Presentar la propuesta de valor de Byticode**
- **Mostrar secciones de producto/servicios y beneficios**
- **Facilitar el contacto o conversión** (por ejemplo, a través de un CTA principal)

---

## 🚀 Tecnologías principales

- **Framework**: Astro
- **Lenguaje**: TypeScript (donde aplique)
- **Estilos**: CSS global en `src/styles/global.css`
- **Gestor de paquetes**: `pnpm`

---

## 📦 Estructura del proyecto

Estructura general relevante de la landing:

```text
/
├── public/              # Recursos estáticos públicos (favicon, imágenes estáticas, etc.)
├── src/
│   ├── assets/          # Assets usados en componentes/páginas
│   ├── components/      # Componentes reutilizables de la UI
│   ├── layouts/
│   │   └── Layout.astro # Layout base de la landing
│   ├── pages/
│   │   └── index.astro  # Página principal de la landing
│   ├── lib/             # Utilidades y helpers de la app
│   └── styles/
│       └── global.css   # Estilos globales
└── package.json
```

---

## 🧞 Scripts disponibles

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando          | Descripción                                                   |
| ---------------- | ------------------------------------------------------------- |
| `pnpm install`   | Instala las dependencias                                      |
| `pnpm dev`       | Arranca el servidor de desarrollo en `http://localhost:4321` |
| `pnpm build`     | Genera el build de producción en la carpeta `dist/`          |
| `pnpm preview`   | Previsualiza el build de producción de forma local           |

---

## 🧩 Estructura de la landing

La landing principal vive en `src/pages/index.astro` y usa el layout `src/layouts/Layout.astro`.

De forma general:
- **`Layout.astro`** define la estructura general de la página (HTML base, `<head>`, wrapper principal, etc.).
- **Componentes de `src/components/`** agrupan secciones como cabecera, hero, features, testimonios, footer, etc.
- **`global.css`** contiene los estilos globales y tokens básicos (colores, tipografía, spacing).

---

## 🛠 Desarrollo local

1. Clona el repositorio.
2. Instala dependencias:

   ```sh
   pnpm install
   ```

3. Inicia el entorno de desarrollo:

   ```sh
   pnpm dev
   ```

4. Abre `http://localhost:4321` en tu navegador.

---

## 🚀 Deploy

El proyecto genera una salida estática en `dist/` mediante:

```sh
pnpm build
```

El contenido de `dist/` se puede desplegar en cualquier servicio de hosting estático (por ejemplo, Netlify, Vercel o GitHub Pages). Ajusta la configuración de cada proveedor según sea necesario (ruta base, adaptadores de Astro, etc.).

---

## ✏️ Convenciones

- Mantener **nombres descriptivos** para componentes y secciones.
- Centralizar estilos globales y tokens en `global.css` siempre que sea posible.
- Preferir **componentes pequeños y reutilizables** para secciones repetidas.
