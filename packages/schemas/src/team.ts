import z from "zod";
import { Timestamps } from "./shared";

export const Team = z.object({
    id: z.uuid(),
    name: z.string()
}).extend(Timestamps.shape)

export const CreateTeam = Team.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
})

export const GetTeam = Team.pick({
    id: true
})

export const UpdateTeam = Team.omit({
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
}).partial().required({ id: true, })

export const DeleteTeam = Team.pick({
    id: true
})