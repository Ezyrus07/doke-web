from pathlib import Path
import re

ROOT = Path('.')
IN_APP = ROOT / 'assets/js/features/in-app-notifications.js'
MANAGER = ROOT / 'assets/js/core/notification-toast.js'
TEST_MANAGER = ROOT / 'scripts/test-ux-notif-003-toast-manager.js'
TEST_DELEGATION = ROOT / 'scripts/test-ux-notif-003-in-app-delegation.js'
DOC = ROOT / 'docs/ux/UX-NOTIF-003.md'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


if not MANAGER.exists():
    raise SystemExit('notification-toast.js must exist before patching')

text = IN_APP.read_text(encoding='utf-8')
text = replace_once(text, "  const seen = new Set();\n", "", 'remove seen state')
text = replace_once(text, "  const toastRegistry = new Map();\n", "", 'remove toast registry state')
text = replace_once(text, "  let host = null;\n", "", 'remove toast host state')
text = replace_once(
    text,
    "  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\\"/g, '&quot;');\n",
    "",
    'remove local toast escaping'
)
text = replace_once(
    text,
    "  const getNotificationCenter = () => window.Doke?.notificationCenter || null;\n",
    "  const getNotificationCenter = () => window.Doke?.notificationCenter || null;\n  const getToastManager = () => window.Doke?.notificationToast || null;\n",
    'add toast manager getter'
)
old_priority = "  const priorityOf = (payload) => ['silent', 'normal', 'high'].includes(payload?.priority) ? payload.priority : (typeGroup(payload) === 'mentions' || String(payload?.type || '').includes('ban') ? 'high' : 'normal');\n"
new_priority = """  const priorityOf = (payload) => {
    const canonical = String(payload?.priority || '').trim().toLowerCase();
    if (canonical === 'critical') return 'high';
    if (canonical === 'low') return 'silent';
    if (['silent', 'normal', 'high'].includes(canonical)) return canonical;
    return typeGroup(payload) === 'mentions' || String(payload?.type || '').includes('ban') ? 'high' : 'normal';
  };
"""
text = replace_once(text, old_priority, new_priority, 'canonical priority mapping')
ensure_host_start = text.find("  const ensureHost = () =>")
if ensure_host_start < 0:
    raise SystemExit('ensureHost start not found')
mark_read_start = text.find("  const markAsRead = (id) =>", ensure_host_start)
if mark_read_start < 0:
    raise SystemExit('markAsRead anchor not found')
segment = text[ensure_host_start:mark_read_start]
icon_match = re.search(r"  const iconFor = \(payload\) => .*?;\n", segment)
if not icon_match:
    raise SystemExit('iconFor inside toast block not found')
icon_line = icon_match.group(0)
text = text[:ensure_host_start] + icon_line + text[mark_read_start:]

show_start = text.find("  const show = (payload, options={}) => {")
publish_start = text.find("  const publish = (payload={}) =>", show_start)
if show_start < 0 or publish_start < 0:
    raise SystemExit('show/publish anchors not found')
delegate_show = """  const show = (payload, options = {}) => {
    const manager = getToastManager();
    if (!manager || typeof manager.show !== 'function') return false;
    return manager.show(payload, options);
  };
"""
text = text[:show_start] + delegate_show + text[publish_start:]

unmute_line = "  const unmuteScope = (scope) => { const prefs=readPrefs();prefs.mutedScopes=prefs.mutedScopes.filter((item)=>item!==scope);if(prefs.mutedScopeLabels)delete prefs.mutedScopeLabels[scope];return writePrefs(prefs); };\n"
configure_block = unmute_line + """
  const configureToastManager = () => {
    const manager = getToastManager();
    if (!manager || typeof manager.configure !== 'function') return false;
    manager.configure({
      getAccountKey: () => getAccountKeys()[0] || 'anonymous',
      isForCurrentUser,
      shouldToast,
      isDndActive,
      queueDigest,
      priorityOf,
      iconFor,
      resolveActions,
      scopeOf,
      onMarkRead: markAsRead,
      onOpen: openPayload,
      onMuteScope: muteScope,
      onQuickAction: runQuickAction,
      onRecordActionResult: recordActionResult,
      onPublishAction: publishAction,
      onPlaySound: playSound,
      isActionExpired
    });
    return true;
  };
  configureToastManager();
"""
text = replace_once(text, unmute_line, configure_block, 'configure toast manager')

text = text.replace(
    "    const registered = toastRegistry.get(String(detail.notificationId || ''));",
    "    const registered = getToastManager()?.getRecord?.(String(detail.notificationId || '')) || null;"
)
text = text.replace(
    "    const registered = toastRegistry.get(notificationId);",
    "    const registered = getToastManager()?.getRecord?.(notificationId) || null;"
)
if 'toastRegistry' in text:
    raise SystemExit('toastRegistry reference remains after delegation')

