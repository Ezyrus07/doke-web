import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeAction,
  normalizeLimit,
  normalizeNote,
  normalizeOperationsError,
  statusForError,
} from "./operations.mjs";

const FUNCTION_NAME = "order-event-operations";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: unknown) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const text = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);

type SupabaseClient = ReturnType<typeof createClient>;
type OperatorContext = {
  userId: string;
  role: "support" | "admin";
  serviceClient: SupabaseClient;
};

const createContext = async (req: Request): Promise<OperatorContext | Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";

  if (!supabaseUrl || !publicKey || !secretKey) {
    return jsonResponse(503, { error: "SERVER_CONFIGURATION_MISSING" });
  }

  const authorization = req.headers.get("Authorization") || "";
  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  const user = authData?.user;
  if (authError || !user?.id) return jsonResponse(401, { error: "DOKE_ORDER_OPS_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  const role = text(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || (role !== "support" && role !== "admin")) {
    return jsonResponse(403, { error: "DOKE_ORDER_OPS_ROLE_REQUIRED" });
  }

  return { userId: user.id, role: role as "support" | "admin", serviceClient };
};

const rpc = async (
  context: OperatorContext,
  name: string,
  params: Record<string, unknown>,
) => {
  const { data, error } = await context.serviceClient.rpc(name, params);
  if (error) throw error;
  return data;
};

