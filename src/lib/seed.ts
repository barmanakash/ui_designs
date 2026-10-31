// Seed content for demo mode (no Supabase) AND for `npm run seed`.
// ⚠ Every entry is a PLACEHOLDER: fictional titles, generated placeholder art,
// "Placeholder Studio" credit. Replace via /admin with real, properly credited work.
// Keep imports relative: this file is also run by Node (scripts/seed.ts).
import type { AdminDesign, Design, Job, ProContent } from '../types'
import { label, slugify } from './constants'

type Entry = {
  title: string
  flow: string
  industry: string
  platform: 'web' | 'mobile'
  tags: string[]
  color: string
  description: string
  /** [layout, typography, color, psychology] */
  notes: [string, string, string, string]
  free?: boolean
}

const ENTRIES: Entry[] = [
  { title: 'Agent Run Timeline', flow: 'agent-workflow', industry: 'ai-agents', platform: 'web', tags: ['transparency', 'dark-ui', 'progress'], color: '#4f46e5',
    description: 'A vertical timeline that narrates every step an AI agent takes, with live status and expandable detail.',
    notes: ['A single left rail holds status dots; cards hang off it so the eye reads top to bottom like a log.', 'Monospace for tool names, sans for human summaries, so machine and human text are instantly separable.', 'Indigo marks the active step; completed steps drop to neutral so only one thing demands attention.', 'Showing work reduces anxiety about autonomous actions and builds calibrated trust.'] },
  { title: 'Approve Before Acting', flow: 'agent-workflow', industry: 'ai-agents', platform: 'web', tags: ['human-in-the-loop', 'trust', 'security'], color: '#d97706',
    description: 'An inline approval card where the agent pauses before a risky action and shows exactly what will change.',
    notes: ['The approval card sits inside the conversation flow instead of a modal, keeping context visible.', 'The action sentence is set larger than its parameters, so the decision is readable at a glance.', 'Amber signals caution without the alarm of red; the approve button stays the single filled element.', 'Explicit consent at the moment of risk gives users control and makes autonomy feel safe.'] },
  { title: 'Prompt-First Home', flow: 'chat', industry: 'ai-agents', platform: 'web', tags: ['minimal', 'friendly'], color: '#7c3aed',
    description: 'A near-empty home screen where one large prompt box and a few suggestion chips are the entire interface.',
    notes: ['Centered single column with a wide input and generous whitespace, so the first action is obvious.', 'A serif greeting adds warmth; the input text is a large neutral sans.', 'Violet appears only on the focus ring and send button.', 'Suggestion chips lower the blank-page barrier by turning "what can I ask" into one tap.'] },
  { title: 'Agent Tool Call Inspector', flow: 'dashboard', industry: 'ai-agents', platform: 'web', tags: ['dense', 'dark-ui', 'transparency'], color: '#334155',
    description: 'A developer panel listing tool calls with latency, tokens, inputs and outputs in a compact table.',
    notes: ['A split view: list on the left, selected call detail on the right, so context never gets lost.', 'Tight line height and tabular numerals make columns of latency and tokens scannable.', 'A slate palette keeps chrome quiet; only errors and slow calls get color.', 'Power users want density and traceability; surfacing raw data earns credibility.'] },
  { title: 'Voice Agent Onboarding', flow: 'onboarding', industry: 'ai-agents', platform: 'mobile', tags: ['progress', 'friendly'], color: '#0284c7',
    description: 'A three-step mobile onboarding that asks for microphone access only after explaining the benefit.',
    notes: ['One decision per screen with a bottom-anchored primary button in thumb reach.', 'Large rounded headings with short, spoken-style body copy.', 'Sky blue with soft gradients feels calm, fitting a voice product.', 'Priming before the system permission prompt raises opt-in rates because users understand the why.'] },
  { title: 'Empty Workspace Nudge', flow: 'empty-state', industry: 'ai-agents', platform: 'web', tags: ['minimal', 'friendly'], color: '#059669',
    description: 'An illustration-free empty state that offers three starter templates instead of a blank canvas.',
    notes: ['A centered card grid replaces the void, with the recommended template visually first.', 'Short verb-led titles ("Summarise inbox") beat abstract names.', 'Emerald accents suggest go and growth against a neutral field.', 'Templates convert curiosity into a first success quickly, which drives activation.'] },
  { title: 'Agent Memory Settings', flow: 'settings', industry: 'ai-agents', platform: 'web', tags: ['toggles', 'security', 'trust'], color: '#334155',
    description: 'Settings that let people see, edit and delete what an AI agent remembers about them.',
    notes: ['Grouped rows with a plain-language explanation under each toggle.', 'Labels are nouns, helper text is a full sentence, so scanning and reading both work.', 'Neutral slate with one accent on enabled switches keeps the page calm.', 'Visible control over personal data builds trust and reduces perceived creepiness.'] },
  { title: 'Agent Failure Recovery', flow: 'error-state', industry: 'ai-agents', platform: 'web', tags: ['friendly', 'transparency'], color: '#e11d48',
    description: 'An honest error card that says what failed, what was saved, and offers retry or hand-off.',
    notes: ['The error replaces only the failed step, so completed work stays on screen.', 'A plain headline states the problem; technical detail is collapsed beneath.', 'Rose is limited to the icon and a thin border, avoiding a wall of red.', 'Naming what was preserved restores a sense of progress and lowers frustration.'] },
  { title: 'Streaming Answer with Sources', flow: 'chat', industry: 'ai-agents', platform: 'mobile', tags: ['transparency', 'minimal'], color: '#4f46e5',
    description: 'A mobile chat answer that streams in, with numbered source chips that open a bottom sheet.',
    notes: ['Answer text uses the full width; sources collapse into a horizontal chip row.', 'Body at 16px with generous line height for sustained reading.', 'Indigo is used only for citation numbers, making them feel tappable.', 'Visible citations let people verify claims, which increases trust in AI answers.'] },
  { title: 'UPI Scan & Pay', flow: 'checkout', industry: 'upi-payments', platform: 'mobile', tags: ['friendly', 'minimal'], color: '#4f46e5', free: true,
    description: 'A camera-first scan screen that resolves the merchant and drops straight into an amount keypad.',
    notes: ['The viewfinder fills the screen; the amount sheet slides up only after a successful scan.', 'The amount is set at 48px or more, the single most important number on the screen.', 'Indigo frames the scan target; everything else is monochrome for focus.', 'Reducing steps between intent and payment cuts abandonment at the moment of highest motivation.'] },
  { title: 'UPI PIN Entry', flow: 'checkout', industry: 'upi-payments', platform: 'mobile', tags: ['security', 'trust', 'minimal'], color: '#334155',
    description: 'A focused PIN pad that repeats the payee and amount above the keypad.',
    notes: ['A fixed numeric keypad occupies the lower half; the summary stays pinned above.', 'Large digits with ample hit areas; masked dots show progress without revealing input.', 'A quiet slate theme avoids anything that feels decorative at a sensitive moment.', 'Echoing payee and amount lets users catch mistakes right before commitment.'] },
  { title: 'Payment Success Burst', flow: 'confirmation', industry: 'upi-payments', platform: 'mobile', tags: ['celebration', 'friendly'], color: '#059669',
    description: 'A brief animated success state with amount, reference number and a clear next action.',
    notes: ['A centered check draws in, then details fade in below in reading order.', 'The amount is largest; the reference ID is small monospace you can copy.', 'Emerald signals completion with strong, universal meaning.', 'A moment of delight rewards the user and a visible receipt removes doubt that it worked.'] },
  { title: 'Payment Failed, Money Safe', flow: 'error-state', industry: 'upi-payments', platform: 'mobile', tags: ['trust', 'transparency'], color: '#e11d48',
    description: 'A failure screen that leads with reassurance about funds and shows a refund timeline.',
    notes: ['Reassurance is the headline, the failure reason second, retry third.', 'A short timeline uses small numerals and clear dates so expectations are explicit.', 'Rose appears on the icon only; the body is calm neutral.', 'People fear losing money more than failing a task, so addressing that first de-escalates support tickets.'] },
  { title: 'Recent Contacts Pay Home', flow: 'dashboard', industry: 'upi-payments', platform: 'mobile', tags: ['friendly', 'minimal'], color: '#7c3aed',
    description: 'A payments home built around a row of recent contacts and four large shortcuts.',
    notes: ['Avatars in a horizontal scroller sit above a 2x2 shortcut grid; balances are secondary.', 'Names are medium weight; section titles are small caps-like labels.', 'Violet avatars rings add personality while the rest stays neutral.', 'People pay people, so putting people first matches the most frequent task.'] },
  { title: 'Split Bill Composer', flow: 'checkout', industry: 'wallet', platform: 'mobile', tags: ['friendly', 'progress'], color: '#d97706',
    description: 'A split-bill screen with equal and custom modes and live per-person totals.',
    notes: ['A segmented control switches modes; rows update instantly beneath it.', 'Per-person amounts are right-aligned tabular numerals for easy comparison.', 'Amber highlights unassigned remainder so the total always reconciles.', 'Real-time arithmetic removes the social awkwardness of calculating by hand.'] },
  { title: 'Transaction History Grouped', flow: 'history', industry: 'upi-payments', platform: 'mobile', tags: ['minimal', 'dense'], color: '#0284c7', free: true,
    description: 'A history list grouped by day with sticky headers, search and status icons.',
    notes: ['Sticky date headers anchor position during long scrolls; search is always one tap away.', 'Merchant name in medium weight, metadata in muted small text, amount right-aligned.', 'Color is reserved for status: failed and pending are the only tinted rows.', 'Grouping and status-only color let people find "that payment" fast without cognitive load.'] },
  { title: 'Autopay Mandate Manager', flow: 'settings', industry: 'upi-payments', platform: 'mobile', tags: ['toggles', 'trust', 'security'], color: '#334155',
    description: 'A list of recurring mandates with next-debit dates, limits and a one-tap pause.',
    notes: ['Each mandate is a card with the next debit date as the most prominent element.', 'Amounts and dates use tabular numerals; merchant names lead each card.', 'Neutral slate with a single accent for the pause action.', 'Easy pause and clear dates make recurring payments feel safe rather than sneaky.'] },
  { title: 'KYC in Three Steps', flow: 'onboarding', industry: 'banking', platform: 'mobile', tags: ['progress', 'trust', 'security'], color: '#059669',
    description: 'A step-by-step KYC flow with a progress bar, time estimate and saved progress.',
    notes: ['A persistent top progress bar and step count set expectations for a long flow.', 'Each step has one question and a short reason why the data is needed.', 'Emerald progress fill gives a steady sense of forward motion.', 'Time estimates and save-and-resume lower drop-off in a high-friction flow.'] },
  { title: 'Net-Worth Dashboard', flow: 'dashboard', industry: 'investing', platform: 'web', tags: ['charts', 'dense'], color: '#4f46e5',
    description: 'A wealth dashboard with a headline net-worth number, a trend chart and asset breakdown cards.',
    notes: ['A hero number and sparkline top the page, with allocation cards in a responsive grid below.', 'The headline figure uses the display serif; supporting numbers use tabular sans.', 'Indigo for the primary series; gains and losses use success and danger colors sparingly.', 'Leading with one summary number answers "how am I doing" before any detail.'] },
  { title: 'SIP Setup Wizard', flow: 'onboarding', industry: 'investing', platform: 'mobile', tags: ['progress', 'friendly'], color: '#7c3aed', free: true,
    description: 'A short wizard with an amount slider and a live projection of long-term value.',
    notes: ['Slider, projection and CTA stack in one screen so cause and effect are visible together.', 'The projected value is the largest number; assumptions sit below in small muted text.', 'Violet gradient on the slider track draws the eye to the one interactive element.', 'Immediate feedback on a future outcome makes an abstract habit feel concrete.'] },
  { title: 'Loan Offer Breakdown', flow: 'checkout', industry: 'lending', platform: 'web', tags: ['transparency', 'trust'], color: '#d97706',
    description: 'A loan offer page that itemises EMI, interest, fees and total repayable with an interactive tenure.',
    notes: ['A two-column layout keeps the calculator left and the summary receipt right.', 'Numbers are tabular and aligned; fees are listed individually, not bundled.', 'Amber highlights the total cost so it cannot be missed.', 'Upfront cost transparency builds credibility and reduces regret and support load.'] },
  { title: 'Card Controls Panel', flow: 'settings', industry: 'banking', platform: 'mobile', tags: ['toggles', 'security'], color: '#0284c7',
    description: 'A card control screen with instant freeze, online and international toggles and limits.',
    notes: ['A card visual on top confirms which card is being edited; toggles list below.', 'Toggle labels are short; consequences appear as one-line helper text.', 'Sky blue is used for on-state; a frozen card turns the visual grayscale.', 'Instant, reversible controls give a feeling of safety that reduces fear of fraud.'] },
  { title: 'Empty Transactions State', flow: 'empty-state', industry: 'wallet', platform: 'mobile', tags: ['friendly', 'minimal'], color: '#059669',
    description: 'A first-use empty state that explains what will appear and offers a single add-money action.',
    notes: ['An icon, a one-line promise and one button, vertically centered with room to breathe.', 'The headline is benefit-led, not "No data".', 'Emerald CTA on a neutral field is the only color on screen.', 'Treating emptiness as a first step, not a dead end, prompts the first transaction.'] },
  { title: 'Merchant Checkout Sheet', flow: 'checkout', industry: 'upi-payments', platform: 'web', tags: ['trust', 'minimal'], color: '#e11d48',
    description: 'A web checkout bottom sheet with a UPI app picker, QR fallback and order summary.',
    notes: ['The sheet keeps the order visible behind it; app icons are the primary targets.', 'The total is bold at the top; secondary methods use smaller text links.', 'Rose branding is limited to the pay button so the sheet reads as neutral and safe.', 'Showing familiar app icons leverages recognition over recall and speeds the choice.'] },
]

