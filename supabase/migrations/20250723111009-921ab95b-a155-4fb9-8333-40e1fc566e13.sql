-- Create trigger function and trigger for auto availability notifications
CREATE OR REPLACE FUNCTION public.auto_send_availability_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Send notifications for new events
  IF TG_OP = 'INSERT' THEN
    PERFORM send_availability_notifications(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS auto_availability_notifications ON events;
CREATE TRIGGER auto_availability_notifications
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_availability_notifications();