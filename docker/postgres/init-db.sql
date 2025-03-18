CREATE SCHEMA IF NOT EXISTS jwt;

CREATE TABLE IF NOT EXISTS jwt.client_assertion_audit (
    jwt_id VARCHAR(36) PRIMARY KEY,
    issued_at TIMESTAMPTZ NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    subject VARCHAR(36) NOT NULL,
    audience VARCHAR(255) NOT NULL,
    expiration_time TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS jwt.generated_token_audit (
    jwt_id VARCHAR(36) PRIMARY KEY,
    correlation_id VARCHAR(36) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    client_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    agreement_id VARCHAR(36) NOT NULL,
    eservice_id VARCHAR(36) NOT NULL,
    descriptor_id VARCHAR(36) NOT NULL,
    purpose_id VARCHAR(36) NOT NULL,
    purpose_version_id VARCHAR(36) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    audience VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    not_before TIMESTAMPTZ NOT NULL,
    expiration_time TIMESTAMPTZ NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    client_assertion_jwt_id VARCHAR(36) NOT NULL,
    CONSTRAINT fk_client_assertion FOREIGN KEY (client_assertion_jwt_id) REFERENCES jwt.client_assertion_audit(jwt_id) ON DELETE CASCADE
);

CREATE SCHEMA IF NOT EXISTS infra;

CREATE TABLE IF NOT EXISTS infra.alb_logs_audit (
    trace_id VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    time VARCHAR(255) NOT NULL,
    elb VARCHAR(255) NOT NULL,
    client VARCHAR(50) NOT NULL,
    target VARCHAR(255),
    request_processing_time VARCHAR(255) NOT NULL,
    target_processing_time VARCHAR(255) NOT NULL,
    response_processing_time VARCHAR(255) NOT NULL,
    elb_status_code VARCHAR(255) NOT NULL,
    target_status_code VARCHAR(255),
    received_bytes BIGINT NOT NULL,
    sent_bytes BIGINT NOT NULL,
    request VARCHAR(1024) NOT NULL,
    user_agent VARCHAR(512),
    ssl_cipher VARCHAR(255),
    ssl_protocol VARCHAR(255),
    target_group_arn VARCHAR(512),
    domain_name VARCHAR(255),
    chosen_cert_arn VARCHAR(512),
    matched_rule_priority VARCHAR(255),
    request_creation_time VARCHAR(255),
    actions_executed VARCHAR(512),
    redirect_url VARCHAR(1024),
    error_reason VARCHAR(255),
    target_port_list VARCHAR(1024),
    target_status_code_list VARCHAR(1024),
    classification VARCHAR(255),
    classification_reason VARCHAR(255),
    conn_trace_id VARCHAR(255)
);

CREATE SCHEMA IF NOT EXISTS application;

CREATE TABLE IF NOT EXISTS application.begin_request_audit (
    correlation_id VARCHAR(36) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    service_version VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(255) NOT NULL,
    phase VARCHAR(255) NOT NULL,
    requester_ip_address VARCHAR(255) NOT NULL,
    node_ip VARCHAR(255) NOT NULL,
    pod_name VARCHAR(255) NOT NULL,
    uptime_seconds BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    amazon_trace_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS application.end_request_audit (
    correlation_id VARCHAR(36) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    service_version VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(255) NOT NULL,
    phase VARCHAR(255) NOT NULL,
    requester_ip_address VARCHAR(255) NOT NULL,
    node_ip VARCHAR(255) NOT NULL,
    pod_name VARCHAR(255) NOT NULL,
    uptime_seconds BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    amazon_trace_id VARCHAR(255),
    organization_id VARCHAR(36),
    user_id VARCHAR(36),
    self_care_id VARCHAR(36),
    http_response_status INTEGER NOT NULL,
    execution_time_ms BIGINT NOT NULL
);