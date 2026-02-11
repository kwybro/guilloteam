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
})

export const GetTeam = Team.pick({
    id: true
})

export const GetTeams = z.object({
    ids: z.uuid().array()
})

export const UpdateTeam = Team.omit({
    createdAt: true,
    updatedAt: true
}).partial().required({ id: true, })

// TODO: Decide what deleted means? deletedAt timestamp?
// const DeleteTeam = z.object({})