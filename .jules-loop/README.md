# Jules loop — автоматическая петля багфиксов

Воркфлоу сами никогда не пушат в main. Всё состояние — в переменной репозитория
`JULES_STATE` (Settings → Secrets and variables → Actions → Variables).

## Как работает цикл

1. `jules-loop.yml` — берёт старейший неразобранный баг-репорт из Discussions
   upstream (PrimeIntellect-ai/prime-agent, категория Bug reports), отправляет
   задачу в Jules (сессия создаётся API на этом форке, `AUTO_CREATE_PR`).
2. Jules открывает PR на форке → `jules-validate.yml` гоняет `npm run build`,
   `npm run check` и точечные регрессионные тесты из диффа.
3. Зелёный PR → черновик комментария (причина/дифт/валидация) постится в
   исходный Discussion (лимит `JULES_MAX_POSTS` в сутки) → PR мёржится →
   merge-ивент запускает следующую задачу. Петля замкнулась.
4. Красный PR → PR закрывается с хвостом лога, состояние = failed, крон
   (`7 */2 * * *`) подхватит следующую задачу максимум через 2 часа.

Триггеры петли: merge PR от `google-labs-jules[bot]`, крон каждые 2 часа,
ручной запуск. Бюджет: не более `JULES_DAILY_BUDGET` сессий за 24ч
(считается по реальному API Jules, включая ваши ручные).

## Управление

- **Порулить агентом** — правьте `.jules-loop/directives.md` и коммитьте:
  содержимое добавляется в каждый промпт.
- **Конкретный баг** — Actions → Jules loop → Run workflow →
  `discussion_number = N`.
- **Запостить черновик вручную** — Actions → Jules contribute →
  `discussion_number` + `pr_number`.
- **Черновики постов** — лежат в комментариях PR на форке (метка
  `jules-loop-draft`), так что историю можно перечитать.
- **Остановить петлю** — Actions → Jules loop → `...` → Disable workflow.
- **Остаток квоты** — в логе любого запуска строка `budget: N/M ...` либо
  jules.google.com/settings.

## Файлы

- `scripts/pick_and_dispatch.sh` — reconcile сессий, бюджет, дисковери, диспатч
- `scripts/run_focused_tests.sh` — точечные тесты из диффа PR
- `scripts/publish.sh` — черновик комментария, постинг, мёрж
- `scripts/reject.sh` — фиксация провала валидации
- `scripts/repost.sh` — ручной постинг черновика
- `scripts/lib.sh` — общие функции (состояние, Jules API, GraphQL)
- `prompt_template.txt` — системная часть промпта для Jules
- `directives.md` — ваши директивы агенту

Переменные репозитория: `JULES_DAILY_BUDGET` (30), `JULES_MAX_POSTS` (2),
`JULES_AUTOPOST` (true), `JULES_STATE` (JSON: dispatched/posted/счётчик постов).
Секреты: `JULES_API_KEY`, `PAT`.
