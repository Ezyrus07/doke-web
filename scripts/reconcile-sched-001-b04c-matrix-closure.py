#!/usr/bin/env python3
import json
from pathlib import Path


def replace_once(path_string, old, new):
    path = Path(path_string)
    text = path.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Unexpected replacement count in {path}: {count}")
    path.write_text(text.replace(old, new, 1))


def write_json(path_string, value):
    Path(path_string).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


matrix_path = Path("config/domain-completion-matrix.json")
matrix = json.loads(matrix_path.read_text())
if matrix["version"] not in ("1.3.69", "1.3.70"):
    raise SystemExit(f"Unexpected matrix version: {matrix['version']}")
matrix["version"] = "1.3.70"
matrix["updatedAt"] = "2026-08-01T17:03:06-03:00"
domains = {domain["id"]: domain for domain in matrix["domains"]}
sched = domains["SCHED-001"]
order = domains["ORD-001"]
sched["blockers"] = [item for item in sched["blockers"] if item["id"] != "SCHED-B04"]
order["blockers"] = [item for item in order["blockers"] if item["id"] != "ORD-B04"]
sched["nextActions"] = [
    "Connect the authenticated frontend scheduling surfaces to the canonical server authority under a separately reviewed activation gate.",
    "Add continuous hold-expiration operations through Cron or workers only under independent authorization and preserve canonical ORD projection.",
    "Keep production release and pull-request merge blocked pending independent release authorization."
]
order["nextActions"] = [
    "Complete ORD-B02 through the separately authorized two-account visual settlement canary and run-scoped cleanup.",
    "Keep ORD-B03 handed to PAY-001 until the real PSP webhook lifecycle becomes canonical.",
    "Keep ORD-B05 blocked until exact external staging provider selection and separately authorized deployment.",
    "Keep production release and pull-request merge blocked pending independent authorization."
]
for item in [
    "SCHED-B04C authenticated ORD/SCHED composition passed in staging run 30716088197 at head c2bddcd061d2136e07d8c3790abf8f66884c480f.",
    "The successful canary proved confirmation, reschedule, canonical cancellation, replacement rejection, partial rollback, idempotency and cross-domain event correlation inside one SERIALIZABLE transaction ending in ROLLBACK.",
    "All 15 residue counters were zero and all 8 authority counters were unchanged in both the canary report and independent post-run verification; SCHED-B04 is closed without promoting maturity or enabling frontend, Cron, workers, production or merge."
]:
    if item not in sched["evidence"]:
        sched["evidence"].append(item)
for item in [
    "SCHED-B04C authenticated ORD/SCHED composition passed in staging run 30716088197 and proved the canonical reservation reference and projection lifecycle end to end.",
    "Confirmation emitted order.scheduled, reschedule preserved the reservation ID, and canonical cancellation emitted order.accepted while atomically clearing reference and scheduled time.",
    "ORD-B04 is closed; ORD-B02, ORD-B03 and ORD-B05 remain open, and production, deployment, frontend activation and merge remain blocked."
]:
    if item not in order["evidence"]:
        order["evidence"].append(item)
closure_paths = [
    "config/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.json",
    "docs/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.md",
    "docs/validation/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.json",
    "scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-closure.js",
    ".github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.yml"
]
for domain in (sched, order):
    for item in closure_paths:
        if item not in domain["requiredPaths"]:
            domain["requiredPaths"].append(item)
    test_name = "audit:sched-001-b04c-authenticated-ord-sched-composition-canary-closure"
    if test_name not in domain["tests"]:
        domain["tests"].append(test_name)
for flow in matrix.get("criticalFlows", []):
    if isinstance(flow.get("blockers"), list):
        flow["blockers"] = [item for item in flow["blockers"] if item not in ("SCHED-B04", "ORD-B04")]
write_json(str(matrix_path), matrix)

for path_string in [
    "config/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.json",
    "docs/validation/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.json"
]:
    data = json.loads(Path(path_string).read_text())
    data["status"] = "authenticated_staging_composition_canary_passed_blockers_closed"
    data["blockerDecision"] = {
        "closed": ["SCHED-B04", "ORD-B04"],
        "remainingSched": [],
        "remainingOrd": ["ORD-B02", "ORD-B03", "ORD-B05"],
        "domainCompletionClaimed": False
    }
    data["matrixDecision"] = {
        "version": "1.3.70",
        "schedMaturity": 3,
        "schedServerAuthority": "partial",
        "schedStagingEvidence": "staging_canary",
        "reasonNoPromotion": "Frontend activation, continuous hold expiration operations and production release remain separately gated."
    }
    write_json(path_string, data)

