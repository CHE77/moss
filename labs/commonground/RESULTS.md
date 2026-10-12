# CommonGround Lab — результаты живой проверки

Дата: 11 октября 2026, Ubuntu 24.04.4 LTS, x86_64. Ветка `CHE77/moss:lab/commonground-cycle`. Маркер объектов: `commonground-bread-v1`. Выполнено задание [CODEX.md](CODEX.md). Изменения относятся к стенду; исходники CommonGround, дизайн и логика Moss и инструментов не изменялись. Инструменты не форкались.

**Полный цикл не прошёл.** Moss доставляет сообщения и совместные задачи между тестовыми профилями. hREA собирается и подтверждает расход/выпуск, но `transfer` не меняет два остатка; это воспроизведено отдельно. Unyt завершил один прямой расчёт на 30 тестовых ZF. Защита кредитного лимита на сервере и остальные финансовые требования не подтверждены.

`PASS` означает проверенное действие с чтением результата. `FAIL` — наблюдаемое несовпадение. `BLOCKED` — указан конкретный препятствующий фактор. `NOT RUN` — проверка не выполнялась. Установка пакета не означает прохождение всех его функций.

Повторный анализ пригодности компонентов и проект связанного пользовательского процесса: [PROCESS_AND_ARCHITECTURE.md](PROCESS_AND_ARCHITECTURE.md). Предлагаемые там автоматизация, ресурсная доска и условия расчёта не входят в результаты выполненных тестов.

Дополнение от **12.10.2026**: выполнен [анализ Requests and Offers](REQUESTS_AND_OFFERS_ASSESSMENT.md). Release webhApp v0.6.0-alpha.1 скачан, SHA256 совпал с digest GitHub, bundle распакован hc 0.6.1. Установка в Moss, сборка dev и функциональный цикл NOT RUN; количество установленных tools остаётся 17. [Метаданные проверки](evidence/requests-and-offers-assessment.json).

Дополнение по CFN от **12.10.2026**: [источники и оценка производственного контура](CARBON_FARM_NETWORK_ASSESSMENT.md). Прочитаны установленный Inventory, Plans и несохранённый экран Planning; запас, план, события и платежи не создавались. Реализованные в исходниках инвентарь/рецепты/планирование не считаются PASS сквозного цикла. [Публичные наблюдения](evidence/cfn-assessment.json).

## Окружение и версии

| Компонент | Фактически проверено |
| --- | --- |
| Moss checkout | базовый commit `4a87b935f013491714f347b0c609c391886b969b`; package **0.15.6**, конфигурация Holochain **0.6.1-rc.7** |
| Запущенный Moss desktop | официальный **v0.15.8 AppImage**, встроенный conductor **0.6.1**, проверенный через запущенный executable |
| hREA | tag **happ-0.5.0-beta.1**, commit `79c8d4fb98c4f7f9a8cf3f7dd69690d6d1334d85` в отдельном `../hrea-commonground-lab` |
| hREA runtime | Holochain **0.7.0**, hc **0.7.0**, Lair **0.7.1**, kitsune2-bootstrap-srv **0.5.0**; официальные Linux release binaries |
| Инструменты сборки | Node **24.21.0**, Yarn **1.22.22**, Nix **2.35.2**, Rust **1.95.0**, target `wasm32-unknown-unknown`; Rust/Binaryen сохранены локальными Nix GC roots |
| Память | около 14 GiB RAM и 15 GiB swap; профили проверялись попарно, с отдельными systemd user units |

Форк имеет `origin=https://github.com/CHE77/moss.git` и `upstream=https://github.com/lightningrodlabs/moss.git`. Текущая исходная ветка не является исходным деревом v0.15.8: живые проверки выполнены на официальном стабильном desktop, а `yarn typecheck` — на этой ветке. Сборка desktop из этой ветки **NOT RUN**; проверку AppImage нельзя выдавать за такую сборку.

