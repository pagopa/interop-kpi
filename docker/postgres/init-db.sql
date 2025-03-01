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

CREATE SCHEMA IF NOT EXISTS loadbalancerlog;
CREATE TABLE IF NOT EXISTS loadbalancerlog.load_balancer_logs (
    type VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    elb VARCHAR(255) NOT NULL,
    client VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL,
    request_processing_time VARCHAR(50) NOT NULL,
    target_processing_time VARCHAR(50) NOT NULL,
    response_processing_time VARCHAR(50) NOT NULL,
    elb_status_code INTEGER NOT NULL,
    target_status_code INTEGER,
    received_bytes BIGINT NOT NULL,
    sent_bytes BIGINT NOT NULL,
    request TEXT NOT NULL,
    user_agent TEXT,
    ssl_cipher VARCHAR(255),
    ssl_protocol VARCHAR(50),
    target_group_arn VARCHAR(255),
    trace_id VARCHAR(255) NOT NULL,
    domain_name VARCHAR(255),
    chosen_cert_arn VARCHAR(255),
    matched_rule_priority INTEGER,
    request_creation_time VARCHAR(50),
    actions_executed TEXT,
    redirect_url TEXT,
    error_reason TEXT,
    target_port_list TEXT,
    target_status_code_list TEXT,
    classification VARCHAR(50),
    classification_reason VARCHAR(255),
    conn_trace_id VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS loadbalancerlog.load_balancer_logs_staging (
    LIKE loadbalancerlog.load_balancer_logs INCLUDING ALL
);
