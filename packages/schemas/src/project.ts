import z from "zod";
import { Timestamps } from "./shared";

export const Project = z.object({
    id: z.uuid(),
    teamId: z.uuid(),
    name: z.string(),
}).extend(Timestamps.shape);

export const CreateProject = Project.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
})

export const GetProject = Project.pick({
    id: true
})

export const GetProjects = z.object({
    ids: z.uuid().array()
})

export const UpdateProject = Project.omit({
    createdAt: true,
    updatedAt: true,
}).partial().required({ id: true })

// TODO: Decide what deleted means? `closed` status or deletedAt timestamp?
// const DeleteProject = z.object({})