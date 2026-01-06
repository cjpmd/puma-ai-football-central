-- Add recurring event columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern text, -- 'weekly', 'biweekly', 'monthly'
ADD COLUMN IF NOT EXISTS recurrence_day_of_week integer, -- 0=Sunday through 6=Saturday
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS recurrence_occurrences integer,
ADD COLUMN IF NOT EXISTS recurring_group_id uuid; -- Links all events in a recurring series

-- Add index for recurring group lookups
CREATE INDEX IF NOT EXISTS idx_events_recurring_group_id ON events(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN events.recurrence_pattern IS 'Recurrence pattern: weekly, biweekly, or monthly';
COMMENT ON COLUMN events.recurrence_day_of_week IS 'Day of week for recurrence: 0=Sunday through 6=Saturday';
COMMENT ON COLUMN events.recurring_group_id IS 'UUID linking all events in the same recurring series';