# Repository boundary

Living contract for the implementation in assets/js/services/repository-boundary.js, api-repository-provider.js, mock-repository-provider.js and core/runtime-config.js. This documents current source; it is not staging readiness evidence.

## Responsibilities

The boundary registers and selects providers and dispatches list/get/create/update/remove/action/page-data calls. It does not read browser persistence, query the DOM, issue fetch requests or call a database SDK. The API provider owns HTTP serialization, SDK bearer resolution, omitted cookies, command metadata and rejection of responses after identity changes. Domain services own participant/owner/action policy and confirmation of server acknowledgements. Browser checks never replace server authorization or RLS.

The mock provider obtains explicit fixture data. remoteAuthorityRequired prevents mock selection, direct lookup and fallback when API configuration is unavailable. Local demonstrations are synthetic and do not certify hosted write paths. Orders submitted writes and messaging commands are server-owned; repositories are read mirrors with account-scoped caches. Only explicit local drafts/development fixtures may persist locally.

## Runtime status

The boundary publishes doke:repository-provider-change with activeProvider and requestedProvider only. core/runtime-config.js projects these values to data-doke-data-provider and data-doke-requested-data-provider. Status attributes are diagnostic metadata, never authorization. Core also synchronizes an already loaded boundary, so both load orders preserve status.

## Validation and remaining limits

Run audit:repository-boundary, test-repository-boundary-isolation-runtime.js, test-orders-supabase-repository-contract.js and the Orders/Messages/Auth API compatibility runtime suites. The audit keeps DOM, persistence, network and SDK coupling prohibited. Its document requirement references this contract and the existing DATA-READY-CONTRACTS.md, rather than a missing historical cycle report. No historical completion or hosted security certification is inferred from those documents.

Hosted Auth validation, participant/owner RLS, signed media policies, JWT revocation and durable server acknowledgements require a separately authorized staging canary. No browser service_role credentials are allowed. See DATA-READY-CONTRACTS.md for data-readiness ownership.
