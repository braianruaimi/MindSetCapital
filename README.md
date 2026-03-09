https://braianruaimi.github.io/MindSetCapital/


# 💰 MindSet Capital - Sistema de Gestión de Préstamos

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**MindSet Capital** es una aplicación web progresiva (PWA) completa para la gestión personal de préstamos de dinero. Funciona 100% offline, almacena todos los datos localmente y puede instalarse como una aplicación en dispositivos móviles y desktop.

---

## 🌟 Características Principales

### 📊 Dashboard Financiero
- Métricas en tiempo real (capital disponible, total prestado, ganancias)
- Alertas inteligentes de pagos vencidos y próximos
- Lista de cobros del día
- Gráficos interactivos con Chart.js:
  - Ganancias mensuales
  - Capital prestado por mes
  - Crecimiento del capital
  - Cobros recibidos

### 👥 Gestión de Clientes
- Registro completo de clientes con datos de contacto
- Sistema de **score de confiabilidad** automático (0-100)
- Clasificación de clientes: Excelente, Bueno, Regular, Riesgoso
- Perfil detallado con historial de préstamos y pagos
- Búsqueda rápida de clientes

### 💰 Gestión de Préstamos
- Creación rápida de préstamos con:
  - Monto prestado y cuotas
  - Frecuencia de pago (semanal, quincenal, mensual)
  - Cálculo automático de ganancias y tasas
- Vista de préstamos activos y finalizados
- Barra de progreso visual
- Alertas de pagos pendientes
- Información detallada de cada préstamo

### 💳 Sistema de Pagos
- Registro simple de pagos
- Actualización automática de préstamos
- Historial completo filtrable
- Detección de pagos atrasados

### 📈 Análisis del Negocio
- Tasa promedio de ganancia
- Capital promedio invertido
- Rentabilidad mensual
- Rotación de capital
- Top 5 mejores clientes
- Clientes de alto riesgo

### 🎯 Simulador de Crecimiento
- Proyección de capital a 3, 6 y 12 meses
- Simulación con diferentes tasas de ganancia
- Configuración de reinversión
- Gráficos de proyección
- Cálculo de ROI

### 🤖 Asistente Financiero con IA
Chatbot inteligente que responde preguntas como:
- "¿Qué préstamos vencen hoy?"
- "¿Cuánto gané este mes?"
- "¿Qué clientes son riesgosos?"
- "Dame recomendaciones para mejorar mi negocio"

El chatbot analiza tus datos y proporciona insights personalizados.

---

## 🚀 Cómo Usar la Aplicación

### Paso 1: Abrir en Visual Studio Code

1. **Abrir Visual Studio Code**
2. **Ir a File → Open Folder**
3. **Seleccionar la carpeta:** `MindSetCapital`
4. Verás la estructura completa del proyecto

### Paso 2: Ejecutar la Aplicación Localmente

Tienes varias opciones:

#### Opción A: Usar Live Server (Recomendado)

1. **Instalar la extensión Live Server:**
   - Ir a Extensions (Ctrl+Shift+X)
   - Buscar "Live Server"
   - Instalar la extensión de Ritwick Dey

