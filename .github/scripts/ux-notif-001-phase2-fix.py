from pathlib import Path

path = Path('.github/scripts/ux-notif-001-phase2-executor.py')
text = path.read_text(encoding='utf-8')
replacements = {
    "if 'syncGlobalBadges' in text or 'DokeInAppNotifications' in text:\n    raise SystemExit('repository still depends on presentation badge writer')": "if 'syncGlobalBadges' in text:\n    raise SystemExit('repository still contains a badge writer')",
    "[!repository.includes('syncGlobalBadges') && !repository.includes('DokeInAppNotifications'), 'repository is not badge writer']": "[!repository.includes('syncGlobalBadges'), 'repository is not badge writer']",
    "assert(!repository.includes('DokeInAppNotifications'));\n": ""
}
for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'phase2 assertion fix expected 1 match, found {count}: {old[:60]}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
