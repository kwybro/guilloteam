Slogans:
It's not about what you execute, but who you do it with.
Agent-first, but so fun you'll want to use it yourself.

### Overview
A headless task management system. Today's task management tools feel bloated, slow and increasingly irrelevant to the style of work that is emerging. On top of that, they trap your data in their system. Software engineers, project managers, UI/UX designers and more are increasingly using agents like Claude Code, ChatGPT, and the like to help them with their work. But we're still reaching for tools like Jira to organize our work. For developers, we have GitHub/GitLab Issues, and I think there is value in co-locating the tickets with the code, but this doesn't serve non-developers - and software teams are made up of both developers and non-developers. Plus, when we create projects and tasks in a current task management tool, we can't gain deep insight into the tasks quickly.    
 
guilloteam is an open-source, lightweight system that turns work into data. Once in data, work can be served to the right people, visualized     infinite ways, and allow contributions by any number of people. I envision a world where a solo contributor can be part of many teams, quickly   
switching their team and beginning work on an ongoing project - no slow SSO/project switching/permission hell. Similarly a developer at a big    
company can read & write tasks to their single project alongside their coworkers, while their CEO can make natural language queries against any  
project at the company. Agents are already great at creating task lists and then executing them locally - but what if we connected everyone's    
agent with a shared tasklist: what emergent behavior would we see? How coordinated would we feel? guilloteam is a tool that is flexible enough  
to allow a variety of user types to manage tasks in it. The tool at its simplest is an API and a database. Our second interface is a CLI. Humans and agents (on behalf of humans) can create and manage projects/tasks with ease through the command line and through natural language. Developers can spin up a couple of quick tasks, a designer can track long-running tasks, and a project manager can pull reports of any shape whenever they want during the sprint. It's called guilloteam because it's headless - the user decides how they want to visualize the work - because it's just data. It's not about what you execute, but who you do it with.

---

## What guilloteam is

Work has a shape: a vision on the left, a pile of done tasks on the right, and everything in between. Most tools only care about the middle — the ticket board, the sprint, the status column. guilloteam cares about the whole thing.

At its core, guilloteam turns work into data. Teams, projects, tasks — all of it lives in a clean API backed by a database. No vendor lock-in, no opinionated UI, no permission hell. You own the data. You decide how to visualize it.

The primary interface is a CLI. Humans use it. Agents (Claude Code, Cursor, anything MCP-enabled) use it too — and that's the point. As AI tools get better at executing work, the missing piece is a shared, structured record of *what* is being worked on and *why*. guilloteam is that record. Connect your agent to a shared task list and watch how coordinated a team becomes.

But guilloteam isn't just a headless Jira. It's designed to feel alive. Tasks carry context: the files that informed them, the conversations that shaped them, the decisions that constrained them. Team members have presence: you can see who is working on what, in which repo, on which branch — ambient and inferred, not manually declared. Sessions let teammates work together in the terminal in real time, with chat that becomes permanent context on the tasks you're discussing.

The left side of the timeline — the vision, the brief, the brainstorm — is first-class too. You can attach a project brief, capture raw ideas and promote them to tasks, or describe a feature in plain language and let an agent break it into a task list.

guilloteam is headless by design, so it breaks out of the terminal gracefully: a menubar app for ambient presence, an MCP server so any AI tool can read and write tasks, an IDE extension, a web dashboard for stakeholders. Every surface is just a lens on the same data.

It's called guilloteam because it's headless. The head is yours to build — or not build at all.