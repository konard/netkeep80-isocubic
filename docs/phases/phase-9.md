# Фаза 9: GOD MODE — Автоматизация интерактивной разработки

Данный документ содержит планирование задач для создания системы интерактивной разработки приложений с AI-агентом (GOD MODE).

**Статус**: 🚧 В разработке

---

## Обзор

**Цель**: Создать систему интерактивной разработки, позволяющую пользователям взаимодействовать с AI-агентом прямо внутри приложения для формулировки и автоматического создания задач (GitHub issues).

**Проблема**: Текущая система DevMode представлена несколькими разрозненными панелями (DevModeQueryPanel, ComponentContextPanel, ExtendedSearchPanel), которые:
- Появляются в разных местах экрана, что неудобно
- Не предоставляют единую точку взаимодействия с AI-агентом
- Не позволяют автоматически создавать задачи в репозитории
- Тесно связаны с кодовой базой isocubic и не могут быть переиспользованы

**Решение**: GOD MODE — единый интерфейс интерактивной разработки:
- **Отдельное плавающее окно** с вкладками для всех DevMode-функций
- **AI-агент** для обсуждения улучшений и формулировки задач
- **Автоматическое создание issues** в GitHub-репозитории
- **Выделение в библиотеку** для использования в других проектах

**Концепция**: Визуальный WYSIWYG для разработки — пользователь "путешествует" по приложению с AI-компаньоном, обсуждает что нужно изменить, а AI формирует задачу для "Hive Mind" (команды разработчиков или других AI-агентов).

---

## Планируемые TASK

### TASK 54: Unified DevMode Window ✅

**Заголовок**: `Единое плавающее окно для DevMode`

**Статус**: ✅ Завершено

**Описание**:
Создать единое плавающее окно, объединяющее все DevMode-панели в один интерфейс с вкладками.

**Выполненные задачи**:
- [x] Создание компонента GodModeWindow (плавающее окно)
- [x] Drag-and-drop перемещение окна
- [x] Изменение размера окна (8 направлений: углы и стороны)
- [x] Система вкладок (Query, Context, Search, Conversation, Issues)
- [x] Сохранение позиции и размера в localStorage
- [x] Интеграция существующих панелей в вкладки
- [x] Клавиатурные сокращения (Ctrl+Shift+G для открытия)
- [x] Кнопки Pin/Minimize/Close

**Критерии приёмки**:
- [x] Окно можно перемещать по экрану
- [x] Окно можно изменять в размерах
- [x] Все существующие панели доступны через вкладки
- [x] Позиция и размер сохраняются между сессиями
- [x] Окно не перекрывает основной контент (React Portal для z-index)

**Созданные файлы**:
- `src/components/GodModeWindow.tsx` — основной компонент окна
- `src/components/GodModeWindow.test.tsx` — тесты компонента
- `src/types/god-mode.ts` — типы и утилиты для GOD MODE
- `src/types/god-mode.test.ts` — тесты типов

**Метки**: `god-mode`, `ui`, `devmode`, `window`

---

### TASK 55: AI Conversation Agent ✅

**Заголовок**: `AI-агент для интерактивного обсуждения`

**Статус**: ✅ Завершено

**Описание**:
Создать AI-агента для полноценного диалога с пользователем о возможных улучшениях приложения.

**Выполненные задачи**:
- [x] Создание компонента ConversationPanel
- [x] История сообщений (chat-like interface)
- [x] Контекстное понимание текущего состояния приложения
- [x] Возможность "показать" AI текущий экран/компонент
- [x] Подсказки для формулировки предложений
- [x] Интеграция с TinyLLM для генерации ответов
- [x] Режим "guided brainstorming" для генерации идей

**Критерии приёмки**:
- [x] Пользователь может вести диалог с AI на естественном языке
- [x] AI понимает контекст текущего компонента/экрана
- [x] История сохраняется в сессии
- [x] AI помогает сформулировать предложения по улучшению

**Созданные файлы**:
- `src/components/ConversationPanel.tsx` — компонент чата с AI
- `src/components/ConversationPanel.test.tsx` — тесты компонента
- `src/lib/conversation-agent.ts` — AI-агент с определением намерений и генерацией ответов
- `src/lib/conversation-agent.test.ts` — тесты агента

**Обновлённые файлы**:
- `src/types/god-mode.ts` — добавлены типы ConversationMessage, ConversationSession, утилиты для управления сессиями
- `src/components/GodModeWindow.tsx` — интеграция ConversationPanel во вкладку "Conversation"

**Особенности реализации**:
- Поддержка русского и английского языков
- Определение намерений пользователя (improvement, bug, feature, question, task, general)
- Автоматические подсказки на основе намерения
- Интеграция с метаданными компонентов для контекстного понимания
- Сохранение истории диалога в localStorage
- Индикатор набора текста при обработке сообщений
- Кнопка очистки истории диалога

