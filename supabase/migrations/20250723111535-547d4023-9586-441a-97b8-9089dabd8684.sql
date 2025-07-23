-- Fix the trigger function with proper search path
CREATE OR REPLACE FUNCTION public.auto_send_availability_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  -- Send notifications for new events
  IF TG_OP = 'INSERT' THEN
    PERFORM public.send_availability_notifications(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;