-- SEARCH-001 / SEARCH-A07
-- Reconcile the pre-activation staging-only search-rank-v1 contract drift.
-- Safe on fresh environments: when migration 160 already contains the canonical contract, this is a no-op.

DO $$
DECLARE
  v_active_version text;
  v_event_count bigint;
  v_current_config jsonb;
  v_previous_candidate_config jsonb := pg_catalog.jsonb_build_object(
    'weights', pg_catalog.jsonb_build_object(
      'text', 0.65,
      'reviews', 0.20,
      'availability', 0.05,
      'recency', 0.10
    ),
    'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.0, 'weight', 5),
    'availabilityWindowDays', 14,
    'recencyFullDays', 14,
    'recencyZeroDays', 90,
    'behavioralSignalsEnabled', false,
    'scorePrecision', 8
  );
  v_canonical_candidate_config jsonb := pg_catalog.jsonb_build_object(
    'weights', pg_catalog.jsonb_build_object(
      'text', 0.68,
      'reviews', 0.20,
      'availability', 0.07,
      'recency', 0.05
    ),
    'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5),
    'availabilityWindowDays', 14,
    'recencyFullDays', 14,
    'recencyZeroDays', 120,
    'behavioralSignalsEnabled', false,
    'scorePrecision', 8
  );
BEGIN
  IF pg_catalog.to_regclass('private.service_search_ranking_versions') IS NULL
     OR pg_catalog.to_regclass('private.service_search_ranking_state') IS NULL
     OR pg_catalog.to_regclass('private.service_search_ranking_state_events') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_PREREQUISITE_MISSING';
  END IF;

  SELECT version_row.config
    INTO v_current_config
  FROM private.service_search_ranking_versions version_row
  WHERE version_row.version = 'search-rank-v1';

  IF v_current_config IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_V1_MISSING';
  END IF;

  IF v_current_config = v_canonical_candidate_config THEN
    RETURN;
  END IF;

  IF v_current_config <> v_previous_candidate_config THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_UNEXPECTED_DRIFT';
  END IF;

  SELECT state.active_version
    INTO v_active_version
  FROM private.service_search_ranking_state state
  WHERE state.singleton = true
  FOR UPDATE;

  SELECT pg_catalog.count(*)
    INTO v_event_count
  FROM private.service_search_ranking_state_events;

  IF v_active_version <> 'search-rank-v0' OR v_event_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_NOT_PREACTIVATION';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger trigger_row
    WHERE trigger_row.tgrelid = 'private.service_search_ranking_versions'::pg_catalog.regclass
      AND trigger_row.tgname = 'trg_reject_service_search_ranking_version_mutation'
      AND NOT trigger_row.tgisinternal
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_IMMUTABILITY_TRIGGER_MISSING';
  END IF;

  EXECUTE 'alter table private.service_search_ranking_versions disable trigger trg_reject_service_search_ranking_version_mutation';

  DELETE FROM private.service_search_ranking_versions
  WHERE version = 'search-rank-v1';

  INSERT INTO private.service_search_ranking_versions (version, strategy, config)
  VALUES ('search-rank-v1', 'bounded_quality_v1', v_canonical_candidate_config);

  EXECUTE 'alter table private.service_search_ranking_versions enable trigger trg_reject_service_search_ranking_version_mutation';

  IF NOT EXISTS (
    SELECT 1
    FROM private.service_search_ranking_versions version_row
    WHERE version_row.version = 'search-rank-v1'
      AND version_row.strategy = 'bounded_quality_v1'
      AND version_row.config = v_canonical_candidate_config
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'DOKE_SEARCH_RANKING_RECONCILIATION_FAILED';
  END IF;
END;
$$;

COMMENT ON TABLE private.service_search_ranking_versions IS
  'SEARCH-A07 immutable ranking configurations. The pre-activation staging candidate drift was reconciled by migration 161; browser-originated behavioral counters remain excluded.';
