import type { TranslatedModel } from '@/types/TemplateBlockModel'
import { useCommonStore } from '@/stores/common'

// What a newly inserted FAQ block starts with: the demo's own questions
// (the same twelve as on the home page, content/pages/home-page.json).
const seedTitle: TranslatedModel = { uk: 'Часті запитання', en: 'Frequently Asked Questions', de: 'Häufig gestellte Fragen' }

const seedSubtitle: TranslatedModel = { uk: 'Не знайшли відповідь на своє запитання? Зв\'яжіться з нами і ми вам допоможемо.', en: 'Didn\'t find the answer to your question? Contact us and we will help you.', de: 'Sie haben keine Antwort auf Ihre Frage gefunden? Kontaktieren Sie uns, wir helfen Ihnen gern.' }

const seedQuestions: { question: TranslatedModel, answer: TranslatedModel }[] = [
  { question: { uk: 'Чим займається Virtual Dimension?', en: 'What does Virtual Dimension do?', de: 'Was macht Virtual Dimension?' }, answer: { uk: 'Ми створюємо VR-досвід, сайти й цифрові продукти: від ідеї та дизайну до запуску й підтримки. Коротко - робимо так, щоб технології працювали на вас, а не навпаки.', en: 'We create VR experiences, websites and digital products - from the idea and design to launch and support. In short, we make technology work for you, not the other way round.', de: 'Wir entwickeln VR-Erlebnisse, Websites und digitale Produkte - von der Idee und dem Design bis zum Start und Support. Kurz gesagt: Technik soll für Sie arbeiten, nicht umgekehrt.' } },
  { question: { uk: 'Як почати співпрацю?', en: 'How do we start working together?', de: 'Wie beginnt die Zusammenarbeit?' }, answer: { uk: 'Залиште заявку у формі зворотного дзвінка внизу сторінки або напишіть нам у месенджер. Ми зв\'яжемося, уточнимо задачу й запропонуємо план і терміни.', en: 'Leave a request in the callback form at the bottom of the page or message us. We will get back to you, clarify the task and suggest a plan and timeline.', de: 'Hinterlassen Sie eine Anfrage im Rückrufformular unten auf der Seite oder schreiben Sie uns. Wir melden uns, klären die Aufgabe und schlagen einen Plan und Zeitrahmen vor.' } },
  { question: { uk: 'Скільки коштує проєкт?', en: 'How much does a project cost?', de: 'Was kostet ein Projekt?' }, answer: { uk: 'Залежить від обсягу: невеликий сайт і повноцінний VR-застосунок - різні всесвіти. Після першої розмови ви отримаєте прозорий кошторис без прихованих платежів.', en: 'It depends on the scope: a small website and a full VR application are different universes. After the first call you get a transparent estimate with no hidden costs.', de: 'Das hängt vom Umfang ab: Eine kleine Website und eine vollständige VR-Anwendung sind verschiedene Universen. Nach dem ersten Gespräch erhalten Sie einen transparenten Kostenvoranschlag ohne versteckte Kosten.' } },
  { question: { uk: 'Скільки часу займає розробка?', en: 'How long does development take?', de: 'Wie lange dauert die Entwicklung?' }, answer: { uk: 'Сайт-візитка - від кількох тижнів, складніші продукти - від кількох місяців. Телепатію як послугу ми вже освоїли, а от машину часу ще ні, тож терміни чесні.', en: 'A simple website takes from a few weeks, more complex products from a few months. We have mastered telepathy as a service, but not the time machine yet - so the deadlines are honest.', de: 'Eine einfache Website dauert ab einigen Wochen, komplexere Produkte ab einigen Monaten. Telepathie als Service beherrschen wir schon, die Zeitmaschine noch nicht - die Fristen sind also ehrlich.' } },
  { question: { uk: 'Чи потрібен мені VR-шолом, щоб скористатися вашими послугами?', en: 'Do I need a VR headset to use your services?', de: 'Brauche ich eine VR-Brille, um Ihre Dienste zu nutzen?' }, answer: { uk: 'Ні. Більшість наших продуктів працює у звичайному браузері й на телефоні. VR-шолом - приємний бонус для тих, хто хоче зануритися повністю.', en: 'No. Most of our products work in an ordinary browser and on a phone. A VR headset is a nice bonus for those who want to dive in completely.', de: 'Nein. Die meisten unserer Produkte funktionieren im normalen Browser und auf dem Handy. Eine VR-Brille ist ein netter Bonus für alle, die ganz eintauchen möchten.' } },
  { question: { uk: 'Чи зможу я сам редагувати свій сайт?', en: 'Can I edit my website myself?', de: 'Kann ich meine Website selbst bearbeiten?' }, answer: { uk: 'Так. Сайти, які ми робимо, редагуються у візуальному редакторі: тексти, зображення, блоки й меню змінюються без жодного рядка коду, кількома мовами.', en: 'Yes. The websites we build are edited in a visual editor: texts, images, blocks and menus change without a single line of code, in several languages.', de: 'Ja. Unsere Websites werden in einem visuellen Editor bearbeitet: Texte, Bilder, Blöcke und Menüs ändern Sie ohne eine einzige Zeile Code, in mehreren Sprachen.' } },
  { question: { uk: 'Чи працюєте ви з клієнтами з інших країн?', en: 'Do you work with clients from other countries?', de: 'Arbeiten Sie mit Kunden aus anderen Ländern?' }, answer: { uk: 'Так, ми працюємо віддалено з клієнтами з різних країн і спілкуємося українською, англійською та німецькою.', en: 'Yes, we work remotely with clients from many countries and speak Ukrainian, English and German.', de: 'Ja, wir arbeiten remote mit Kunden aus vielen Ländern und sprechen Ukrainisch, Englisch und Deutsch.' } },
  { question: { uk: 'Що, якщо мені не сподобається результат?', en: 'What if I do not like the result?', de: 'Was, wenn mir das Ergebnis nicht gefällt?' }, answer: { uk: 'Ми показуємо проміжні результати на кожному етапі, тож сюрпризів наприкінці не буває. Правки в межах погодженого обсягу - частина роботи, а не додаткова послуга.', en: 'We show interim results at every stage, so there are no surprises at the end. Revisions within the agreed scope are part of the job, not an extra service.', de: 'Wir zeigen Zwischenergebnisse in jeder Phase, so gibt es am Ende keine Überraschungen. Änderungen im vereinbarten Umfang gehören zur Arbeit und sind keine Zusatzleistung.' } },
  { question: { uk: 'Чи надаєте ви підтримку після запуску?', en: 'Do you provide support after launch?', de: 'Bieten Sie Support nach dem Start an?' }, answer: { uk: 'Так. Після запуску ми стежимо за роботою продукту, оновлюємо його й допомагаємо з будь-якими питаннями - підтримка 12/7, як і обіцяли.', en: 'Yes. After launch we keep an eye on the product, update it and help with any questions - support 12/7, as promised.', de: 'Ja. Nach dem Start überwachen wir das Produkt, aktualisieren es und helfen bei allen Fragen - Support 12/7, wie versprochen.' } },
  { question: { uk: 'Чи є у вас знижки?', en: 'Do you offer discounts?', de: 'Bieten Sie Rabatte an?' }, answer: { uk: 'Є дружні знижки для постійних клієнтів, стартапів і тих, хто приводить друзів. Деталі - у розділі «Дружні знижки».', en: 'There are friendly discounts for regular clients, start-ups and those who bring friends. See the "Friendly Discounts" section for details.', de: 'Es gibt Freundesrabatte für Stammkunden, Start-ups und alle, die Freunde mitbringen. Details finden Sie im Bereich „Freundesrabatte“.' } },
  { question: { uk: 'Хто володіє правами на готовий продукт?', en: 'Who owns the rights to the finished product?', de: 'Wem gehören die Rechte am fertigen Produkt?' }, answer: { uk: 'Умови прав фіксуються в договорі ще до початку роботи, тож ви наперед знаєте, що саме отримуєте і як зможете цим користуватися.', en: 'The rights are set out in the contract before the work starts, so you know in advance exactly what you get and how you can use it.', de: 'Die Rechte werden vor Arbeitsbeginn im Vertrag festgelegt, sodass Sie im Voraus genau wissen, was Sie erhalten und wie Sie es nutzen können.' } },
  { question: { uk: 'Як із вами зв\'язатися?', en: 'How can I contact you?', de: 'Wie kann ich Sie erreichen?' }, answer: { uk: 'Телефони, месенджери й соцмережі - у футері кожної сторінки. А ще можна просто залишити номер у формі зворотного дзвінка, і ми передзвонимо.', en: 'Phones, messengers and social networks are in the footer of every page. Or just leave your number in the callback form and we will call you back.', de: 'Telefonnummern, Messenger und soziale Netzwerke finden Sie im Footer jeder Seite. Oder hinterlassen Sie einfach Ihre Nummer im Rückrufformular, und wir rufen zurück.' } },
]