2. **Iniciar el servidor:**
   - Click derecho en `index.html`
   - Seleccionar "Open with Live Server"
   - La app se abrirá en tu navegador (generalmente en http://127.0.0.1:5500)

#### Opción B: Usar Python Simple Server

Si tienes Python instalado:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Luego abre: http://localhost:8000

#### Opción C: Usar Node.js

Si tienes Node.js instalado:

```bash
npx http-server -p 8000
```

Luego abre: http://localhost:8000

#### Opción D: Abrir el archivo directamente

Simplemente abre el archivo `index.html` con tu navegador favorito haciendo doble clic. 

**Nota:** Algunas funciones del Service Worker pueden no funcionar correctamente con el protocolo `file://`

### Paso 3: Configuración Inicial

1. Al abrir la app por primera vez, verás un modal de bienvenida
2. Ingresa tu **capital inicial** (ejemplo: $10,000)
3. Click en "Comenzar"
4. ¡Listo! Ya puedes empezar a usar MindSet Capital

### Paso 4: Flujo de Trabajo Típico

1. **Agregar un Cliente:**
   - Ir a la sección "Clientes"
   - Click en "+ Nuevo Cliente"
   - Llenar los datos: nombre, teléfono, dirección, notas
   - Guardar

2. **Crear un Préstamo:**
   - Ir a la sección "Préstamos"
   - Click en "+ Nuevo Préstamo"
   - Seleccionar el cliente
   - Ingresar: monto, cuotas, valor de cuota, frecuencia
   - La app calcula automáticamente: total a cobrar, ganancia y tasa
   - Guardar

3. **Registrar un Pago:**
   - En la sección "Préstamos", buscar el préstamo activo
   - Click en "💰 Registrar Pago"
   - Ingresar monto y fecha
   - Guardar
   - El préstamo se actualiza automáticamente

4. **Consultar el Dashboard:**
   - Ver todas las métricas actualizadas
   - Revisar alertas de cobros
   - Analizar gráficos de rendimiento

5. **Usar el Asistente IA:**
   - Ir a "Asistente"
   - Hacer preguntas sobre tus datos
   - Obtener recomendaciones personalizadas

---

## 📱 Instalar como App Móvil (PWA)

### En Android (Chrome):
1. Abrir la web en Chrome
2. Click en el menú (⋮)
3. Seleccionar "Agregar a pantalla de inicio"
4. Confirmar
5. La app aparecerá como cualquier otra app en tu móvil

### En iOS (Safari):
1. Abrir la web en Safari
2. Click en el botón "Compartir" (□↑)
3. Seleccionar "Agregar a pantalla de inicio"
4. Confirmar
5. La app se instalará en tu iPhone

### En Desktop (Chrome/Edge):
1. Abrir la web en Chrome o Edge
2. Click en el icono de instalación en la barra de direcciones
3. Click en "Instalar"
4. La app se abrirá como una aplicación independiente

---

## ☁️ Sincronización con Supabase (Opcional)

La app sigue funcionando 100% local. Si quieres sincronizar entre dispositivos:

1. Crea un proyecto en Supabase.
2. En Supabase SQL Editor, ejecuta: `supabase/schema.sql`.
3. En Supabase Auth, habilita Email/Password.
4. En la app: `Perfil` -> `Supabase Sync`.
5. Pega `Supabase URL` y `Anon Key`.
6. Crea cuenta o inicia sesión.
7. Usa `Sincronizar Ahora` para subir y bajar datos.

Notas:
- El modo local sigue activo (offline).
- La nube se usa para respaldo y multi-dispositivo.
- El botón `Traer desde Nube` reemplaza datos locales con los de la nube.

---

## 🌐 Publicar en GitHub Pages

### Paso 1: Crear el Repositorio en GitHub

1. **Ir a GitHub.com** e iniciar sesión
2. **Click en "New Repository"** (botón verde)
3. **Nombre del repositorio:** `MindSetCapital` (o el que prefieras)
4. **Descripción:** "Sistema de gestión de préstamos personales"
5. **Público** (para usar GitHub Pages gratis)
6. **NO marcar** "Add README" (ya tenemos uno)
7. Click en "Create Repository"

### Paso 2: Subir el Código a GitHub

Abre la terminal en Visual Studio Code (Terminal → New Terminal) y ejecuta:

```bash
# Inicializar repositorio (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: MindSet Capital v1.0"

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/MindSetCapital.git

# Cambiar a la rama main
git branch -M main

# Subir los archivos
git push -u origin main
```

**Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.**

### Paso 3: Activar GitHub Pages

1. **Ir a tu repositorio** en GitHub
2. **Click en "Settings"** (Configuración)
3. **Ir a "Pages"** en el menú lateral
4. **En "Source"** seleccionar: `main` branch
5. **Folder:** seleccionar `/ (root)`
6. Click en **"Save"**
7. Espera 1-2 minutos

### Paso 4: Acceder a tu App

Tu aplicación estará disponible en:

```
https://TU_USUARIO.github.io/MindSetCapital/
```

¡Ahora puedes acceder desde cualquier dispositivo!

---

## 🛠️ Estructura del Proyecto

```
MindSetCapital/
│
├── index.html              # Página principal
├── styles.css              # Estilos globales
├── app.js                  # Aplicación principal
├── README.md               # Este archivo
│
├── js/                     # Módulos JavaScript
│   ├── storage.js          # Sistema de almacenamiento
│   ├── clientes.js         # Gestión de clientes
│   ├── prestamos.js        # Gestión de préstamos
│   ├── pagos.js            # Gestión de pagos
│   ├── dashboard.js        # Dashboard y métricas
│   ├── analytics.js        # Análisis del negocio
│   ├── simulador.js        # Simulador de crecimiento
│   └── chatbot.js          # Asistente financiero IA
│
├── pwa/                    # Progressive Web App
│   ├── manifest.json       # Configuración PWA
│   └── service-worker.js   # Service Worker (offline)
│
└── assets/                 # Recursos (iconos, imágenes)
    ├── icon-192.png        # Icono 192x192
    └── icon-512.png        # Icono 512x512
```

---

## 💾 Almacenamiento de Datos

La aplicación utiliza **LocalStorage** del navegador para almacenar todos los datos:

- ✅ **Persistente:** Los datos NO se borran al cerrar el navegador
- ✅ **Privado:** Los datos solo están en TU dispositivo
- ✅ **Sin servidor:** No requiere conexión a internet
- ⚠️ **Importante:** Si borras los datos del navegador, perderás la información

### Exportar/Importar Datos (Opcional - Función futura)

Para futuras versiones se puede agregar:
- Exportar datos como JSON
- Importar backup desde archivo
- Sincronización con Google Drive o Dropbox

---

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --primary: #1a73e8;      /* Color principal */
    --success: #0f9d58;      /* Verde (ganancias) */
    --warning: #f4b400;      /* Amarillo (alertas) */
    --danger: #db4437;       /* Rojo (vencidos) */
}
```

### Agregar Más Funcionalidades

Cada módulo está en un archivo separado en `/js/`, lo que facilita agregar nuevas características sin afectar el resto del código.

---

## 📊 Tecnologías Utilizadas

- **HTML5** - Estructura
- **CSS3** - Diseño responsive y moderno
- **JavaScript ES6+** - Lógica de la aplicación
- **LocalStorage API** - Almacenamiento local
- **Chart.js** - Gráficos interactivos
- **Service Worker** - Funcionalidad offline
- **PWA** - Instalación como app nativa

---

## 🔒 Seguridad y Privacidad

- ✅ **Sin servidor:** Todos los datos están en tu dispositivo
- ✅ **Sin tracking:** No recopilamos ningún dato
- ✅ **Sin anuncios:** 100% gratis sin publicidad
- ✅ **Open source:** Código completamente transparente
- ⚠️ **Responsabilidad:** Mantén backup de tus datos importantes

---

## 🐛 Solución de Problemas

### La app no carga correctamente
- Verifica que todos los archivos estén en su lugar
- Usa un servidor local (Live Server) en lugar de abrir el HTML directamente
- Revisa la consola del navegador (F12) para ver errores

### Los gráficos no se muestran
- Verifica tu conexión a internet (Chart.js se carga desde CDN)
- Si planeas usar offline, considera descargar Chart.js localmente

### Se borraron mis datos
- Los datos están en LocalStorage del navegador
- Si limpias los datos del navegador, se perderán
- Mantén backups exportando los datos regularmente

### El Service Worker no funciona
- Asegúrate de usar HTTPS o localhost
- El protocolo `file://` no soporta Service Workers
- Verifica en DevTools → Application → Service Workers

---

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Eres libre de usar, modificar y distribuir el código.

---

## 👨‍💻 Desarrollo

Desarrollado con 💙 para emprendedores financieros que buscan una herramienta simple y poderosa para gestionar sus préstamos.

---

## 🚀 Roadmap Futuro

- [ ] Exportar/Importar datos JSON
- [ ] Modo oscuro
- [ ] Múltiples monedas
- [ ] Notificaciones push
- [ ] Generación de PDFs/reportes
- [ ] Sincronización en la nube (opcional)
- [ ] App móvil nativa (React Native)
- [ ] Reconocimiento de voz en el chatbot

---

## 📧 Soporte

Si encuentras algún problema o tienes sugerencias, abre un Issue en GitHub.

---

**¡Disfruta usando MindSet Capital! 💰📈**