old_auth = """  document.addEventListener('doke:auth-session-change', () => {
    getNotificationCenter()?.refreshAccount?.();
    hydrateNotificationCenter();
  });"""
new_auth = """  document.addEventListener('doke:auth-session-change', () => {
    getToastManager()?.reset?.(getAccountKeys()[0] || 'anonymous');
    getNotificationCenter()?.refreshAccount?.();
    hydrateNotificationCenter();
  });"""
text = replace_once(text, old_auth, new_auth, 'account reset fence')

old_dom = """  document.addEventListener('DOMContentLoaded', () => {
    hydrateNotificationCenter();"""
new_dom = """  document.addEventListener('DOMContentLoaded', () => {
    configureToastManager();
    hydrateNotificationCenter();"""
text = replace_once(text, old_dom, new_dom, 'DOMContentLoaded manager configuration')

text = replace_once(
    text,
    """    publish,
    show,
    publishAction,""",
    """    publish,
    show,
    enqueueToast: show,
    publishAction,""",
    'compatibility enqueue facade'
)

for forbidden in ['const seen = new Set()', 'toastRegistry = new Map()', 'let host = null', 'const ensureHost =']:
    if forbidden in text:
        raise SystemExit(f'local toast authority remains: {forbidden}')

IN_APP.write_text(text, encoding='utf-8')

html_consumers = []
script_pattern = re.compile(r'(?P<indent>[ \t]*)<script\s+src=["\']assets/js/features/in-app-notifications\.js["\']></script>')
for path in sorted(ROOT.glob('*.html')):
    source = path.read_text(encoding='utf-8')
    if 'assets/js/features/in-app-notifications.js' not in source:
        continue
    if 'assets/js/core/notification-toast.js' in source:
        raise SystemExit(f'{path}: notification-toast already loaded unexpectedly')

    def inject(match):
        indent = match.group('indent')
        return f'{indent}<script src="assets/js/core/notification-toast.js"></script>\n{match.group(0)}'

    updated, count = script_pattern.subn(inject, source)
    if count != 1:
        raise SystemExit(f'{path}: expected one in-app script tag, found {count}')
    path.write_text(updated, encoding='utf-8')
    html_consumers.append(path.name)

if not html_consumers:
    raise SystemExit('no root HTML consumers found')

TEST_MANAGER.write_text(r"""const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/core/notification-toast.js'), 'utf8');

const previous = { window: global.window, document: global.document };
global.window = { Doke: {}, setTimeout, clearTimeout, location: { href: '' } };
global.document = { body: { appendChild() {} }, createElement() { throw new Error('default renderer should not execute in policy test'); } };
vm.runInThisContext(source, { filename: 'notification-toast.js' });

const manager = global.window.Doke.notificationToast;
assert.ok(manager, 'Doke.notificationToast must exist');
assert.equal(manager.version, '20260809-ux-notif-003-v1');

let accountKey = 'account-a';
const rendered = [];
const configure = () => manager.configure({
  getAccountKey: () => accountKey,
  isForCurrentUser: () => true,
  shouldToast: () => true,
  isDndActive: () => false,
  renderToast(payload, identity) {
    rendered.push({ payload, identity });
    return { payload, notificationId: payload.id || '' };
  }
});
configure();

const allowed = {
  id: 'n-1',
  eventId: 'evt-1',
  dedupeKey: 'evt-1',
  eventAccepted: true,
  eventCategory: 'MESSAGES',
  sourceAuthority: 'CANONICAL_REMOTE',
  channelPolicy: { toast: 'allowed' }
};
assert.equal(manager.show(allowed), true, 'accepted allowed event should show');
assert.equal(manager.show({ ...allowed, id: 'n-2' }), false, 'same logical event must dedupe by dedupeKey');
assert.equal(rendered.length, 1);

assert.equal(manager.show({ ...allowed, id: 'n-silent', eventId: 'evt-silent', dedupeKey: 'evt-silent', channelPolicy: { toast: 'silent' } }), false, 'silent policy must not toast');
assert.equal(manager.show({ ...allowed, id: 'n-forbidden', eventId: 'evt-forbidden', dedupeKey: 'evt-forbidden', channelPolicy: { toast: 'forbidden' } }), false, 'forbidden policy must not toast');
assert.equal(manager.show({ ...allowed, id: 'n-rejected', eventId: 'evt-rejected', dedupeKey: 'evt-rejected', eventAccepted: false }), false, 'rejected canonical event must fail closed');

const criticalBase = {
  id: 'critical-1',
  eventId: 'critical-evt-1',
  dedupeKey: 'critical-evt-1',
  eventCategory: 'PAYMENTS',
  channelPolicy: { toast: 'allowed' }
};
assert.equal(manager.show({ ...criticalBase, sourceAuthority: 'CANONICAL_LOCAL' }), false, 'critical event without accepted=true must fail closed');
assert.equal(manager.show({ ...criticalBase, eventAccepted: true, sourceAuthority: 'DERIVED_INFORMATIONAL' }), false, 'critical event with noncanonical authority must fail closed');
assert.equal(manager.show({ ...criticalBase, eventAccepted: true, sourceAuthority: 'CANONICAL_LOCAL' }), true, 'canonical critical event may toast');

accountKey = 'account-b';
assert.equal(manager.show(allowed), true, 'account fence must reset transient dedupe for a new account');
assert.equal(manager.getState().accountKey, 'account-b');

assert.equal(manager.identityOf({ dedupeKey: 'dedupe', eventId: 'event', id: 'id' }), 'dedupe');
assert.equal(manager.identityOf({ eventId: 'event', id: 'id' }), 'event');
assert.equal(manager.identityOf({ id: 'id' }), 'id');

for (const forbidden of ['localStorage', 'notificationCenter', 'syncBadges', 'repositories.']) {
  assert.equal(source.includes(forbidden), false, `toast authority must not own ${forbidden}`);
}

if (previous.window === undefined) delete global.window; else global.window = previous.window;
if (previous.document === undefined) delete global.document; else global.document = previous.document;

console.log('[ux-notif-003-toast-manager] ok');
console.log('- canonical toast policy, critical provenance, logical dedupe and account fence validated');
""", encoding='utf-8')