// ── Code snippets (React + Tailwind), one template per flow group ──────────
const TEMPLATES: Record<string, string> = {
  checkout: `import { useState } from 'react'

export default function PayCard() {
  const [amount, setAmount] = useState('250')
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-6">
      <p className="text-sm text-neutral-500">Paying</p>
      <p className="mt-1 text-lg font-semibold">Chai Point · chai@upi</p>
      <label htmlFor="amt" className="mt-6 block text-sm text-neutral-500">Amount</label>
      <div className="flex items-baseline gap-1 border-b border-neutral-200 pb-2">
        <span className="text-3xl text-neutral-400">₹</span>
        <input
          id="amt"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\\D/g, ''))}
          className="w-full bg-transparent text-5xl font-semibold outline-none"
        />
      </div>
      <button className="mt-6 w-full rounded-2xl bg-[__ACCENT__] py-4 font-semibold text-white active:scale-[0.98]">
        Pay ₹{amount || 0}
      </button>
      <p className="mt-3 text-center text-xs text-neutral-500">Secured by UPI · No extra charges</p>
    </div>
  )
}`,
  confirmation: `export default function Success() {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[__ACCENT__] text-3xl text-white">✓</div>
      <h2 className="mt-4 text-xl font-semibold">Payment successful</h2>
      <p className="mt-1 text-5xl font-semibold">₹250</p>
      <p className="mt-2 text-sm text-neutral-500">to Chai Point</p>
      <p className="mt-4 rounded-xl bg-neutral-100 px-3 py-2 font-mono text-xs">Ref 4182 9931 0027</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="rounded-xl border border-neutral-200 py-3 text-sm font-medium">Share receipt</button>
        <button className="rounded-xl bg-[__ACCENT__] py-3 text-sm font-medium text-white">Done</button>
      </div>
    </div>
  )
}`,
  dashboard: `const stats = [
  { label: 'Total', value: '₹4,82,300', delta: '+4.2%' },
  { label: 'This month', value: '₹38,120', delta: '+1.1%' },
  { label: 'Pending', value: '₹2,400', delta: '' },
]
const bars = [40, 65, 52, 80, 70, 95, 60]

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            {s.delta && <p className="text-xs text-emerald-600">{s.delta}</p>}
          </div>
        ))}
      </div>
      <div className="flex h-40 items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
        {bars.map((h, i) => (
          <div key={i} style={{ height: h + '%' }} className="flex-1 rounded-t-lg bg-[__ACCENT__]" />
        ))}
      </div>
    </div>
  )
}`,
  chat: `import { useState } from 'react'

export default function Chat() {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hi! What would you like to do?' }])
  const [input, setInput] = useState('')
  const send = () => {
    if (!input.trim()) return
    setMessages((m) => [...m, { role: 'user', text: input }, { role: 'ai', text: 'On it. Working on: ' + input }])
    setInput('')
  }
  return (
    <div className="mx-auto flex h-[520px] max-w-xl flex-col rounded-3xl border border-neutral-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
            <p className={'max-w-[80%] rounded-2xl px-4 py-2 text-sm ' + (m.role === 'user' ? 'bg-[__ACCENT__] text-white' : 'bg-neutral-100')}>
              {m.text}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-neutral-200 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask anything" className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
        <button onClick={send} className="rounded-xl bg-[__ACCENT__] px-4 text-sm font-medium text-white">Send</button>
      </div>
    </div>
  )
}`,
  'agent-workflow': `const steps = [
  { title: 'Read inbox', detail: '12 emails scanned', status: 'done' },
  { title: 'Draft replies', detail: '3 drafts created', status: 'done' },
  { title: 'Send to Priya', detail: 'Waiting for your approval', status: 'active' },
  { title: 'Archive thread', detail: '', status: 'todo' },
]

export default function AgentRun() {
  return (
    <ol className="mx-auto max-w-md space-y-0 p-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-neutral-200" />}
          <span className={'mt-1 h-6 w-6 shrink-0 rounded-full border-2 ' +
            (s.status === 'done' ? 'border-[__ACCENT__] bg-[__ACCENT__]' : s.status === 'active' ? 'border-[__ACCENT__] bg-white' : 'border-neutral-300 bg-white')} />
          <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-sm font-medium">{s.title}</p>
            {s.detail && <p className="text-xs text-neutral-500">{s.detail}</p>}
            {s.status === 'active' && (
              <div className="mt-2 flex gap-2">
                <button className="rounded-lg bg-[__ACCENT__] px-3 py-1.5 text-xs font-medium text-white">Approve</button>
                <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs">Edit</button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}`,
  onboarding: `import { useState } from 'react'

const steps = [
  { title: 'Welcome', body: 'Set up in under a minute.' },
  { title: 'Your goal', body: 'Tell us what you want to achieve.' },
  { title: 'All set', body: 'You can change this anytime.' },
]

export default function Onboarding() {
  const [i, setI] = useState(0)
  const s = steps[i]
  return (
    <div className="mx-auto flex min-h-[520px] max-w-sm flex-col rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="h-1.5 rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-[__ACCENT__] transition-all" style={{ width: ((i + 1) / steps.length) * 100 + '%' }} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">Step {i + 1} of {steps.length}</p>
      <div className="flex flex-1 flex-col justify-center">
        <h2 className="text-3xl font-semibold">{s.title}</h2>
        <p className="mt-2 text-neutral-500">{s.body}</p>
      </div>
      <button onClick={() => setI((n) => Math.min(n + 1, steps.length - 1))}
        className="w-full rounded-2xl bg-[__ACCENT__] py-4 font-semibold text-white">
        {i === steps.length - 1 ? 'Finish' : 'Continue'}
      </button>
    </div>
  )
}`,
  settings: `import { useState } from 'react'

const rows = [
  { id: 'a', title: 'Online payments', help: 'Allow card use on websites and apps.' },
  { id: 'b', title: 'International use', help: 'Allow transactions outside India.' },
  { id: 'c', title: 'Contactless', help: 'Tap to pay at terminals.' },
]

export default function Settings() {
  const [on, setOn] = useState<Record<string, boolean>>({ a: true })
  return (
    <ul className="mx-auto max-w-md divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-neutral-500">{r.help}</p>
          </div>
          <button role="switch" aria-checked={!!on[r.id]} aria-label={r.title}
            onClick={() => setOn((s) => ({ ...s, [r.id]: !s[r.id] }))}
            className={'relative h-6 w-11 rounded-full transition ' + (on[r.id] ? 'bg-[__ACCENT__]' : 'bg-neutral-300')}>
            <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition ' + (on[r.id] ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </li>
      ))}
    </ul>
  )
}`,
  state: `export default function StateCard() {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-2xl">✦</div>
      <h2 className="mt-4 text-xl font-semibold">Nothing here yet</h2>
      <p className="mt-1 text-sm text-neutral-500">Your activity will show up here once you get started.</p>
      <button className="mt-6 w-full rounded-2xl bg-[__ACCENT__] py-3 font-semibold text-white">Get started</button>
      <button className="mt-2 w-full rounded-2xl py-3 text-sm text-neutral-500">Learn more</button>
    </div>
  )
}`,
  history: `const groups = [
  { day: 'Today', items: [{ name: 'Chai Point', amt: -250, ok: true }, { name: 'Aarav', amt: 1200, ok: true }] },
  { day: 'Yesterday', items: [{ name: 'Metro Recharge', amt: -500, ok: false }] },
]

export default function History() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white">
      {groups.map((g) => (
        <section key={g.day}>
          <h3 className="sticky top-0 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{g.day}</h3>
          <ul className="divide-y divide-neutral-100">
            {g.items.map((t) => (
              <li key={t.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  {!t.ok && <p className="text-xs text-rose-600">Failed · refund in 3 days</p>}
                </div>
                <p className={'text-sm font-semibold tabular-nums ' + (t.amt > 0 ? 'text-emerald-600' : '')}>
                  {t.amt > 0 ? '+' : '−'}₹{Math.abs(t.amt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}`,
}

