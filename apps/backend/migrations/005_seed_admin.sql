-- Replace password hash in real setup or create via app bootstrap script
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
  'admin@stitchflow.app',
  '$2b$12$Qk1gIr7dzU5i7D7Gll8pz.1bqVpo5xgM8B3vAOrYQmD7hJ8d5n8yC',
  'StitchFlow Admin',
  'admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;
