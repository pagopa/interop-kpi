CREATE SCHEMA IF NOT EXISTS jwt_generated;

CREATE TABLE IF NOT EXISTS jwt_generated.client_assertion_audit_details (
    jwt_id UUID PRIMARY KEY,
    issued_at TIMESTAMPTZ NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    subject UUID NOT NULL,
    audience VARCHAR(255) NOT NULL,
    expiration_time TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS jwt_generated.generated_token_audit_details (
    jwt_id UUID PRIMARY KEY,
    correlation_id UUID NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    client_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    agreement_id UUID NOT NULL,
    eservice_id UUID NOT NULL,
    descriptor_id UUID NOT NULL,
    purpose_id UUID NOT NULL,
    purpose_version_id UUID NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    audience VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    not_before TIMESTAMPTZ NOT NULL,
    expiration_time TIMESTAMPTZ NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    client_assertion_jwt_id UUID NOT NULL,
    CONSTRAINT fk_client_assertion FOREIGN KEY (client_assertion_jwt_id) REFERENCES jwt_generated.client_assertion_audit_details(jwt_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jwt_generated.client_assertion_audit_details_staging (
    LIKE jwt_generated.client_assertion_audit_details
);

CREATE TABLE IF NOT EXISTS jwt_generated.generated_token_audit_details_staging (
    LIKE jwt_generated.generated_token_audit_details
);