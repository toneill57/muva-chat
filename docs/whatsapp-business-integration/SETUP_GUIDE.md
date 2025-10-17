# WhatsApp Business Cloud API - Setup Guide

**Proyecto:** MUVA Chat - WhatsApp Business Integration
**Última actualización:** 2025-10-16
**Tenant de prueba:** Simmerdown Guest House

---

## 📋 Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Paso 1: Crear Meta Business Account](#paso-1-crear-meta-business-account)
3. [Paso 2: Configurar WhatsApp Business API](#paso-2-configurar-whatsapp-business-api)
4. [Paso 3: Obtener Credenciales](#paso-3-obtener-credenciales)
5. [Paso 4: Configurar Webhook](#paso-4-configurar-webhook)
6. [Paso 5: Configurar Variables de Entorno](#paso-5-configurar-variables-de-entorno)
7. [Paso 6: Testing](#paso-6-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisitos

Antes de comenzar, asegúrate de tener:

- ✅ **Cuenta de Facebook:** Una cuenta personal de Facebook (será el administrador)
- ✅ **Número de teléfono:** Un número de teléfono que NO esté registrado en WhatsApp (exclusivo para el negocio)
- ✅ **Documento de identidad:** Para verificación Meta Verified (opcional pero recomendado)
- ✅ **Política de privacidad:** URL pública a la política de privacidad del negocio (requerido por Meta)
- ✅ **Acceso al servidor:** Acceso SSH/FTP para configurar webhook en VPS
- ✅ **SSL certificate:** HTTPS obligatorio para webhook (ya configurado en VPS)

---

## Paso 1: Crear Meta Business Account

### 1.1 Acceder a Meta Business Suite

1. Navega a [business.facebook.com](https://business.facebook.com)
2. Inicia sesión con tu cuenta de Facebook
3. Click en **"Crear cuenta"** (si no tienes una) o selecciona una cuenta existente

### 1.2 Configurar Información del Negocio

1. **Nombre del negocio:** `Simmerdown Guest House` (o el nombre de tu tenant)
2. **Tu nombre:** Nombre completo del administrador
3. **Correo electrónico del negocio:** Email corporativo
4. **País:** Colombia (o el país donde opera el negocio)

### 1.3 Verificar Cuenta (Meta Verified)

**Opcional pero recomendado:**

1. En Meta Business Suite, ve a **Configuración** → **Seguridad**
2. Click en **"Verificar cuenta"**
3. Sube documento de identidad (cédula, pasaporte)
4. Espera aprobación (1-3 días hábiles)

**Beneficios de verificación:**
- ✅ Límites de mensajes más altos (250 → 1,000 conversaciones/día)
- ✅ Mayor confianza de los usuarios
- ✅ Badge de verificación en perfil WhatsApp

---

## Paso 2: Configurar WhatsApp Business API

### 2.1 Agregar Producto WhatsApp

1. En Meta Business Suite, ve a **"Productos"** en el menú lateral
2. Click en **"Agregar producto"**
3. Selecciona **"WhatsApp"**
4. Click en **"Comenzar"**

### 2.2 Verificar Número de Teléfono

1. Ingresa el número de teléfono del negocio en formato internacional:
   ```
   Ejemplo: +57 300 123 4567
   ```

2. Selecciona método de verificación:
   - **SMS:** Recibirás un código de 6 dígitos
   - **Llamada de voz:** Escucharás el código

3. Ingresa el código de verificación

4. Espera confirmación: **"Número verificado ✅"**

**⚠️ IMPORTANTE:**
- El número NO debe estar registrado en WhatsApp personal
- No puedes usar el mismo número en 2 cuentas WhatsApp Business
- Si el número ya está en uso, debes eliminarlo primero

### 2.3 Configurar Perfil de Negocio

1. **Nombre para mostrar:** `Simmerdown Guest House`
2. **Categoría:** `Hotel` o `Hospedaje`
3. **Descripción:** Breve descripción del negocio (max 256 caracteres)
4. **Dirección:** Dirección física del negocio
5. **Horario de atención:** Opcional
6. **Sitio web:** `https://simmerdown.muva.chat`
7. **Foto de perfil:** Logo del negocio (200x200px, PNG/JPG, max 100KB)

---

## Paso 3: Obtener Credenciales

### 3.1 Obtener Phone Number ID

1. En WhatsApp Manager, ve a **"Configuración de la API"**
2. Busca la sección **"Números de teléfono"**
3. Copia el **Phone Number ID** (número largo, ej: `109876543210987`)

   ```bash
   WHATSAPP_PHONE_NUMBER_ID=109876543210987
   ```

### 3.2 Generar Access Token

**Opción A: Token Temporal (60 días) - Para testing**

1. En WhatsApp Manager → **"Configuración de la API"**
2. Busca sección **"Access token"**
3. Click en **"Generar token"**
4. Copia el token (empieza con `EAAE...`)

   ```bash
   WHATSAPP_ACCESS_TOKEN=EAAExxxxxxxxxxx
   ```

**⚠️ ADVERTENCIA:** Este token expira en 60 días. Para producción, usa Opción B.

**Opción B: Token Permanente (Producción) - Recomendado**

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Selecciona tu app → **"Configuración"** → **"Básica"**
3. Copia **App ID** y **App Secret**
4. Ve a **"WhatsApp"** → **"Configuración de la API"**
5. Click en **"Crear token permanente"**
6. Selecciona permisos necesarios:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
7. Copia el token permanente

   ```bash
   WHATSAPP_ACCESS_TOKEN=EAAExxxxxxxxx (permanente)
   ```

### 3.3 Obtener App Secret

1. En Meta Developers, ve a tu app → **"Configuración"** → **"Básica"**
2. Click en **"Mostrar"** junto a **"Clave secreta de la app"**
3. Ingresa tu contraseña de Facebook
4. Copia el App Secret

   ```bash
   WHATSAPP_APP_SECRET=abc123def456ghi789
   ```

### 3.4 Obtener Business Account ID

1. En WhatsApp Manager, ve a **"Información general"**
2. Copia el **Business Account ID**

   ```bash
   WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
   ```

### 3.5 Generar Webhook Verify Token

**Este token lo creas tú (no lo da Meta):**

```bash
# Generar token aleatorio (Linux/Mac)
openssl rand -hex 32

# Resultado ejemplo:
WHATSAPP_WEBHOOK_VERIFY_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**⚠️ GUARDA ESTE TOKEN:** Lo necesitarás en el paso 4.

---

## Paso 4: Configurar Webhook

### 4.1 URL del Webhook

Tu webhook está desplegado en:

```
https://simmerdown.muva.chat/api/webhooks/whatsapp
```

**Requisitos:**
- ✅ HTTPS (SSL certificate válido)
- ✅ Responde en <5 segundos (verificación GET)
- ✅ Responde en <20 segundos (POST messages)

### 4.2 Registrar Webhook en Meta

1. En WhatsApp Manager → **"Configuración de la API"**
2. Busca sección **"Webhook"**
3. Click en **"Editar"**
4. Ingresa:
   - **URL del webhook:** `https://simmerdown.muva.chat/api/webhooks/whatsapp`
   - **Token de verificación:** El token generado en paso 3.5

5. Click en **"Verificar y guardar"**

**Si la verificación falla:**
- ✅ Verifica que el servidor esté corriendo (`npm run dev` o PM2)
- ✅ Verifica que el token en `.env.local` coincida
- ✅ Revisa logs del servidor: `pm2 logs muva-chat`

### 4.3 Suscribirse a Eventos

Después de verificar el webhook, suscríbete a estos eventos:

1. ✅ **messages:** Mensajes entrantes de usuarios
2. ✅ **message_status:** Estado de mensajes (enviado, entregado, leído)
3. ❌ **contacts:** Opcional (actualizaciones de información de contacto)

Click en **"Administrar"** → Selecciona eventos → **"Guardar"**

---

## Paso 5: Configurar Variables de Entorno

### 5.1 Editar `.env.local`

Abre el archivo `.env.local` en el proyecto y actualiza:

```bash
# WhatsApp Business Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID=109876543210987          # Paso 3.1
WHATSAPP_ACCESS_TOKEN=EAAExxxxxxxxxxx             # Paso 3.2
WHATSAPP_WEBHOOK_VERIFY_TOKEN=a1b2c3d4e5f6g7h8    # Paso 3.5
WHATSAPP_APP_SECRET=abc123def456ghi789            # Paso 3.3
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345      # Paso 3.4

# Simmerdown Tenant ID (ya configurado)
SIMMERDOWN_TENANT_ID=b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
```

### 5.2 Reiniciar Servidor

**Development:**
```bash
./scripts/dev-with-keys.sh
```

**Production (VPS):**
```bash
pm2 restart muva-chat
```

---

## Paso 6: Testing

### 6.1 Test de Verificación Webhook (GET)

```bash
curl -X GET 'https://simmerdown.muva.chat/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=a1b2c3d4e5f6g7h8&hub.challenge=TEST123'

# Resultado esperado:
TEST123
```

### 6.2 Test de Mensaje Manual

1. Abre WhatsApp en tu teléfono
2. Guarda el número de negocio como contacto
3. Envía un mensaje de prueba: `Hola, ¿tienen disponibilidad?`

**Verificar logs:**

```bash
# Development
Ver consola donde está corriendo npm run dev

# Production
pm2 logs muva-chat

# Buscar líneas:
[WhatsApp Webhook] Message received: { from: '573001234567', text: 'Hola...' }
```

### 6.3 Test de Envío de Mensaje

Crea un script de prueba `scripts/test-whatsapp.ts`:

```typescript
import { createWhatsAppClient } from '../src/lib/whatsapp/client';

async function testSendMessage() {
  const client = createWhatsAppClient();

  const messageId = await client.sendTextMessage(
    '+573001234567', // Tu número de teléfono
    '¡Hola! Este es un mensaje de prueba desde Simmerdown Guest House.'
  );

  console.log('✅ Mensaje enviado:', messageId);
}

testSendMessage();
```

**Ejecutar:**

```bash
set -a && source .env.local && set +a && npx tsx scripts/test-whatsapp.ts
```

**Resultado esperado:**
- ✅ Recibes el mensaje en WhatsApp
- ✅ Console muestra: `✅ Mensaje enviado: wamid.xxx`

---

## Troubleshooting

### Error: "Webhook verification failed"

**Causa:** Token de verificación no coincide

**Solución:**
1. Verifica que `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en `.env.local` sea exactamente igual al que configuraste en Meta
2. Reinicia el servidor: `pm2 restart muva-chat`
3. Vuelve a verificar webhook en Meta

---

### Error: "Invalid signature"

**Causa:** App Secret incorrecto o payload corrupto

**Solución:**
1. Verifica `WHATSAPP_APP_SECRET` en `.env.local`
2. Ve a Meta Developers → App → Configuración → Básica
3. Copia el App Secret correcto
4. Reinicia servidor

---

### Error: "Invalid access token"

**Causa:** Token expirado o revocado

**Solución:**
1. Genera nuevo token en WhatsApp Manager → Configuración API
2. Actualiza `WHATSAPP_ACCESS_TOKEN` en `.env.local`
3. Reinicia servidor

---

### Error: "Rate limit exceeded" (Code 130429)

**Causa:** Excediste límites de mensajes/día

**Límites:**
- Sin verificación: 250 conversaciones/día
- Con verificación: 1,000 conversaciones/día
- Con aprobación: 10,000+ conversaciones/día

**Solución:**
1. Espera 24 horas para reset
2. Solicita aumento de límites en WhatsApp Manager → Configuración API
3. Implementa rate limiting en código (FASE 1)

---

### No recibo mensajes en el webhook

**Checklist:**
1. ✅ Webhook verificado en Meta (estado: "Conectado")
2. ✅ Servidor corriendo (`pm2 list` muestra `online`)
3. ✅ SSL certificate válido (`https://simmerdown.muva.chat` accesible)
4. ✅ Firewall permite puerto 443 (HTTPS)
5. ✅ Eventos suscritos en Meta (messages, message_status)

**Debug:**
```bash
# Ver logs en tiempo real
pm2 logs muva-chat --lines 100
```

---

### Mensaje enviado pero no llega a WhatsApp

**Checklist:**
1. ✅ Access token válido y con permisos correctos
2. ✅ Phone Number ID correcto
3. ✅ Número de destino en formato E.164 (`573001234567`, sin `+`)
4. ✅ Usuario no bloqueó el número de negocio

**Test manual:**
```bash
curl -X POST "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573001234567",
    "type": "text",
    "text": { "body": "Test" }
  }'
```

---

## 📚 Referencias Oficiales

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Error Codes Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

---

## ✅ Siguiente Paso

Una vez completado este setup, estás listo para **FASE 1: Core Messaging**.

Ver `TODO.md` para las siguientes tareas.

---

**Última actualización:** 2025-10-16
**Autor:** Claude AI (MUVA Development Team)