const templateFor = (flow: string) =>
  TEMPLATES[flow] ?? (flow === 'empty-state' || flow === 'error-state' ? TEMPLATES.state : TEMPLATES.checkout)

function build(e: Entry, i: number): AdminDesign {
  const dark = e.tags.includes('dark-ui')
  const teardown = [
    `## Layout\n${e.notes[0]}`,
    `## Typography\n${e.notes[1]}`,
    `## Color\n${e.notes[2]}`,
    `## Why it works\n${e.notes[3]}`,
    `## Steal this\n- Start with the single most important element and size it first.\n- Keep one accent color for the primary action only.\n- Borrow the **${label(e.tags[0])}** approach, then adapt copy to your product.`,
  ].join('\n\n')
  const code = templateFor(e.flow).replaceAll('__ACCENT__', e.color)
  const prompt =
    `Build a ${e.platform} ${label(e.flow).toLowerCase()} screen for a ${label(e.industry).toLowerCase()} product using React 18 + Tailwind CSS.\n\n` +
    `Brief: ${e.description}\n\n` +
    `Requirements:\n- Layout: ${e.notes[0]}\n- Typography: ${e.notes[1]}\n- Color: use ${e.color} as the single accent. ${e.notes[2]}\n` +
    `- Psychology to preserve: ${e.notes[3]}\n- Fully responsive (start at 375px), keyboard accessible, visible focus rings, AA contrast.\n` +
    `- Output one default-exported component with realistic placeholder data. No external UI libraries.`
  return {
    id: `seed-${i + 1}`,
    slug: slugify(e.title),
    title: e.title,
    description: e.description,
    image_url: '/seed/placeholder.svg', // PLACEHOLDER art; rendered synthetically from colors
    video_url: null,
    source_url: 'https://example.com/placeholder-source',
    author_name: 'Placeholder Studio',
    author_url: 'https://example.com',
    flow_type: e.flow,
    industry: e.industry,
    platform: e.platform,
    tags: e.tags,
    dominant_colors: [e.color, dark ? '#0b0b0f' : '#ffffff'],
    teardown_md: teardown,
    code_snippet: code,
    prompt_text: prompt,
    is_pro_content: !e.free,
    is_featured: i % 6 === 0,
    status: 'published',
    views: 120 + ((i * 37) % 400),
    saves: 10 + ((i * 13) % 90),
    created_at: new Date(Date.UTC(2026, 9, 30 - i, 9, 0, 0)).toISOString(),
  }
}

