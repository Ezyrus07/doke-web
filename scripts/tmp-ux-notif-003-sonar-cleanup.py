from pathlib import Path

source_path = Path('assets/js/core/notification-toast.js')
source = source_path.read_text(encoding='utf-8')

old_escape = """  const escapeHtml = (value) => normalizeText(value)\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/\\\"/g, '&quot;');\n"""
new_escape = """  const escapeHtml = (value) => normalizeText(value)\n    .replaceAll('&', '&amp;')\n    .replaceAll('<', '&lt;')\n    .replaceAll('>', '&gt;')\n    .replaceAll('\\\"', '&quot;');\n"""
if old_escape not in source:
    raise SystemExit('escapeHtml anchor not found')
source = source.replace(old_escape, new_escape, 1)

old_render = """    const repeat = Number(payload.repeatCount || 1);\n    const icon = normalizeText(config.iconFor?.(payload) || '!');\n    toast.innerHTML = `<span class=\"doke-live-toast__icon\" aria-hidden=\"true\">${escapeHtml(icon)}</span><span class=\"doke-live-toast__content\"><strong>${escapeHtml(payload.title || 'Nova notificação')}${repeat > 1 ? ` <em>×${repeat}</em>` : ''}</strong><span>${escapeHtml(payload.body || payload.message || '')}</span>${actions.length ? `<span class=\"doke-live-toast__actions\">${actions.map((action, index) => `<button type=\"button\" data-toast-action=\"${index}\">${escapeHtml(action.label)}</button>`).join('')}</span>` : ''}<small class=\"doke-live-toast__status\" data-toast-action-status aria-live=\"polite\"></small></span><button class=\"doke-live-toast__close doke-close-button doke-icon-btn doke-icon-btn--flat\" type=\"button\" aria-label=\"Fechar notificação\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12\"></path><path d=\"M18 6 6 18\"></path></svg></button>`;\n"""
new_render = """    const repeat = Number(payload.repeatCount || 1);\n    const icon = normalizeText(config.iconFor?.(payload) || '!');\n    const repeatMarkup = repeat > 1 ? ` <em>×${repeat}</em>` : '';\n    const actionButtonsMarkup = actions\n      .map((action, index) => `<button type=\"button\" data-toast-action=\"${index}\">${escapeHtml(action.label)}</button>`)\n      .join('');\n    const actionsMarkup = actionButtonsMarkup\n      ? `<span class=\"doke-live-toast__actions\">${actionButtonsMarkup}</span>`\n      : '';\n    const titleMarkup = `${escapeHtml(payload.title || 'Nova notificação')}${repeatMarkup}`;\n    const bodyMarkup = escapeHtml(payload.body || payload.message || '');\n    toast.innerHTML = `<span class=\"doke-live-toast__icon\" aria-hidden=\"true\">${escapeHtml(icon)}</span><span class=\"doke-live-toast__content\"><strong>${titleMarkup}</strong><span>${bodyMarkup}</span>${actionsMarkup}<small class=\"doke-live-toast__status\" data-toast-action-status aria-live=\"polite\"></small></span><button class=\"doke-live-toast__close doke-close-button doke-icon-btn doke-icon-btn--flat\" type=\"button\" aria-label=\"Fechar notificação\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12\"></path><path d=\"M18 6 6 18\"></path></svg></button>`;\n"""
if old_render not in source:
    raise SystemExit('defaultRender markup anchor not found')
source = source.replace(old_render, new_render, 1)

old_catch = """    } catch (_error) {\n      state.seen.delete(identity);\n      return false;\n    }\n"""
new_catch = """    } catch (error) {\n      state.seen.delete(identity);\n      config.onRenderError?.(Object.freeze({\n        name: normalizeText(error?.name || 'Error'),\n        message: normalizeText(error?.message || 'Toast renderer failed')\n      }));\n      return false;\n    }\n"""
if old_catch not in source:
    raise SystemExit('renderer catch anchor not found')
source = source.replace(old_catch, new_catch, 1)
source_path.write_text(source, encoding='utf-8')

test_path = Path('scripts/test-ux-notif-003-toast-manager-runtime.js')
test = test_path.read_text(encoding='utf-8')

old_counter = """let sounds = 0;\nlet digest = 0;\n"""
new_counter = """let sounds = 0;\nlet digest = 0;\nlet renderErrors = 0;\n"""
if old_counter not in test:
    raise SystemExit('runtime counters anchor not found')
test = test.replace(old_counter, new_counter, 1)

old_config = """  onPlaySound: () => { sounds += 1; },\n  queueDigest: () => { digest += 1; }\n"""
new_config = """  onPlaySound: () => { sounds += 1; },\n  queueDigest: () => { digest += 1; },\n  onRenderError: (diagnostic) => {\n    renderErrors += 1;\n    assert.equal(diagnostic.name, 'Error');\n    assert.equal(diagnostic.message, 'renderer failure');\n  }\n"""
if old_config not in test:
    raise SystemExit('runtime configure anchor not found')
test = test.replace(old_config, new_config, 1)

old_assert = """manager.configure({ renderToast: () => { throw new Error('renderer failure'); } });\nassert.equal(manager.show(payload('renderer-error')), false);\nmanager.configure({ renderToast: () => ({}) });\n"""
new_assert = """manager.configure({ renderToast: () => { throw new Error('renderer failure'); } });\nassert.equal(manager.show(payload('renderer-error')), false);\nassert.equal(renderErrors, 1);\nmanager.configure({ renderToast: () => ({}) });\n"""
if old_assert not in test:
    raise SystemExit('runtime renderer error anchor not found')
test = test.replace(old_assert, new_assert, 1)
test_path.write_text(test, encoding='utf-8')

print('[ux-notif-003-sonar-cleanup] patch applied')
