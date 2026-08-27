import { Transform } from "stream";
import { Gunzip } from "zlib";
import split2 from "split2";
import { LoadBalancerLog } from "../model/load-balancer-log.js";

export function transformFileStream(fileStream: Gunzip): Transform {
  return fileStream.pipe(split2()).pipe(
    new Transform({
      objectMode: true,
      transform(line, _enc, callback): void {
        if (!line || line.startsWith("#")) {
          return callback();
        }

        const tokens = line.match(/(".*?"|\S+)/g);
        if (!tokens) {
          return callback();
        }

        try {
          const log = convertTokensToLog(tokens);
          callback(null, log);
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
      },
    })
  );
}

function convertTokensToLog(tokens: string[]): LoadBalancerLog | null {
  const unquote = (str: string): string => str?.replace(/^"|"$/g, "");

  const replaceDashWithUndefined = (value?: string): string | undefined =>
    value && value !== "-" ? value : undefined;

  const [
    type,
    time,
    elb,
    client,
    target,
    request_processing_time,
    target_processing_time,
    response_processing_time,
    elb_status_code,
    target_status_code,
    received_bytes,
    sent_bytes,
    rawRequest,
    rawUserAgent,
    rawSslCipher,
    rawSslProtocol,
    rawTargetGroupArn,
    rawTraceId,
    rawDomainName,
    rawChosenCertArn,
    matched_rule_priority,
    request_creation_time,
    rawActionsExecuted,
    rawRedirectUrl,
    rawErrorReason,
    rawTargetPortList,
    rawTargetStatusCodeList,
    rawClassification,
    rawClassificationReason,
    conn_trace_id,
  ] = tokens;

  return {
    type,
    time,
    elb,
    client,
    target: replaceDashWithUndefined(target),
    request_processing_time,
    target_processing_time,
    response_processing_time,
    elb_status_code,
    target_status_code: replaceDashWithUndefined(target_status_code),
    received_bytes,
    sent_bytes,
    request: unquote(rawRequest),
    user_agent: unquote(rawUserAgent),
    ssl_cipher: replaceDashWithUndefined(rawSslCipher),
    ssl_protocol: replaceDashWithUndefined(rawSslProtocol),
    target_group_arn: replaceDashWithUndefined(rawTargetGroupArn),
    trace_id: unquote(rawTraceId),
    domain_name: replaceDashWithUndefined(unquote(rawDomainName)),
    chosen_cert_arn: replaceDashWithUndefined(unquote(rawChosenCertArn)),
    matched_rule_priority,
    request_creation_time,
    actions_executed: unquote(rawActionsExecuted),
    redirect_url: replaceDashWithUndefined(unquote(rawRedirectUrl)),
    error_reason: replaceDashWithUndefined(unquote(rawErrorReason)),
    target_port_list: replaceDashWithUndefined(unquote(rawTargetPortList)),
    target_status_code_list: replaceDashWithUndefined(
      unquote(rawTargetStatusCodeList)
    ),
    classification: replaceDashWithUndefined(unquote(rawClassification)),
    classification_reason: replaceDashWithUndefined(
      unquote(rawClassificationReason)
    ),
    conn_trace_id: replaceDashWithUndefined(conn_trace_id),
  };
}
