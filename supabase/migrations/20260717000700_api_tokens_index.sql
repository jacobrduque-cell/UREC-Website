-- UREC Platform — unique index on api_tokens.token_hash
--
-- Needed for the Phase 5 calendar subscribe feed: the feed route looks
-- up a token by its hash with no user session (the calling app, e.g.
-- Google Calendar, never sends auth cookies), so this is a point
-- lookup on every fetch and should be indexed. Unique also protects
-- against a random hash collision ever mapping to two users' tokens.

create unique index if not exists api_tokens_token_hash_idx
  on public.api_tokens(token_hash);
