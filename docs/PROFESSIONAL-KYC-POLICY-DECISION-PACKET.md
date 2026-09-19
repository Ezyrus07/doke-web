# Professional KYC Policy Decision Packet

Status: **awaiting legal/privacy approval**  
Domain: **PROF-001 / PROF-B04 / LEGAL-B03**  
Implementation authority: `config/professional-kyc-policy-decision-contract.json`

## 1. Purpose and authority

This document is the human approval worksheet for the professional KYC policy gate. It exists because the machine-readable contract can enforce completeness, but it must not invent legal or privacy decisions.

Authority order:

1. Approved legal/privacy source documents and signed decisions.
2. `config/professional-kyc-policy-decision-contract.json` as the machine-readable activation gate.
3. This document as the decision intake/checklist mapped to that contract.
4. G6/G7 implementation only after the contract becomes explicitly approved.

This document does **not** authorize retention intervals, external providers, biometric processing, physical deletion, migrations, or production changes.

## 2. Current technical state

PROF-B05 is technically closed. The current KYC architecture already provides:

- private KYC Storage with referenced-read only;
- zero browser INSERT/UPDATE/DELETE Storage policies;
- signed upload intents under `locked/<user>/<intent>/...`;
- immutable evidence sets, object snapshots and lifecycle events;
- deterministic `event_sequence`;
- rejected → reopen lineage;
- dry-run-only GC classification;
- no physical KYC GC authority.

The policy blocker is now external: the technical system can preserve evidence safely, but it cannot decide **why**, **for how long**, or **under which legal/privacy conditions** each class may be retained or deleted.

## 3. Legal/regulatory baseline that the decision must respect

The following are constraints, not Doke-specific legal conclusions:

- LGPD arts. 15–16: when treatment ends, deletion is the default rule, subject to the conservation hypotheses in art. 16. Therefore a universal retention interval must not be invented.
- LGPD art. 18: the holder has rights including access, correction, anonymization/blocking/deletion in applicable cases, portability, information about sharing and revocation of consent.
- LGPD art. 5, II: biometric data linked to a natural person is sensitive personal data.
- LGPD art. 11: sensitive-data treatment requires a valid art. 11 hypothesis. Fraud-prevention/security in electronic identification/authentication is one statutory hypothesis, but its applicability to Doke must be decided for the concrete processing.
- LGPD art. 46: technical and administrative security measures must protect personal data throughout the processing lifecycle.
- ANPD Resolution CD/ANPD 2/2022 provides criteria used by ANPD as a high-risk reference. The ANPD RIPD guidance says controllers may use those criteria while specific RIPD regulation is pending.
- ANPD’s 2025–2026 regulatory agenda keeps biometric sensitive data and high-risk processing as active regulatory topics.
- ANPD Resolution CD/ANPD 19/2024 governs international transfers. If a KYC provider, subprocessor or storage flow transfers personal data abroad, the applicable transfer mechanism and transparency obligations must be documented.

Official references for legal/privacy review:

- Lei 13.709/2018 (LGPD), especially arts. 5, 11, 15, 16, 18 and 46.
- Resolução CD/ANPD 2/2022 — high-risk criteria.
- ANPD — Relatório de Impacto à Proteção de Dados Pessoais (RIPD) guidance.
- Resolução CD/ANPD 19/2024 — international data transfers.
- ANPD Agenda Regulatória 2025–2026 — biometrics and high-risk processing.

## 4. Decisions that must be signed

No row below can be treated as approved until a source-document reference and approver are recorded.

| ID | Decision | Required output | Machine field(s) | Status |
|---|---|---|---|---|
| B04-D01 | Purpose inventory | Specific purpose for every evidence class and document field | supporting policy source | PENDING |
| B04-D02 | Legal basis | Legal basis for ordinary personal data; art. 11 basis if sensitive biometric processing exists | `legalBasisRef` / supporting source | PENDING |
| B04-D03 | Treatment termination | Legally approved termination anchor for each evidence class | `evidenceClasses[].terminationAnchor` | PARTIAL / UNAPPROVED |
| B04-D04 | Retention mode | `delete_at_termination`, `elapsed_interval` or `hold_only` per class | `evidenceClasses[].retentionMode` | PENDING |
| B04-D05 | Retention interval | Explicit interval only when `elapsed_interval` is approved | `retentionInterval` + `conservationBasisRef` | PENDING |
| B04-D06 | Rejection/appeal | Whether appeal exists, appeal window and rejection-reason policy | `rejectionAndAppeal.*` | PENDING |
| B04-D07 | Legal hold | Authority, scope, trigger, review and release rule | `legalHold.*` | PENDING |
| B04-D08 | Verification provider | Internal manual review or approved external provider | `provider.*` | PENDING |
| B04-D09 | International transfer | Whether KYC flows transfer data abroad and, if so, the valid mechanism/reference | `provider.internationalTransferDecision*` | PENDING |
| B04-D10 | Selfie/biometrics | Human visual review vs automated biometric verification | `selfieAndBiometrics.*` | PENDING |
| B04-D11 | Privacy/RIPD | Risk classification and whether RIPD is required/adopted | `riskAssessmentRef` / approval source | PENDING |
| B04-D12 | Holder rights | Access, correction, export/portability, deletion/anonymization workflow and exceptions | policy/SOP source | PENDING |
| B04-D13 | Notice/records | Privacy notice version, processing record and effective date | governance source refs | PENDING |
| B04-D14 | Final approvals | Legal + privacy approval metadata | `approvals.legal.*`, `approvals.privacy.*` | PENDING |

