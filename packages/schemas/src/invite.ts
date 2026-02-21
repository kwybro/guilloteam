import z from "zod";

export const CreateInvite = z.object({
    email: z.email()
})