import type { Initiative, Noise, Project, Team } from "@guilloteam/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createProjectClient,
	createTeamClient,
	type ProjectWorkspaceData,
} from "./project-client";

type WorkspaceTab = "noise" | "workshop" | "queue" | "outcomes";

const configured =
	import.meta.env.VITE_GUILLOTEAM_USER_ID &&
	import.meta.env.VITE_GUILLOTEAM_USER_TOKEN;

function relativeTime(timestamp: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(timestamp));
}

function NoiseCard({ noise }: { noise: Noise }) {
	return (
		<article className="item-card">
			<div className="eyebrow">{noise.source.replaceAll("_", " ")}</div>
			<p>{noise.content}</p>
			<div className="item-meta">
				<span>{noise.capturedByUserId}</span>
				<span>{relativeTime(noise.createdAt)}</span>
			</div>
		</article>
	);
}

function InitiativeCard({
	initiative,
	onGraduate,
	busy,
}: {
	initiative: Initiative;
	onGraduate: (initiativeId: string) => void;
	busy: boolean;
}) {
	return (
		<article className="item-card initiative-card">
			<div className="eyebrow">
				signal · {initiative.noiseIds.length} supporting Noise
			</div>
			<p>{initiative.statement}</p>
			<div className="item-meta">
				<span>Updated {relativeTime(initiative.updatedAt)}</span>
				<span>{initiative.state}</span>
			</div>
			<button
				className="primary-action"
				disabled={busy}
				onClick={() => onGraduate(initiative.id)}
				type="button"
			>
				Graduate to queue
			</button>
		</article>
	);
}

