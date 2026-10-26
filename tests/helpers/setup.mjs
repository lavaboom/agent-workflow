// Shared test helpers: temp folders, the fixture template, and running the CLI in-process or as a process.
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../../src/cli.mjs';

export const REPO_DIR = fileURLToPath(new URL('../../', import.meta.url));
export const FIXTURES_DIR = path.join(REPO_DIR, 'tests', 'fixtures');
export const FIXTURE_TEMPLATE = path.join(FIXTURES_DIR, 'template');
export const BIN = path.join(REPO_DIR, 'bin', 'agent-workflow.mjs');
export const HOOK = path.join(REPO_DIR, 'template', '.claude', 'hooks', 'usage-log.mjs');
export const FIXED_NOW = new Date('2026-10-26T12:00:00Z');

const created = [];

export async function makeTempDir(prefix = 'aw-') {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  created.push(dir);
  return dir;
}

export async function removeTempDirs() {
  while (created.length > 0) await rm(created.pop(), { recursive: true, force: true });
}

// A writable copy of the fixture template.
export async function copyFixtureTemplate() {
  const dir = path.join(await makeTempDir('aw-tpl-'), 'template');
  await cp(FIXTURE_TEMPLATE, dir, { recursive: true });
  return dir;
}

// An empty project folder with its own .git so its name never depends on the temp folder's parents.
export async function makeProject(name = 'demo-project') {
  const dir = path.join(await makeTempDir('aw-proj-'), name);
  await mkdir(path.join(dir, '.git'), { recursive: true });
  return dir;
}

function collector() {
  let text = '';
  return { write: (chunk) => { text += chunk; return true; }, text: () => text };
}

// Runs the CLI in-process. Returns { code, stdout, stderr }.
export async function runCli(argv, { cwd = REPO_DIR, env = {}, now = FIXED_NOW, homeDir } = {}) {
  const stdout = collector();
  const stderr = collector();
  const code = await main(argv, { stdout, stderr, cwd, env, homeDir: homeDir ?? os.tmpdir(), now: () => now });
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

// Runs a script with node as a child process (no shell). Returns { code, stdout, stderr }.
export function runNode(script, args, { input = '', env = {}, cwd = REPO_DIR } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, env: { ...process.env, ...env }, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

export async function readText(...segments) {
  return readFile(path.join(...segments), 'utf8');
}

export async function writeText(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, 'utf8');
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export function nativeIn(root, posixPath) {
  return path.join(root, ...posixPath.split('/'));
}

export async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
