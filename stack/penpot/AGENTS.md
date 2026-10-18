# Penpot

Прочитай [общие ресурсы](../../docs/resources.md). Уточни instance URL: cloud и self-hosted могут иметь разные версии и доступные интеграции. Не отправляй файлы self-hosted instance в публичный сервис ради преобразования.

Запиши document/page/board IDs, вариант, тему и состояние. Используй доступный MCP/plugin/API или разрешённый export. Версию получай из фактического инструмента; если immutable revision недоступна, оставь null и ограничение вместо выдуманного аналога Figma version.

Получай исходный board export и необходимые assets/tokens. Проверь scale, fonts, clipping и скрытые состояния. Для .penpot archive используй документированный формат и инструмент соответствующей версии; не считай произвольный архив JSON-ответом REST API. Изменения макета выполняются отдельной порученной задачей.

Интеграции и tokens описаны в [официальном integration guide](https://help.penpot.app/technical-guide/integration/), exports — в [export/import guide](https://help.penpot.app/user-guide/export-import/), возможности платформы — на [Penpot](https://penpot.app/). Не создавай webhooks, внешние uploads или новые credentials как побочный эффект обследования.
