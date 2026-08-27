CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_created_at ON licenses(created_at);

CREATE INDEX idx_license_devices_license_id ON license_devices(license_id);
CREATE INDEX idx_license_devices_user_id ON license_devices(user_id);
CREATE INDEX idx_license_devices_fingerprint ON license_devices(device_fingerprint);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_occurred_at ON events(occurred_at);

CREATE INDEX idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);

CREATE INDEX idx_feature_request_votes_user_id ON feature_request_votes(user_id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE INDEX idx_sync_changes_user_id ON sync_changes(user_id);
CREATE INDEX idx_sync_changes_table_name ON sync_changes(table_name);
CREATE INDEX idx_sync_changes_occurred_at ON sync_changes(occurred_at);
