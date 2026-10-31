// Creates the Pro monthly + yearly plans in Razorpay and prints the ids for your .env.
//   npm run razorpay:plans
// Uses RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and the display prices VITE_PRICE_MONTHLY / VITE_PRICE_YEARLY
// (INR). Run it ONCE per Razorpay account/mode. Re-running creates duplicate plans.

const keyId = process.env.RAZORPAY_KEY_ID
const secret = process.env.RAZORPAY_KEY_SECRET
if (!keyId || !secret) {
  console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env')
  process.exit(1)
}
if (process.env.RAZORPAY_PLAN_MONTHLY || process.env.RAZORPAY_PLAN_YEARLY) {
  console.error('RAZORPAY_PLAN_MONTHLY / RAZORPAY_PLAN_YEARLY are already set. Remove them first if you really want new plans.')
  process.exit(1)
}

const monthly = Number(process.env.VITE_PRICE_MONTHLY || 499)
const yearly = Number(process.env.VITE_PRICE_YEARLY || 4999)
const auth = 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64')
console.log(`Mode: ${keyId.startsWith('rzp_live') ? 'LIVE' : 'TEST'}`)

async function createPlan(period, amountInr, name) {
  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      period,
      interval: 1,
      item: { name, amount: Math.round(amountInr * 100), currency: 'INR', description: `${name} (GST included where applicable)` },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${name}: ${json?.error?.description ?? res.status}`)
  return json.id
}

try {
  const m = await createPlan('monthly', monthly, 'Frameflow Pro Monthly')
  const y = await createPlan('yearly', yearly, 'Frameflow Pro Yearly')
  console.log('\nAdd these to .env (and to Vercel env vars):\n')
  console.log(`RAZORPAY_PLAN_MONTHLY=${m}`)
  console.log(`RAZORPAY_PLAN_YEARLY=${y}\n`)
} catch (e) {
  console.error('Failed:', e.message)
  process.exit(1)
}
