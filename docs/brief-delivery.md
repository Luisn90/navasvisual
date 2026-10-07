# Briefs por Telegram y correo

El formulario envía las respuestas y referencias a `/api/brief`, una función Node de Vercel definida en `api/brief.mjs`. La función manda el brief como documento de texto y las referencias originales al chat de Telegram, y el texto del brief con las referencias adjuntas al correo. No se descarga un ZIP ni se usa un enlace `mailto:` para enviar la solicitud.

Después del envío completo, el cliente puede abrir «Ver opciones de pago» o consultar por WhatsApp. Las opciones muestran el Binance Pay ID 283127648 y los datos de Pago Móvil indicados por el propietario. El importe en bolívares se calcula con la tasa USD publicada en la web oficial del BCV únicamente si su fecha corresponde al día actual en Venezuela. Si la fuente está bloqueada, su estructura cambia o solo muestra una fecha anterior/futura, no se calcula el importe y se ofrece confirmarlo por WhatsApp. La web no confirma pagos ni inicia el trabajo automáticamente. El precio se obtiene del catálogo del servidor, no de valores enviados por el navegador.

## Configuración requerida en Vercel

En el proyecto de Vercel: **Settings → Environment Variables**. Añade las siguientes variables para el entorno **Production** (y **Preview** si vas a probar ahí). No coloques claves en el repositorio, en HTML/JS ni en el chat. Después de guardarlas, vuelve a desplegar el sitio para aplicarlas.

| Variable | Valor que debe introducir el propietario |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token privado del bot creado con BotFather |
| `TELEGRAM_CHAT_ID` | ID del chat privado o grupo que recibe solicitudes |
| `RESEND_API_KEY` | Clave privada del servicio de correo Resend |
| `BRIEF_EMAIL_FROM` | Remitente autorizado por Resend, por ejemplo `Navas Visual <proyectos@navasvisual.com>` después de verificar el dominio |
| `BRIEF_EMAIL_TO` | `luisgabrielnavast90@gmail.com`, destinatario indicado por el propietario |

La función requiere las cinco primeras variables. Si falta alguna, devuelve un error y mantiene el brief en pantalla; no afirma haberlo enviado.

### Telegram

1. Abre el bot oficial **@BotFather** en Telegram y usa `/newbot`.
2. Guarda su token únicamente en `TELEGRAM_BOT_TOKEN` en Vercel.
3. Abre una conversación con tu nuevo bot y pulsa **Start / Iniciar**. El bot no puede iniciar por su cuenta un chat privado contigo.
4. Para obtener el `chat_id`, ejecuta `getUpdates` mediante la API de Telegram en una herramienta privada del propietario y busca `message.chat.id`. No pegues el token en un chat, enlace público ni captura de pantalla. Si ya tiene un webhook activo, usa la configuración de ese webhook para identificar el chat sin desactivarlo.
5. Si vas a usar un grupo, añade el bot, envía un mensaje dirigido al bot y comprueba que tiene permiso para enviar documentos al grupo.

### Correo

1. Crea una cuenta en Resend y verifica el dominio desde el que enviarás (requiere acceso a su DNS).
2. Crea una API key con permiso de envío y guárdala en `RESEND_API_KEY`.
3. Configura un remitente del dominio verificado en `BRIEF_EMAIL_FROM` y el destinatario en `BRIEF_EMAIL_TO`.
4. El correo del cliente se usa como `reply_to`, nunca como remitente ni destinatario controlado por el cliente.

## Validación

- Usa Node 22 o posterior. No se requieren dependencias adicionales para la función.
- `node --test tests/brief.test.mjs` prueba validación, adjuntos, rutas de entrega, errores e idempotencia con proveedores simulados. No envía mensajes reales.
- Un servidor Python sirve el frontend, pero no ejecuta la función de Vercel. Para probar el envío real, utiliza `vercel dev` o un despliegue con sus variables configuradas.
- En el sitio desplegado, completa un brief de prueba y adjunta una imagen o PDF. Comprueba el mensaje y documento en Telegram, el correo y los adjuntos, y las opciones de pago/consulta.
- Los archivos admitidos son JPG, PNG, WebP y PDF: máximo 5 y 3 MB en total, para mantenerse dentro del límite de solicitudes de Vercel. La firma del archivo se verifica en el servidor.

## Límites operativos

- Si falla un canal pero el otro recibe la solicitud, se informa de recepción parcial y se ofrece consulta, sin botón de pago.
- Si fallan ambos, se conserva el formulario para reintentar; no se muestra una confirmación falsa.
- Resend recibe una clave de idempotencia basada en el brief y los archivos. Telegram tiene prevención de duplicados y límites de intentos **solo en la instancia activa**; no hay almacenamiento duradero ni garantía de entrega exactamente una vez entre instancias o después de reinicios. Los IDs de solicitud ayudan a identificar duplicados.
- El honeypot y la validación no sustituyen una protección global contra automatización. Para tráfico público elevado, añade reglas de límites de solicitudes en Vercel Firewall o un captcha verificado por el servidor.
- No se guardan solicitudes en Supabase ni se añade una bandeja al administrador. No se imprimen claves ni respuestas privadas de los proveedores en los logs.
- Se muestran los QR originales aportados por el propietario: `assets/Binance qr.jpg` y `assets/9110928d-686f-4cf4-8912-67fc551e44a4.jpg`. Pueden abrirse a tamaño completo o descargarse para usarlos desde la app de pago. No se alteran ni se generan códigos a partir del ID.

La lectura real de BCV todavía no pudo verificarse desde este entorno: la fuente devolvió HTTP 403. El parser y el cálculo se prueban con fixtures, y el despliegue debe comprobar acceso real a la fuente. No se desactiva la verificación TLS ni se usan tasas de fuentes no autorizadas.
