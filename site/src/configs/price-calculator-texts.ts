// What the price calculator says, in the site's languages. Separate from
// the rate card (price-calculator.ts) because these are words the owner may
// want to reword and those are numbers they may want to change, and the two
// are edited on different days.

export interface CalculatorTexts {
  title: string
  intro: string
  signInTitle: string
  signInWhy: string
  signInButton: string
  calculate: string
  again: string
  answerAll: string
  setup: string
  monthly: string
  weeks: string
  saved: string
  estimate: string
  limitTitle: string
  limitBody: string
  limitWhen: string
  limitClose: string
  limitShort: string
}

export const TEXTS: Record<'uk' | 'en' | 'de', CalculatorTexts> = {
  uk: {
    title: 'Порахувати вартість',
    intro: 'Шість відповідей — і ви побачите вилку по грошах і по строку. Рахує не людина і не чат: цифру рахує прайс, а помічник поруч пояснює, що саме у ваших відповідях на неї впливає.',
    signInTitle: 'Калькулятор працює для тих, хто увійшов',
    signInWhy: 'Так розрахунок зберігається у вашому кабінеті, і так я бачу його перш ніж готувати рахунок. А ще це тримає помічника в межах безкоштовного ліміту — інакше його вичерпають ті, хто просто грається.',
    signInButton: 'Увійти',
    calculate: 'Порахувати',
    again: 'Спочатку',
    answerAll: 'Дайте відповідь на всі шість питань.',
    setup: 'Розробка',
    monthly: 'Щомісяця',
    weeks: 'Тижнів роботи',
    saved: 'Розрахунок збережено у вашому кабінеті, і він уже в мене — відповім особисто.',
    estimate: 'Це оцінка до розмови, а не рахунок. Фіксовану ціну я даю після пів години розмови.',
    limitTitle: 'Помічник сьогодні відпрацював своє',
    limitBody: 'Денний безкоштовний ліміт вичерпано, тож пояснення цього разу не буде. Розрахунок вище від цього не залежить — він уже ваш і вже збережений.',
    limitWhen: 'Повернеться:',
    limitClose: 'Зрозуміло',
    limitShort: 'Пояснення від помічника сьогодні недоступне — денний ліміт вичерпано.',
  },
  en: {
    title: 'Work out the price',
    intro: 'Six answers and you have a range, in money and in weeks. Neither a person nor a chatbot does the sums: the figure comes from the rate card, and the assistant beside it explains what in your answers moves it.',
    signInTitle: 'The calculator works for signed-in visitors',
    signInWhy: 'That way the quote is kept in your account, and I see it before I prepare an invoice. It also keeps the assistant inside its free allowance — otherwise it is used up by people just having a look.',
    signInButton: 'Sign in',
    calculate: 'Calculate',
    again: 'Start over',
    answerAll: 'Please answer all six questions.',
    setup: 'Build',
    monthly: 'Per month',
    weeks: 'Weeks of work',
    saved: 'The quote is saved in your account, and it has reached me — I will answer personally.',
    estimate: 'This is an estimate before a conversation, not an invoice. The fixed price comes after half an hour on a call.',
    limitTitle: 'The assistant has done its day',
    limitBody: 'The free daily allowance is spent, so there is no commentary this time. The figures above do not depend on it — they are yours and already saved.',
    limitWhen: 'Back at:',
    limitClose: 'Understood',
    limitShort: 'No commentary from the assistant today — the daily allowance is spent.',
  },
  de: {
    title: 'Preis berechnen',
    intro: 'Sechs Antworten, und Sie haben eine Spanne — in Geld und in Wochen. Gerechnet wird weder von Hand noch von einem Chatbot: die Zahl kommt aus der Preisliste, und der Assistent daneben erklärt, was in Ihren Antworten sie bewegt.',
    signInTitle: 'Der Rechner steht angemeldeten Besuchern offen',
    signInWhy: 'So bleibt die Berechnung in Ihrem Konto, und ich sehe sie, bevor ich eine Rechnung vorbereite. Außerdem hält das den Assistenten im kostenlosen Rahmen — sonst verbrauchen ihn Leute, die nur stöbern.',
    signInButton: 'Anmelden',
    calculate: 'Berechnen',
    again: 'Von vorn',
    answerAll: 'Bitte beantworten Sie alle sechs Fragen.',
    setup: 'Erstellung',
    monthly: 'Monatlich',
    weeks: 'Wochen Arbeit',
    saved: 'Die Berechnung liegt in Ihrem Konto und ist bei mir angekommen — ich melde mich persönlich.',
    estimate: 'Das ist eine Schätzung vor dem Gespräch, keine Rechnung. Den Festpreis nenne ich nach einer halben Stunde Gespräch.',
    limitTitle: 'Der Assistent hat sein Tagwerk getan',
    limitBody: 'Das kostenlose Tageskontingent ist aufgebraucht, deshalb gibt es diesmal keine Erläuterung. Die Zahlen oben hängen nicht davon ab — sie gehören Ihnen und sind bereits gespeichert.',
    limitWhen: 'Wieder verfügbar:',
    limitClose: 'Verstanden',
    limitShort: 'Heute keine Erläuterung vom Assistenten — das Tageskontingent ist aufgebraucht.',
  },
}
