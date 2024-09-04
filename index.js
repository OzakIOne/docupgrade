import path from 'path';
import fs from 'fs-extra';
import process from 'process';
import { execa } from 'execa';
import semver from 'semver';
import _ from 'lodash';
const cwd = process.cwd();
const packagePath = path.resolve(cwd, 'package.json');
const packageName = '@docusaurus/core';
async function hasYarn(siteDir) {
    return fs.pathExists(path.resolve(siteDir, 'yarn.lock'));
}
async function hasPnpm(siteDir) {
    return fs.pathExists(path.resolve(siteDir, 'pnpm-lock.yaml'));
}
async function CommandRunner(siteDir) {
    if (await hasYarn(siteDir)) {
        return 'yarn install';
    }
    else if (await hasPnpm(siteDir)) {
        return 'pnpm install';
    }
    else {
        return 'npm install';
    }
}
async function getPackageInfo() {
    const { stdout } = await execa('npm', ['view', packageName, '--json']);
    const data = JSON.parse(stdout);
    return { versions: data.versions, tags: data['dist-tags'] };
}
async function getPackageList(name) {
    try {
        const data = await fs.readJSON(packagePath);
        const dependencies = data.dependencies || {};
        const devDependencies = data.devDependencies || {};
        // TODO use npm ls ?
        return Array.from(new Set([...Object.entries(dependencies), ...Object.entries(devDependencies)]))
            .filter(([pkg]) => pkg.startsWith(name))
            .map(([pkg, version]) => ({ name: pkg, version }));
    }
    catch (error) {
        throw new Error('Failed to read package.json:', { cause: error });
    }
}
function verifyRequestedTag(userRequestTag, tags) {
    if (!tags[userRequestTag]) {
        throw new Error(`Tag "${userRequestTag}" available for package "${packageName}"`);
    }
}
function verifyPackageName(packageNames) {
    if (!packageNames.length) {
        throw new Error(`Found 0 packages with scope @docusaurus`);
    }
}
export function suggestVersion(currentVersion, versions) {
    // Categorize versions
    const categorizeVersion = (version) => {
        if (version.startsWith('0.0.0-'))
            return 'canary';
        if (version.includes('alpha'))
            return 'alpha';
        if (version.includes('beta'))
            return 'beta';
        if (version.includes('rc'))
            return 'rc';
        return 'stable';
    };
    const currentCategory = categorizeVersion(currentVersion);
    const versionsByCategory = _.groupBy(versions, categorizeVersion);
    const sortedVersions = _.mapValues(versionsByCategory, (versionGroup) => versionGroup.sort(semver.rcompare));
    // Handle canary versions
    if (currentCategory === 'canary') {
        const latestCanary = _.first(sortedVersions.canary);
        return latestCanary === currentVersion ? 'No higher canary version available' : latestCanary;
    }
    // Handle stable versions and transitions from alpha/beta/rc to stable
    if (currentCategory !== 'stable') {
        const nextStableInSameMinor = _.find(sortedVersions.stable, (v) => semver.satisfies(v, `${semver.major(currentVersion)}.${semver.minor(currentVersion)}`));
        if (nextStableInSameMinor) {
            return nextStableInSameMinor;
        }
    }
    // Handle next stable version within the same major version
    if (currentCategory === 'stable') {
        const nextStable = _.find(sortedVersions.stable, (v) => semver.gt(v, currentVersion) && semver.satisfies(v, `${semver.major(currentVersion)}`));
        if (nextStable) {
            return nextStable;
        }
    }
    // Handle next major version upgrade
    const nextMajorStable = _.find(sortedVersions.stable, (v) => semver.major(v) > semver.major(currentVersion));
    if (nextMajorStable) {
        return nextMajorStable;
    }
    // If already on the latest stable version
    const latestStable = _.first(sortedVersions.stable);
    if (currentCategory === 'stable' && currentVersion === latestStable) {
        return 'No higher stable version available';
    }
    return 'No suitable version found';
}
export async function upgrade(siteDir, { userRequestTag }) {
    if (!fs.existsSync(packagePath)) {
        throw new Error('Current directory is not a npm package');
    }
    const commandClient = await CommandRunner(siteDir);
    const { versions, tags } = await getPackageInfo();
    // console.log('versions:', versions)
    verifyRequestedTag(userRequestTag, tags);
    const packageNames = (await getPackageList('@docusaurus'));
    verifyPackageName(packageNames.map(({ name }) => name));
    const currentDocusaurusVersion = semver.coerce(packageNames.find(({ name }) => name === packageName).version)?.raw || '0';
    const suggestedVersion = suggestVersion(currentDocusaurusVersion, versions);
    // const packageNamesWithTag = packageNames.map((name) => [name, userRequestTag] as const)
    // console.log(`Upgrading ${packageNames.length} package(s) ${packageNames} code=${`${commandClient} ${packageNames.join(' ')}`}`)
    // packageNamesWithTag.forEach(([name, tag]) => {
    //   const version = tags[tag]
    //   console.log(`Upgrading ${name} to ${version}`)
    //   // execa(commandClient, [`${name}@${version}`], { cwd: siteDir, stdio: 'inherit' })
    // })
}
upgrade(cwd, { userRequestTag: 'latest' });