// If this block was deleted from the current page earlier in this editing
// session, DynamicPageTemplate.vue's requestDeleteBlock stashed its live
// props here (see stores/common.ts's own comment on deletedSingletonBlocks) -
// restore that instead of starting over from the seed content below. Deep-
// cloned either way, since the returned props object must never share array/
// object references with the seed constants (or a stashed block), or editing
// one inserted FAQ block's questions would mutate every future insertion.
export function faq () {
  const cached = useCommonStore().deletedSingletonBlocks.FAQ
  if (cached) {
    return structuredClone(cached)
  }

  return {
    type: 'component',
    content: 'FAQ',
    props: {
      title: structuredClone(seedTitle),
      subtitle: structuredClone(seedSubtitle),
      // Matches production's original fixed .faq-item-title/.faq-item look
      // (22px/500/black question, 18px/400/black answer - see
      // theme_2/styles/faq.css) using this app's own editable size/weight
      // vocabulary instead: h4=22px, h6=18px, text-medium=500, text-thin=400
      // (see typographics.css) - text-bold is 600, NOT a match for either.
      questionClass: 'h4 text-medium text-black text-left',
      answerClass: 'h6 text-thin text-black text-left',
      // Empty = Vuetify's own $expand/$collapse defaults (chevron down/up).
      // Always a matched PAIR once set - see utils/faq-expand-icons.ts.
      expandIcon: '',
      collapseIcon: '',
      questions: structuredClone(seedQuestions),
    },
  }
}
