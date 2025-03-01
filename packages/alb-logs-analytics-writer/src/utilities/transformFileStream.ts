import { Transform } from "stream";
import { Gunzip } from "zlib";
import split2 from "split2";
import { LoadBalancerLog } from "../model/load-balancer-log.js";

export function transformFileStream(fileStream: Gunzip): Transform {
  return fileStream.pipe(split2()).pipe(
    new Transform({
      objectMode: true,
      transform(line, _enc, callback): void {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          return callback();
        }

        const tokens = trimmed.match(/(".*?"|\S+)/g);
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

function convertTokensToLog(tokens: string[]): LoadBalancerLog {
  return {
    type: unquote(tokens[0]),
    time: unquote(tokens[1]),
    elb: unquote(tokens[2]),
    client: unquote(tokens[3]),
    target: unquote(tokens[4]),
    request_processing_time: tokens[5] || "0.0",
    target_processing_time: tokens[6] || "0.0",
    response_processing_time: tokens[7] || "0.0",
    elb_status_code: tokens[8] || "0",
    target_status_code: unquote(tokens[9]),
    received_bytes: tokens[10] || "0",
    sent_bytes: tokens[11] || "0",
    request: tokens[12].split(" ")[0] || "",
    user_agent: unquote(tokens[13]),
    ssl_cipher: unquote(tokens[14]),
    ssl_protocol: unquote(tokens[15]),
    target_group_arn: unquote(tokens[16]),
    trace_id: unquote(tokens[17]),
    domain_name: unquote(tokens[18]),
    chosen_cert_arn: unquote(tokens[19]),
    matched_rule_priority: unquote(tokens[20]),
    request_creation_time: unquote(tokens[21]),
    actions_executed: unquote(tokens[22]),
    redirect_url: unquote(tokens[23]),
    error_reason: unquote(tokens[24]),
    target_port_list: unquote(tokens[25]),
    target_status_code_list: unquote(tokens[26]),
    classification: unquote(tokens[27]),
    classification_reason: unquote(tokens[28]),
    conn_trace_id: unquote(tokens[29]),
  };
}

function unquote(str: string): string {
  return str ? str.replace(/^"|"$/g, "") : str;
}