doc_path = Path("docs/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.md")
doc = doc_path.read_text()
doc = doc.replace(
    "Matrix and blocker reconciliation are intentionally performed in a separate validated phase.",
    "The validated matrix reconciliation closes `SCHED-B04` and `ORD-B04`. SCHED remains maturity `3`, server authority `partial` and staging evidence `staging_canary`; ORD retains `ORD-B02`, `ORD-B03` and `ORD-B05`."
)
doc_path.write_text(doc)

replace_once(
    "scripts/audit-ord-001-a01-baseline.js",
    "['ORD-B02', 'ORD-B03', 'ORD-B04'].forEach((id) => {\n  assert(blockerIds.has(id), `Active ORD blocker missing: ${id}`);\n});",
    "const matrixPatchOrdA01 = Number(String(matrix.version).split('.')[2] || 0);\nconst requiredOrdBlockersA01 = matrixPatchOrdA01 >= 70 ? ['ORD-B02', 'ORD-B03'] : ['ORD-B02', 'ORD-B03', 'ORD-B04'];\nrequiredOrdBlockersA01.forEach((id) => assert(blockerIds.has(id), `Active ORD blocker missing: ${id}`));\nif (matrixPatchOrdA01 >= 70) assert(!blockerIds.has('ORD-B04'));"
)
replace_once(
    "scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js",
    "if (schedMatrixPatchA01 >= 63) {",
    "if (schedMatrixPatchA01 >= 70) {\n  assert.deepStrictEqual(sched.blockers.map((blocker) => blocker.id), []);\n  assert(sched.nextActions[0].includes('frontend'));\n} else if (schedMatrixPatchA01 >= 63) {"
)
for file in [
    "scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js",
    "scripts/audit-sched-001-a04-server-command-runtime.js",
    "scripts/audit-sched-001-a05-persistence-readiness.js"
]:
    marker = "const postB02B = compareVersions(matrix.version, '1.3.63') >= 0 && sched.maturity >= 3;"
    replace_once(file, marker, "const postB04Closure = compareVersions(matrix.version, '1.3.70') >= 0 && sched.maturity >= 3;\n" + marker)
    replace_once(
        file,
        "if (postB02B) {",
        "if (postB04Closure) {\n  assert.deepStrictEqual(sched.blockers.map((item) => item.id), []);\n  assert(sched.nextActions[0].includes('frontend'));\n  assert(ord.evidence.some((item) => item.includes('run 30716088197')));\n} else if (postB02B) {"
    )
replace_once(
    "scripts/audit-sched-001-a03-reservation-migration-local-contract.js",
    "const postB02B = schedMatrixPatchA03 >= 63 && sched.maturity >= 3;",
    "const postB04Closure = schedMatrixPatchA03 >= 70 && sched.maturity >= 3;\nconst postB02B = schedMatrixPatchA03 >= 63 && sched.maturity >= 3;"
)
replace_once(
    "scripts/audit-sched-001-a03-reservation-migration-local-contract.js",
    "if (postB02B) {",
    "if (postB04Closure) {\n  assert.deepStrictEqual(sched.blockers.map((item) => item.id), []);\n  assert(sched.nextActions[0].includes('frontend'));\n  assert(ord.evidence.some((item) => item.includes('run 30716088197')));\n} else if (postB02B) {"
)
replace_once(
    "scripts/audit-sched-001-a07-history-canary-readiness.js",
    "if (schedMatrixPatchA07 >= 63) {",
    "if (schedMatrixPatchA07 >= 70) {\n    assert.deepStrictEqual(blockerIds, []);\n    assert(sched.nextActions[0].includes('frontend'));\n  } else if (schedMatrixPatchA07 >= 63) {"
)
for file in [
    "scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js",
    "scripts/audit-sched-001-b04b-ord-canonical-wiring-implementation.js",
    "scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js"
]:
    replace_once(
        file,
        "assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));\nassert(ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));",
        "const postB04Closure = Number(String(matrix.version).split('.')[2] || 0) >= 70;\nif (postB04Closure) {\n  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));\n  assert(!ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));\n} else {\n  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));\n  assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));\n}"
    )
