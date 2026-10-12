# Requests and Offers: кандидат для CommonGround

Дата: **12 октября 2026**, Europe/Amsterdam. Статус: анализ исходников и выпусков. Установка, запуск и функциональные тесты этого инструмента в нашем Moss **NOT RUN**.

**Рекомендация:** использовать Requests and Offers кандидатом на основу модуля потребностей, предложений и согласования обменов. Разработка всего этого модуля с нуля сейчас нецелесообразна. Инвентарь конкретных ресурсов, мощности, коллективный производственный граф и автоматический расчёт требуют дополнительной реализации. Переход всего CommonGround на форк R&O пока не обоснован.

## Источники и версии

[DeepWiki](https://deepwiki.com/happenings-community/requests-and-offers/5-hrea-and-valueflows-integration) не открылся через браузерный инструмент; прямой запрос вернул HTTP 429. Проверены первичные исходники, документация, выпуски и PR разработчиков.

| Объект | Проверено |
| --- | --- |
| Repo | [happenings-community/requests-and-offers](https://github.com/happenings-community/requests-and-offers), не архивирован |
| Dev checkout | **5ad458dfc25a83fc90176260b644048e4ce8a775** |
| Последний опубликованный выпуск по GitHub API | **v0.6.0-alpha.1**, prerelease от 15.09.2026 |
| Commit тега | **967e6255ca1a2b7dc0436d1153237bf1d5d15ba5** |
| Runtime dev / описание выпуска | Holochain **0.6.1**; Cargo.toml: HDK 0.6.1, HDI 0.7.1 |
| hREA dev | закреплён **happ-0.4.0-beta**, отдельная роль hrea |
| Наш Moss | desktop **0.15.8**, Holochain **0.6.1** |
| Лицензия R&O | **CAL-1.0**, package.json и LICENSE.md |

Совпадение runtime, WeaveClient.connect и опубликованный webhApp делают R&O подходящим кандидатом для нашего Moss. Это подтверждение по коду и метаданным; живую совместимость ещё нужно проверить. [Выпуск и инструкция Moss/Weave](https://github.com/happenings-community/requests-and-offers/releases/tag/v0.6.0-alpha.1), [Weave service](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/ui/src/lib/services/weave.service.ts).

## Автоматизация есть, но важно выбрать правильную версию

**Опубликованный v0.6.0-alpha.1** записывает обмен в собственном модуле: Interest, Agreement, Response, Completion, Review, Cancellation. Состояние выводится из записей. Автоматического зеркала принятия/выполнения обмена из последующего PR в этом теге нет: createAgreementFromExchange и recordCompletionEvent отсутствуют в прочитанном файле тега. [Документация exchange record](https://happenings-community.github.io/requests-and-offers/technical-specs/zomes/exchanges.html).

**Dev 5ad458d** включает [PR #255](https://github.com/happenings-community/requests-and-offers/pull/255), merged 29.09.2026. В коде есть следующая цепочка:

| Действие | Автоматическое следствие |
| --- | --- |
| Создание запроса / предложения | Proposal и связанные Intents в hREA |
| Принятие обмена | exchange:accepted → createAgreementFromExchange → Agreement + Commitments |
| Отметка участника о выполнении | exchange:completed → recordCompletionEvent → EconomicEvent; его Commitment отмечается finished |

Это полезная реализация требования «одно действие активирует другое». Цепочка проверена чтением [Exchanges store](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/ui/src/lib/stores/exchanges.store.svelte.ts) и [hREA store](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/ui/src/lib/stores/hrea.store.svelte.ts). Разработчики сообщают о двух peers и тестах; в нашем окружении они ещё не повторялись.

## Что пока не соответствует требуемому производственному процессу

- **Зеркалирование работает в UI.** Собственные zomes R&O не управляют hREA. Для CommonGround нужны долговечная очередь и восстановление переходов при закрытом/оборванном UI. Задача [#278](https://github.com/happenings-community/requests-and-offers/issues/278) прямо отмечает RAM-only mappings и риск дубликатов при восстановлении.
- **Событие создаётся по Done.** Отзыв о качестве идёт отдельно и не является условием создания события. Это уточнено в разделе Implementation status; начальная схема документа описывает более широкий замысел. Для оплаты понадобится отдельная подписанная приёмка. [Фактическая реализация](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/documentation/architecture/hrea-integration.md#implementation-status-september-2026-featexchanges-hrea-mirror).
- **Вид услуги не является личным запасом.** Service Types и Mediums of Exchange отображаются в ResourceSpecification. Изученный mapper не выбирает конкретную партию участника и не резервирует её.
- **Структура условий неполная.** delivery_timeframe — свободный текст. Количество с неизвестной единицей превращается в note. Для планирования нужны структурированные сроки и единицы.
- **Currency/transfer не исполняет платёж.** Это описание экономического потока. Прочитанная цепочка не вызывает наш Credit Layer или Unyt и не доказывает движение средств.

Последние три пункта относятся к конкретному [mapper обмена](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/ui/src/lib/services/mappers/agreement-commitment.mapper.ts), а не ко всем возможным расширениям приложения.

Наш прежний transfer FAIL относится к hREA **0.5.0-beta.1**, R&O dev использует **0.4.0-beta**. Нужно отдельно проверить два остатка и многопользовательскую работу; нельзя объявлять этот выпуск ни затронутым, ни исправленным по одному различию версий.

После изучения [Carbon Farm Network](CARBON_FARM_NETWORK_ASSESSMENT.md) его модели и UI стали приоритетным кандидатом для инвентаря, рецептов и стадий. [Последующий live test](CFN_CYCLE_RESULTS.md) выявил расход без партии и некорректные остатки transfer; готовность backend не подтверждена. Ниже ресурсные функции следует понимать как расширение CommonGround на 0.8 с оценкой переиспользования предметных частей CFN; R&O оценивается прежде всего как модуль обменов.

## Что брать готовым, что добавлять

| Требование | Рекомендация |
| --- | --- |
| Потребности, предложения, категоризация услуг | R&O — кандидат на основу модуля, сравнить с нашим Marketplace |
| Двустороннее согласование, подтверждение действий, отзывы | переиспользовать модель и правила после собственных тестов |
| Связь действий с hREA | использовать dev-код как основу адаптера; усилить восстановление и идемпотентность |
| Личный инвентарь, партии и остатки | добавить EconomicResource и выбор конкретного вклада |
| Мощности, календарь, конфликт резервов | разработать предметный модуль |
| Производство с несколькими вкладчиками | расширить модель; двустороннего primary/reciprocal обмена недостаточно |
| Общая доска разных типов блоков | новый редактор ресурсов, процессов, обязательств и фактов |
| Приёмка → автоматический расчёт | политика соглашения и адаптер финансового backend |
| P2P финансы | развивать/сравнивать существующий Credit Layer; Unyt остаётся альтернативным кандидатом |
| Профили, группы и мобильный клиент | сохранить CommonGround; выбор marketplace не требует замены всего приложения |

CAL-1.0 имеет условия предоставления исходников и пользовательских данных при поставке системы; учитывать их при выборе способа переиспользования. [Лицензия](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/LICENSE.md). Форк не создавался, код не переносился.

## Практический следующий опыт

1. **Релиз v0.6.0-alpha.1:** проверить установку в отдельный тестовый экземпляр, интерфейс и двусторонний exchange record.
2. **Закреплённый dev 5ad458d:** отдельно собрать и проверить автоматическую цепочку hREA. Не выдавать установку старого релиза за эту проверку.
3. На двух независимых участниках пройти запрос → согласование → выполнение; читать исходные записи и связанные hREA ID с обеих сторон.
4. Перезапустить UI между этапами, прервать зеркалирование, проверить восстановление без дубликатов.
5. Добавить конкретную ресурсную партию; подтвердить передачу по двум остаткам и исполнение обязательства.
6. Подключить один тестовый расчёт по приёмке; после сбоя восстановить исходный результат с прежним платёжным ID.

Repo weave/tool-list-0.15.json всё ещё указывает **0.3.0-alpha.1** из другого GitHub namespace. Этот каталог не устанавливает рассмотренный новый выпуск. Нужен точный webhApp и тестовая запись каталога с проверенными hashes. [Каталог repo](https://github.com/happenings-community/requests-and-offers/blob/5ad458dfc25a83fc90176260b644048e4ce8a775/weave/tool-list-0.15.json).

Готовый release webhApp скачан в /home/al/Documents/Codex/Moss-lab/artifacts/requests_and_offers-v0.6.0-alpha.1.webhapp: **13 835 045 байт**, SHA256 **facd75248cc70175857061d3091cb47e1d66509fbcc8cef00c3ebe60875b848c**, совпадает с digest GitHub release asset. Он **ещё не установлен**.

До dev-запуска нужно согласовать порты: weave/applet-dev.sh задаёт UI_PORT=8888, weave.dev.config.json — uiPort=8880, а наш hREA UI занимает 8888. Эти команды не запускались; это найденное ограничение предварительной подготовки.

**Критерий выбора:** готовые функции должны сократить ручные действия и наш объём кода. Если для полноценного CommonGround придётся переписать большую часть приложения, выгоднее перенести отдельные решения в существующие модули. Решение о форке принимать после этого короткого опыта.

## Границы проверки

Clone расположен в /home/al/Documents/Codex/Moss-lab/research/requests-and-offers. Исходники CommonGround и Moss не изменялись; tools не форкались. Сборка, установка, peer-синхронизация и платежи — NOT RUN.

Graph Verify: requests-and-offers, generation 2026-10-11T22:26:17Z. Прочитаны точные snippets и направления вызовов, проверено покрытие. Материальные TS/Rust paths: metadata_match/no_recorded_issue. Исключённые scripts, license и documentation прочитаны напрямую; исходники тега — через git show отдельно от dev. Это ограниченный обзор, не полный аудит приложения.
