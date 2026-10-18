# Связь с E2E Manifest

[E2E Manifest](https://github.com/ggkguelensan/e2e-manifest) владеет запуском, capture, покрытием и отчётностью. Design Manifest владеет snapshot, ресурсами и comparison. Общих изменяемых копий схем в двух репозиториях нет.

В выбранном приложении создай review root внутри e2e/tmp/, например `e2e/tmp/design-review/<review-id>/`. В нём находятся snapshot.json, comparison.json, assets/ и производные reports/. UI-снимок из другого run можно скопировать как immutable resource: сохрани hash, run ID и исходный evidence ID/path. Это снимок доказательства, не второй редактируемый реестр.

Схемы snapshot/comparison принадлежат закреплённой поставке Design Manifest. Валидатор запускается из неё с явным --root. При отсутствии поставки E2E может собрать исходные данные, но не объявляет design review выполненным.

Для HTML/MR/PR используй `create-e2e-report` из явно подключённой версии E2E Manifest. Если skill недоступен, передай валидный comparison.json и ресурсы, обозначив отсутствие форматирования. Не угадывай путь соседнего checkout и не скачивай изменяемый main как скрытую зависимость.

Report показывает пары design/UI, findings, source revisions и ограничения. Он не вычисляет новый verdict. Remote comments/uploads требуют поручения на конкретное действие; локальная подготовка отчёта не публикует assets.
