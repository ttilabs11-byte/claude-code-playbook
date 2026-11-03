---
name: after-restart
description: After a PC restart, crash or Claude app freeze, find the cause and resume the sessions that were mid-task. Use when told "system restarted", "Claude crashed", "resume all sessions" or similar.
---

1. Find when and why (PowerShell):
   - Boot time: `(Get-CimInstance Win32_OperatingSystem).LastBootUpTime`.
   - System log around then: 1074 = planned restart or update, 6008/41 = unexpected power-off or crash,
     2004 = commit memory (RAM+pagefile) exhausted. Application log: 1000/1002 for claude.exe = crash or hang.
   - App froze without a reboot: compare session last-activity times. Check commit free (Win32_OperatingSystem
     FreeVirtualMemory) and the Process Lasso CSV log (`C:\ProgramData\ProcessLasso\logs\processlasso.log*`, Import-Csv)
     for what it acted on around then (e.g. a burst of msedge.exe from a headless-browser render).
2. List sessions (list_sessions). The ones to resume are those active in the few hours before the restart or freeze.
3. Message each: "The PC restarted at <time> (<cause>). Please read your session log and carry on from where you
   stopped. If your task was already finished, do nothing." Add a prevention note only if the cause was memory
   pressure (e.g. browser renders: at most 2 workers, one reused browser, one render at a time).
4. Report: cause (and how sure), which sessions were delivered or queued, which didn't pick it up (those can be
   opened and nudged by hand). Log it in the session log.
