// Builds public/models/blackhole-lite.glb for phones: same look, a fraction of the
// triangles. Point-cloud parts are kept; only triangle meshes are simplified.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplifyPrimitive, weld, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read('public/models/blackhole.glb');
await doc.transform(weld());
let before = 0;
let after = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 4) continue; // keep points and lines as they are
    const count = (p) => (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
    before += count(prim);
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0.12, error: 0.01 });
    after += count(prim);
  }
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write('public/models/blackhole-lite.glb', doc);
console.log(`triangles ${Math.round(before)} -> ${Math.round(after)}`);
