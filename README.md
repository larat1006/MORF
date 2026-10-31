# MORF. 🍽️

**Todos los antojos. Un solo lugar.**

MORF. es una aplicación web desarrollada para descubrir restaurantes, explorar opciones gastronómicas, gestionar reservas y organizar salidas con amigos.

Su objetivo es facilitar la elección de dónde comer mediante una experiencia interactiva, intuitiva y colaborativa.

## Funcionalidades principales

- **Explorar restaurantes:** descubrir diferentes propuestas gastronómicas y filtrar opciones.
- **Detalle de restaurantes:** consultar información sobre cada establecimiento.
- **¿Qué pinta?:** recibir recomendaciones según las preferencias del usuario.
- **Mis reservas:** realizar y gestionar reservas.
- **Planes con amigos:** crear un plan con dos o tres restaurantes y compartirlo mediante un enlace.
- **Votaciones en tiempo real:** permitir que diferentes usuarios voten por su restaurante favorito y visualicen los resultados actualizados.

## Tecnologías utilizadas

- **React:** desarrollo de componentes e interfaces interactivas.
- **Vite:** entorno de desarrollo y compilación.
- **JavaScript:** lógica y funcionalidades de la aplicación.
- **CSS:** diseño visual y adaptación responsive.
- **Firebase Authentication:** autenticación anónima de usuarios.
- **Cloud Firestore:** almacenamiento y sincronización de reservas, planes y votaciones.
- **GitHub:** control de versiones.
- **Vercel:** despliegue de la aplicación.

## Requisitos previos

Para ejecutar el proyecto localmente es necesario tener instalado:

- Node.js y npm.
- Git.
- Un editor de código, como Visual Studio Code.
- Un proyecto de Firebase configurado.

## Instalación del proyecto

**1. Clonar el repositorio**

Abrir una terminal y ejecutar:

```bash
git clone https://github.com/larat1006/MORF.git
```

**2. Acceder a la carpeta del proyecto**

```bash
cd MORF
```

**3. Instalar las dependencias**

```bash
npm install
```

## Configuración de Firebase

MORF. utiliza Firebase para gestionar la autenticación anónima y almacenar los datos de la aplicación.

**1. Crear un proyecto en Firebase**

Ingresar a [Firebase Console](https://console.firebase.google.com/) y crear un proyecto.

**2. Registrar una aplicación web**

Dentro del proyecto, agregar una aplicación web y obtener las credenciales de configuración.

**3. Habilitar Authentication**

En Firebase Console:

- Acceder a Authentication.
- Abrir la sección de métodos de acceso.
- Habilitar el proveedor **Anónimo**.

**4. Configurar Cloud Firestore**

Crear una base de datos Cloud Firestore y configurar reglas de seguridad compatibles con las operaciones de la aplicación.

La aplicación utiliza las siguientes colecciones:

- `reservas`: almacena las reservas de los usuarios.
- `planes`: almacena los planes compartidos.
- `planes/{planId}/votos`: subcolección que registra los votos de cada plan.

**5. Configurar las variables de entorno**

Crear un archivo `.env` en la raíz del proyecto y agregar las credenciales correspondientes:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

Los nombres de las variables deben coincidir con los utilizados en `src/firebase.js`.

El archivo `.env` debe estar excluido del repositorio mediante `.gitignore`.

## Ejecución local

Una vez instaladas las dependencias y configurado Firebase, ejecutar:

```bash
npm run dev
```

Vite mostrará una dirección local en la terminal, generalmente:

```text
http://localhost:5173/
```

Abrir esa dirección en el navegador para utilizar la aplicación.

Para detener el servidor, presionar `Ctrl + C` en la terminal.

## Compilación para producción

Para generar una versión optimizada:

```bash
npm run build
```

Los archivos compilados se guardarán en la carpeta `dist`.

Para previsualizar la compilación:

```bash
npm run preview
```

## Despliegue

La aplicación está publicada mediante Vercel y conectada al repositorio de GitHub.

**Sitio web:** https://morf-gamma.vercel.app/

Para realizar un despliegue propio:

1. Importar el repositorio en Vercel.
2. Seleccionar Vite como framework, si no se detecta automáticamente.
3. Configurar las variables de entorno de Firebase.
4. Ejecutar el despliegue.

## Funcionamiento de los planes compartidos

1. Un usuario crea un plan y selecciona dos o tres restaurantes.
2. El plan se guarda en Cloud Firestore.
3. La aplicación genera un enlace único para compartirlo.
4. Los invitados abren el enlace sin necesidad de crear una cuenta.
5. Firebase Authentication inicia una sesión anónima.
6. Cada usuario puede registrar un voto por plan.
7. Los resultados se sincronizan en tiempo real entre dispositivos.
8. El creador puede cerrar la votación.

## Persistencia de datos

Cloud Firestore permite conservar los datos de reservas, planes y votaciones más allá de una sesión del navegador.

Las suscripciones en tiempo real permiten reflejar los cambios de las votaciones sin necesidad de recargar la página.

## Proyecto académico

MORF. fue desarrollado como proyecto de la materia **Frontend II**, aplicando conceptos de desarrollo frontend, componentes reutilizables, gestión de estados, integración con servicios externos, persistencia de datos y despliegue web.

---

**MORF. — Todos los antojos. Un solo lugar.** 🧡