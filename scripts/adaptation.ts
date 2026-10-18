import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv);
const schema = JSON.parse(readFileSync(new URL('../schemas/adaptation.schema.json', import.meta.url), 'utf8'));
ajv.addSchema(schema);
const validate = ajv.getSchema(schema.$id)!;
const validatePatch = ajv.compile(JSON.parse(readFileSync(new URL('../schemas/project-patch.schema.json', import.meta.url), 'utf8')));

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['--no-optional-locks', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function within(root: string, path: string) { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); }
export function validateAdaptation(directory: string, base: string, target: string, repositoryId: string, targetId: string, now = new Date()) {
  [directory, base, target] = [directory, base, target].map(p => realpathSync(p));
  check(realpathSync(git(base, 'rev-parse', '--show-toplevel')) === base, 'Base must be its Git root');
  const workdir = realpathSync(resolve(base, 'workdir'));
  check(within(base, workdir) && within(workdir, directory), 'Adaptation must be inside base workdir');
  check(!within(target, directory), 'Adaptation cannot be inside product target');
  check(statSync(target).isDirectory(), 'Target must be a directory');
  const worktree = realpathSync(git(target, 'rev-parse', '--show-toplevel'));
  check(!within(worktree, base), 'Base must be outside product worktree');
  const file = realpathSync(resolve(directory, 'manifest.json'));
  check(within(directory, file), 'Manifest escapes adaptation directory');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  check(validate(data), `Adaptation schema: ${JSON.stringify(validate.errors)}`);
  check(data.base_revision === git(base, 'rev-parse', 'HEAD'), 'Base revision mismatch');
  check(git(base, 'status', '--porcelain') === '', 'Base has local changes');
  check(data.repository_id === repositoryId && data.target_id === targetId, 'Selected repository/target identity mismatch');
  check(new Set(data.sources.map((s: any) => s.id)).size === data.sources.length, 'Duplicate source IDs');
  const paths: string[] = [];
  function resourceFile(item: {path: string; sha256: string}) {
    const resource = realpathSync(resolve(directory, item.path));
    check(within(directory, resource) && statSync(resource).isFile(), 'Source resource escapes adaptation or is not a file');
    check(createHash('sha256').update(readFileSync(resource)).digest('hex') === item.sha256, 'Source resource hash mismatch');
    return resource;
  }
  for (const source of data.sources) {
    check(data.modules.includes(source.module), 'Source uses an unselected module');
    const resource = resourceFile(source.resource);
    check(!paths.includes(resource), 'Duplicate physical source resource'); paths.push(resource);
  }
  const patches = data.patches.map((path: string) => {
    const actual = realpathSync(resolve(directory, path));
    check(within(directory, actual), 'Patch escapes adaptation');
    const patch = JSON.parse(readFileSync(actual, 'utf8'));
    check(validatePatch(patch), `Patch schema: ${JSON.stringify(validatePatch.errors)}`);
    check(patch.base_revision === data.base_revision, 'Patch base revision mismatch');
    check(patch.scope.every((id: string) => data.sources.some((source: any) => source.id === id)), 'Patch scope has unknown source');
    resourceFile(patch.resource);
    if (patch.status === 'active') {
      check(patch.review !== null, 'Active patch requires review');
      const start = Date.parse(patch.review.reviewed_at), end = Date.parse(patch.review.review_due_at);
      check(start <= now.getTime() && start < end && now.getTime() < end, 'Patch review is future, expired or invalid');
    }
    return patch;
  });
  check(new Set(patches.map((p: any) => p.id)).size === patches.length, 'Duplicate patch IDs');
  for (const patch of patches) for (const conflict of patch.conflicts_with) {
    const other = patches.find((p: any) => p.id === conflict);
    check(other && other !== patch, 'Unknown or self patch conflict');
    check(!(patch.status === 'active' && other.status === 'active' && patch.scope.some((id: string) => other.scope.includes(id))), 'Active patches conflict in overlapping scope');
  }

  return { valid: true, repository_id: repositoryId, target_id: targetId, target_root: target, base_revision: data.base_revision, modules: data.modules, sources: data.sources, active_patches: patches.filter((p: any) => p.status === 'active'), proposed_patches: patches.filter((p: any) => p.status === 'proposed'), limitations: ['Source scope and semantic conflicts in patch text require human/agent review; provider access, native context isolation and permission to modify designs are not established by this check.'] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    check(args.length === 5, 'Usage: <adaptation-directory> <base-checkout> <selected-target> <repository-id> <target-id>');
    console.log(JSON.stringify(validateAdaptation(args[0], args[1], args[2], args[3], args[4]), null, 2));
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
