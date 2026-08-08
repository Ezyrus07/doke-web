from pathlib import Path

path = Path('scripts/test-ux-notif-001-in-app-adapter.js')
text = path.read_text(encoding='utf-8')
old_open = "documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', {\n    items: ["
new_open = "documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', { detail: {\n    items: ["
old_close = "      { id: 'alpha-ignored', eventKey: 'alpha-ignored', userId: 'account_alpha_123456', title: 'Ignored', read: false }\n    ]\n  }));"
new_close = "      { id: 'alpha-ignored', eventKey: 'alpha-ignored', userId: 'account_alpha_123456', title: 'Ignored', read: false }\n    ]\n  } }));"
for old, new, label in [(old_open, new_open, 'sync event detail open'), (old_close, new_close, 'sync event detail close')]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