replace_once(
    "scripts/audit-ord-001-a10-blocker-reconciliation.js",
    "assert.deepStrictEqual(ord.blockers.map((blocker) => blocker.id), ['ORD-B02', 'ORD-B03', 'ORD-B04', 'ORD-B05']);\nassert.strictEqual(ord.nextActions.length, 4);\nif (compareVersions(matrix.version, '1.3.50') >= 0) {\n  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));\n  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));\n} else {\n  assert(ord.nextActions[0].includes('SCHED-A07'));\n}",
    "const postB04Closure = compareVersions(matrix.version, '1.3.70') >= 0;\nassert.deepStrictEqual(ord.blockers.map((blocker) => blocker.id), postB04Closure ? ['ORD-B02', 'ORD-B03', 'ORD-B05'] : ['ORD-B02', 'ORD-B03', 'ORD-B04', 'ORD-B05']);\nassert.strictEqual(ord.nextActions.length, 4);\nif (postB04Closure) {\n  assert(ord.nextActions[0].includes('ORD-B02'));\n  assert(ord.evidence.some((item) => item.includes('run 30716088197')));\n} else if (compareVersions(matrix.version, '1.3.50') >= 0) {\n  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));\n  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));\n} else {\n  assert(ord.nextActions[0].includes('SCHED-A07'));\n}"
)
replace_once(
    "scripts/audit-ord-001-a10-blocker-reconciliation.js",
    "assert(blockers['ORD-B04'].description.includes('SCHED-001'));",
    "if (postB04Closure) assert(!blockers['ORD-B04']);\nelse assert(blockers['ORD-B04'].description.includes('SCHED-001'));"
)
replace_once(
    "scripts/audit-ord-001-a11-scheduling-authority-handoff.js",
    "const ordB04 = ord.blockers.find((blocker) => blocker.id === 'ORD-B04');\nassert(ordB04, 'ORD-B04 missing from completion matrix');\nassert(ordB04.description.includes('SCHED-001'));\nassert(ordB04.description.includes('canonical reservation reference'));",
    "const schedMatrixPatchA11 = Number(String(matrix.version).split('.')[2] || 0);\nconst ordB04 = ord.blockers.find((blocker) => blocker.id === 'ORD-B04');\nif (schedMatrixPatchA11 >= 70) {\n  assert(!ordB04);\n  assert(ord.evidence.some((item) => item.includes('run 30716088197')));\n} else {\n  assert(ordB04);\n  assert(ordB04.description.includes('SCHED-001'));\n  assert(ordB04.description.includes('canonical reservation reference'));\n}"
)
replace_once(
    "scripts/audit-ord-001-a11-scheduling-authority-handoff.js",
    "const schedMatrixPatchA11 = Number(String(matrix.version).split('.')[2] || 0);\nif (schedMatrixPatchA11 >= 63) {",
    "if (schedMatrixPatchA11 >= 63) {"
)
replace_once(
    "scripts/audit-ord-001-a11-scheduling-authority-handoff.js",
    "assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));",
    "if (schedMatrixPatchA11 >= 70) assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));\nelse assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));"
)
replace_once(
    "scripts/audit-ord-001-a11-scheduling-authority-handoff.js",
    "if (schedMatrixPatchA11 >= 63) {\n    assert(sched.nextActions[0].includes('SCHED-B04') || sched.nextActions[0].includes('ORD-001'));\n    assert(ord.nextActions.some((action) => action.includes('ORD-B04') || action.includes('SCHED-B04')));",
    "if (schedMatrixPatchA11 >= 70) {\n    assert(sched.nextActions[0].includes('frontend'));\n    assert(ord.nextActions[0].includes('ORD-B02'));\n  } else if (schedMatrixPatchA11 >= 63) {\n    assert(sched.nextActions[0].includes('SCHED-B04') || sched.nextActions[0].includes('ORD-001'));\n    assert(ord.nextActions.some((action) => action.includes('ORD-B04') || action.includes('SCHED-B04')));"
)

print("SCHED-B04C matrix closure reconciliation prepared.")
