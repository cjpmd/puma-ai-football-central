-- Add medical information columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS medical_conditions text,
ADD COLUMN IF NOT EXISTS medical_treatment text;

-- Add comment for documentation
COMMENT ON COLUMN players.medical_conditions IS 'Player medical conditions (e.g., Asthma, Allergies)';
COMMENT ON COLUMN players.medical_treatment IS 'Treatment or medicines for medical conditions';