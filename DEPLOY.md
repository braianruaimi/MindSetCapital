# 🚀 Despliegue en GitHub Pages

## Configuración

Este proyecto está optimizado para funcionar en GitHub Pages.

### Pasos para configurar GitHub Pages:

1. **Haz push de todos los archivos a tu repositorio:**
   ```bash
   git add .
   git commit -m "Mobile-first design and GitHub Pages setup"
   git push origin main
   ```

2. **Configura GitHub Pages:**
   - Ve a tu repositorio en GitHub
   - Ve a `Settings` > `Pages`
   - En `Source`, selecciona la rama `main`
   - En `Folder`, selecciona `/ (root)`
   - Haz clic en `Save`

3. **Espera unos minutos** y tu aplicación estará disponible en:
   ```
   https://[tu-usuario].github.io/MindSetCapital/
   ```

## Características Mobile-First

✅ **Diseño Responsive Optimizado:**
- Mobile-first design
- Menú hamburguesa funcional en móviles
- Navegación touch-friendly
- Botones con tamaño mínimo de 44px para mejor usabilidad táctil
- Tablas con scroll horizontal en pantallas pequeñas
- Modales adaptados a móvil (95% ancho en pantallas pequeñas)

✅ **PWA (Progressive Web App):**
- Funciona offline
- Instalable en dispositivos móviles
- Iconos optimizados para Android/iOS
- Manifest configurado con tema oscuro

✅ **Performance:**
- CSS optimizado con media queries mobile-first
- Animaciones suaves con CSS transforms
- Service Worker para caching

## Tecnologías

- HTML5 + CSS3 (Mobile-First)
- JavaScript Vanilla (ES6+)
- PWA con Service Worker
- LocalStorage para persistencia
- Chart.js para gráficos
- Diseño Dark Mode moderno

## Soporte de Navegadores

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Notas

- El archivo `.nojekyll` previene el procesamiento de Jekyll
- Todos los archivos estáticos se sirven directamente
- No requiere build process
- 100% compatible con GitHub Pages
