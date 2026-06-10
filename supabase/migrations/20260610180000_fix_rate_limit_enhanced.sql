-- Fix check_rate_limit_enhanced so it actually limits.
--
-- The previous implementation counted rows in rate_limit_violations, but
-- nothing ever recorded individual attempts, so the count could never reach
-- max_attempts and the function never blocked anything.
--
-- Now each call records an attempt in the (previously unused) rate_limits
-- table — a fixed-window counter per (user or IP) + action. Once attempts
-- exceed the configured max the caller is blocked for
-- block_duration_minutes and a row is written to rate_limit_violations.
--
-- The return shape is unchanged (is_blocked, violation_count, max_attempts,
-- blocked_until, window_minutes) so existing callers (securityService.ts)
-- keep working. CREATE OR REPLACE preserves the function's ACL (anon EXECUTE
-- already revoked by the earlier hardening migration).

CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  p_action_type text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_ip_address inet DEFAULT NULL::inet
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    config_record RECORD;
    rl RECORD;
    attempts integer := 0;
    is_blocked boolean := false;
    block_until timestamp with time zone := NULL;
BEGIN
    SELECT * INTO config_record
    FROM rate_limiting_config
    WHERE action_type = p_action_type;

    IF NOT FOUND THEN
        config_record.max_attempts := 5;
        config_record.window_minutes := 15;
        config_record.block_duration_minutes := 30;
    END IF;

    -- Nothing to key on: allow without counting
    IF p_user_id IS NULL AND p_ip_address IS NULL THEN
        RETURN jsonb_build_object(
            'is_blocked', false,
            'violation_count', 0,
            'max_attempts', config_record.max_attempts,
            'blocked_until', NULL,
            'window_minutes', config_record.window_minutes
        );
    END IF;

    SELECT * INTO rl
    FROM rate_limits
    WHERE action = p_action_type
      AND ((p_user_id IS NOT NULL AND user_id = p_user_id)
        OR (p_user_id IS NULL AND ip_address = p_ip_address))
    ORDER BY window_start DESC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF rl.id IS NOT NULL AND rl.blocked_until IS NOT NULL AND rl.blocked_until > now() THEN
        -- Currently blocked
        is_blocked := true;
        block_until := rl.blocked_until;
        attempts := COALESCE(rl.attempt_count, 0);
    ELSIF rl.id IS NOT NULL AND rl.window_start IS NOT NULL
          AND rl.window_start > now() - (config_record.window_minutes || ' minutes')::interval THEN
        -- Inside the current window: count this attempt
        attempts := COALESCE(rl.attempt_count, 0) + 1;
        IF attempts > config_record.max_attempts THEN
            is_blocked := true;
            block_until := now() + (config_record.block_duration_minutes || ' minutes')::interval;
            UPDATE rate_limits
            SET attempt_count = attempts, blocked_until = block_until
            WHERE id = rl.id;
            -- Audit trail only — must never abort the block itself (e.g. the
            -- user_id FK to auth.users fails for since-deleted users).
            BEGIN
                INSERT INTO rate_limit_violations (
                    action_type, user_id, ip_address, violation_count,
                    blocked_until, window_start
                ) VALUES (
                    p_action_type, p_user_id, p_ip_address, attempts,
                    block_until, rl.window_start
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        ELSE
            UPDATE rate_limits SET attempt_count = attempts WHERE id = rl.id;
        END IF;
    ELSE
        -- No row yet, or the previous window expired: start a new window
        attempts := 1;
        IF rl.id IS NOT NULL THEN
            UPDATE rate_limits
            SET attempt_count = 1, window_start = now(), blocked_until = NULL
            WHERE id = rl.id;
        ELSE
            INSERT INTO rate_limits (id, user_id, ip_address, action, attempt_count, window_start)
            VALUES (gen_random_uuid(), p_user_id, p_ip_address, p_action_type, 1, now());
        END IF;
    END IF;

    PERFORM log_security_event_enhanced(
        'RATE_LIMIT_CHECK',
        jsonb_build_object(
            'action_type', p_action_type,
            'violation_count', attempts,
            'max_attempts', config_record.max_attempts,
            'is_blocked', is_blocked
        ),
        CASE WHEN is_blocked THEN 'high' ELSE 'low' END,
        p_ip_address
    );

    RETURN jsonb_build_object(
        'is_blocked', is_blocked,
        'violation_count', attempts,
        'max_attempts', config_record.max_attempts,
        'blocked_until', block_until,
        'window_minutes', config_record.window_minutes
    );
END;
$function$;

-- Lookup index for the per-check counter query
CREATE INDEX IF NOT EXISTS idx_rate_limits_action_user
  ON public.rate_limits(action, user_id, window_start DESC);

-- Quota configuration for the newly rate-limited edge function actions.
-- invitation_send (10/hour) already exists.
INSERT INTO public.rate_limiting_config (id, action_type, max_attempts, window_minutes, block_duration_minutes)
SELECT gen_random_uuid(), v.action_type, v.max_attempts, v.window_minutes, v.block_duration_minutes
FROM (VALUES
  ('notification_send',      30, 60, 60),
  ('push_notification_send', 30, 60, 60),
  ('ai_generation',          20, 60, 30)
) AS v(action_type, max_attempts, window_minutes, block_duration_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rate_limiting_config c WHERE c.action_type = v.action_type
);