## 5. Evidence-class worksheet

### 5.1 `abandoned_signed_intent`

Technical event available: `intent_expires_at`.

Decisions required:

- Is intent expiry also the approved end of the treatment purpose?
- Is immediate deletion after termination required, or is conservation allowed?
- If conservation is allowed, what exact basis supports it?
- If interval retention is approved, what exact interval applies?
- Can a legal hold apply to an upload that was never submitted?

Do not infer a retention period from signed URL expiry.

### 5.2 `rejected_submission_evidence`

No legal termination anchor is approved yet.

Decisions required:

- Does the purpose end at rejection, final rejection after appeal, account closure, or another event?
- Is an appeal available?
- If yes, what is the appeal window and when does it start?
- Can rejected evidence be reused for a corrected resubmission, or must a new evidence set always be collected?
- What conservation basis, if any, applies after the treatment purpose ends?
- Can a legal hold apply, under which authority, and how is it released?

### 5.3 `verified_submission_evidence`

No legal termination anchor is approved yet.

Decisions required:

- Is evidence needed only to reach the verification decision, throughout professional status, until reverification, until account termination, or for another explicitly defined purpose?
- Which parts of the verification result may be retained after raw documents are no longer necessary?
- Is a derived verification fact sufficient instead of retaining raw identity documents?
- If raw evidence is conserved, what exact legal/regulatory basis supports conservation?
- What event starts any approved interval?
- What happens when a verified professional is suspended, deactivated, deleted or reverified?

### 5.4 `reopened_historical_evidence`

Technical lineage anchor available: `reopened_event_sequence`.

Decisions required:

- Is reopening a legal treatment-termination event, or only an immutable provenance marker?
- Must the old evidence remain until an appeal/dispute window ends?
- Can historical raw documents be replaced by a narrower audit fact or anonymized record after their purpose ends?
- What legal-hold rules can preserve the historical set?

The immutable evidence ledger is not itself a justification to retain raw Storage objects indefinitely.

## 6. Selfie and biometric decision

Choose exactly one approved treatment model.

### Option A — human visual review

Required decisions:

- confirm no automated biometric template, embedding, faceprint or matching is generated;
- document the purpose and ordinary personal-data legal basis for the image/document workflow;
- document access restrictions, retention and holder-rights handling.

### Option B — automated biometric verification

Before enabling:

- identify the exact biometric processing and vendor/model;
- identify and approve the applicable LGPD art. 11 legal basis;
- provide `sensitiveDataLegalBasisRef`;
- complete the risk assessment/RIPD decision and provide `riskAssessmentRef`;
- document false-match/false-reject handling and human review;
- document vendor use, model-training restrictions and subprocessors;
- document retention/deletion of raw images and derived biometric templates separately;
- document any international transfer.

Until this decision is approved, `biometricExtractionAllowed` must remain unset/false and automated biometric verification must remain blocked.

## 7. External provider due-diligence gate

If the decision is `approved_provider`, the approval package must identify:

- provider legal entity and product/service;
- whether the provider acts as operator, suboperator, independent controller or another role for each processing activity;
- DPA/processor terms reference;
- documented purposes and prohibited secondary uses;
- whether KYC data or biometric derivatives may be used for provider model training;
- storage/processing countries;
- subprocessors and change-notification mechanism;
- international-transfer mechanism and reference when applicable;
- retention/deletion/return obligations;
- security controls and incident-notification commitments;
- access/audit evidence;
- treatment of raw documents, selfies and any biometric template as separate data assets.

A Brazilian project region alone is not sufficient evidence that no international transfer occurs.

If the decision is `no_external_provider`, document the internal manual-review owner and explicitly set external-provider activation to not applicable.

## 8. Rejection, appeal and legal hold

### Rejection/appeal

Legal/privacy must decide:

