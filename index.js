import path from 'path';
import fs from 'fs-extra';
import process from 'process';
import { execa } from 'execa';
const cwd = process.cwd();
const packagePath = path.resolve(cwd, 'package.json');
async function hasYarn(siteDir) {
    return fs.pathExists(path.resolve(siteDir, 'yarn.lock'));
}
async function hasPnpm(siteDir) {
    return fs.pathExists(path.resolve(siteDir, 'pnpm-lock.yaml'));
}
async function CommandRunner(siteDir) {
    if (await hasYarn(siteDir)) {
        return 'yarn upgrade';
    }
    else if (await hasPnpm(siteDir)) {
        return 'pnpm upgrade';
    }
    else {
        return 'npm install';
    }
}
async function fetchPackageJson() {
    const { stdout } = await execa('npm', ['view', 'tea-bool', '--json']);
    const data = JSON.parse(stdout);
    console.log('execaData:', data.versions, data['dist-tags']);
}
async function getPackageList() {
    const data = await fs.readJSON(packagePath);
    // TODO support devDeps
    // TODO devDeps or deps can be null
    return Array.from(new Set([...Object.keys(data.dependencies)].filter((pkg) => pkg.startsWith('@docusaurus'))));
}
export async function upgrade(siteDir, { userRequestTag }) {
    if (!fs.existsSync(packagePath)) {
        throw new Error('Current directory is not a npm package');
    }
    const commandClient = await CommandRunner(siteDir);
    // console.log(`Using command=${commandClient}`)
    await fetchPackageJson();
    const packageNames = await getPackageList();
    console.log('packageNames:', packageNames);
    const packageNamesWithTag = packageNames.map((name) => [name, userRequestTag]);
    console.log('packageNamesWithTag:', packageNamesWithTag);
    // if (!packageNames.length) {
    //   throw new Error(`Found 0 packages with scope @docusaurus`)
    // }
    // console.info`Found number=${packageNames.length} to update: name=${packageNames}`
    // console.info`Executing code=${`${commandClient} ${packageNames.join(' ')}`}`
    // execa(commandClient, packageNamesWithTag)
}
upgrade(cwd, { userRequestTag: 'latest' });
