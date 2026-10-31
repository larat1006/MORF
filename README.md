# MORF. — Prototipo funcional de interfaz

Proyecto React + Vite para TP de Desarrollo Frontend II.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Abrir la URL indicada por Vite (habitualmente http://localhost:5173).

## Qué incluye

- Home responsive, identidad naranja/crema/azul y microanimaciones.
- Catálogo ficticio, búsqueda, filtros y favoritos.
- Cuestionario de recomendaciones basado en coincidencias.
- Fichas de restaurantes.
- Crear, consultar, modificar y eliminar reservas **de demostración**.
- Crear planes, votar y visualizar resultados **locales**.

## MUY IMPORTANTE — Alcance

Esta entrega es un **prototipo frontend**. Usa `localStorage` del navegador para demostrar flujos. **No** contiene autenticación, Firestore, control real de cupos, reglas de seguridad, ni sincronización entre usuarios. Un enlace de votación solo sirve dentro del mismo navegador donde se creó el plan. No se deben usar estas reservas como reservas reales ni presentarlas como CRUD en Firestore.

Los restaurantes, sus nombres y valoraciones son ficticios. Las fotografías se cargan desde Unsplash; los emojis son ilustraciones temporales.

## Para cumplir el TP

1. Configurar Firebase Auth (Google + correo, y sesión anónima para votantes).
2. Crear colecciones Firestore para restaurantes, reservas, planes y votos.
3. Reemplazar `localStorage` por operaciones Firestore seguras; aplicar reglas, validar disponibilidad y transacciones.
4. Integrar rutas reales, controles de acceso y estados de carga/error.
5. Probar, documentar V1/V2/V3, preparar README final, repositorio GitHub y deploy Vercel.

Este proyecto es un punto de partida visual, **no la entrega final del TP**.
