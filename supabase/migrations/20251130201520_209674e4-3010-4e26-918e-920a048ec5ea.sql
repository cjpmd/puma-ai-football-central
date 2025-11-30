-- Drop the existing check constraint
ALTER TABLE match_events 
DROP CONSTRAINT IF EXISTS match_events_event_type_check;

-- Add updated check constraint including 'substitution'
ALTER TABLE match_events 
ADD CONSTRAINT match_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'goal'::text, 
  'assist'::text, 
  'save'::text, 
  'yellow_card'::text, 
  'red_card'::text,
  'substitution'::text
]));