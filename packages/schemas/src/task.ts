import z from "zod"
import { Timestamps } from "./shared";

const TaskStatus = z.enum(['open', "in_progress", "done", "cancelled"])

export const Task = z.object({
	id: z.uuid(),
    projectId: z.uuid(),
	title: z.string(),
    status: TaskStatus
}).extend(Timestamps.shape)

export const CreateTask = Task.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
})

export const GetTask = Task.pick({
    id: true
})

export const GetTasks = z.object({
    ids: z.uuid().array()
})

export const UpdateTask = Task.omit({
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
}).partial().required({ id: true })

export const DeleteTask = Task.pick({
    id: true,
})
