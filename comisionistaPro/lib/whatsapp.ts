export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp] Faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN')
    return false
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[WhatsApp] Error enviando mensaje:', err)
    return false
  }

  return true
}
