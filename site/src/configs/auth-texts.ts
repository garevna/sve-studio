// What the sign-in and account pages say. Visitor-facing, so every site
// language. The wording of the form follows the original booking site's
// (client-side locales/parts/auth.ts); the rest is the demo's own voice.
import type { AuthErrorCode } from '@/services/auth/types'

type Words = { uk: string, en: string, de: string }

export const AUTH_TEXTS = {
  signInTab: { uk: 'Авторизація', en: 'Sign in', de: 'Anmeldung' },
  signUpTab: { uk: 'Реєстрація', en: 'Registration', de: 'Registrierung' },
  name: { uk: 'Ім’я', en: 'Name', de: 'Name' },
  email: { uk: 'пошта', en: 'email', de: 'E-Mail' },
  password: { uk: 'Пароль', en: 'Password', de: 'Passwort' },
  confirmPassword: { uk: 'Підтвердіть пароль', en: 'Confirm password', de: 'Passwort bestätigen' },
  signInButton: { uk: 'Авторизуватись', en: 'Sign in', de: 'Anmelden' },
  signUpButton: { uk: 'Зареєструватись', en: 'Sign up', de: 'Registrieren' },
  or: { uk: 'або', en: 'or', de: 'oder' },
  google: { uk: 'Вхід через Google', en: 'Sign in with Google', de: 'Anmeldung über Google' },
  github: { uk: 'Вхід через GitHub', en: 'Sign in with GitHub', de: 'Anmeldung über GitHub' },
  forgot: { uk: 'Забули пароль?', en: 'Forgot your password?', de: 'Passwort vergessen?' },
  resetSent: {
    uk: 'Ми надіслали вам лист. Перейдіть за посиланням у ньому, щоб задати новий пароль.',
    en: 'We’ve sent you an email. Follow the link in it to set a new password.',
    de: 'Wir haben Ihnen eine E-Mail geschickt. Folgen Sie dem Link darin, um ein neues Passwort festzulegen.',
  },
  passwordHint: { uk: 'Щонайменше 6 символів', en: 'At least 6 characters', de: 'Mindestens 6 Zeichen' },
  passwordsDiffer: { uk: 'Паролі не збігаються', en: 'The passwords don’t match', de: 'Die Passwörter stimmen nicht überein' },
  notSetUp: {
    uk: 'Вхід на цьому сайті ще не налаштований.',
    en: 'Signing in isn’t set up on this site yet.',
    de: 'Die Anmeldung ist auf dieser Website noch nicht eingerichtet.',
  },
  abilitiesTitle: { uk: 'В особистому кабінеті ви можете', en: 'In your personal account you can', de: 'In Ihrem persönlichen Bereich können Sie' },
  abilities: [
    { uk: 'Читати відповіді на свої повідомлення', en: 'Read the replies to your messages', de: 'Die Antworten auf Ihre Nachrichten lesen' },
    { uk: 'Бачити всі свої звернення в одному місці', en: 'See all your requests in one place', de: 'Alle Ihre Anfragen an einem Ort sehen' },
    { uk: 'Писати нам, не вводячи контакти щоразу', en: 'Write to us without typing your contacts every time', de: 'Uns schreiben, ohne jedes Mal Ihre Kontaktdaten einzugeben' },
  ],
  // The account page.
  accountTitle: { uk: 'Особистий кабінет', en: 'Personal account', de: 'Persönlicher Bereich' },
  signedInWith: { uk: 'Вхід через', en: 'Signed in with', de: 'Angemeldet über' },
  viaPassword: { uk: 'пошту і пароль', en: 'email and password', de: 'E-Mail und Passwort' },
  signOut: { uk: 'Вийти', en: 'Sign out', de: 'Abmelden' },
  messagesTitle: { uk: 'Мої повідомлення', en: 'My messages', de: 'Meine Nachrichten' },
  messagesEmpty: {
    uk: 'Тут з’являтимуться ваші повідомлення з форм на сайті і наші відповіді на них. Поки що тихо — як у проді о третій ночі.',
    en: 'Your messages from the site’s forms and our replies will appear here. All quiet for now — like prod at 3 a.m.',
    de: 'Hier erscheinen Ihre Nachrichten aus den Formularen der Website und unsere Antworten. Noch ist es still – wie in Prod um drei Uhr nachts.',
  },
  messagesFailed: {
    uk: 'Не вдалося завантажити повідомлення. Спробуйте оновити сторінку.',
    en: 'Couldn’t load your messages. Try reloading the page.',
    de: 'Die Nachrichten konnten nicht geladen werden. Laden Sie die Seite neu.',
  },
  writeToUs: { uk: 'Написати нам', en: 'Write to us', de: 'Schreiben Sie uns' },
  popupTitle: { uk: 'Напишіть нам', en: 'Write to us', de: 'Schreiben Sie uns' },
  waiting: { uk: 'Чекає на відповідь', en: 'Waiting for a reply', de: 'Wartet auf Antwort' },
  answered: { uk: 'Є відповідь', en: 'Answered', de: 'Beantwortet' },
  replyFrom: { uk: 'Відповідь', en: 'Reply', de: 'Antwort' },
} satisfies Record<string, Words | Words[]>

