import { expect, test } from "bun:test";
import { createPostgresLearningStore } from "../src/index";

const databaseUrl = process.env.DATABASE_URL;

test.skipIf(!databaseUrl)(
	"persists Team membership and Projects in Postgres",
	async () => {
		const store = createPostgresLearningStore(databaseUrl as string);
		try {
			await store.migrate();
			const team = await store.createTeam({
				name: "Guilloteam",
				ownerId: "ava",
			});
			expect(await store.getTeamMember(team.id, "ava")).toMatchObject({
				role: "owner",
			});
			await store.joinTeam(team.id, "ben");
			expect(await store.getTeamMember(team.id, "ben")).toMatchObject({
				role: "member",
			});

			const project = await store.createProject({
				teamId: team.id,
				name: "Mobile app",
				createdByUserId: "ben",
			});
			expect(await store.getProject(project.id)).toMatchObject({
				teamId: team.id,
				name: "Mobile app",
				createdByUserId: "ben",
			});
			const website = await store.createProject({
				teamId: team.id,
				name: "Website",
				createdByUserId: "ben",
			});
			const captured = await store.createNoise({
				projectId: project.id,
				content: "Make invitations recoverable.",
				source: "fleeting_thought",
				capturedByUserId: "ben",
				metadata: { channel: "walk" },
			});
			expect(captured).toMatchObject({
				projectId: project.id,
				capturedByUserId: "ben",
				metadata: { channel: "walk" },
			});
			expect(await store.countNoise(project.id)).toBe(1);
			expect(await store.listNoise(project.id)).toHaveLength(1);
			expect(await store.listNoise(website.id)).toEqual([]);

			const initiative = await store.createInitiative({
				projectId: project.id,
				statement: "Make invitation recovery reliable.",
				noiseIds: [captured.id],
			});
			expect(initiative).toMatchObject({
				projectId: project.id,
				state: "signal",
				noiseIds: [captured.id],
			});
			expect(await store.countWorkshopInitiatives(project.id)).toBe(1);
			expect(await store.listWorkshopInitiatives(project.id)).toEqual([
				initiative,
			]);
			expect(await store.listWorkshopInitiatives(website.id)).toEqual([]);

			const additionalNoise = await store.createNoise({
				projectId: project.id,
				content: "Support sees the same recovery request repeatedly.",
				source: "conversation",
				capturedByUserId: "ben",
				metadata: {},
			});
			const updatedInitiative = await store.attachNoise(initiative.id, [
				additionalNoise.id,
			]);
			expect(updatedInitiative.noiseIds).toEqual([
				captured.id,
				additionalNoise.id,
			]);
			expect(await store.getInitiative(initiative.id)).toEqual(
				updatedInitiative,
			);
			const mergeNoise = await store.createNoise({
				projectId: project.id,
				content: "Invitation recovery is a recurring support burden.",
				source: "conversation",
				capturedByUserId: "ben",
				metadata: {},
			});
			const absorbedInitiative = await store.createInitiative({
				projectId: project.id,
				statement: "Reduce invitation support burden.",
				noiseIds: [mergeNoise.id],
			});
			const editedInitiative = await store.updateInitiative(
				initiative.id,
				"Make invitation recovery reliable.",
			);
			expect(editedInitiative?.statement).toBe(
				"Make invitation recovery reliable.",
			);
			const mergedInitiative = await store.mergeInitiatives({
				survivingInitiativeId: initiative.id,
				absorbedInitiativeIds: [absorbedInitiative.id],
				mergedByUserId: "ben",
			});
			expect(mergedInitiative.noiseIds).toEqual([
				captured.id,
				additionalNoise.id,
				mergeNoise.id,
			]);
			expect(await store.getInitiative(absorbedInitiative.id)).toMatchObject({
				mergedIntoInitiativeId: initiative.id,
				noiseIds: [mergeNoise.id],
			});
			const graduatedInitiative = await store.graduateInitiative(
				initiative.id,
				project.id,
				"ben",
			);
			expect(graduatedInitiative?.state).toBe("queued");
			expect(await store.listInitiativeQueue(project.id)).toMatchObject([
				{ initiativeId: initiative.id, position: 1, queuedByUserId: "ben" },
			]);
			expect(await store.countWorkshopInitiatives(project.id)).toBe(0);
			const startedInitiative = await store.startNextInitiative(
				project.id,
				"ben",
			);
			expect(startedInitiative).toMatchObject({
				id: initiative.id,
				state: "executing",
				startedByUserId: "ben",
			});
			expect(startedInitiative?.startedAt).toBeDefined();
			expect(await store.listInitiativeQueue(project.id)).toEqual([]);
			const completedInitiative = await store.completeInitiative(
				initiative.id,
				"ben",
				"Owners can now recover expired invitations.",
			);
			expect(completedInitiative).toMatchObject({
				id: initiative.id,
				state: "completed",
				completedByUserId: "ben",
				outcomeSummary: "Owners can now recover expired invitations.",
			});
			expect(completedInitiative?.completedAt).toBeDefined();
			expect(await store.countOutcomes(project.id)).toBe(1);

			const noOpSynthesis = await store.createNoOpSynthesis({
				projectId: project.id,
				noiseIds: [additionalNoise.id],
				rationale: "This does not warrant additional work yet.",
				requestedByUserId: "ben",
			});
			expect(noOpSynthesis).toMatchObject({
				projectId: project.id,
				noiseIds: [additionalNoise.id],
				requestedByUserId: "ben",
			});
			expect(await store.listNoOpSyntheses(project.id)).toEqual([
				noOpSynthesis,
			]);
		} finally {
			await store.close();
		}
	},
);
