#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";

const main = defineCommand({
	meta: {
		name: "guillo",
		version: "0.0.1",
		description: "The guilloteam CLI"
	},
	subCommands: {
		teams: () => import('./commands/teams').then(m => m.teamsCommand),
		projects: () => import('./commands/projects').then(m => m.projectsCommand),
		tasks: () => import('./commands/tasks').then(m => m.tasksCommand),
	}
})

runMain(main);