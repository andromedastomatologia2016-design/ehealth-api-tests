# eHealth API Tests

Навчальний фреймворк автоматизованого API-тестування для української медичної системи **eHealth**, побудований з нуля на TypeScript + Playwright Test.

Оскільки доступ до реального API eHealth вимагає реєстрації медичного закладу/МІС-розробника, проєкт включає **власний мок-сервер**, що імітує ключову поведінку реального API: OAuth2 `client_credentials` авторизацію, рольову модель доступу (DOCTOR / ADMIN / MIS_USER / NHS_ADMIN) та CRUD-операції з пацієнтами й декларациями — за мотивами публічної специфікації [eHealth API](https://uaehealthapi.docs.apiary.io/).

## Стек

- **TypeScript**
- **Playwright Test** — тест-раннер та API-клієнт (`APIRequestContext`)
- **Express** — мок-сервер, що імітує eHealth backend
- **Zod** — (підготовлено для валідації схем відповідей)

## Структура проєкту