**Метки**: `god-mode`, `ai`, `chat`, `conversation`

---

### TASK 56: Issue Draft Generator

**Заголовок**: `Генератор черновиков задач (issues)`

**Описание**:
Создать модуль для автоматической генерации структурированных черновиков GitHub issues на основе диалога с пользователем.

**Планируемые задачи**:
- [ ] Создание типов IssueDraft, IssueTemplate
- [ ] Парсинг диалога для извлечения требований
- [ ] Генерация заголовка issue
- [ ] Генерация структурированного описания
- [ ] Предложение меток (labels)
- [ ] Preview черновика перед публикацией
- [ ] Редактирование черновика вручную
- [ ] Шаблоны для разных типов задач (bug, feature, improvement)

**Критерии приёмки**:
- [ ] AI генерирует структурированный черновик issue
- [ ] Пользователь может просмотреть и отредактировать черновик
- [ ] Поддержка разных типов задач
- [ ] Автоматическое определение приоритета и сложности

**Файлы для создания**:
- `src/lib/issue-generator.ts`
- `src/lib/issue-generator.test.ts`
- `src/components/IssueDraftPanel.tsx`
- `src/components/IssueDraftPanel.test.tsx`

**Метки**: `god-mode`, `ai`, `issues`, `generator`

---

### TASK 57: GitHub Integration

**Заголовок**: `Интеграция с GitHub API`

**Описание**:
Реализовать интеграцию с GitHub API для автоматического создания issues в репозитории проекта.

**Планируемые задачи**:
- [ ] OAuth авторизация через GitHub
- [ ] Получение информации о репозитории
- [ ] Создание issues через GitHub API
- [ ] Получение списка labels репозитория
- [ ] Получение шаблонов issues (если есть)
- [ ] Уведомление о созданном issue
- [ ] Ссылка на созданный issue

**Критерии приёмки**:
- [ ] Пользователь может авторизоваться через GitHub
- [ ] Issues создаются в выбранном репозитории
- [ ] Labels автоматически применяются
- [ ] После создания показывается ссылка на issue

**Файлы для создания**:
- `src/lib/github-api.ts`
- `src/lib/github-api.test.ts`
- `src/components/GitHubAuthButton.tsx`
- `src/components/GitHubAuthButton.test.tsx`

**Зависимости**:
- GitHub OAuth App (необходима настройка в репозитории)

**Метки**: `god-mode`, `github`, `api`, `oauth`

---

### TASK 58: Screen Capture & Annotation

**Заголовок**: `Захват экрана и аннотации`

**Описание**:
Реализовать возможность захвата скриншотов текущего состояния приложения и добавления аннотаций для иллюстрации issues.

**Планируемые задачи**:
- [ ] Захват скриншота текущего viewport
- [ ] Захват отдельного компонента
- [ ] Инструменты аннотации (стрелки, текст, выделение)
- [ ] Загрузка изображения в issue
- [ ] Сохранение аннотированных скриншотов
- [ ] Интеграция с IssueDraftPanel

**Критерии приёмки**:
- [ ] Можно сделать скриншот текущего экрана
- [ ] Можно добавить аннотации на скриншот
- [ ] Скриншоты прикрепляются к issues

**Файлы для создания**:
- `src/lib/screen-capture.ts`
- `src/lib/screen-capture.test.ts`
- `src/components/AnnotationCanvas.tsx`
- `src/components/AnnotationCanvas.test.tsx`

**Метки**: `god-mode`, `screenshot`, `annotation`, `ui`

---

### TASK 59: GOD MODE Library Extraction

**Заголовок**: `Выделение GOD MODE в отдельную библиотеку`

**Описание**:
Выделить GOD MODE в отдельный npm-пакет для использования в других React-проектах.

**Планируемые задачи**:
- [ ] Создание структуры npm-пакета
- [ ] Абстрагирование от isocubic-специфичного кода
- [ ] Конфигурируемый API для интеграции
- [ ] Документация библиотеки
- [ ] Примеры использования
- [ ] Публикация в npm registry
- [ ] Настройка CI для автоматической публикации

**Критерии приёмки**:
- [ ] Библиотека устанавливается через `npm install @isocubic/god-mode`
- [ ] Простая интеграция через `<GodModeProvider>`
- [ ] Конфигурация через props (GitHub repo, labels, etc.)
- [ ] Работает с любым React-приложением

**Структура пакета**:
```
packages/god-mode/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── components/
│   ├── lib/
│   └── types/
└── examples/
```

**Метки**: `god-mode`, `library`, `npm`, `extraction`

---

## Архитектура

