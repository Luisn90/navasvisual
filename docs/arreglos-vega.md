# Arreglos automáticos de lo que encuentra Vega

Una tarea programada de Claude se ejecuta dos veces al día (8:15 y 17:15, hora de Venezuela), después de las revisiones de Vega. Sigue estas instrucciones al pie de la letra.

## Datos

- Repositorio: `Luisn90/navasvisual` (rama principal `main`). Despliega Vercel al unir a `main`.
- Supabase: proyecto `kzbhybcyjjqupojuakuw`.
  - `public.monitor_reports`: revisiones de Vega. Usa la más reciente (`order by created_at desc limit 1`) y su lista `hallazgos` (`id`, `tipo` error/aviso/mejora, `area`, `titulo`, `detalle`, `url`).
  - `public.monitor_fixes`: tus informes. Antes de empezar, lee los de los últimos 3 días para no repetir trabajo ni avisos.
- Vercel: proyecto `navasvisual` (`prj_BbP3qvfgo2PQJKLXZKhImUISxAZJ`, equipo `team_ACew8hlSxo1dza4eW2UBqLSf`).

## Pedidos de Luis (primero)

Luis puede pedir cambios desde la ficha de Vega. Están en `public.cambios_web` (`id`, `texto`, `imagen_url`, `estado`, `respuesta`, `pr_url`). En cada ejecución, antes que los hallazgos, atiende los que tengan `estado = 'pendiente'`, del más antiguo al más nuevo:

- `imagen_url` es una imagen pública en el almacenamiento de Supabase (`https://kzbhybcyjjqupojuakuw.supabase.co/storage/v1/object/public/web/cambios/…`). Úsala tal cual en el código con esa URL absoluta; no hace falta descargarla ni subirla al repositorio.
- La imagen al compartir la web ya no se cambia en el código: la sirve `/api/og-image` con lo que Luis sube en la oficina. Si te piden eso, responde que ya se hace desde «Imagen al compartir la web».
- Si el pedido cambia contenido visible (textos, imágenes, orden de proyectos, enlaces) en las páginas públicas y las pruebas y la vista previa pasan, publícalo como un arreglo seguro. Si toca `api/`, `admin*.html`, precios, pagos o lógica, abre un PR sin unir.
- Si el pedido es ambiguo, no se puede hacer o sería mala idea para la web, no lo hagas: explica por qué en `respuesta`.
- Al terminar cada pedido actualiza su fila:

  ```sql
  update public.cambios_web
  set estado = 'hecho' /* o 'en_revision' o 'no_posible' */,
      respuesta = 'Qué hiciste o por qué no, en una o dos frases sencillas',
      pr_url = 'https://github.com/Luisn90/navasvisual/pull/…',
      resuelto_at = now()
  where id = '…';
  ```

- Inclúyelos también en tu informe de `monitor_fixes`: los hechos y en revisión en `arreglados` (con `hallazgo_id` = `pedido:<id>` y el título empezando por «Tu pedido:»), y los no posibles en `pendientes`.

## Qué hacer en cada ejecución

1. Lee la última revisión de Vega y tus informes recientes. Descarta los hallazgos que ya arreglaste y esperan a que Vega los compruebe, y los pendientes que ya notificaste sin cambios desde entonces.
2. Si no queda nada nuevo (ni hallazgos ni pedidos pendientes), termina sin escribir nada.
3. Clasifica cada hallazgo restante:
   - **Arreglo seguro (se publica solo):**
     - Etiquetas de SEO en los `.html` públicos: `<meta name="description">`, `og:title`, `og:description`, `og:image` (usa una imagen que ya exista en `assets/`), `lang`, `<title>`. Textos en español, coherentes con la página y la marca Navas Visual.
     - Rutas de imágenes o enlaces internos rotos cuando el archivo correcto existe en el repositorio.
     - Comprimir imágenes pesadas de `assets/` sin cambiar el nombre ni el formato del archivo (misma ruta, misma extensión), manteniendo buena calidad visual.
     - Textos `alt` que falten.
   - **Arreglo con revisión (PR sin unir):** cualquier cambio en `vercel.json` (cabeceras de seguridad, CSP), cambiar React a la versión de producción, cambiar el formato o el nombre de una imagen, tocar `api/`, la lógica de los `.jsx` o `admin*.html`.
   - **No se puede arreglar en el código:** servicios externos caídos (BCV, Google), cuotas agotadas, variables o claves que faltan en Vercel, decisiones de negocio o de diseño, y migraciones grandes (por ejemplo, pasar a Vite). Explica el motivo y qué tendría que hacer Luis.
4. Arreglos seguros: crea una rama `vega/seguro-AAAAMMDD-HHMM` desde `main`, haz los cambios, ejecuta `node --test tests/*.test.mjs` y, si pasan, sube la rama, abre un PR y espera a que el despliegue de vista previa de Vercel de esa rama esté en `READY`. Si todo está bien, une el PR (squash). Si algo falla, no lo unas y trátalo como «con revisión».
5. Arreglos con revisión: otra rama `vega/revision-AAAAMMDD-HHMM`, mismo proceso de pruebas, abre el PR y **no lo unas**. Explica en el PR qué cambia y cómo probarlo.
6. Nunca: borres archivos, toques datos de clientes, cambies precios o textos comerciales, cambies claves, ni hagas push directo a `main`.
7. Guarda tu informe en Supabase (una sola fila por ejecución, solo si hiciste algo o hay algo nuevo que contar):

   ```sql
   insert into public.monitor_fixes (resumen, arreglados, pendientes)
   values ('Resumen en 1 o 2 frases',
     '[{"hallazgo_id":"desc:/about.html","titulo":"…","cambio":"…","publicado":true,"pr_url":"https://github.com/Luisn90/navasvisual/pull/…"}]'::jsonb,
     '[{"hallazgo_id":"api:rate","titulo":"…","motivo":"…","accion_usuario":"…"}]'::jsonb);
   ```

8. Pide a Vega una revisión rápida para que compruebe tus arreglos y envíe tu informe a Telegram:

   ```sql
   select net.http_post(
     url := 'https://navasvisual.com/api/monitor?modo=rapido',
     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'vega_monitor_secret')),
     timeout_milliseconds := 10000);
   ```

   No leas ni muestres el valor del secreto: úsalo solo dentro de esta consulta.

## Estilo

- Mensajes y PR en español, claros para Luis, que es diseñador y no programador.
- Commits con el formato habitual del repositorio.
