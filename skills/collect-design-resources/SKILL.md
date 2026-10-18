---
name: collect-design-resources
description: Collect a traceable design reference and related assets from the selected project source for implementation or UI review. Use for snapshots and resource inventories, not for editing the design.
---

# Collect design resources

1. Войди через [AGENTS.md](../../AGENTS.md), выбери target, reference и [provider](../../stack/README.md). Уточни неизвестные файл/frame, состояния, форм-факторы и приоритет. Не запрашивай уже известное.
2. Прочитай [resources](../../docs/resources.md). Используй доступный read-only инструмент; его специальные skills загружаются по требованиям окружения. При отсутствии доступа предложи предоставленный export и зафиксируй ограничения.
3. Собери минимальные нужные exports и метаданные компонентов, tokens и fonts. Не выгружай все файлы команды. Запиши immutable revision, если доступна; иначе null и limitations.
4. Сохрани snapshot.json и resources в выбранном review root внутри e2e/tmp/. Проверь hashes, права распространения и происхождение. Не сохраняй токены доступа и временные подписанные URLs.
5. Запусти валидатор: `node <design-manifest>/scripts/validate.ts --root <review-root> --snapshot snapshot.json`. Осмотри exports отдельно: валидатор не проверяет их визуальное содержание.
6. Передай snapshot path, source IDs, проверенные состояния и ограничения. Публикация, создание/изменение дизайна и загрузка в другой сервис не входят в сбор.
