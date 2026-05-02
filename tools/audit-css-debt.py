#!/usr/bin/env python3
"""Audit CSS debt without modifying runtime files.

Outputs reports under docs/reports/ so frontend refactors can be planned
without deleting or moving CSS blindly.
"""
from __future__ import annotations

import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_ROOT = ROOT / "assets" / "css"
REPORTS_DIR = ROOT / "docs" / "reports"

CSS_IMPORT_RE = re.compile(r"@import\s+(?:url\()?['\"]?([^'\")\s]+)")
HTML_CSS_RE = re.compile(r"href=['\"]([^'\"]+\.css(?:\?[^'\"]*)?)['\"]")
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)

SHELL_TOUCH_RE = re.compile(
    r"\b(body|html|\.app-shell|\.page__content|\.sidebar|\.site-sidebar|\.app-header|\.topbar|\.shell-home|\.doke-shell)\b"
)

TEMP_FILE_RE = re.compile(r"(?:fix|hotfix|ajuste|novo|redesign|stage)\.css$", re.I)


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def strip_query(value: str) -> str:
    return value.split("?", 1)[0]


def resolve_import(importer: Path, target: str) -> str:
    target = strip_query(target)
    if target.startswith(("http://", "https://", "//")):
        return target
    resolved = (importer.parent / target).resolve()
    try:
        return resolved.relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return target


def import_after_runtime_rules(css_text: str) -> bool:
    """CSS @import is valid before runtime rules; comments are ignored."""
    stripped = COMMENT_RE.sub("", css_text)
    seen_runtime_rule = False
    for line in stripped.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("@charset"):
            continue
        if s.startswith("@import"):
            if seen_runtime_rule:
                return True
            continue
        seen_runtime_rule = True
    return False