export function App() {
	const [tab, setTab] = useState<WorkspaceTab>("noise");
	const [workspace, setWorkspace] = useState<ProjectWorkspaceData>();
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const [noiseText, setNoiseText] = useState("");
	const [teams, setTeams] = useState<Team[]>([]);
	const [teamId, setTeamId] = useState<string>();
	const [projects, setProjects] = useState<Project[]>([]);
	const [projectId, setProjectId] = useState<string>();
	const [newProjectName, setNewProjectName] = useState("");
	const teamClient = useMemo(
		() =>
			configured
				? createTeamClient({
						userId: import.meta.env.VITE_GUILLOTEAM_USER_ID,
						token: import.meta.env.VITE_GUILLOTEAM_USER_TOKEN,
					})
				: undefined,
		[],
	);
	const client = useMemo(
		() =>
			configured && projectId
				? createProjectClient({
						projectId,
						userId: import.meta.env.VITE_GUILLOTEAM_USER_ID,
						token: import.meta.env.VITE_GUILLOTEAM_USER_TOKEN,
					})
				: undefined,
		[projectId],
	);
	const loadProjects = useCallback(
		async (nextTeamId: string, preferredProjectId?: string) => {
			if (!teamClient) return;
			const loadedProjects = await teamClient.listProjects(nextTeamId);
			setProjects(loadedProjects);
			const nextProjectId = loadedProjects.some(
				(project) => project.id === preferredProjectId,
			)
				? preferredProjectId
				: loadedProjects[0]?.id;
			setProjectId(nextProjectId);
			if (nextProjectId) {
				await teamClient.setWorkspaceFocus(nextTeamId, nextProjectId);
			}
		},
		[teamClient],
	);
	const loadTeams = useCallback(async () => {
		if (!teamClient) return;
		setError(undefined);
		try {
			const loadedTeams = await teamClient.listTeams();
			setTeams(loadedTeams);
			const firstTeam = loadedTeams[0];
			setTeamId(firstTeam?.id);
			if (firstTeam) await loadProjects(firstTeam.id);
			else setProjects([]);
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Unable to load Teams.",
			);
		}
	}, [loadProjects, teamClient]);

	const refresh = useCallback(async () => {
		if (!client) return;
		setError(undefined);
		try {
			setWorkspace(await client.loadWorkspace());
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Unable to load Project.",
			);
		}
	}, [client]);

	useEffect(() => {
		void loadTeams();
	}, [loadTeams]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const tabs = useMemo(
		() => [
			{
				id: "noise" as const,
				label: "Noise",
				count: workspace?.noise.length ?? 0,
			},
			{
				id: "workshop" as const,
				label: "Workshop",
				count: workspace?.workshop.length ?? 0,
			},
			{
				id: "queue" as const,
				label: "Queue",
				count: workspace?.queue.length ?? 0,
			},
			{
				id: "outcomes" as const,
				label: "Outcomes",
				count: workspace?.workspace.outcomeCount ?? 0,
			},
		],
		[workspace],
	);

	const captureNoise = async () => {
		if (!client || !noiseText.trim()) return;
		setBusy(true);
		try {
			await client.captureNoise({
				content: noiseText.trim(),
				source: "fleeting_thought",
			});
			setNoiseText("");
			await refresh();
		} finally {
			setBusy(false);
		}
	};

	const graduate = async (initiativeId: string) => {
		if (!client) return;
		setBusy(true);
		try {
			await client.graduateInitiative(initiativeId);
			await refresh();
		} finally {
			setBusy(false);
		}
	};

	const startNext = async () => {
		if (!client) return;
		setBusy(true);
		try {
			await client.startNextInitiative();
			await refresh();
		} finally {
			setBusy(false);
		}
	};

	const selectTeam = async (nextTeamId: string) => {
		setTeamId(nextTeamId);
		setWorkspace(undefined);
		await loadProjects(nextTeamId);
		setTab("noise");
	};

	const createProject = async () => {
		if (!teamClient || !teamId || !newProjectName.trim()) return;
		setBusy(true);
		try {
			const project = await teamClient.createProject(
				teamId,
				newProjectName.trim(),
			);
			setProjects((current) => [...current, project]);
			setProjectId(project.id);
			await teamClient.setWorkspaceFocus(teamId, project.id);
			setNewProjectName("");
			setWorkspace(undefined);
			setError(undefined);
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Unable to create Project.",
			);
		} finally {
			setBusy(false);
		}
	};

	const selectProject = (nextProjectId: string) => {
		setProjectId(nextProjectId);
		if (teamClient && teamId) {
			void teamClient.setWorkspaceFocus(teamId, nextProjectId);
		}
		setTab("noise");
		setWorkspace(undefined);
	};

	if (!configured) {
		return (
			<main className="configuration-state">
				<h1>Connect a Project</h1>
				<p>
					Set VITE_GUILLOTEAM_USER_ID and VITE_GUILLOTEAM_USER_TOKEN to open
					your Team Projects.
				</p>
			</main>
		);
	}

	return (
		<main className="app-shell">
			<header className="app-header">
				<div>
					<div className="product-name">Guilloteam</div>
					<h1>Project workspace</h1>
				</div>
				<div className="header-actions">
					<form
						className="project-selector"
						onSubmit={(event) => {
							event.preventDefault();
							void createProject();
						}}
					>
						<label htmlFor="team-selector">Team</label>
						<select
							id="team-selector"
							onChange={(event) => void selectTeam(event.target.value)}
							value={teamId}
						>
							{teams.map((team) => (
								<option key={team.id} value={team.id}>
									{team.name}
								</option>
							))}
						</select>
						<label htmlFor="project-selector">Project</label>
						<select
							id="project-selector"
							onChange={(event) => selectProject(event.target.value)}
							value={projectId}
						>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
						<input
							aria-label="New Project name"
							onChange={(event) => setNewProjectName(event.target.value)}
							placeholder="New Project name"
							value={newProjectName}
						/>
						<button
							className="secondary-action"
							disabled={busy || !teamId || !newProjectName.trim()}
							type="submit"
						>
							Create
						</button>
					</form>
					<div className="agent-presence">
						Agent work appears in each surface
					</div>
				</div>
			</header>
			<nav aria-label="Project lifecycle" className="lifecycle-tabs">
				{tabs.map((item, index) => (
					<div className="tab-step" key={item.id}>
						<button
							aria-current={tab === item.id ? "page" : undefined}
							className={tab === item.id ? "tab active" : "tab"}
							onClick={() => setTab(item.id)}
							type="button"
						>
							{item.label} <span>{item.count}</span>
						</button>
						{index < tabs.length - 1 ? <i aria-hidden="true">→</i> : null}
					</div>
				))}
			</nav>
			{error ? <p className="error-message">{error}</p> : null}
			<section className="surface">
				{tab === "noise" ? (
					<>
						<div className="surface-header">
							<div>
								<h2>Noise</h2>
								<p>Raw material the agent can review and connect later.</p>
							</div>
						</div>
						<form
							className="capture-form"
							onSubmit={(event) => {
								event.preventDefault();
								void captureNoise();
							}}
						>
							<label htmlFor="noise">Capture a thought</label>
							<textarea
								id="noise"
								onChange={(event) => setNoiseText(event.target.value)}
								placeholder="What just occurred to you?"
								value={noiseText}
							/>
							<button
								className="primary-action"
								disabled={busy || !noiseText.trim()}
								type="submit"
							>
								Capture Noise
							</button>
						</form>
						<div className="item-list">
							{workspace?.noise.map((noise) => (
								<NoiseCard key={noise.id} noise={noise} />
							))}
						</div>
					</>
				) : null}
				{tab === "workshop" ? (
					<>
						<div className="surface-header">
							<div>
								<h2>Workshop</h2>
								<p>
									Signals the agent has shaped from supporting Noise. You decide
									when they enter the queue.
								</p>
							</div>
						</div>
						<div className="item-list">
							{workspace?.workshop.map((initiative) => (
								<InitiativeCard
									busy={busy}
									initiative={initiative}
									key={initiative.id}
									onGraduate={graduate}
								/>
							))}
						</div>
					</>
				) : null}
				{tab === "queue" ? (
					<>
						<div className="surface-header">
							<div>
								<h2>Queue</h2>
								<p>
									A shared vertical execution order. Starting work always uses
									position one.
								</p>
							</div>
							{workspace?.queue.length ? (
								<button
									className="primary-action"
									disabled={busy}
									onClick={() => void startNext()}
									type="button"
								>
									Start next
								</button>
							) : null}
						</div>
						<ol className="queue-list">
							{workspace?.queue.map((entry) => (
								<li key={entry.initiativeId}>
									<span className="queue-position">{entry.position}</span>
									<div>
										<strong>
											{entry.initiative?.statement ?? entry.initiativeId}
										</strong>
										<p>Queued {relativeTime(entry.queuedAt)}</p>
									</div>
								</li>
							))}
						</ol>
					</>
				) : null}
				{tab === "outcomes" ? (
					<div className="empty-state">
						<h2>Outcomes</h2>
						<p>
							{workspace?.workspace.outcomeCount
								? "Completed work will be listed here in the next slice."
								: "No completed Initiatives yet."}
						</p>
					</div>
				) : null}
			</section>
		</main>
	);
}
