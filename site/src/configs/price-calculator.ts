// The rate card behind the offer page's calculator, and the arithmetic that
// turns answers into a figure.
//
// The figure is worked out HERE, not by the AI assistant. A model asked to
// multiply will sometimes multiply wrong, and a wrong price on a public page
// is a commercial problem rather than a cosmetic one. The assistant is given
// the finished figure and writes the two or three sentences around it - what
// in these particular answers moves it, and what would bring it down - which
// is the part no table can do.
//
// Everything priced below is a delta on the base. Each one is a range,
// because an honest quote before a conversation is a range; the low end is
// what it costs when the answer is simple and the high end when it is not.
// To change what the page quotes, change the numbers here and nothing else.

export type Money = { setup: [number, number], monthly: [number, number], weeks: [number, number] }

export interface CalculatorOption {
  id: string
  label: { uk: string, en: string, de: string }
  add: Partial<Money>
}

export interface CalculatorQuestion {
  id: string
  label: { uk: string, en: string, de: string }
  options: CalculatorOption[]
}

// What any site costs before a single answer: the design, the content
// modelling, putting it together and half a day teaching the client's person
// to use it.
// The low end is $4,000 on purpose: the cards further up the same page
// quote "from $4,000", and a calculator on that page that can answer $3,000
// contradicts them in front of the reader.
export const BASE: Money = { setup: [4000, 5500], monthly: [0, 0], weeks: [2, 3] }

// The six questions are the six lines the page already lists under "what
// moves the price" - in the same order, so a reader recognises them.
export const QUESTIONS: CalculatorQuestion[] = [
  {
    id: 'languages',
    label: {
      uk: 'Скільки мов',
      en: 'How many languages',
      de: 'Wie viele Sprachen',
    },
    options: [
      { id: 'one', label: { uk: 'Одна', en: 'One', de: 'Eine' }, add: {} },
      { id: 'two', label: { uk: 'Дві', en: 'Two', de: 'Zwei' }, add: { setup: [500, 800] } },
      { id: 'three', label: { uk: 'Три', en: 'Three', de: 'Drei' }, add: { setup: [900, 1500] } },
      { id: 'more', label: { uk: 'Більше трьох', en: 'More than three', de: 'Mehr als drei' }, add: { setup: [1600, 2600], weeks: [1, 1] } },
    ],
  },
  {
    id: 'blocks',
    label: {
      uk: 'Скільки потрібно розділів, яких немає в галереї готових блоків',
      en: 'How many sections you need that are not in the library of ready-made blocks',
      de: 'Wie viele Abschnitte Sie brauchen, die es in der Bibliothek fertiger Blöcke nicht gibt',
    },
    options: [
      { id: 'none', label: { uk: 'Жодного — вистачить готових', en: 'None — the library is enough', de: 'Keine — die Bibliothek reicht' }, add: {} },
      { id: 'few', label: { uk: 'Один-три', en: 'One to three', de: 'Einen bis drei' }, add: { setup: [800, 1400] } },
      { id: 'several', label: { uk: 'Чотири-вісім', en: 'Four to eight', de: 'Vier bis acht' }, add: { setup: [2000, 3600], weeks: [1, 2] } },
      { id: 'many', label: { uk: 'Більше восьми', en: 'More than eight', de: 'Mehr als acht' }, add: { setup: [4000, 7000], weeks: [2, 4] } },
    ],
  },
  {
    id: 'migration',
    label: {
      uk: 'Чи треба переносити контент із наявного сайту',
      en: 'Whether content has to be moved across from an existing site',
      de: 'Ob Inhalte von einer bestehenden Website übernommen werden müssen',
    },
    options: [
      { id: 'no', label: { uk: 'Ні, починаємо з нуля', en: 'No, we start from scratch', de: 'Nein, wir fangen neu an' }, add: {} },
      { id: 'part', label: { uk: 'Частково', en: 'Partly', de: 'Teilweise' }, add: { setup: [400, 900] } },
      { id: 'all', label: { uk: 'Весь сайт', en: 'The whole site', de: 'Die ganze Website' }, add: { setup: [1200, 2500], weeks: [1, 1] } },
    ],
  },
  {
    id: 'accounts',
    label: {
      uk: 'Чи потрібні кабінети відвідувачів і відповіді з Telegram',
      en: 'Whether you want visitor accounts and answers from Telegram',
      de: 'Ob Sie Besucherkonten und Antworten aus Telegram möchten',
    },
    options: [
      { id: 'no', label: { uk: 'Досить звичайної форми', en: 'A plain form is enough', de: 'Ein einfaches Formular genügt' }, add: {} },
      { id: 'yes', label: { uk: 'Так, це головне, що мені треба', en: 'Yes — that is the part I want', de: 'Ja, genau das möchte ich' }, add: { setup: [700, 1200], monthly: [0, 30] } },
    ],
  },
  {
    id: 'hosting',
    label: {
      uk: 'Де живе сайт',
      en: 'Where the site lives',
      de: 'Wo die Website läuft',
    },
    options: [
      { id: 'static', label: { uk: 'Статика — найдешевше в обслуговуванні', en: 'Static — cheapest to run', de: 'Statisch — am günstigsten im Betrieb' }, add: { monthly: [50, 100] } },
      { id: 'own', label: { uk: 'Мій власний хостинг', en: 'My own hosting', de: 'Mein eigenes Hosting' }, add: { setup: [1000, 2000], weeks: [1, 1] } },
      { id: 'cloudflare', label: { uk: 'Cloudflare — я рекомендую', en: 'Cloudflare — what I recommend', de: 'Cloudflare — meine Empfehlung' }, add: { setup: [300, 600], monthly: [150, 300] } },
      { id: 'managed', label: { uk: 'Повністю на вашій стороні', en: 'Entirely on your side', de: 'Vollständig auf Ihrer Seite' }, add: { setup: [300, 600], monthly: [300, 500] } },
    ],
  },
  {
    id: 'ai',
    label: {
      uk: 'Чи вмикаємо AI-помічника',
      en: 'Whether an AI assistant is switched on',
      de: 'Ob ein KI-Assistent aktiviert wird',
    },
    options: [
      { id: 'no', label: { uk: 'Поки ні', en: 'Not for now', de: 'Vorerst nicht' }, add: {} },
      { id: 'own-key', label: { uk: 'Так, на моєму власному ключі', en: 'Yes, on my own key', de: 'Ja, mit meinem eigenen Schlüssel' }, add: { setup: [500, 900] } },
      { id: 'included', label: { uk: 'Так, і рахунок хай іде через вас', en: 'Yes, and bill it through you', de: 'Ja, und rechnen Sie es über sich ab' }, add: { setup: [500, 900], monthly: [50, 150] } },
    ],
  },
]

