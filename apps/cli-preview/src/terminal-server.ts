/**
 * Terminal server that runs inside the Fly.io container.
 * Serves an xterm.js frontend and bridges WebSocket connections to a PTY.
 *
 * Uses @lydell/node-pty for PTY spawning and Bun's native WebSocket support.
 */
import * as pty from "@lydell/node-pty";

// Ignore SIGHUP at the parent level — container runtimes (Fly, Cloudflare)
// send SIGHUP to the process group, which kills PTY children.
process.on("SIGHUP", () => {});

const PORT = Number(process.env.PORT) || 8080;
const SHELL = process.env.SHELL || "/bin/bash";

// Inline the HTML page — avoids needing to serve static files
function getTerminalHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>guillo preview</title>
<link rel="stylesheet" href="https://esm.sh/@xterm/xterm@5.5.0/css/xterm.css" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 16px;
  }
  .window {
    width: 100%;
    max-width: 960px;
    background: #1e1e1e;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #2d2d2d;
    user-select: none;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }
  .title {
    flex: 1;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
    font-weight: 500;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    transition: background 0.3s;
  }
  .status-dot.connected { background: #22c55e; }
  #terminal-container {
    height: 70vh;
    height: 70dvh;
    min-height: 400px;
  }
  @media (max-width: 768px) {
    body { padding: 8px; }
    .window { border-radius: 8px; }
    #terminal-container {
      height: 80vh;
      height: 80dvh;
      min-height: 300px;
    }
  }
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="dot dot-red"></div>
    <div class="dot dot-yellow"></div>
    <div class="dot dot-green"></div>
    <div class="title">guillo preview</div>
    <div class="status">
      <div class="status-dot" id="status-dot"></div>
      <span id="status-text">connecting</span>
    </div>
  </div>
  <div id="terminal-container"></div>
</div>

<script type="module">
  import { Terminal } from "https://esm.sh/@xterm/xterm@5.5.0";
  import { FitAddon } from "https://esm.sh/@xterm/addon-fit@0.10.0";
  import { WebLinksAddon } from "https://esm.sh/@xterm/addon-web-links@0.11.0";

  const container = document.getElementById("terminal-container");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  function connect() {
    const term = new Terminal({
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "Monaco, Menlo, 'Courier New', monospace",
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(container);
    fitAddon.fit();

    const { cols, rows } = term;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(proto + "//" + location.host + "/ws?cols=" + cols + "&rows=" + rows);

    ws.addEventListener("open", () => {
      statusDot.classList.add("connected");
      statusText.textContent = "connected";
    });

    ws.addEventListener("message", (e) => {
      term.write(typeof e.data === "string" ? e.data : new Uint8Array(e.data));
    });

    ws.addEventListener("close", () => {
      ro.disconnect();
      statusDot.classList.remove("connected");
      statusText.textContent = "disconnected";
      term.write("\\r\\n\\x1b[90m[session ended — refreshing in 3s]\\x1b[0m\\r\\n");
      setTimeout(() => {
        term.dispose();
        container.innerHTML = "";
        connect();
      }, 3000);
    });

    term.onData((data) => ws.readyState === WebSocket.OPEN && ws.send(data));

    const ro = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    ro.observe(container);
  }

  connect();
</script>
</body>
</html>`;
}

// Track active PTY sessions for cleanup
const sessions = new Map<string, pty.IPty>();

const server = Bun.serve({
	port: PORT,
	fetch(req, server) {
		const url = new URL(req.url);

		// Health check
		if (url.pathname === "/health") {
			return new Response("ok");
		}

		// WebSocket upgrade
		if (url.pathname === "/ws") {
			const cols = Number(url.searchParams.get("cols")) || 80;
			const rows = Number(url.searchParams.get("rows")) || 24;
			const upgraded = server.upgrade(req, { data: { cols, rows } });
			if (!upgraded) {
				return new Response("WebSocket upgrade failed", { status: 400 });
			}
			return undefined;
		}

		// Serve terminal page
		return new Response(getTerminalHtml(), {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	},
	websocket: {
		open(ws) {
			const { cols, rows } = ws.data as { cols: number; rows: number };
			console.log(`[ws] new connection cols=${cols} rows=${rows}`);

			let ptyProcess: pty.IPty;
			try {
				// Spawn bash with SIGHUP ignored BEFORE the login shell starts.
				// trap "" HUP sets SIG_IGN, which is preserved across exec,
				// so the login shell and its children are immune to SIGHUP.
				ptyProcess = pty.spawn(SHELL, ["-c", 'trap "" HUP; exec bash --login'], {
					name: "xterm-256color",
					cols,
					rows,
					cwd: process.env.HOME || "/",
					env: {
						...process.env,
						TERM: "xterm-256color",
						COLORTERM: "truecolor",
					} as Record<string, string>,
				});
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				console.error(`[ws] PTY spawn failed: ${msg}`);
				ws.send(`\r\n\x1b[31mPTY spawn failed: ${msg}\x1b[0m\r\n`);
				ws.close();
				return;
			}

			const id = String(ptyProcess.pid);
			sessions.set(id, ptyProcess);
			(ws.data as Record<string, unknown>).ptyId = id;
			console.log(`[ws] PTY spawned pid=${id}`);

			ptyProcess.onData((data: string) => {
				try {
					ws.send(data);
				} catch {
					// ws may have closed
				}
			});

			ptyProcess.onExit(({ exitCode, signal }) => {
				console.log(
					`[ws] PTY exited pid=${id} code=${exitCode} signal=${signal}`,
				);
				sessions.delete(id);
				try {
					ws.close();
				} catch {
					// already closed
				}
			});
		},
		message(ws, message) {
			const id = (ws.data as Record<string, unknown>).ptyId as string;
			const ptyProcess = sessions.get(id);
			if (!ptyProcess) return;

			if (typeof message === "string") {
				// Check for resize messages
				try {
					const parsed = JSON.parse(message);
					if (parsed.type === "resize") {
						ptyProcess.resize(parsed.cols, parsed.rows);
						return;
					}
				} catch {
					// Not JSON — treat as terminal input
				}
				ptyProcess.write(message);
			} else {
				ptyProcess.write(Buffer.from(message).toString());
			}
		},
		close(ws) {
			const id = (ws.data as Record<string, unknown>).ptyId as string;
			const ptyProcess = sessions.get(id);
			if (ptyProcess) {
				console.log(`[ws] client disconnected, killing PTY pid=${id}`);
				ptyProcess.kill();
				sessions.delete(id);
			}
		},
	},
});

console.log(`Terminal server listening on port ${PORT}`);
