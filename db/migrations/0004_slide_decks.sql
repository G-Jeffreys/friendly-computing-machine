-- Migration: create slide_decks table
CREATE TABLE IF NOT EXISTS slide_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL,
  outline JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for quick lookup by user & document
CREATE INDEX IF NOT EXISTS slide_decks_user_document_idx ON slide_decks (user_id, document_id); 