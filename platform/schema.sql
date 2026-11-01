-- Skipper Ostsee weather archive (SPEC §14.3)
CREATE TABLE IF NOT EXISTS skipper_wx_snapshot (
  id          bigserial PRIMARY KEY,
  fetched_at  timestamptz NOT NULL,
  source      text        NOT NULL,
  t0          timestamptz NOT NULL,
  hours       integer     NOT NULL,
  n_points    integer     NOT NULL,
  has_marine  boolean     NOT NULL,
  sha256      text        NOT NULL UNIQUE,
  payload     jsonb       NOT NULL
);
CREATE INDEX IF NOT EXISTS skipper_wx_snapshot_fetched_at ON skipper_wx_snapshot (fetched_at DESC);
-- Retention example (keep 180 days):
-- DELETE FROM skipper_wx_snapshot WHERE fetched_at < now() - interval '180 days';
