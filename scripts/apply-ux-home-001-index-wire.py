#!/usr/bin/env python3
from pathlib import Path

path = Path('index.html')
source = path.read_text(encoding='utf-8')
old = '  <script src="assets/js/pages/index-data-controller.js?v=20260719-home-render-before-reveal-v1" defer></script>'
new = '\n'.join([
    '  <script src="assets/js/pages/home/rail-state.js?v=20260806-ux-home-001-v1" defer></script>',
    '  <script src="assets/js/pages/index-data-controller.js?v=20260806-ux-home-001-v1" defer></script>'
])
if source.count(old) != 1:
    raise SystemExit(f'expected exactly one canonical index controller script, found {source.count(old)}')
if 'assets/js/pages/home/rail-state.js' in source:
    raise SystemExit('home rail state script is already wired')
path.write_text(source.replace(old, new), encoding='utf-8')
print('UX-HOME-001 index script order wired')
