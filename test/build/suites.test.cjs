// The suites are split so CI can run each on its own (npm run test:build, test:content, test:accessibility).
// A test file that isn't in a suite's directory would then pass locally under npm test and never run in CI.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scripts } = require('../../package.json');

const testDir = path.join(__dirname, '..');

/** Each suite's directory under test/, from the test:<suite> scripts in package.json */
const suiteDirs = Object.entries(scripts)
    .filter(([name]) => name.startsWith('test:'))
    .map(([name, command]) => {
        const dir = command.match(/"test\/([\w-]+)\/\*\.test\.cjs"/)?.[1];
        assert.ok(dir, `${name} should run "test/<suite>/*.test.cjs", not: ${command}`);
        return dir;
    });

/** Every test file under test/, relative to it */
const testFiles = fs
    .readdirSync(testDir, { recursive: true })
    .filter((file) => file.endsWith('.test.cjs'))
    .map((file) => file.split(path.sep).join('/'));

test('there are test suites to run', () => {
    assert.ok(suiteDirs.length > 0);
});

test('every test file is directly in a suite directory', () => {
    const outside = testFiles.filter((file) => !suiteDirs.includes(path.posix.dirname(file)));
    assert.deepEqual(outside, [], 'move these into a test/<suite>/ directory with a test:<suite> script');
});

test('every suite has tests', () => {
    for (const dir of suiteDirs) {
        assert.ok(testFiles.some((file) => path.posix.dirname(file) === dir), `test/${dir}/ has no tests`);
    }
});