-- Add txt_content field to sire_exports table
-- This allows re-downloading previously generated TXT files without regenerating

ALTER TABLE sire_exports
ADD COLUMN IF NOT EXISTS txt_content TEXT;

COMMENT ON COLUMN sire_exports.txt_content IS 'Full TXT file content (tab-delimited SIRE format) - allows re-download without regeneration';
