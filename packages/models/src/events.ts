/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { z } from "zod";

export const Message = <TEventZodType extends z.ZodType>(
  event: TEventZodType
) => event;
export type Message<TEvent> = z.infer<
  ReturnType<typeof Message<z.ZodType<TEvent>>>
>;
