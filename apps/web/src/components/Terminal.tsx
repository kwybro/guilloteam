import { useEffect, useState } from "react";

type LineType = "command" | "output" | "success" | "empty";

interface Line {
	type: LineType;
	text: string;
}

interface TerminalProps {
	lines: Line[];
	loopDelay?: number;
}

const LINE_DELAYS: Record<LineType, number> = {
	command: 1600,
	output: 450,
	success: 550,
	empty: 400,
};

export function Terminal({ lines, loopDelay = 3500 }: TerminalProps) {
	const [visibleCount, setVisibleCount] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const timeouts: ReturnType<typeof setTimeout>[] = [];

		const run = () => {
			if (cancelled) return;
			setVisibleCount(0);

			let delay = 0;
			lines.forEach((line, i) => {
				delay += LINE_DELAYS[line.type];
				const t = setTimeout(() => {
					if (!cancelled) setVisibleCount(i + 1);
				}, delay);
				timeouts.push(t);
			});

			const loopT = setTimeout(() => {
				if (!cancelled) run();
			}, delay + loopDelay);
			timeouts.push(loopT);
		};

		run();

		return () => {
			cancelled = true;
			timeouts.forEach(clearTimeout);
		};
	}, [lines, loopDelay]);

	return (
		<div className="w-full rounded-xl border border-white/8 bg-[#0c0c0c] overflow-hidden font-mono text-sm shadow-2xl shadow-black/60">
			{/* Window chrome */}
			<div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-[#111]">
				<span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
				<span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
				<span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
				<span className="ml-auto text-white/25 text-xs tracking-wide">
					guillo
				</span>
			</div>

			{/* Lines — fixed height so hero above never shifts */}
			<div className="p-5 space-y-0.5 h-[220px] overflow-hidden">
				{lines.slice(0, visibleCount).map((line, i) => {
					if (line.type === "empty") {
						return <div key={`${i}-${line.type}`} className="h-3" />;
					}

					if (line.type === "command") {
						return (
							<div
								key={`${i}-${line.type}`}
								className="flex items-center gap-2"
							>
								<span className="text-red-500 select-none shrink-0">$</span>
								<span className="text-white/90">{line.text}</span>
							</div>
						);
					}

					if (line.type === "success") {
						return (
							<div key={`${i}-${line.type}`} className="text-red-400/90 pl-5">
								{line.text}
							</div>
						);
					}

					return (
						<div key={`${i}-${line.type}`} className="text-white/40 pl-5">
							{line.text}
						</div>
					);
				})}

				{/* Blinking cursor */}
				<div className="flex items-center gap-2 pt-0.5">
					<span className="text-red-500 select-none shrink-0">$</span>
					<span className="inline-block w-2 h-4 bg-red-500/70 cursor-blink" />
				</div>
			</div>
		</div>
	);
}