export const SEED_ADMIN_DESIGNS: AdminDesign[] = ENTRIES.map(build)

/** Paywall-safe projection: what the public view exposes. */
export const SEED_DESIGNS: Design[] = SEED_ADMIN_DESIGNS.map((d) => ({
  id: d.id, slug: d.slug, title: d.title, description: d.description, image_url: d.image_url,
  video_url: d.video_url, source_url: d.source_url, author_name: d.author_name, author_url: d.author_url,
  flow_type: d.flow_type, industry: d.industry, platform: d.platform, tags: d.tags,
  dominant_colors: d.dominant_colors, teardown_preview: d.teardown_md.slice(0, 280),
  is_pro_content: d.is_pro_content, is_featured: d.is_featured, views: d.views, saves: d.saves, created_at: d.created_at,
}))

export const SEED_PRO: Record<string, ProContent> = Object.fromEntries(
  SEED_ADMIN_DESIGNS.map((d) => [d.slug, { teardown_md: d.teardown_md, code_snippet: d.code_snippet, prompt_text: d.prompt_text }]),
)

/** Sample moodboards (by design slug). Demo mode loads them; `npm run seed` inserts them if SEED_OWNER_ID is set. */
export const SAMPLE_BOARDS = [
  { name: 'Trustworthy payments', slugs: ['upi-scan-pay', 'upi-pin-entry', 'payment-success-burst', 'payment-failed-money-safe'] },
  { name: 'Agent transparency', slugs: ['agent-run-timeline', 'approve-before-acting', 'agent-tool-call-inspector'] },
  { name: 'Onboarding ideas', slugs: ['voice-agent-onboarding', 'kyc-in-three-steps', 'sip-setup-wizard'] },
]

export const SAMPLE_JOBS: Omit<Job, 'id' | 'created_at'>[] = [
  { title: 'Senior Product Designer, Agents', company: 'Placeholder AI', location: 'Bengaluru / Remote', type: 'Full-time', apply_url: 'https://example.com/jobs/1', status: 'open' },
  { title: 'Frontend Engineer, Payments', company: 'Placeholder Pay', location: 'Mumbai', type: 'Full-time', apply_url: 'https://example.com/jobs/2', status: 'open' },
  { title: 'UX Researcher (Contract)', company: 'Placeholder Bank', location: 'Remote (India)', type: 'Contract', apply_url: 'https://example.com/jobs/3', status: 'open' },
]