Происхождение, размеры и SHA256: [versions.json](evidence/versions.json). SHA256 AppImage: `bb495a46769d88df0fb08f5569c8f010d510a63496710e1ac80c4c93e1bd50ea`. Опубликованный hREA hApp: `b9a7c3f0dd81fa934ba69b5054b7cdf58008526ee77ce57351b30cc5900a43a7`; собранный здесь hApp: `87278f055ad46a952ce9affd7b3461d807db7970f6870e624c015b7967286134`. Это два разных артефакта; оба показали сбой передачи.

## Установка и подготовка

| Проверка | Статус | Результат / свидетельство |
| --- | --- | --- |
| Runner: сохранность каталогов, закреплённого commit и изменённых тестов; проверка runtime и возврат ошибок | PASS | [5 тестов, 5 pass](evidence/runner-tests-final.log) |
| Синтаксис JS и трёх TS-файлов без исполнения | PASS | [syntax-final.log](evidence/syntax-final.log); Node сначала удаляет типы через `stripTypeScriptTypes` |
| Moss `yarn typecheck` | PASS | [moss-typecheck.log](evidence/moss-typecheck.log), exit 0 |
| `prepare-hrea`, отдельный clone | PASS | HEAD соответствует точному commit; собственный тест скопирован без reset/checkout чужого каталога |
| Полное окружение через default `nix develop` | BLOCKED | Даже после включения доверенного официального кэша конкретный conductor derivation не имел substitute. Сборка native conductor остановлена, чтобы ограничить нагрузку; это не результат экономического теста |
| Установка зависимостей hREA | PASS | `yarn install --frozen-lockfile`; первые сетевые попытки дали ETIMEDOUT/были остановлены; повтор с IPv4 preference и большим timeout завершился с exit 0 |
| hREA source build через `--current-env` | PASS | [hrea-source-build.log](evidence/hrea-source-build.log), exit 0; Rust из Nix, официальный hc 0.7.0 |
| hREA upstream demo на опубликованном hApp | PASS | [71/71 steps, exit 0](evidence/hrea-upstream-demo.log) |
| hREA запуск upstream `yarn dev` | FAIL | hc 0.7 отклоняет `webrtc` (exit 2) и `run-local-services` (exit 1); Vite при этом поднимает 8888, без conductor |
| UI на 8888 с отдельным loopback conductor | PASS | Рабочий обход запуска: bootstrap 0.5.0 + `hc sandbox … network … mem`; браузер подключается без ошибок. Подробности ниже |

hREA имеет локальный, незакоммиченный `.yarnrc`: `--install.ignore-optional true`. Глобальная конфигурация Yarn не менялась. Установка не меняла `yarn.lock` или `Cargo.lock`; в clone добавлены только локальные тесты и `.yarnrc`. Режим `--current-env` добавлен в runner явно: он проверяет hc/Holochain 0.7.x и сохраняет защиту закреплённого checkout. Default остаётся Nix.

Первый запуск conductor не нашёл `lair-keystore`; следующий отклонил Lair 0.6.3 из Moss: требуется 0.7.1. Установлены отдельные официальные бинарники, keystore/conductor Moss не обновлялись. Первый реально запущенный API-тест затем остановился на схеме `UnitCreateParams`: отсутствовал обязательный `omUnitIdentifier`. Исправлен **тест**: kilogram/one/hour. История ошибок сохранена в [preflight-errors.json](evidence/preflight-errors.json) и [первом API-выводе](evidence/hrea-cycle-real.log).

## Инструменты CommonGround Lab

Все перечисленные 17 выпусков установлены в первом профиле. В новых профилях выполняется Activate. KanDo существовал ранее и сохранён; остальные установки выполнены через Moss с проверкой пакетов, частично через автоматизацию `GroupStore.installAndAdvertiseApplet`, затем проверены в UI. Существующая дополнительная копия Glass Bead Game сохранена.

