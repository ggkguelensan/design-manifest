---
name: compare-ui-with-design
description: Compare captured application UI with a specific Figma, Penpot or local design reference and produce evidence-backed findings. Use for design fidelity reviews, not for automatic visual baselines or unsolicited code/design fixes.
---

# Compare UI with design

1. Войди через [AGENTS.md](../../AGENTS.md). Получи фактическое UI evidence и target; если нужны новые кадры, используй capture-процедуру подключённого E2E Manifest по [границе интеграции](../../docs/e2e-integration.md).
2. Получи выбранный snapshot через [collect-design-resources](../collect-design-resources/SKILL.md). Не выбирай похожий макет автоматически.
3. Прочитай [методику сравнения](../../docs/comparison.md). Сопоставь состояние/viewport/theme/locale/content и источник. Неизвестные существенные условия отмечаются inconclusive; просьба сравнить не разрешает исправлять приложение.
4. Осмотри оба оригинала и проверь layout, typography, assets и состояния. Запиши findings с областью, ожидаемым/фактическим, влиянием и confidence. Производные crops/overlays не заменяют оригиналы. Числовые deltas сообщаются только после измерения.
5. Создай comparison.json по [схеме](../../schemas/comparison.schema.json), сохрани все requested pairs, включая not-reviewed. Выполни `node <design-manifest>/scripts/validate.ts --root <review-root> --comparison comparison.json`.
6. Передай findings и ограничения. При запросе HTML или MR/PR используй подключённый skill `create-e2e-report`; форматирование не меняет verdict. Если его нет, верни структурированный результат и явно укажи недоступность форматирования. Не публикуй и не создавай issues без поручения.
