import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const snapshotSchema = JSON.parse(readFileSync(resolve(base, 'schemas/design-snapshot.schema.json'), 'utf8'));
const comparisonSchema = JSON.parse(readFileSync(resolve(base, 'schemas/comparison.schema.json'), 'utf8'));
ajv.addSchema(snapshotSchema);
const validateSnapshotShape = ajv.getSchema(snapshotSchema.$id)!;
const validateComparisonShape = ajv.compile(comparisonSchema);
export const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
function requireCondition(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function unique(items: any[], label: string) {
  const ids = items.map(item => item.id);
  requireCondition(new Set(ids).size === ids.length, `${label}: duplicate IDs`);
}
function localFile(root: string, path: string) {
  requireCondition(!isAbsolute(path) && !path.includes('\\') && !path.includes(':') && !path.split('/').includes('..'), `Invalid relative path: ${path}`);
  const actualRoot = realpathSync(root);
  const actual = realpathSync(resolve(actualRoot, path));
  const rel = relative(actualRoot, actual);
  requireCondition(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) && statSync(actual).isFile(), `Path escapes root or is not a file: ${path}`);
  return readFileSync(actual);
}
function artifact(root: string, item: any) {
  const bytes = localFile(root, item.path);
  requireCondition(hash(bytes) === item.sha256, `Hash mismatch: ${item.path}`);
  if (item.media_type === 'image/png') requireCondition(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid PNG signature: ${item.path}`);
  if (item.media_type === 'image/jpeg') requireCondition(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, `Invalid JPEG signature: ${item.path}`);
}
export function validateSnapshot(root: string, path: string) {
  const snapshot = JSON.parse(localFile(root, path).toString('utf8'));
  requireCondition(validateSnapshotShape(snapshot), ajv.errorsText(validateSnapshotShape.errors));
  unique(snapshot.references, 'references'); unique(snapshot.resources, 'resources');
  if (snapshot.source.version === null) requireCondition(snapshot.limitations.length, 'Unknown source version requires limitations');
  const resources = new Map<string, any>(snapshot.resources.map((item: any) => [item.id, item]));
  for (const resource of snapshot.resources) {
    artifact(root, resource.artifact);
    if (resource.role === 'derived') {
      requireCondition(resource.parent_id && resource.transform, 'Derived resource requires parent and transform');
      const seen = new Set([resource.id]); let parent = resource.parent_id;
      while (parent) {
        requireCondition(resources.has(parent) && !seen.has(parent), 'Missing parent or derivation cycle');
        seen.add(parent); parent = resources.get(parent).parent_id;
      }
    } else requireCondition(resource.parent_id === null && resource.transform === null, 'Only derived resources have parent/transform');
  }
  for (const reference of snapshot.references) {
    const resource = resources.get(reference.resource_id);
    requireCondition(resource && resource.role === 'reference' && resource.artifact.media_type.startsWith('image/'), `Reference missing original image: ${reference.id}`);
  }
  return snapshot;
}
export function validateComparison(root: string, path: string) {
  const comparison = JSON.parse(localFile(root, path).toString('utf8'));
  requireCondition(validateComparisonShape(comparison), ajv.errorsText(validateComparisonShape.errors));
  requireCondition(hash(localFile(root, comparison.snapshot.path)) === comparison.snapshot.sha256, 'Snapshot hash mismatch');
  const snapshot = validateSnapshot(root, comparison.snapshot.path);
  const references = new Map<string, any>(snapshot.references.map((item: any) => [item.id, item]));
  unique(comparison.pairs, 'pairs');
  unique(comparison.pairs.flatMap((pair: any) => pair.findings), 'findings');
  for (const pair of comparison.pairs) {
    const reference = references.get(pair.reference_id);
    requireCondition(reference, `Unknown reference: ${pair.reference_id}`);
    requireCondition(pair.ui.artifact.media_type.startsWith('image/'), 'UI evidence must be an image');
    artifact(root, pair.ui.artifact);
    if (pair.status === 'matched') requireCondition(pair.findings.length === 0, 'Matched pair cannot have unresolved findings');
    if (pair.status === 'mismatch') requireCondition(pair.findings.some((finding: any) => finding.verdict === 'mismatch'), 'Mismatch pair requires mismatch finding');
    if (pair.status === 'inconclusive' || pair.status === 'not-reviewed') requireCondition(pair.limitations.length, 'Incomplete pair requires limitations');
    const comparable = ['theme','locale','state'].every(key => reference[key] === pair.ui[key]) && reference.viewport.width === pair.ui.viewport.width && reference.viewport.height === pair.ui.viewport.height;
    if (!comparable) requireCondition(['inconclusive','not-reviewed'].includes(pair.status), 'Different conditions cannot yield a conclusive pair');
  }
  return comparison;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length === 4 && args[0] === '--root' && ['--snapshot','--comparison'].includes(args[2]), 'Usage: validate.ts --root <directory> --snapshot|--comparison <relative.json>');
    const data = args[2] === '--snapshot' ? validateSnapshot(args[1], args[3]) : validateComparison(args[1], args[3]);
    console.log(JSON.stringify({ valid: true, id: data.snapshot_id ?? data.comparison_id, scope: 'schema, files, hashes, references; not visual correctness' }));
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