| Запрошенный инструмент | Установленный выпуск | Проверка в этом цикле |
| --- | --- | --- |
| KanDo | 0.17.5; DNA 0.17.0 | задачи, назначения, изменение колонки, чтение другими профилями |
| Who’s In? | 0.2.4 | событие, присоединение и отказ; ограничение обновления другого окна |
| Converge | 0.3.2 | обсуждение, критерий, предложение, три голоса Yes |
| Acorn | 12.0.0 | проект и outcome; воспроизведён сбой повторного открытия |
| Chat / Vines | Vines 1.28.2 | общий канал, двусторонние сообщения, восстановление доставки |
| Rhymez | 0.2.0 | установка; функции NOT RUN |
| Files | 1.4.0 | установка; файловый цикл NOT RUN |
| Notebook | Notebooks 0.6.13 | установка; функции NOT RUN |
| Spreadsheets | 0.2.3 | установка; функции NOT RUN |
| Slate | 0.4.5 | установка; функции NOT RUN |
| Ark | 0.1.2 | установка; функции NOT RUN |
| TalkingStickers | TalkingStickies 0.15.2 | соответствует найденному названию в каталоге; функции NOT RUN |
| Games | Gamez 0.9.3 | соответствует найденному названию в каталоге; функции NOT RUN |
| Glass Bead Game | 0.3.0 | установка; функции NOT RUN |
| FarmHack | 0.1.0 | установка; функции NOT RUN |
| Unyt | 0.90.0 | прямой тестовый расчёт и UI-проверка лимита |
| Carbon Farm Network App | 0.6.0 | PASS: открывается карта/поиск; создание хозяйства и синхронизация NOT RUN |

