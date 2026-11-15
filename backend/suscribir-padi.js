const apiBase = 'https://padi.runasp.net';
const apiKey = process.env.PADI_API_KEY;

const response = await fetch(`${apiBase}/api/v1/integrations/webhook`, {
  method: 'PUT',
  headers: {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    webhookUrl: 'https://pad-3anq.onrender.com/api/padi/webhook',
    webhookSecret: 'secreto_super_seguro_para_rentas_tucuman_2026',
  }),
});

const data = await response.json();
console.log('Webhook configurado:', data.webhookUrl);