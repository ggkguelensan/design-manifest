# Figma

Прочитай [общие ресурсы](../../docs/resources.md). Для получения reference используй read-only доступ к выбранному file/branch и node. Запиши IDs, версию, export scale и доступный контекст variables/components. До получения design context или выполнения мутаций загрузи обязательные skills подключённого Figma-инструмента, если они предусмотрены окружением.

Figma REST возвращает JSON и изображения выбранных nodes; version query позволяет выбрать конкретную версию. Если metadata и export получены из меняющегося latest, проверь согласованность версии или пометь snapshot несогласованным и пересними. Временный URL export не является долговременным evidence: сохрани разрешённые bytes и hash локально.

Если доступен только screenshot, не утверждай знание layout constraints или token bindings. Для записи используй подходящий доступный plugin/MCP workflow; не предполагай, что read API умеет редактировать произвольные nodes. Наличие токена не разрешает комментарии и публикацию libraries.

Официальные источники: [REST overview](https://developers.figma.com/docs/rest-api/), [file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/), [MCP overview](https://developers.figma.com/docs/figma-mcp-server/). Проверяй текущие scopes и возможности фактически используемого инструмента.
