# Design Manifest

Правила и skills для получения дизайн-ресурсов, работы с Figma/Penpot и сравнения фактического UI с выбранным макетом. Вход агента — [AGENTS.md](AGENTS.md).

| Задача | Читать |
| --- | --- |
| Подключение, область и хранение | [Workflow](docs/workflow.md) |
| Снимок макета, assets, fonts и tokens | [Resources](docs/resources.md) и [collect-design-resources](skills/collect-design-resources/SKILL.md) |
| Изменение макета | [Design editing](docs/design-editing.md) |
| Сравнение реализации с дизайном | [Comparison](docs/comparison.md) и [compare-ui-with-design](skills/compare-ui-with-design/SKILL.md) |
| Работа через инструмент | [Stack](stack/README.md) |
| Передача в E2E и отчёт | [E2E integration](docs/e2e-integration.md) |
| Развитие правил | [Maintenance](docs/maintenance.md) |

## Проверки

```sh
npm ci
npm run check
npm test
node scripts/validate.ts --root /absolute/project/e2e/tmp/review-001 --snapshot snapshot.json
node scripts/validate.ts --root /absolute/project/e2e/tmp/review-001 --comparison comparison.json
```

CLI работает локально: JSON Schema, форматы дат, пути, hashes ресурсов и связи evidence. Он не подключается к Figma/Penpot, не сравнивает изображения и не подтверждает визуальный verdict. Hash spec записывается как provenance: этот CLI не читает исходники приложения вне review root. Schema IDs — идентификаторы; зависимости схем загружаются из локальной поставки без сети. Браузерное/визуальное ревью выполняет агент отдельно.

Модули Figma/Penpot описывают workflow через доступные официальные API/MCP/plugins. Это не встроенные сетевые adapters: фактическая доступность и права проверяются в окружении пользователя. Live-проверка с дизайнерскими файлами пока не выполнена.