### Схема взаимодействия

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GOD MODE Window                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [Query] [Context] [Search] [Conversation] [Issues]           │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │                 Active Tab Content                       │ │  │
│  │  │                                                         │ │  │
│  │  │   • DevModeQueryPanel (existing)                        │ │  │
│  │  │   • ComponentContextPanel (existing)                    │ │  │
│  │  │   • ExtendedSearchPanel (existing)                      │ │  │
│  │  │   • ConversationPanel (new)                             │ │  │
│  │  │   • IssueDraftPanel (new)                               │ │  │
│  │  │                                                         │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  [Create Issue]  [Capture Screen]  [Settings]  [Minimize]  [Close] │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Conversation Agent                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Context        │  │  TinyLLM        │  │  Issue Generator    │ │
│  │  Analyzer       │→→│  Dialog Engine  │→→│  (Draft Creator)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Integration                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  OAuth Auth     │  │  Issue API      │  │  Screenshot         │ │
│  │  (Token)        │  │  (Create/Edit)  │  │  Upload (Gist)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Поток создания Issue

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Навигация  │ →  │  Обсуждение  │ →  │   Черновик   │ →  │  Публикация  │
│   по app     │    │   с AI       │    │   Issue      │    │  на GitHub   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  "Вижу баг в       "Кнопка не         Заголовок:          POST /repos/
   этой кнопке"      меняет цвет        "Fix: Button        owner/repo/
                     при наведении"      hover state"        issues
```

### Типы данных

```typescript
// Конфигурация GOD MODE
interface GodModeConfig {
  github?: {
    owner: string;
    repo: string;
    defaultLabels?: string[];
    issueTemplates?: IssueTemplate[];
  };
  position?: WindowPosition;
  size?: WindowSize;
  tabs?: GodModeTab[];
  shortcuts?: KeyboardShortcuts;
}

// Позиция окна
interface WindowPosition {
  x: number;
  y: number;
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Размер окна
interface WindowSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

// Вкладки GOD MODE
type GodModeTab =
  | 'query'        // AI Query Interface
  | 'context'      // Component Context
  | 'search'       // Extended Search
  | 'conversation' // AI Conversation
  | 'issues';      // Issue Drafts

// Черновик Issue
interface IssueDraft {
  title: string;
  body: string;
  labels: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'bug' | 'feature' | 'improvement' | 'documentation';
  screenshots?: Screenshot[];
  relatedComponents?: string[];
  conversationContext?: ConversationMessage[];
}

// Сообщение в диалоге
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    componentId?: string;
    screenshot?: Screenshot;
    screenPosition?: { x: number; y: number };
  };
}

// Скриншот с аннотациями
interface Screenshot {
  id: string;
  imageData: string;  // base64
  annotations?: Annotation[];
  componentId?: string;
  timestamp: Date;
}

// Аннотация
interface Annotation {
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  coordinates: { x: number; y: number; x2?: number; y2?: number };
  color?: string;
  text?: string;
}
```

---

## Оценка объёма работ

| TASK | Сложность | Приоритет | Зависимости |
|------|-----------|-----------|-------------|
| 54. Unified DevMode Window | Средняя | Критический | — |
| 55. AI Conversation Agent | Высокая | Критический | TASK 54 |
| 56. Issue Draft Generator | Средняя | Критический | TASK 55 |
| 57. GitHub Integration | Высокая | Высокий | TASK 56 |
| 58. Screen Capture & Annotation | Средняя | Средний | TASK 54 |
| 59. GOD MODE Library Extraction | Высокая | Низкий | TASK 54-58 |

**Порядок выполнения**:
1. TASK 54 (базовое окно) — фундамент для всего
2. TASK 55 + TASK 58 (параллельно) — AI диалог и скриншоты
3. TASK 56 (генератор issues) — требует AI агента
4. TASK 57 (GitHub) — финализация функционала
5. TASK 59 (библиотека) — рефакторинг и выделение

---

## Зависимости

- **Фаза 8** (AI + Metadata) — TinyLLM, DevMode панели, метаданные
- **GitHub OAuth App** — для TASK 57 требуется создание OAuth приложения
- **html2canvas** или Canvas API — для TASK 58 (скриншоты)

---

## Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сложность OAuth авторизации | Средняя | Высокое | Использовать Personal Access Token как fallback |
| Ограничения браузера на скриншоты | Низкая | Среднее | Использовать html2canvas с polyfills |
| Размер библиотеки | Средняя | Среднее | Lazy loading, code splitting |
| Конфликты Z-index с приложением | Низкая | Низкое | Использовать React Portal |

---

## Следующие шаги

После завершения Фазы 9 планируется:

- **Фаза 10**: Marketplace и монетизация
  - Платные кубики и пресеты
  - Премиум-подписка
  - Выплаты авторам

---

**Назад к [README](../../README.md)**