TEST_DELEGATION.write_text(r"""const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inAppPath = path.join(root, 'assets/js/features/in-app-notifications.js');
const source = fs.readFileSync(inAppPath, 'utf8');

for (const forbidden of [
  'const seen = new Set()',
  'const toastRegistry = new Map()',
  'let host = null',
  'const ensureHost ='
]) {
  assert.equal(source.includes(forbidden), false, `in-app adapter must not keep toast authority: ${forbidden}`);
}

for (const required of [
  'const getToastManager = () => window.Doke?.notificationToast || null;',
  'manager.show(payload, options)',
  'manager.configure({',
  "getToastManager()?.getRecord?.",
  "getToastManager()?.reset?.",
  'enqueueToast: show',
  "if (canonical === 'critical') return 'high';",
  "if (canonical === 'low') return 'silent';"
]) {
  assert.ok(source.includes(required), `missing toast delegation contract: ${required}`);
}

const consumers = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .filter((name) => fs.readFileSync(path.join(root, name), 'utf8').includes('assets/js/features/in-app-notifications.js'));

assert.ok(consumers.length > 0, 'expected root HTML consumers');
for (const name of consumers) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const managerTag = 'assets/js/core/notification-toast.js';
  const adapterTag = 'assets/js/features/in-app-notifications.js';
  assert.equal(html.split(managerTag).length - 1, 1, `${name}: toast manager must load exactly once`);
  assert.ok(html.indexOf(managerTag) < html.indexOf(adapterTag), `${name}: toast manager must load before in-app adapter`);
}

console.log('[ux-notif-003-in-app-delegation] ok');
console.log(`- toast authority delegated and load order validated across ${consumers.length} root consumers`);
""", encoding='utf-8')

DOC.write_text("""# UX-NOTIF-003 — Canonical toast manager

## Objetivo

Implementar o handoff `NOTIF-H03` sem alterar transporte, persistência, unread/badge ou o contrato de eventos.

## Autoridades

- `Doke.notificationEvent`: identidade, classificação e `channelPolicy`.
- `Doke.notificationCenter`: snapshot de apresentação, unread e badge.
- `Doke.notificationToast`: elegibilidade canônica de toast, dedupe transitório, account fence e lifecycle/render de toast.
- `DokeInAppNotifications`: adapter de publish/cross-tab, preferences/DND/digest e quick actions.

## Fase 1

A nova authority aplica fail-closed antes das preferências locais:

1. evento com `eventAccepted === false` não gera toast;
2. `channelPolicy.toast` diferente de `allowed` não gera toast;
3. PAYMENTS/DISPUTES/SECURITY exigem `eventAccepted === true` e `CANONICAL_LOCAL|CANONICAL_REMOTE`;
4. dedupe usa `dedupeKey`, depois `eventId`, `eventKey` e somente então `id` legado;
5. troca de conta limpa `seen` e registros DOM transitórios;
6. manager não acessa repository, localStorage, notification center ou badge.

Preferences, DND, digest e quick-action behavior permanecem no adapter por design nesta fase.

## Fora de escopo

Sem backend, Supabase, migrations, staging, produção, browser notifications, redesign visual, migração de preferences/DND, analytics, ready-for-review ou merge.
""", encoding='utf-8')

print('[ux-notif-003-patch] consumers:', ', '.join(html_consumers))
