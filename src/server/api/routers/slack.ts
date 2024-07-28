import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { processUserQuery } from "@/utils/user-interpret-ai";

export const slackRouter = createTRPCRouter({
  processQuery: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return await processUserQuery(input);
    }),
});