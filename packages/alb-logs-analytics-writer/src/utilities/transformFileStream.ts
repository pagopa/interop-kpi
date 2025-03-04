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

function convertTokensToLog(tokens: string[]): LoadBalancerLog {
  const unquote = (str: string): string =>
    str ? str.replace(/^"|"$/g, "") : str;

  const replaceDashWithUndefined = (value?: string): string | undefined =>
    value && value !== "-" ? value : undefined;

  return {
    type: tokens[0],
    time: tokens[1],
    elb: tokens[2],
    client: tokens[3],
    target: replaceDashWithUndefined(tokens[4]),
    request_processing_time: tokens[5],
    target_processing_time: tokens[6],
    response_processing_time: tokens[7],
    elb_status_code: tokens[8],
    target_status_code: replaceDashWithUndefined(tokens[9]),
    received_bytes: tokens[10],
    sent_bytes: tokens[11],
    request: unquote(tokens[12]),
    user_agent: unquote(tokens[13]),
    ssl_cipher: replaceDashWithUndefined(tokens[14]),
    ssl_protocol: replaceDashWithUndefined(tokens[15]),
    target_group_arn: replaceDashWithUndefined(tokens[16]),
    trace_id: unquote(tokens[17]),
    domain_name: replaceDashWithUndefined(unquote(tokens[18])),
    chosen_cert_arn: replaceDashWithUndefined(unquote(tokens[19])),
    matched_rule_priority: tokens[20],
    request_creation_time: tokens[21],
    actions_executed: unquote(tokens[22]),
    redirect_url: replaceDashWithUndefined(unquote(tokens[23])),
    error_reason: replaceDashWithUndefined(unquote(tokens[24])),
    target_port_list: replaceDashWithUndefined(unquote(tokens[25])),
    target_status_code_list: replaceDashWithUndefined(unquote(tokens[26])),
    classification: replaceDashWithUndefined(unquote(tokens[27])),
    classification_reason: replaceDashWithUndefined(unquote(tokens[28])),
    conn_trace_id: replaceDashWithUndefined(tokens[29]),
  };
}
