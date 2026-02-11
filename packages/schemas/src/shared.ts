import z from "zod";

export const Timestamps = z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
})