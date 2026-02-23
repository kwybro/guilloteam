#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";

const main = defineCommand({
	meta: {
		name: "guillo",
		version: "0.0.1",
		description: "The guilloteam CLI"
	},
	subCommands: {
		auth: () => import('./commands/auth').then(m => m.authCommand),
		config: () => import('./commands/config').then(m => m.configCommand),
		lock: () => import('./commands/lock').then(m => m.lockCommand),
		unlock: () => import('./commands/lock').then(m => m.unlockCommand),
		teams: () => import('./commands/teams').then(m => m.teamsCommand),
		projects: () => import('./commands/projects').then(m => m.projectsCommand),
		tasks: () => import('./commands/tasks').then(m => m.tasksCommand),
		summon: () => import('./commands/summon').then(m => m.summonCommand),
		team: () => import('./commands/team').then(m => m.teamCommand),
		execute: () => import('./commands/execute').then(m => m.executeCommand),
	}
})

runMain(main);