export type Answers = Record<string, string>

// Every question answered? The page does not quote on half a form - a figure
// from four of six answers is a figure that will be wrong later.
export function complete (answers: Answers): boolean {
  return QUESTIONS.every(question => Boolean(answers[question.id]))
}

export function optionOf (question: CalculatorQuestion, answers: Answers): CalculatorOption | undefined {
  return question.options.find(option => option.id === answers[question.id])
}

// Round to something a person reads as a price rather than as a computation:
// $4,732 is arithmetic, $4,700 is a quote. Never rounds down to zero.
function round (value: number): number {
  if (value <= 0) {
    return 0
  }
  const step = value >= 2000 ? 100 : 50
  return Math.max(step, Math.round(value / step) * step)
}

export function calculate (answers: Answers): Money {
  const total: Money = {
    setup: [...BASE.setup] as [number, number],
    monthly: [...BASE.monthly] as [number, number],
    weeks: [...BASE.weeks] as [number, number],
  }
  for (const question of QUESTIONS) {
    const add = optionOf(question, answers)?.add
    if (!add) {
      continue
    }
    for (const key of ['setup', 'monthly', 'weeks'] as const) {
      const delta = add[key]
      if (delta) {
        total[key][0] += delta[0]
        total[key][1] += delta[1]
      }
    }
  }
  return {
    setup: [round(total.setup[0]), round(total.setup[1])],
    monthly: [round(total.monthly[0]), round(total.monthly[1])],
    weeks: total.weeks,
  }
}

// The answers as the assistant (and the owner's Telegram) reads them: one
// line per question, in the site's language, with the figure at the end.
// Written out rather than sent as ids, because an id means nothing in a
// Telegram post and nothing to a model either.
export function describe (answers: Answers, money: Money, locale: 'uk' | 'en' | 'de'): string {
  const lines = QUESTIONS.map(question => {
    const option = optionOf(question, answers)
    return `${question.label[locale]}: ${option ? option.label[locale] : '—'}`
  })
  const money_ = [
    `setup: $${money.setup[0]}–${money.setup[1]}`,
    `monthly: $${money.monthly[0]}–${money.monthly[1]}`,
    `weeks: ${money.weeks[0]}–${money.weeks[1]}`,
  ].join(', ')
  return `${lines.join('\n')}\n\n${money_}`
}
