from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IGNORE_PARTS = {"archive", ".git", ".venv", "node_modules"}

HTML_RE = re.compile(r'(?:href|src)="([^"]+)"')


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_PARTS for part in path.parts)


def collect_references() -> tuple[set[str], dict[str, list[str]]]:
    references: set[str] = set()
    html_map: dict[str, list[str]] = {}
    for html in ROOT.rglob('*.html'):
        if is_ignored(html):
            continue
        rel_html = html.relative_to(ROOT).as_posix()
        html_map[rel_html] = []
        text = html.read_text(encoding='utf-8')
        for match in HTML_RE.findall(text):
            if match.startswith(('http://', 'https://', '#', 'mailto:', 'tel:')):
                continue
            ref = (html.parent / match).resolve()
            try:
                rel_ref = ref.relative_to(ROOT).as_posix()
            except ValueError:
                continue
            references.add(rel_ref)
            html_map[rel_html].append(rel_ref)
    return references, html_map


def main() -> None:
    references, html_map = collect_references()
    print('== HTML entrypoints and their local references ==')
    for html, refs in sorted(html_map.items()):
        print(f'\n[{html}]')
        for ref in refs:
            print(' -', ref)

    print('\n== Candidate files without direct HTML reference ==')
    candidates = []
    for path in ROOT.rglob('*'):
        if is_ignored(path) or not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.endswith(('.md', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.json')):
            continue
        if rel.endswith('.html'):
            continue
        if rel not in references:
            candidates.append(rel)
    for rel in sorted(candidates):
        print(' -', rel)


if __name__ == '__main__':
    main()
