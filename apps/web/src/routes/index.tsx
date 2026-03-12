import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Terminal } from "@/components/Terminal";
import { Meteors } from "@/components/ui/meteors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({ component: HomePage });

const TERMINAL_LINES = [
	{
		type: "command" as const,
		text: 'guillo tasks create "Ship the landing page"',
	},
	{ type: "success" as const, text: "  ✓  created task_x7k2p" },
	{ type: "empty" as const, text: "" },
	{ type: "command" as const, text: "guillo tasks list" },
	{
		type: "output" as const,
		text: "  task_x7k2p   open   Ship the landing page",
	},
	{ type: "empty" as const, text: "" },
	{ type: "command" as const, text: "guillo execute task_x7k2p" },
	{ type: "success" as const, text: "  ✓  the blade has fallen." },
];

const PACKAGE_MANAGERS = [
	{ id: "npm", cmd: "npm install -g guillo" },
	{ id: "pnpm", cmd: "pnpm add -g guillo" },
	{ id: "bun", cmd: "bun add -g guillo" },
] as const;

type PackageManagerId = (typeof PACKAGE_MANAGERS)[number]["id"];

function InstallPicker() {
	const [copied, setCopied] = useState<PackageManagerId | null>(null);

	const handleCopy = (id: PackageManagerId, cmd: string) => {
		navigator.clipboard.writeText(cmd);
		setCopied(id);
		setTimeout(() => setCopied(null), 2000);
	};

	return (
		<div className="flex flex-col items-center gap-3">
			<p className="text-white/30 text-xs uppercase tracking-widest">install</p>
			<Tabs defaultValue="npm" className="w-72">
				<TabsList className="bg-white/4 border border-white/8 mb-0 rounded-t-lg rounded-b-none border-b-0 h-auto p-1 gap-0.5 w-full">
					{PACKAGE_MANAGERS.map(({ id }) => (
						<TabsTrigger
							key={id}
							value={id}
							className="text-white/40 data-[state=active]:text-white data-[state=active]:bg-white/8 text-xs font-mono px-3 py-1.5 rounded-md"
						>
							{id}
						</TabsTrigger>
					))}
				</TabsList>
				{PACKAGE_MANAGERS.map(({ id, cmd }) => (
					<TabsContent key={id} value={id} className="mt-0">
						<button
							type="button"
							onClick={() => handleCopy(id, cmd)}
							className="group flex items-center gap-3 bg-white/4 hover:bg-white/7 border border-white/8 hover:border-white/14 rounded-b-lg rounded-t-none px-5 py-3 font-mono text-sm text-white/70 hover:text-white transition-all cursor-pointer z-10 w-full"
						>
							<span className="flex-1">{cmd}</span>
							<span className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
								{copied === id ? <Check size={14} /> : <Copy size={14} />}
							</span>
						</button>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}

function HomePage() {
	return (
		<div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">
			{/* Meteor background */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
				<Meteors number={24} minDuration={4} maxDuration={30} />
			</div>

			{/* Nav */}
			<nav className="flex items-center justify-between px-8 py-5 border-b border-white/6">
				<span />
				<div className="flex items-center gap-6 text-sm text-white/50">
					<a
						href="https://docs.guillo.team"
						className="hover:text-white transition-colors"
					>
						docs
					</a>
					<a
						href="https://github.com/kwybro/guilloteam/"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-white transition-colors"
					>
						github
					</a>
				</div>
			</nav>

			{/* Hero */}
			<main className="flex-1 flex flex-col items-center justify-center px-6 py-24 gap-10 z-10">
				{/* Tagline */}
				<div className="text-center space-y-3 max-w-lg">
					<h1 className="text-3xl font-semibold tracking-tight text-white">
						guillo<span className="text-red-500">.</span>team
					</h1>
					<p className="text-white/50 text-base leading-relaxed">
						headless task management.
					</p>
				</div>

				{/* Terminal demo */}
				<div className="w-full max-w-xl">
					<Terminal lines={TERMINAL_LINES} />
				</div>

				{/* Slogan */}
				<p className="text-white/30 text-sm italic text-center max-w-sm leading-relaxed">
					It's not about what you execute, but who you do it with.
				</p>

				<InstallPicker />
			</main>

			{/* Footer */}
			<footer className="flex items-center justify-center px-8 py-5 border-t border-white/6 text-white/25 text-xs gap-6 font-mono">
				<span>© {new Date().getFullYear()} guilloteam</span>
				<a
					href="https://docs.guillo.team"
					className="hover:text-white/50 transition-colors"
				>
					docs
				</a>
				<a
					href="https://github.com/kwybro/guilloteam/"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-white/50 transition-colors"
				>
					github
				</a>
			</footer>
		</div>
	);
}