- whether appeal is offered;
- who may appeal;
- start event and duration of the appeal window;
- whether corrected resubmission is a new evidence set;
- which rejection reasons may be shown to the applicant;
- which reasons must be internally retained for fraud/security or legal purposes;
- whether evidence remains accessible during the appeal window.

### Legal hold

A legal hold must not be an arbitrary indefinite retention switch.

The approved policy must define:

- authorized issuer/role;
- legal or regulatory authority/reference;
- allowed scope: user, verification, evidence set or object;
- reason reference;
- activation timestamp;
- periodic review if applicable;
- release authority and release rule;
- immutable audit trail;
- effect on deletion eligibility without creating browser-accessible mutation authority.

## 9. Holder-rights operating decision

The approved policy/SOP must specify how KYC data participates in:

- confirmation/access;
- correction of inaccurate account/identity information;
- export/portability where applicable;
- deletion/anonymization requests;
- objection or consent revocation where legally applicable;
- information about third-party sharing;
- response when requested deletion conflicts with an approved conservation basis or legal hold.

The implementation must return a reasoned policy outcome; it must not silently delete immutable audit evidence or silently reject the request.

## 10. Risk assessment / RIPD decision

Privacy approval must record one of:

- `RIPD_REQUIRED` with a source document reference;
- `RIPD_ADOPTED_AS_GOOD_PRACTICE` with a source document reference; or
- `RIPD_NOT_REQUIRED` with a documented rationale and approver.

The assessment must consider at minimum:

- scale and number of professionals;
- identity-document sensitivity and fraud/identity-theft impact;
- automated decision-making, if any;
- biometric processing, if any;
- external provider/subprocessor exposure;
- cross-border transfers;
- consequences of false verification or false rejection;
- security and breach impact.

## 11. Approval payload required before contract activation

### Legal approval

Required:

- `state = approved`
- `approvedVersion`
- `approvedAt`
- `approverRef`
- `sourceDocumentRef`

### Privacy approval

Required:

- `state = approved`
- `approvedVersion`
- `approvedAt`
- `approverRef`
- `sourceDocumentRef`

### Each evidence class

Required:

- approved `terminationAnchor`;
- approved `retentionMode`;
- `retentionInterval` only for `elapsed_interval`;
- `conservationBasisRef` whenever conservation requires one under the approved policy;
- `deletionRuleRef`;
- boolean `legalHoldApplicability`;
- `anonymizationRuleRef` when anonymization is part of the approved outcome.

### Provider / biometrics / appeal / hold

Every currently pending field in the machine contract must be replaced by an explicit approved decision or an explicit not-applicable outcome supported by a source reference.

## 12. Mechanical activation sequence after approval

Approval of this packet does not itself delete data.

Only after all decisions above are approved:

1. Update the machine-readable contract with approved values and source references.
2. Run `npm run audit:professional-kyc-policy-decision-contract`.
3. Re-run KYC static authority and domain matrix audits.
4. Prepare any required **forward-only** G6 policy migration; do not edit historical migrations.
5. Preflight the exact nominal KYC migration before any staging apply.
6. Validate retention/governance policy behavior transactionally.
7. Re-run GC in dry-run mode and review every classification.
8. Keep G7 physical GC blocked until a separate execution authorization records:
   - `approvedAt`;
   - `approvalRef`;
   - `dryRunEvidenceRef`;
   - `operatorReviewRef`.
9. Only then may a separately reviewed physical-GC implementation be considered.

Production remains outside this sequence until its own release/go-no-go authority is satisfied.

## 13. Explicit non-decisions

As of this packet version:

- no retention interval is approved;
- no KYC evidence class is authorized for physical deletion;
- no external KYC provider is approved;
- no automated biometric processing is approved;
- no appeal window is approved;
- no legal-hold policy is approved;
- no international-transfer decision is approved;
- G6 remains blocked;
- G7 remains blocked;
- PROF-001 remains 4/6.

## 14. Sign-off checklist

Legal reviewer:

- [ ] purposes and legal bases approved;
- [ ] termination/conservation rules approved per evidence class;
- [ ] rejection/appeal policy approved;
- [ ] legal-hold authority/release approved;
- [ ] provider legal terms approved or external provider marked not applicable;
- [ ] international-transfer decision approved;
- [ ] legal source document/version identified.

Privacy reviewer:

- [ ] data minimization reviewed;
- [ ] holder-rights workflow approved;
- [ ] privacy notice/processing-record references approved;
- [ ] selfie/biometric treatment mode approved;
- [ ] RIPD/risk decision recorded;
- [ ] provider/subprocessor privacy terms reviewed;
- [ ] retention/anonymization/deletion rules reviewed;
- [ ] privacy source document/version identified.

Engineering may activate the machine contract only after both approval blocks are complete and the automated gate passes.
