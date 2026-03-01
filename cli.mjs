#!/usr/bin/env node
/**
 * cc-subagent — How many subagents does your Claude Code spawn?
 * Analyzes subagent usage: sessions, count, size, and per-project breakdown.
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`cc-subagent — Subagent usage in your Claude Code sessions

Usage:
  npx cc-subagent          # Subagent count, size, and project breakdown
  npx cc-subagent --json   # JSON output
`);
  process.exit(0);
}

const claudeDir = join(homedir(), '.claude', 'projects');

function humanSize(bytes) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  if (bytes >= 1024)      return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function projectName(dirName) {
  const stripped = dirName.replace(/^-home-[^-]+/, '').replace(/^-/, '');
  return stripped || '~/ (home)';
}

let projectDirs;
try {
  projectDirs = readdirSync(claudeDir);
} catch {
  console.error(`Cannot read ${claudeDir}`);
  process.exit(1);
}

// Totals
let totalMainSessions = 0;
let sessionsWithSubagents = 0;
let totalSubagentSessions = 0;
let totalSubagentBytes = 0;
let maxSubagentsInSession = 0;
let maxSubagentsSession = '';

const byProject = {};   // { projDir: { subagentSessions, parentSessions, bytes, name } }
const distribution = { 1: 0, '2-5': 0, '6-10': 0, '11-30': 0, '31-100': 0, '100+': 0 };

for (const projDir of projectDirs) {
  const projPath = join(claudeDir, projDir);
  let pstat;
  try {
    pstat = statSync(projPath);
    if (!pstat.isDirectory()) continue;
  } catch { continue; }

  const projLabel = projectName(projDir);
  if (!byProject[projDir]) byProject[projDir] = { subagentSessions: 0, parentSessions: 0, bytes: 0, name: projLabel };

  // Each entry in projPath could be a session file OR a session dir (when it has subagents)
  let entries;
  try { entries = readdirSync(projPath); } catch { continue; }

  // Count main sessions (*.jsonl files directly in projPath)
  const mainSessions = entries.filter(e => e.endsWith('.jsonl'));
  totalMainSessions += mainSessions.length;
  byProject[projDir].parentSessions += mainSessions.length;

  // Check subdirectories for session dirs with subagents
  for (const entry of entries) {
    if (entry.endsWith('.jsonl')) continue;  // skip session files
    const sessionDir = join(projPath, entry);
    let sdstat;
    try {
      sdstat = statSync(sessionDir);
      if (!sdstat.isDirectory()) continue;
    } catch { continue; }

    const subagentsDir = join(sessionDir, 'subagents');
    let subEntries;
    try {
      subEntries = readdirSync(subagentsDir);
    } catch { continue; }

    const subFiles = subEntries.filter(e => e.endsWith('.jsonl'));
    if (!subFiles.length) continue;

    // This session has subagents
    sessionsWithSubagents++;
    const sessionSubCount = subFiles.length;
    totalSubagentSessions += sessionSubCount;

    // Distribution bucket
    if (sessionSubCount === 1)       distribution[1]++;
    else if (sessionSubCount <= 5)   distribution['2-5']++;
    else if (sessionSubCount <= 10)  distribution['6-10']++;
    else if (sessionSubCount <= 30)  distribution['11-30']++;
    else if (sessionSubCount <= 100) distribution['31-100']++;
    else                              distribution['100+']++;

    // Max
    if (sessionSubCount > maxSubagentsInSession) {
      maxSubagentsInSession = sessionSubCount;
      maxSubagentsSession = `${projLabel}/${entry.slice(0, 8)}...`;
    }

    // Size of subagent files
    let sessionSubBytes = 0;
    for (const sf of subFiles) {
      try {
        sessionSubBytes += statSync(join(subagentsDir, sf)).size;
      } catch {}
    }
    totalSubagentBytes += sessionSubBytes;
    byProject[projDir].subagentSessions += sessionSubCount;
    byProject[projDir].bytes += sessionSubBytes;
  }
}

if (totalMainSessions === 0) {
  console.error('No session files found.');
  process.exit(1);
}

const adoptionRate = (sessionsWithSubagents / totalMainSessions * 100).toFixed(1);
const avgPerSpawner = sessionsWithSubagents > 0 ? (totalSubagentSessions / sessionsWithSubagents).toFixed(1) : '0';
const avgPerAll = (totalSubagentSessions / totalMainSessions).toFixed(1);

const sortedProjects = Object.entries(byProject)
  .filter(([, d]) => d.subagentSessions > 0)
  .sort((a, b) => b[1].subagentSessions - a[1].subagentSessions);

if (jsonMode) {
  console.log(JSON.stringify({
    main_sessions: totalMainSessions,
    sessions_with_subagents: sessionsWithSubagents,
    adoption_rate_pct: parseFloat(adoptionRate),
    total_subagent_sessions: totalSubagentSessions,
    avg_per_spawning_session: parseFloat(avgPerSpawner),
    avg_per_all_sessions: parseFloat(avgPerAll),
    total_subagent_size: humanSize(totalSubagentBytes),
    max_in_single_session: maxSubagentsInSession,
    distribution,
    by_project: sortedProjects.slice(0, 10).map(([, d]) => ({
      project: d.name,
      subagent_sessions: d.subagentSessions,
      size: humanSize(d.bytes),
    })),
  }, null, 2));
  process.exit(0);
}

// Terminal display
const BAR_WIDTH = 24;

function countBar(n, max) {
  const filled = max > 0 ? Math.round((n / max) * BAR_WIDTH) : 0;
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function rpad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

console.log('cc-subagent — Claude Code subagent usage\n');

console.log(`  Main sessions:        ${totalMainSessions.toLocaleString()}`);
console.log(`  Sessions w/ subagents:${sessionsWithSubagents.toLocaleString().padStart(5)} (${adoptionRate}% of sessions)`);
console.log(`  Total subagent sessions: ${totalSubagentSessions.toLocaleString()}`);
console.log(`  Avg per spawning session: ${avgPerSpawner}`);
console.log(`  Avg per all sessions:    ${avgPerAll}`);
console.log(`  Total subagent data:     ${humanSize(totalSubagentBytes)}`);
console.log(`  Peak in one session:     ${maxSubagentsInSession} subagents`);

// Distribution
console.log('\n' + '─'.repeat(56));
console.log('  Subagents per session (spawning sessions only)\n');
const maxDist = Math.max(...Object.values(distribution));
for (const [label, count] of Object.entries(distribution)) {
  const pct = sessionsWithSubagents > 0 ? (count / sessionsWithSubagents * 100).toFixed(1) : '0.0';
  console.log(`  ${label.padEnd(8)}  ${countBar(count, maxDist)}  ${String(count).padStart(4)}  (${pct}%)`);
}

// Project breakdown
if (sortedProjects.length) {
  console.log('\n' + '─'.repeat(56));
  console.log('  By project (top 8)\n');
  const maxProj = sortedProjects[0][1].subagentSessions;
  const maxLabel = Math.max(...sortedProjects.slice(0, 8).map(([, d]) => d.name.length));
  for (const [, data] of sortedProjects.slice(0, 8)) {
    const label = rpad(data.name, maxLabel);
    console.log(`  ${label}  ${countBar(data.subagentSessions, maxProj)}  ${String(data.subagentSessions).padStart(4)}  ${humanSize(data.bytes)}`);
  }
}