Источники: [каталог Lightningrod Labs для 0.15](https://lightningrodlabs.org/weave-tool-curation/0.15/tool-list-0.15.json), [дополнительный каталог matthme](https://raw.githubusercontent.com/matthme/weave-tool-curation/refs/heads/main/0.15/lists/tool-list-0.15.json), [каталог Unyt](https://raw.githubusercontent.com/unytco/unyt-moss/refs/heads/main/0.15/lists/tool-list-0.15.json). Точные URLs пакетов, branch, SHA256 и записи установки: [tools.json](evidence/tools.json). Совместимость здесь подтверждена установкой в conductor Moss 0.6.1; отдельные функции не проверялись по одному лишь номеру версии.

## Moss: группа, координация и восстановление

Созданы три независимых сохранённых профиля: **Lab Agent One** — кооператив, **Lab Agent Two** — пекарня, **Lab Agent Three** — координатор. Второй и третий вошли через приглашение в одну CommonGround Lab. Group DNA и разные публичные ключи: [moss-identities.json](evidence/moss-identities.json). Приватные приглашения и ключи в PR не публикуются. Копировались только кэшированные пакеты/UIS; identity и базы между профилями не копировались.

| Проверка | Статус | Фактический результат |
| --- | --- | --- |
| Группа и приглашения двух дополнительных профилей | PASS | одинаковая group DNA, разные agent keys; третий получил инструменты после задержки синхронизации |
| Все три окна одновременно | NOT RUN | проверены пары 1↔2 и 1↔3; профиль 2 временно остановлен перед запуском 3 для снижения памяти |
| Vines: общий заказ и ответ пекарни | PASS | One отправил заказ на 10 буханок, Two ответил, One прочитал; Three позже прочитал обе записи |
| Vines: получение после временного отключения | PASS, ограниченная проверка | conductor Two приостановлен SIGSTOP на 45 с, окно оставалось открытым; новое сообщение отсутствовало у него во время паузы и появилось после SIGCONT без перезапуска UI |
| Отключение сетевого интерфейса / работа через Интернет | NOT RUN | SIGSTOP моделирует недоступность conductor, не сетевой partition между компьютерами |
| Acorn: потребность | PASS | проект `commonground-bread-v1 — 10 буханок`, outcome **#214509** создан через UI |
| Acorn: повторное открытие и общий outcome | FAIL / BLOCKED | reload маршрута `/project/…/table` вызывает `Cannot read properties of undefined (reading 'profiles')`; dashboard работает, но повторное открытие Map зависало на 50% |
| Acorn: второй участник | PASS для входа, NOT RUN для outcome read-back | Two вошёл через отдельное приглашение проекта; dashboard One показал 2 members; общего чтения/изменения outcome не подтверждено |
| Acorn: иерархия целей и WAL | BLOCKED | после сбоя проекта связь с целями и attachment не проверены |
| Who’s In?: участие и отказ | PASS локально | событие выпечки/выдачи; One записан; Two нажал Add me → 2 committed / 200%, затем Remove me → 1 / 100% |
| Who’s In?: актуальный список в другом окне | FAIL для наблюдавшегося live refresh | повторная проверка: спустя более 30 с One всё ещё показывал 1 / 100%; после reload iframe и открытия события — 2 / 200%. После отказа Two и нового refresh One видит снова 1 / 100%. Синхронизация после refresh — PASS, live refresh — FAIL |
| Converge: согласование | PASS для предложения и голосов | количество 10, срок 11.10 до 23:59, распределение и тестовая цена записаны; One/Two/Three голосовали Yes; One и Three видят **3 Yes / 0 No** |
| Converge: подробная оценка критерия, закрытие обсуждения | NOT RUN | Score остаётся `_ %`; финальное переключение complete не выполнялось |
| KanDo: общие задачи и назначения | PASS | три карточки: выделить 5 кг муки; испечь 10 — назначено Two; выдать 10 — назначено One. Two и Three прочитали карточки |
| KanDo: изменение статуса | PASS после refresh | Three переместил выпечку из To Do в Doing; One после reload iframe видит карточку в Doing с прежним назначением |
| KanDo: немедленное обновление структуры колонки | FAIL в наблюдавшемся окне | One показывал `undefined` для новой колонки и пустое In; после reload — правильные Doing и карточка. Нельзя считать начальный результат автоматизации независимым воспроизведением ошибки ввода человеком |
| WAL между инструментами | BLOCKED / NOT RUN | KanDo board добавлен в Pocket, но сохранённая связь с Acorn не подтверждена |
| Сохранность идентичности/данных после restart | PASS, ограниченная проверка | профиль Two перезапущен; его Unyt баланс +30 и завершённое принятие сохранились |

Свидетельства действий и чтения: [ui.json](evidence/ui.json), где каждое наблюдение имеет имя исходного файла и время UTC. Для выполнения UI использовались реальные клики по видимым контролам; часть полей заполнялась через DOM. Снимки текста сами по себе не доказывают, что каждый скрытый/заэкранный контрол был доступен для клика.

Во всех основных объектах сохранён маркер. Связи между Acorn #214509, Vines channel, Who’s In? event, Converge deliberation и KanDo карточками внесены **текстом вручную**. Это идентификаторы/названия, а не подтверждённые WAL. Экономические ID хранятся отдельно. Автоматическая связь Moss ↔ hREA ↔ Unyt отсутствует. Тестовые карточки не означают физическую выпечку или выдачу хлеба.

Для offline-проверки: пауза Two **19:16:41–19:17:26 Europe/Amsterdam**, сообщение One **19:16:56**, маркер `offline-recovery-2026-10-11`. Это локальные сохранённые профили, не удаляемые dev-профили.

## hREA: реальные события и остатки

И опубликованный, и собранный здесь hApp проверялись через официальный acceptance harness с настоящим conductor. На каждый запуск — временная база, **один Holochain-подписант**, три экономических актора. Harness удаляет данные после теста. ID полезны для трассы в выводе; записи нельзя потом открыть в отдельном UI. Это не тест трёх hREA peers и не интеграция с Moss.

| Шаг | Статус | Проверенный результат |
| --- | --- | --- |
| Organization/Person, Unit, спецификации | PASS после исправления теста | создано через GraphQL; units имеют OM identifier kilogram/one/hour |
| Intent → Commitment, Plan → Process | PASS для создания | ID сохранены; обязательство и процесс получили ссылки в параметрах |
| Начальная мука 25 кг | PASS | accounting **25**, onhand **25** |
| Consume 5 кг | PASS | accounting **20**, onhand **20** |
| Work 3 часа | PASS | чтение события возвращает **3** и ID именно единицы hour |
| Produce 10 штук | PASS | accounting **10**, onhand **10** |
| Process backlinks | PASS | consume/work в observedInputs, produce в observedOutputs |
| Transfer и fulfilledBy | PASS для записи/ссылки | transfer сохранён, Commitment.fulfilledBy включает его ID |
| Transfer: два остатка | **FAIL** | bakery **10/10**, cooperative **0/0** вместо **0/0**, **10/10** |
| Минимальный transfer repro на собранном hApp | **FAIL** | один produce, нулевой начальный запас, один transfer: оба количества не меняются |
| hREA P2P между разными подписантами / offline recovery | NOT RUN | текущий harness этого не покрывает |

Основной запуск: [hrea-cycle-built.log](evidence/hrea-cycle-built.log), **exit 1**. Минимальный: [hrea-transfer-repro-built.log](evidence/hrea-transfer-repro-built.log), **exit 1**. Более ранний прогон опубликованного hApp: [hrea-cycle-schema-corrected.log](evidence/hrea-cycle-schema-corrected.log), также exit 1 на двух остатках. Runner сохраняет ненулевой результат, не ослабляет ожидание и не добавляет компенсирующих `raise`/`lower`.

Полные ID всех этапов: [hrea-cycle-records.json](evidence/hrea-cycle-records.json). Ключевые ID **собранного** цикла:

- Bakery bread: `uhCkk08lA5NcYL4HPA3Tkanku25WXEwYEF_C5ImwzGocDdRtlFD_0`.
- Cooperative bread: `uhCkkush9bq3TOo1ZsBHke-0rUfkeMmMNTAetT3lAJ99NXxg3cx91`.
- Commitment: `uhCkkjPGACx7u_lHs1HNJAfcJkj8rgGRU6QQd3GBov7kbuQxtu5iJ`.
- Transfer event: `uhCkkAZnQb-TDrnhg7NcgRRLtzzM11JqKHNp1pAgzVz0wbyFauuJX`.

Upstream demo имеет 71/71 зелёных проверок на опубликованном hApp; это не проверка нашего требования двух остатков. Минимальный пример [hrea-transfer-repro.ts](hrea-transfer-repro.ts) исключает Plan/Commitment/Intent, сохраняя оба чтения без Apollo cache. До исправления и повторного прохождения transfer hREA нельзя считать проверенным экономическим ядром этого цикла.

## hREA UI

Адрес: **http://localhost:8888**. Upstream `yarn dev` проверен в `hrea-ui-upstream.service`, затем этот unit остановлен: его команды conductor/services несовместимы с hc 0.7. Рабочий Vite запущен отдельно в `hrea-ui-loopback.service`, а `hrea-bootstrap-loopback.service` и `hrea-conductor-loopback.service` обеспечивают backend; они используют локальный bootstrap 28134, admin 22994, app 29281 и transport `mem`. Данные UI находятся в `Moss-lab/hrea-ui-profiles/commonground-ui`, отдельно от Moss и API harness.

UI показывает выбор Form/Table/Graph; открыты Form и Table. Graph rendering — NOT RUN. Form picker содержит Organization, Plan, Agreement, Commitment, EconomicEvent, ProcessSpecification, Process, Proposal, Intent, Unit. **Person, ResourceSpecification, EconomicResource отсутствуют в проверенном меню прямого создания**; это ограничение данного меню, не API. Organization form показывает Name и Submit. Наличие остальных форм ещё не означает прохождения создания всех сущностей или удобного хлебного процесса.

Создание Organization через UI — **PASS**: Name `commonground-bread-v1 — UI organization probe`, Submit, затем Table → Organizations в новом браузерном сеансе показывает одну сохранённую запись с этим названием. При submit был warning Apollo 3.14.0 о поле `organization` в ответе; запись действительно сохранена и перечитана, в том числе после перезапуска conductor и Vite без generation/clean. [hrea-ui.json](evidence/hrea-ui.json) содержит меню, форму, результат и read-back. Создание остальных сущностей через UI — **NOT RUN**; API-записи из acceptance-тестов в этом UI не демонстрировались.

## Unyt: один расчёт и отдельные ограничения

Использована сеть/единица **Fuel (ZF)**, GLOBAL/default System infrastructure, с тестовым credit limit **10000 ZF** у обоих профилей. USD limit = 0; внешние кошельки и bridges не использовались. Это тестовые кредитные единицы, не USD и не реальные средства.

| Проверка | Статус | Результат |
| --- | --- | --- |
| Прямой расчёт 30 ZF | PASS для UI и связанных записей | One нажал Pay **один раз**, Two получил Payment и нажал Accept **один раз**; обе стороны Completed |
| Остатки | PASS | One current −30, available **9970**; Two current +30, available **10030**; proposed 0 |
| Повторный запуск получателя | PASS | те же баланс и операция принятия после restart |
| Превышение лимита в UI | PASS | одна попытка **10001 ZF** при available 9970; `Spend exceeds credit limit`, баланс не изменился |
| Серверное кредитное правило | BLOCKED | в журнале этой попытки нет commit/payment вызова; UI отверг запрос до сервера. Бypass UI не выполнялся |
| Отправка при отключённом получателе, отложенное принятие | NOT RUN | проверка Vines offline не является такой проверкой Unyt |
| Идемпотентность по внешнему ID | NOT RUN | публичный API с таким контрактом для этой версии не подтверждён; платёж не повторялся |
| A→B→C trust route | NOT RUN | третья Unyt-связь/маршрут не создавались; bridge не подменяет этот тест |
| Конкурирующие расходы лимита | NOT RUN | два параллельных commit не отправлялись |
| Резервный подписант / смена полномочий | NOT RUN | ключи не копировались, протокол смены прав не проверен |
| Наш клиент / мобильный API / конфигурация правил | BLOCKED для выбора ядра | документация доступна, но исходники `unytco/unyt-app` недоступны аккаунту CHE77 (GitHub 404); открытость всего ядра и пригодность его API не установлены |

ID отправки/Commitment: `uhCkkmesOWWuMaHlzdN7QhuJguke1h_RyJGDYJDboUiEm1kxGQUW5` — [запись отправителя](evidence/unyt-transaction-public.json).

ID принятия/Accept: `uhCkktidjnB1fYbgCZvJRYD0QaJ_9SQw7Vk4U9EtrcH9M1VsKun5X` — [запись получателя](evidence/unyt-receiver-transaction-public.json). History получателя ссылается на ID отправки. В обеих записях note: `commonground-bread-v1; 30 ZF test credit; no real funds; cooperative -> bakery`.

В записи отправителя присутствует Valid receipt RegisterAgentActivity, но `receipts_complete=false`. Completed в UI не доказывает распределённую окончательность, резервирование лимитов или защиту от двойного расхода. Положительный платёж не повторялся после неизвестного результата.

[Документация Unyt](https://unyt.co/docs/) описывает P2P currencies/Smart Agreements. GitHub API для CHE77 вернул 404 на [unyt-app](https://github.com/unytco/unyt-app); это не позволяет различить private/deleted/absent. [Sandbox](https://github.com/unytco/unyt-sandbox/blob/main/LICENSE) имеет Apache-2.0, [Smart Agreement Library](https://github.com/unytco/smart_agreement_library/blob/main/LICENSE) — GPL-3.0; [результаты доступа](evidence/unyt-source-access.json). Эти лицензии нельзя автоматически приписать недоступному ядру. Автоматическая пара hREA event ↔ Unyt operation не реализована; здесь они сопоставлены только маркером в отчёте.

## Команды повторения

Из `/home/al/Documents/Codex/Moss`:

```bash
node labs/commonground/run.mjs inspect
node --test labs/commonground/run.test.mjs
node --check labs/commonground/run.mjs
node labs/commonground/check-syntax.mjs
yarn typecheck
node labs/commonground/run.mjs prepare-hrea
```

Стандартная подготовка по [официальной инструкции hREA](https://github.com/h-REA/hREA/blob/happ-0.5.0-beta.1/docs/getting-started.md):

```bash
node labs/commonground/run.mjs build-hrea
node labs/commonground/run.mjs demo-hrea
node labs/commonground/run.mjs test-hrea
node labs/commonground/run.mjs repro-hrea
```

Проверенный локальный вариант (env-файл содержит пути к проверенным release binaries, Rust/Nix и Yarn):

```bash
source /home/al/Documents/Codex/Moss-lab/env-hrea07.sh
holochain --version
hc --version
lair-keystore --version
kitsune2-bootstrap-srv --version
rustc --version
node labs/commonground/run.mjs build-hrea --current-env
node labs/commonground/run.mjs demo-hrea --current-env
node labs/commonground/run.mjs test-hrea --current-env
node labs/commonground/run.mjs repro-hrea --current-env
```

Для initial Yarn install использовалось:

```bash
NODE_OPTIONS='--dns-result-order=ipv4first --network-family-autoselection-attempt-timeout=5000 --max-old-space-size=1024' \
  yarn install --frozen-lockfile --network-timeout 120000 --network-concurrency 8
```

Рабочий UI обход (три отдельных терминала, свободные указанные порты; не запускать поверх действующих units):

```bash
source /home/al/Documents/Codex/Moss-lab/env-hrea07.sh
cd /home/al/Documents/Codex/hrea-commonground-lab
# Терминал 1
kitsune2-bootstrap-srv --listen 127.0.0.1:28134
# Терминал 2 — initial generation, только новый пустой каталог
mkdir -p /home/al/Documents/Codex/Moss-lab/hrea-ui-profiles
printf '%s\n' pass | hc sandbox --piped -f=22994 generate workdir/hrea.happ \
  --run=29281 -a hrea --root /home/al/Documents/Codex/Moss-lab/hrea-ui-profiles \
  -d commonground-ui network -b http://127.0.0.1:28134 mem
# Терминал 3
VITE_ADMIN_PORT=22994 VITE_APP_PORT=29281 UI_PORT=8888 yarn workspace ui start
```

Не выполнять generation поверх существующего UI-профиля. Для текущей работающей установки сначала посмотреть `systemctl --user status hrea-ui-loopback hrea-conductor-loopback hrea-bootstrap-loopback`. После остановки UI conductor сохранённый sandbox можно запустить из hREA clone: `hc sandbox list`, затем `printf '%s\n' pass | hc sandbox --piped -f=22994 run 0`; индекс сначала сверить по list, bootstrap оставить запущенным. Upstream `yarn dev` включает `hc s clean` в отдельном clone; это команда пересоздания sandbox, а не восстановления старого профиля.

Ручной запуск Moss с сохранённым тестовым профилем, после остановки его прежнего окна/unit:

```bash
bash /home/al/Documents/Codex/Moss-lab/start-moss.sh agent1 --no-sandbox \
  --bootstrap-url http://127.0.0.1:19444 --signaling-url ws://127.0.0.1:19444 \
  --relay-url http://127.0.0.1:19444/relay
```

Для другого участника заменить agent1 на agent2/agent3. Использован только loopback bootstrap; конфигурации conductor разрешают plaintext relay/signaling для этих локальных адресов. Первый agent3 launch отклонял plaintext URL, OOM counter был 0. Эта конкретная ошибка не была вызвана нехваткой памяти. В дальнейшем MemoryHigh 2G вызывал swap/задержку CDP, увеличение до 3G помогло; все три профиля одновременно не запускались. AppImage запускался с `--no-sandbox` в данном окружении.

## Вывод и оставшиеся проверки

**Moss пригоден для следующего ограниченного опыта с координацией**, однако нынешний путь требует ручной установки/Activate, отдельных приглашений Acorn, переноса названий/ID и иногда reload iframe. Потрачены часы на первоначальные зависимости и окружение; чистое время прохождения пользователем полного цикла не измерено. Полный цикл остановился на Acorn и экономической передаче hREA.

**hREA пока не прошло основной критерий экономического ядра.** Исправление схемы теста позволило дойти до настоящей проверки; изменение остатков transfer остаётся воспроизводимым FAIL на двух артефактах. Следующее техническое действие — разбор и исправление upstream transfer, затем повтор обоих assertions и отдельный multi-signer стенд. В этом PR исправления hREA core нет.

**Unyt подтверждён как отдельный прямой тестовый расчёт**, но оснований выбирать его финансовым ядром CommonGround пока недостаточно: серверные лимиты, concurrent spend, idempotency, trust routing, права резервного подписанта и доступность ядра/API остаются непройденными.

Ручные следующие проверки: повторить Acorn table reload и открытие outcome с двух профилей; проверить Who’s In? список после refresh, сохранив участие второго; добавить рабочую WAL между объектами; провести три одновременных Moss peers на машине с запасом памяти/разных устройствах. Финансовые проверки выполнять отдельно по матрице README, сохраняя ID перед любыми повторными запросами.

Полные локальные логи/скриншоты: `/home/al/Documents/Codex/Moss-lab/cycle-2026-10-11`. В PR включена ограниченная публичная выборка: без приглашений, private keys, keystore configs, tokens и raw launch logs. В конце оставлены работающие профили One/Two и hREA UI; Three остановлен с сохранением данных. Draft PR сохраняется черновиком; автоматического merge нет.

## Дополнение 12.10.2026: CFN на двух независимых peers

**Полный производственный цикл CFN 0.6.0 — FAIL.** Подробный алгоритм опыта, версии, команды и результаты: [CFN_CYCLE_RESULTS.md](CFN_CYCLE_RESULTS.md). Оценка переиспользования обновлена в [CARBON_FARM_NETWORK_ASSESSMENT.md](CARBON_FARM_NETWORK_ASSESSMENT.md).

Через UI созданы акторы на двух подписантах, три вида материала, два рецепта 5→5→4 кг, начальный запас 25 кг и запрос второго участника. Генерация стадий от запроса не прошла; редактор обязательства упал на null. Для независимой проверки учёта создан диагностический план через API того же CFN и выполнены четыре UI-события consume/produce.

| Проверка | Результат |
| --- | --- |
| Сохранение ресурсов, рецептов, запроса | PASS |
| Диагностический API-план и четыре связи event/commitment | PASS; не подтверждает автоматическое планирование |
| UI расход конкретной партии | FAIL: оба consume без resourceInventoriedAs; запас сырья 25 вместо 20, промежуточный запас 5 вместо 0 |
| Стадия выпущенных партий | FAIL: stage отсутствует |
| UI передача результата | FAIL: событие записано без исходной/конечной партии; 4/0 вместо 0/4 |
| Независимый API расход с ID партии | PASS: оба количества 10→8 |
| Независимый API transfer с двумя ID | FAIL: оба количества 8/0 вместо 5/3; подтверждено прямым чтением подписанных resource entries на обоих peers |
| Восстановление второго peer после offline | PASS: записи второй стадии получены после restart; в конце совпали 10 событий, 5 ресурсов и 1 план |

Операции денег и автоматический расчёт не выполнялись. CommonGround не изменён: HEAD `a36b50cecc87ae7bd69df67fb038b51307d1a6ff`; tools не форкались. Оба Moss-профиля восстановлены и оставлены с открытым CFN.

Повторная проверка существующих записей **без мутаций**:

```bash
node --check labs/commonground/cfn-verify.mjs
node labs/commonground/cfn-verify.mjs --output /tmp/cfn-check.json
```

Node 24.21.0, `@msgpack/msgpack` из установленных зависимостей Moss. CDP 9222/9223, CFN должен быть открыт в обоих профилях. Результат: **7 PASS / 8 FAIL, exit 1**; syntax PASS. Это проверка предметных инвариантов, а не общий typecheck Moss. Результаты: [cfn-cycle-live.json](evidence/cfn-cycle-live.json), [cfn-cycle-phases.json](evidence/cfn-cycle-phases.json), [план](evidence/cfn-plan.png), [инвентарь](evidence/cfn-inventory-peer2.png).

По итогам CFN полезен как источник моделей и UI стадий, но его готовый backend пока не проходит критерий учёта. Основным приложением предлагается CommonGround на 0.8 с проверяемым контрактом партии, прав, резервов, событий, обоих остатков и приёмки. Moss остаётся сравнительным стендом.
