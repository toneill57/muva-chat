/**
 * Welcome Email Templates
 *
 * Email templates for new tenant onboarding.
 * Can be sent via Resend, SendGrid, or other email service.
 */

export interface WelcomeEmailData {
  tenant_name: string
  subdomain: string
  admin_username: string
  admin_email: string
  dashboard_url: string
}

/**
 * Generates HTML email template for new tenant welcome
 */
export function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a MUVA</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px 40px 60px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                ¡Bienvenido a MUVA! 🎉
              </h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 18px;">
                Tu plataforma está lista para usar
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Hola ${data.tenant_name},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Tu cuenta de MUVA Chat ha sido creada exitosamente. Ahora puedes empezar a gestionar tu hotel con inteligencia artificial.
              </p>

              <!-- Dashboard Access -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; border: 2px solid #3b82f6; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #eff6ff; padding: 20px;">
                    <p style="margin: 0 0 10px; color: #1e40af; font-weight: bold; font-size: 14px;">
                      🌐 Tu Dashboard
                    </p>
                    <a href="${data.dashboard_url}" style="color: #2563eb; text-decoration: none; font-size: 16px; word-break: break-all;">
                      ${data.dashboard_url}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      <strong>Username:</strong> ${data.admin_username}
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      <strong>Password:</strong> [la contraseña que elegiste]
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h2 style="margin: 40px 0 20px; color: #111827; font-size: 20px; font-weight: bold;">
                Próximos Pasos
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 28px; height: 28px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">1</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0; color: #111827; font-weight: bold; font-size: 15px;">Accede a tu Dashboard</p>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Ingresa con tus credenciales y explora las funcionalidades</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 28px; height: 28px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">2</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0; color: #111827; font-weight: bold; font-size: 15px;">Personaliza tu Branding</p>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Sube tu logo y ajusta los colores en Settings → Branding</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 28px; height: 28px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">3</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0; color: #111827; font-weight: bold; font-size: 15px;">Conecta MotoPress o Airbnb</p>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Sincroniza tus habitaciones y reservas automáticamente</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 28px; height: 28px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">4</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0; color: #111827; font-weight: bold; font-size: 15px;">Carga Documentos del Hotel</p>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Sube políticas, FAQs y manuales en Knowledge Base</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 28px; height: 28px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">5</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0; color: #111827; font-weight: bold; font-size: 15px;">Prueba el Chat de Huéspedes</p>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Comparte el link con tus huéspedes y recibe mensajes en tiempo real</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboard_url}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Ir a Mi Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Premium Features -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; border-radius: 8px; margin: 40px 0;">
                <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: bold;">
                  ✨ Incluido en tu Plan Premium
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding-bottom: 10px; color: #ffffff; font-size: 14px;">
                      ✓ Chat AI con Claude (ilimitado)
                    </td>
                    <td width="50%" style="padding-bottom: 10px; color: #ffffff; font-size: 14px;">
                      ✓ Contenido turístico MUVA
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 10px; color: #ffffff; font-size: 14px;">
                      ✓ Integraciones MotoPress/Airbnb
                    </td>
                    <td style="padding-bottom: 10px; color: #ffffff; font-size: 14px;">
                      ✓ Cumplimiento SIRE automático
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #ffffff; font-size: 14px;">
                      ✓ Chat para staff interno
                    </td>
                    <td style="color: #ffffff; font-size: 14px;">
                      ✓ Reportes y analytics
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <a href="mailto:support@muva.chat" style="color: #3b82f6; text-decoration: none;">support@muva.chat</a>
              </p>
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">
                © 2025 MUVA Chat. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generates plain text email template for new tenant welcome
 */
export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  return `
¡Bienvenido a MUVA! 🎉

Hola ${data.tenant_name},

Tu cuenta de MUVA Chat ha sido creada exitosamente. Ahora puedes empezar a gestionar tu hotel con inteligencia artificial.

TU DASHBOARD
============
URL: ${data.dashboard_url}
Username: ${data.admin_username}
Password: [la contraseña que elegiste]

PRÓXIMOS PASOS
==============

1. Accede a tu Dashboard
   Ingresa con tus credenciales y explora las funcionalidades

2. Personaliza tu Branding
   Sube tu logo y ajusta los colores en Settings → Branding

3. Conecta MotoPress o Airbnb
   Sincroniza tus habitaciones y reservas automáticamente

4. Carga Documentos del Hotel
   Sube políticas, FAQs y manuales en Knowledge Base

5. Prueba el Chat de Huéspedes
   Comparte el link con tus huéspedes y recibe mensajes en tiempo real

INCLUIDO EN TU PLAN PREMIUM
============================
✓ Chat AI con Claude (ilimitado)
✓ Contenido turístico MUVA
✓ Integraciones MotoPress/Airbnb
✓ Cumplimiento SIRE automático
✓ Chat para staff interno
✓ Reportes y analytics

¿Necesitas ayuda?
Contáctanos en support@muva.chat

© 2025 MUVA Chat. Todos los derechos reservados.
  `.trim()
}

/**
 * Sends welcome email to new tenant
 *
 * NOTE: You need to implement actual email sending here using:
 * - Resend (recommended): https://resend.com
 * - SendGrid: https://sendgrid.com
 * - AWS SES: https://aws.amazon.com/ses
 *
 * For now, this is a placeholder that logs the email.
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    const html = generateWelcomeEmailHTML(data)
    const text = generateWelcomeEmailText(data)

    console.log('[welcome-email] Sending email to:', data.admin_email)
    console.log('[welcome-email] Subject: Bienvenido a MUVA - Tu cuenta está lista')

    // TODO: Implement actual email sending here
    // Example with Resend:
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'MUVA <noreply@muva.chat>',
    //   to: data.admin_email,
    //   subject: 'Bienvenido a MUVA - Tu cuenta está lista',
    //   html: html,
    //   text: text
    // })

    console.log('[welcome-email] ✅ Email would be sent (placeholder)')
    console.log('[welcome-email] HTML length:', html.length)
    console.log('[welcome-email] Text length:', text.length)

    return true
  } catch (error: any) {
    console.error('[welcome-email] ❌ Error sending email:', error)
    return false
  }
}
