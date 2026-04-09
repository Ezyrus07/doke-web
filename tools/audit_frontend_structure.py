#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS_ROOT = ROOT / 'assets' / 'css'
JS_ROOT = ROOT / 'assets' / 'js'
HTML_FILES = list(ROOT.glob('*.html')) + list((ROOT / 'auth').glob('*.html'))


def kb(path: Path) -> int:
    return int(path.stat().st_size / 1024)


def top_files(base: Path, suffix: str, limit: int = 10):
    files = sorted(base.rglob(f'*{suffix}'), key=lambda p: p.stat().st_size, reverse=True)
    return files[:limit]


def html_links(path: Path):
    text = path.read_text(encoding='utf-8', errors='ignore')
    css = re.findall(r'href=["\']([^"\']+\.css)["\']', text)
    js = re.findall(r'src=["\']([^"\']+\.js)["\']', text)
    return css, js


print('=== Largest CSS files ===')
for path in top_files(CSS_ROOT, '.css'):
    print(f'{kb(path):>4} KB  {path.relative_to(ROOT)}')

print('\n=== Largest JS files ===')
for path in top_files(JS_ROOT, '.js'):
    print(f'{kb(path):>4} KB  {path.relative_to(ROOT)}')

print('\n=== HTML asset map ===')
for html in sorted(HTML_FILES):
    css, js = html_links(html)
    print(f'\n[{html.relative_to(ROOT)}]')
    for item in css:
        print(f'  CSS: {item}')
    for item in js:
        print(f'  JS : {item}')

print('\n=== Heuristics ===')
print('- revisar páginas internas que importam home.css só por shell compartilhado')
print('- revisar páginas que compartilham CSS de outra página')
print('- mover mocks de scripts de página para assets/data/mocks/')