const optionalRpc = async (
  context: OperatorContext,
  name: string,
  params: Record<string, unknown>,
) => {
  const { data, error } = await context.serviceClient.rpc(name, params);
  if (!error) return data;

  const source = [error.code, error.message, error.details, error.hint]
    .map((item) => String(item || ""))
    .join(" " )
    .toUpperCase();
  if (source.includes("PGRST202") || source.includes("42883") || source.includes("COULD NOT FIND THE FUNCTION")) {
    return null;
  }
  throw error;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });

  const context = await createContext(req);
  if (context instanceof Response) return context;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = normalizeAction(body.action);

  try {
    if (action === "dashboard") {
      const [dashboard, operationalAlerts, operationalRunbooks, postIncident, operationalSlos, changeProtection] = await Promise.all([
        rpc(context, "get_order_event_operations_dashboard_internal", {
          p_actor_id: context.userId,
          p_event_limit: normalizeLimit(body.eventLimit, 50, 10, 100),
          p_run_limit: normalizeLimit(body.runLimit, 20, 5, 50),
        }),
        rpc(context, "get_order_operational_alerts_internal", {
          p_actor_id: context.userId,
          p_limit: normalizeLimit(body.alertLimit, 20, 5, 50),
        }),
        rpc(context, "get_order_operational_runbooks_internal", {
          p_actor_id: context.userId,
          p_limit: normalizeLimit(body.runbookLimit, 20, 5, 50),
        }),
        rpc(context, "get_order_operational_post_incident_internal", {
          p_actor_id: context.userId,
          p_limit: normalizeLimit(body.postIncidentLimit, 20, 5, 50),
        }),
        optionalRpc(context, "get_order_operational_slos_internal", {
          p_actor_id: context.userId,
          p_days: normalizeLimit(body.sloDays, 30, 7, 90),
          p_limit: normalizeLimit(body.postmortemLimit, 20, 5, 50),
        }),
        rpc(context, "get_order_operational_change_protection_internal", {
          p_actor_id: context.userId,
          p_limit: normalizeLimit(body.changeLimit, 30, 10, 80),
        }),
      ]);
      return jsonResponse(200, {
        ...(dashboard && typeof dashboard === "object" ? dashboard : {}),
        operationalAlerts: operationalAlerts || {},
        operationalRunbooks: operationalRunbooks || {},
        postIncident: postIncident || {},
        operationalSlos: operationalSlos || {},
        changeProtection: changeProtection || {},
      });
    }

    if (action === "requeue") {
      const eventKey = text(body.eventKey, 220);
      const note = normalizeNote(body.note);
      const result = await rpc(context, "requeue_order_domain_event_internal", {
        p_actor_id: context.userId,
        p_event_key: eventKey,
        p_note: note,
      });
      return jsonResponse(200, result || {});
    }

    if (action === "incident_update") {
      const result = await rpc(context, "mutate_order_operational_incident_internal", {
        p_actor_id: context.userId,
        p_alert_id: text(body.alertId, 80) || null,
        p_action: text(body.incidentAction, 40),
        p_note: normalizeNote(body.note),
        p_assignee_id: text(body.assigneeId, 80) || null,
      });
      return jsonResponse(200, result || {});
    }


    if (action === "postmortem_update") {
      const result = await rpc(context, "mutate_order_operational_postmortem_internal", {
        p_actor_id: context.userId,
        p_postmortem_id: text(body.postmortemId, 80) || null,
        p_root_cause_category: text(body.rootCauseCategory, 40),
        p_root_cause_summary: text(body.rootCauseSummary, 1200),
        p_impact_summary: text(body.impactSummary, 1200),
        p_prevention_action: text(body.preventionAction, 1200),
        p_complete: body.complete === true,
      });
      return jsonResponse(200, result || {});
    }

    if (action === "runbook_preview") {
      const result = await rpc(context, "preview_order_operational_runbook_internal", {
        p_actor_id: context.userId,
        p_alert_id: text(body.alertId, 80) || null,
      });
      return jsonResponse(200, result || {});
    }

    if (action === "runbook_execute") {
      const result = await rpc(context, "execute_order_operational_runbook_internal", {
        p_actor_id: context.userId,
        p_preview_id: text(body.previewId, 80) || null,
        p_approval_token: text(body.approvalToken, 180),
        p_confirmation_text: text(body.confirmationText, 80),
        p_note: normalizeNote(body.note),
        p_selected_event_key: text(body.selectedEventKey, 240) || null,
      });
      if (result && typeof result === "object" && result.ok === false) {
        const code = text(result.errorCode, 120) || "DOKE_ORDER_RUNBOOK_EXECUTION_FAILED";
        return jsonResponse(statusForError(code), { ...result, error: code });
      }
      return jsonResponse(200, result || {});
    }

    if (action === "post_incident_update") {
      const result = await rpc(context, "mutate_order_operational_post_incident_internal", {
        p_actor_id: context.userId,
        p_review_id: text(body.reviewId, 80) || null,
        p_action: text(body.reviewAction, 40),
        p_payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      });
      return jsonResponse(200, result || {});
    }

    if (action === "prevention_action_update") {
      const result = await rpc(context, "mutate_order_operational_prevention_action_internal", {
        p_actor_id: context.userId,
        p_review_id: text(body.reviewId, 80) || null,
        p_action_id: text(body.preventionActionId, 80) || null,
        p_action: text(body.preventionAction, 40),
        p_payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      });
      return jsonResponse(200, result || {});
    }

    if (action === "change_register") {
      const result = await rpc(context, "register_order_operational_change_internal", {
        p_actor_id: context.userId,
        p_external_key: text(body.externalKey, 180),
        p_change_type: text(body.changeType, 40),
        p_risk_level: text(body.riskLevel, 40),
        p_title: text(body.title, 300),
        p_description: text(body.description, 2000) || null,
        p_change_reference: text(body.changeReference, 500) || null,
        p_metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      });
      return jsonResponse(200, result || {});
    }

    if (action === "change_approve") {
      const result = await rpc(context, "approve_order_operational_change_override_internal", {
        p_actor_id: context.userId,
        p_change_id: text(body.changeId, 80) || null,
        p_reason: normalizeNote(body.reason, 1000),
        p_valid_minutes: normalizeLimit(body.validMinutes, 60, 15, 120),
      });
      return jsonResponse(200, result || {});
    }

    if (action === "change_start") {
      const result = await rpc(context, "start_order_operational_change_internal", {
        p_actor_id: context.userId,
        p_change_id: text(body.changeId, 80) || null,
        p_confirmation_text: text(body.confirmationText, 260),
        p_execution_reference: text(body.executionReference, 500) || null,
      });
      return jsonResponse(200, result || {});
    }

    if (action === "change_complete") {
      const result = await rpc(context, "complete_order_operational_change_internal", {
        p_actor_id: context.userId,
        p_change_id: text(body.changeId, 80) || null,
        p_outcome: text(body.outcome, 40),
        p_note: normalizeNote(body.note, 2000),
      });
      return jsonResponse(200, result || {});
    }

    const result = await rpc(context, "run_order_event_worker_now_internal", {
      p_actor_id: context.userId,
      p_note: normalizeNote(body.note),
    });
    return jsonResponse(200, result || {});
  } catch (error) {
    const code = normalizeOperationsError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code }));
    return jsonResponse(statusForError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
