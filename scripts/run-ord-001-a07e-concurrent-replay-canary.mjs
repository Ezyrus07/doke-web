import { runConcurrentReplayCanary } from './lib/ord-a07e-concurrent-replay-canary.mjs';

const args = new Set(process.argv.slice(2));
const forbidden = ['--staging', '--remote', '--production', '--execute', '--deploy'];
const forbiddenArgument = forbidden.find((argument) => args.has(argument));

if (forbiddenArgument) {
  console.error(`ORD-A07E is local-only; ${forbiddenArgument} is not supported.`);
  process.exitCode = 2;
} else {
  const concurrencyArgument = process.argv.find((argument) => argument.startsWith('--concurrency='));
  const concurrency = concurrencyArgument ? Number(concurrencyArgument.split('=')[1]) : 32;
  const result = await runConcurrentReplayCanary({ concurrency });
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