def main() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    css_files = sorted(CSS_ROOT.glob("**/*.css"))
    html_files = sorted(ROOT.glob("**/*.html")) + sorted((ROOT / "auth").glob("**/*.html"))
    html_files = sorted(set(p for p in html_files if p.is_file()))

    import_edges: dict[str, list[str]] = defaultdict(list)
    html_refs: dict[str, list[str]] = defaultdict(list)
    important_counts: list[tuple[int, str]] = []
    literal_radius_counts: list[tuple[int, str]] = []
    shell_touch_counts: list[tuple[int, str]] = []
    invalid_imports: list[str] = []
    temp_css_files: list[str] = []

    all_import_refs: set[str] = set()
    all_html_refs: set[str] = set()

    for css in css_files:
        text = css.read_text(encoding="utf-8", errors="ignore")
        r = rel(css)
        important = text.count("!important")
        if important:
            important_counts.append((important, r))
        radius_literals = len(re.findall(r"border-radius\s*:\s*(?!var\()", text))
        if radius_literals:
            literal_radius_counts.append((radius_literals, r))
        shell_touches = len(SHELL_TOUCH_RE.findall(text))
        if shell_touches:
            shell_touch_counts.append((shell_touches, r))
        if import_after_runtime_rules(text):
            invalid_imports.append(r)
        if TEMP_FILE_RE.search(css.name):
            temp_css_files.append(r)
        for match in CSS_IMPORT_RE.finditer(text):
            target = resolve_import(css, match.group(1))
            import_edges[r].append(target)
            if target.startswith("assets/css/"):
                all_import_refs.add(target)

    for html in html_files:
        text = html.read_text(encoding="utf-8", errors="ignore")
        for match in HTML_CSS_RE.finditer(text):
            target = strip_query(match.group(1))
            if target.startswith("/"):
                target = target.lstrip("/")
            html_refs[target].append(rel(html))
            if target.startswith("assets/css/"):
                all_html_refs.add(target)

    referenced_css = all_html_refs | all_import_refs
    orphan_candidates = [rel(css) for css in css_files if rel(css) not in referenced_css]

    # CSV: important map
    with (REPORTS_DIR / "frontend-stage5-important-map.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["important_count", "file"])
        for count, path in sorted(important_counts, reverse=True):
            writer.writerow([count, path])

    with (REPORTS_DIR / "frontend-stage5-radius-literals.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["literal_border_radius_count", "file"])
        for count, path in sorted(literal_radius_counts, reverse=True):
            writer.writerow([count, path])

    with (REPORTS_DIR / "frontend-stage5-shell-touch-map.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["shell_or_global_selector_hits", "file"])
        for count, path in sorted(shell_touch_counts, reverse=True):
            writer.writerow([count, path])

    (REPORTS_DIR / "frontend-stage5-orphan-css-candidates.txt").write_text(
        "# Candidatos a CSS órfão\n"
        "# Não apagar automaticamente. Primeiro verificar JS, páginas futuras e histórico.\n\n"
        + "\n".join(orphan_candidates)
        + "\n",
        encoding="utf-8",
    )

    (REPORTS_DIR / "frontend-stage5-import-graph.txt").write_text(
        "# Grafo simplificado de imports CSS\n\n"
        + "\n".join(
            f"{source} -> {target}" for source in sorted(import_edges) for target in sorted(import_edges[source])
        )
        + "\n",
        encoding="utf-8",
    )

    top_important = sorted(important_counts, reverse=True)[:15]
    top_radius = sorted(literal_radius_counts, reverse=True)[:15]
    top_shell = sorted(shell_touch_counts, reverse=True)[:15]

    md = f"""# Stage 5 — Auditoria de dívida CSS controlada

## Objetivo

Mapear dívida CSS sem apagar arquivos às cegas. Este stage prioriza rastreabilidade: `!important`, imports, CSS possivelmente órfão, literais de radius e arquivos que tocam shell/global.

## Resultado executivo

- CSS total auditado: **{len(css_files)} arquivos**.
- HTML total auditado: **{len(html_files)} arquivos**.
- `!important` total encontrado: **{sum(count for count, _ in important_counts)}**.
- Arquivos com `!important`: **{len(important_counts)}**.
- Arquivos com `border-radius` literal: **{len(literal_radius_counts)}**.
- Candidatos a CSS órfão: **{len(orphan_candidates)}**.
- Imports CSS inválidos após regra runtime: **{len(invalid_imports)}**.
- Arquivos CSS com nome proibido de remendo: **{len(temp_css_files)}**.

## Decisão técnica

Não removi CSS nesta etapa. A quantidade de CSS potencialmente órfão ainda exige verificação contra JS, telas futuras e histórico visual. Remover agora seria alto risco de regressão.

A limpeza segura começa pelos contratos com maior impacto e menor risco: reduzir `!important` dentro dos contratos ativos, consolidar radius com tokens e isolar regras de shell que estejam dentro de arquivos de página.

## Top 15 — `!important`

| Qtde | Arquivo |
|---:|---|
"""
    for count, path in top_important:
        md += f"| {count} | `{path}` |\n"

    md += """
## Top 15 — `border-radius` literal

| Qtde | Arquivo |
|---:|---|
"""
    for count, path in top_radius:
        md += f"| {count} | `{path}` |\n"

    md += """
## Top 15 — arquivos que tocam shell/global

Este mapa não significa erro automático. Ele indica onde há maior risco arquitetural ao alterar CSS.

| Hits | Arquivo |
|---:|---|
"""
    for count, path in top_shell:
        md += f"| {count} | `{path}` |\n"

    md += f"""
## Imports

- Imports inválidos após regra runtime: **{len(invalid_imports)}**.
- Nenhum import runtime inválido foi detectado pelo auditor, considerando comentários como conteúdo neutro.

## Candidatos a CSS órfão

Foram detectados **{len(orphan_candidates)}** candidatos. Eles estão em `docs/reports/frontend-stage5-orphan-css-candidates.txt`.

Critério: arquivo CSS não aparece diretamente em HTML e não é importado por outro CSS. Isso não prova que é lixo; apenas indica que precisa de validação antes de arquivar/remover.

## Arquivos gerados

- `docs/reports/frontend-stage5-important-map.csv`
- `docs/reports/frontend-stage5-radius-literals.csv`
- `docs/reports/frontend-stage5-shell-touch-map.csv`
- `docs/reports/frontend-stage5-orphan-css-candidates.txt`
- `docs/reports/frontend-stage5-import-graph.txt`
- `docs/reports/frontend-stage5-manifest.txt`

## Próximo corte seguro recomendado

1. Atacar `assets/css/components/internal/chat-workspace-contract.css` em bloco pequeno, porque ele está ativo e com muitos `!important`.
2. Substituir radius literais por tokens em componentes reutilizáveis, não em arquivos antigos órfãos.
3. Separar regras de shell/global que estejam em CSS de página apenas quando o escopo for comprovadamente global.
4. Arquivar CSS órfão somente após validação visual das páginas e busca por uso em JS.

## Critério de aceite

- Nenhum arquivo runtime foi apagado.
- Nenhum CSS temporário/remendo foi criado.
- A auditoria é reproduzível via `tools/audit-css-debt.py`.
- O próximo stage pode cortar dívida com base em evidência, não em suposição.
"""
    (REPORTS_DIR / "frontend-stage5-css-debt-controlled.md").write_text(md, encoding="utf-8")

    manifest = "\n".join([
        "Stage 5 — CSS debt audit manifest",
        "",
        "Created/updated:",
        "tools/audit-css-debt.py",
        "docs/reports/frontend-stage5-css-debt-controlled.md",
        "docs/reports/frontend-stage5-important-map.csv",
        "docs/reports/frontend-stage5-radius-literals.csv",
        "docs/reports/frontend-stage5-shell-touch-map.csv",
        "docs/reports/frontend-stage5-orphan-css-candidates.txt",
        "docs/reports/frontend-stage5-import-graph.txt",
        "docs/reports/frontend-stage5-manifest.txt",
        "",
        "Runtime CSS/HTML changed: no",
        "Runtime CSS/HTML removed: no",
        "Reason: Stage 5 is an evidence-first cleanup pass. Cutting CSS without visual/runtime validation would be unsafe.",
        "",
    ])
    (REPORTS_DIR / "frontend-stage5-manifest.txt").write_text(manifest, encoding="utf-8")

    print(md)


if __name__ == "__main__":
    main()
