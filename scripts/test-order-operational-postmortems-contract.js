const fs = require('fs');
const assert = require('assert');
const read = (p) => fs.readFileSync(p, 'utf8');
const sql = read('supabase/migrations/076_order_operational_postmortems_slos.sql');
const edge = read('supabase/functions/order-event-operations/index.ts');
const ops = read('supabase/functions/order-event-operations/operations.mjs');
const page = read('assets/js/pages/admin-order-operations.js');
const repo = read('assets/js/repositories/order-event-operations-repository.js');
const html = read('admin-pedidos-operacao.html');

assert(sql.includes('private.order_operational_postmortems'));
assert(sql.includes('trg_materialize_order_operational_postmortem'));
assert(sql.includes('mtta_seconds'));
assert(sql.includes('mttr_seconds'));
assert(sql.includes('get_order_operational_slos_internal'));
assert(sql.includes('mutate_order_operational_postmortem_internal'));
assert(sql.includes("p_complete and v_role <> 'admin'"));
assert(sql.includes('revoke all on function public.get_order_operational_slos_internal'));
assert(edge.includes('operationalSlos'));
assert(edge.includes('postmortem_update'));
assert(ops.includes('DOKE_ORDER_POSTMORTEM_COMPLETE_ADMIN_REQUIRED'));

// The current operator surface consolidated legacy postmortem editing into the
// structured post-incident review command boundary. Keep this compatibility
// contract aligned with the active repository/controller vocabulary.
assert(repo.includes('updatePostIncident'));
assert(page.includes('renderSlo'));
assert(page.includes('submitPostIncident'));
assert(html.includes('data-admin-ops-slo'));
assert(html.includes('data-admin-ops-post-incident-dialog'));
assert(!edge.includes('SUPABASE_SERVICE_ROLE_KEY ='));
console.log('order operational postmortems contract: ok');