export const AUTH_ERRORS: Record<AuthErrorCode, Words> = {
  'wrong-credentials': { uk: 'Невірна пошта або пароль.', en: 'Wrong email or password.', de: 'Falsche E-Mail oder falsches Passwort.' },
  'email-in-use': { uk: 'Користувач з такою поштою вже зареєстрований. Спробуйте увійти.', en: 'This email is already registered. Try signing in.', de: 'Diese E-Mail ist bereits registriert. Versuchen Sie, sich anzumelden.' },
  'weak-password': { uk: 'Пароль закороткий: потрібно щонайменше 6 символів.', en: 'The password is too short: at least 6 characters.', de: 'Das Passwort ist zu kurz: mindestens 6 Zeichen.' },
  'invalid-email': { uk: 'Перевірте адресу пошти.', en: 'Please check the email address.', de: 'Bitte überprüfen Sie die E-Mail-Adresse.' },
  'cancelled': { uk: 'Вхід через Google скасовано.', en: 'Signing in with Google was cancelled.', de: 'Die Anmeldung über Google wurde abgebrochen.' },
  'popup-blocked': { uk: 'Браузер заблокував вікно Google. Дозвольте спливаючі вікна й спробуйте ще раз.', en: 'The browser blocked Google’s window. Allow pop-ups and try again.', de: 'Der Browser hat das Google-Fenster blockiert. Erlauben Sie Pop-ups und versuchen Sie es erneut.' },
  'too-many': { uk: 'Забагато спроб. Спробуйте трохи згодом.', en: 'Too many attempts. Please try again a little later.', de: 'Zu viele Versuche. Bitte versuchen Sie es etwas später erneut.' },
  'network': { uk: 'Немає зв’язку. Перевірте інтернет.', en: 'No connection. Please check your internet.', de: 'Keine Verbindung. Bitte überprüfen Sie Ihre Internetverbindung.' },
  'domain': { uk: 'Цей сайт ще не додано до дозволених для входу.', en: 'This site isn’t on the list of sites allowed to sign in yet.', de: 'Diese Website ist noch nicht für die Anmeldung freigegeben.' },
  'not-allowed': { uk: 'Цей спосіб входу вимкнено.', en: 'This way of signing in is turned off.', de: 'Diese Anmeldeart ist deaktiviert.' },
  'other-method': { uk: 'Ця пошта вже прив’язана до іншого способу входу. Увійдіть так, як заходили раніше.', en: 'This email is already linked to another way of signing in. Sign in the way you did before.', de: 'Diese E-Mail ist bereits mit einer anderen Anmeldeart verknüpft. Melden Sie sich so an wie zuvor.' },
  'unknown': { uk: 'Щось пішло не так. Спробуйте ще раз.', en: 'Something went wrong. Please try again.', de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.' },
}
