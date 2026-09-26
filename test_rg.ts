import { IpythonKernelProvisioner } from './packages/coding-agent/src/core/tools/ipython.js';

async function run() {
  const p = new IpythonKernelProvisioner(process.cwd());
  const m = await p.ensure(console.log, undefined);
  const r = await m.execute("import os; print(os.environ.get('PATH'))", {});
  console.log(r);
  await p.kill();
}

run();
