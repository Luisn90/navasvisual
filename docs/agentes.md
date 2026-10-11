# Marta: solicitudes reales en la oficina de agentes

Cuando alguien envía un brief desde la web, además del aviso que ya llega a Telegram y al correo:

1. `api/brief.mjs` guarda la solicitud en la tabla `solicitudes` de Supabase.
2. Marta (la agente comercial) la analiza con IA (Groq gratis o Claude): resumen, encaje con el plan, preguntas pendientes, prioridad, siguiente paso y un borrador de respuesta.
3. Llega un segundo mensaje a Telegram con ese análisis y un enlace que abre la solicitud en el admin.
4. En **Admin → Equipo**, Marta se pone en amarillo y su ficha muestra la pestaña **Solicitudes**: lista, estados, análisis y borrador editable. La pestaña **Chat** habla con la IA sobre tus solicitudes.

Marta **nunca envía nada al cliente**. Tú revisas el borrador y lo envías desde tu correo («Abrir en mi correo» o «Copiar»).

Si falta configuración, el brief se sigue entregando por Telegram y correo como antes: guardar y analizar son pasos extra que, si fallan, no bloquean la solicitud del cliente.

## 1. Crear la tabla en Supabase

1. Abre tu proyecto en Supabase → **SQL Editor** → **New query**.
2. Pega el contenido de [`solicitudes.sql`](./solicitudes.sql).
3. Cambia `TU_CORREO_DEL_ADMIN` por el correo con el que inicias sesión en el admin (aparece 3 veces).
4. Pulsa **Run**.

Comprueba en **Authentication → Sign In / Providers** que el registro de usuarios nuevos esté desactivado, para que nadie más pueda crearse una cuenta.

## 2. Variables en Vercel

En Vercel: **Settings → Environment Variables**, entorno **Production** (y **Preview** si vas a probar ahí). No pegues estas claves en el código, en el chat ni en capturas.

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://kzbhybcyjjqupojuakuw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API Keys** → clave `service_role` (o la *secret key*). Es privada: da acceso total a la base de datos. |
| `GROQ_API_KEY` | IA gratuita. Créala en [console.groq.com/keys](https://console.groq.com/keys); empieza por `gsk_`. |
| `ANTHROPIC_API_KEY` | Opcional, de pago. Si existe, Marta usa Claude en lugar de Groq. Créala en [console.anthropic.com](https://console.anthropic.com) → **API Keys**. |
| `ADMIN_EMAILS` | El mismo correo del paso 1. Si son varios, sepáralos con comas. |
| `GROQ_MODEL` / `ANTHROPIC_MODEL` | Opcionales. Por defecto `openai/gpt-oss-120b` y `claude-sonnet-5-5`. |

Basta con una de las dos claves de IA. Sin ninguna, las solicitudes se guardan y aparecen en la oficina, pero sin análisis ni borrador.

Después de guardarlas, vuelve a desplegar el sitio (**Deployments → … → Redeploy**).

## 3. Probar

1. Envía un brief de prueba desde la web.
2. En Telegram deben llegar dos mensajes: el brief de siempre y, unos segundos después, el análisis de Marta con un enlace.
3. Abre el enlace (o entra a **Admin → Equipo** y haz clic en Marta). La solicitud aparece con su análisis y su borrador.
4. Cambia el estado, edita el borrador y pulsa **Guardar cambios**. Prueba la pestaña **Chat** con «¿Qué solicitudes tengo pendientes?».

## Cómo funciona por dentro

- `api/_solicitudes.mjs`: catálogo de servicios, guardado en Supabase, llamadas a la IA (Groq o Claude), aviso de Telegram y verificación del admin.
- `api/agent.mjs`: `POST /api/agent` con `{ action: 'analizar', id }` o `{ action: 'chat', message, history }`. Exige la sesión de Supabase del admin (cabecera `Authorization: Bearer …`) y que su correo esté en `ADMIN_EMAILS`.
- `admin-equipo.html`: si hay sesión del admin, lee la tabla `solicitudes` (protegida por RLS) y se actualiza en tiempo real. Sin sesión, la oficina sigue en modo ejemplo.
- El texto del brief lo escribe el cliente; las instrucciones de Marta le indican tratarlo solo como información.
- Los archivos de referencia no se guardan en Supabase: siguen llegando por Telegram y correo. La tabla guarda solo sus nombres.

## Costos

Cada solicitud usa una llamada a la IA para el análisis, y cada mensaje del chat otra. Con Groq entra en el plan gratuito, que tiene límites diarios de peticiones muy por encima de este uso. Con Claude se paga por uso; puedes poner un límite mensual en la consola de Anthropic (**Settings → Limits**).
