/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { z } from "zod";

export const Message = <TEventZodType extends z.ZodType>(
  event: TEventZodType
) =>
  z.object({
    value: z.preprocess(
      (v) => (v != null ? JSON.parse(v.toString()) : null),
      event
    ),
  });
export type Message<TEvent> = z.infer<
  ReturnType<typeof Message<z.ZodType<TEvent>>>
>;
