# Design Manifest

Вход агента — этот файл. Манифест работает с дизайнами и ресурсами; исходники приложения и функциональные E2E принадлежат их репозиториям.

1. Для подключения к проекту используй [adapt-design-manifest](skills/adapt-design-manifest/SKILL.md). Для текущей работы определи задачу: собрать reference, изменить дизайн или сравнить полученный UI. Найди target проекта, доступный инструмент и точный источник. Прочитай [границы работы](docs/workflow.md).
2. Загрузи только выбранный стек через [каталог](stack/README.md), затем [ресурсы](docs/resources.md).
3. Для получения reference используй [collect-design-resources](skills/collect-design-resources/SKILL.md). Для сравнения — [compare-ui-with-design](skills/compare-ui-with-design/SKILL.md). Для изменения макета — [design-editing](docs/design-editing.md).
4. При изменении самого манифеста выполни [SSOT-аудит](docs/maintenance.md), `npm ci`, `npm run check`, `npm test` и `git diff --check`.

Команды выполняются в указанном checkout. Credentials не сохраняются в документах или JSON. `workdir/` — локальная адаптация; `e2e/tmp/` — evidence и рабочие результаты выбранного приложения, не место для норм. Текущее поручение имеет приоритет; уже данное разрешение не запрашивается повторно.
