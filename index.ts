import path from 'path'
import fs from 'fs-extra'
import process from 'process'
import { execa } from 'execa'

type CommonNpmTags = 'latest' | 'next' | 'canary'
type Version = [number, number, number]

const cwd = process.cwd()
const packagePath = path.resolve(cwd, 'package.json')
const packageName = '@docusaurus/core'
type Package = {
  name: string
  version: string
}

type Packages = Package[]

async function hasYarn(siteDir: string) {
  return fs.pathExists(path.resolve(siteDir, 'yarn.lock'))
}

async function hasPnpm(siteDir: string) {
  return fs.pathExists(path.resolve(siteDir, 'pnpm-lock.yaml'))
}

async function CommandRunner(siteDir: string) {
  if (await hasYarn(siteDir)) {
    return 'yarn install'
  } else if (await hasPnpm(siteDir)) {
    return 'pnpm install'
  } else {
    return 'npm install'
  }
}

async function getPackageInfo() {
  const { stdout } = await execa('npm', ['view', packageName, '--json'])
  const data = JSON.parse(stdout)
  return { versions: data.versions, tags: data['dist-tags'] }
}

async function getPackageList(name: string) {
  try {
    const data = await fs.readJSON(packagePath)

    const dependencies = data.dependencies || {}
    const devDependencies = data.devDependencies || {}

    // TODO use npm ls ?
    return Array.from(new Set([...Object.entries(dependencies), ...Object.entries(devDependencies)]))
      .filter(([pkg]) => pkg.startsWith(name))
      .map(([pkg, version]) => ({ name: pkg, version }))
  } catch (error) {
    throw new Error('Failed to read package.json:', { cause: error })
  }
}

function verifyRequestedTag(userRequestTag: CommonNpmTags, tags: Record<string, string>) {
  if (!tags[userRequestTag]) {
    throw new Error(`Tag "${userRequestTag}" available for package "${packageName}"`)
  }
}

function verifyPackageName(packageNames: string[]) {
  if (!packageNames.length) {
    throw new Error(`Found 0 packages with scope @docusaurus`)
  }
}

function suggestVersion(currentVersion: string, versions: string[]): string {
  // Helper function to parse version string into an array of numbers
  const parseVersion = (version: string): (number | string)[] => version.split(/[\.\-]/).map((part) => (isNaN(Number(part)) ? part : Number(part)))

  // Helper function to categorize versions
  const categorizeVersion = (version: string) => {
    if (version.startsWith('0.0.0-')) return 'canary'
    if (version.includes('alpha')) return 'alpha'
    if (version.includes('beta')) return 'beta'
    if (version.includes('rc')) return 'rc'
    return 'stable'
  }

  // Get the category of the current version
  const currentCategory = categorizeVersion(currentVersion)

  // Sort versions in descending order based on version numbers
  const sortedVersions = versions.sort((a, b) => {
    const parsedA = parseVersion(a)
    const parsedB = parseVersion(b)

    for (let i = 0; i < Math.max(parsedA.length, parsedB.length); i++) {
      if (parsedA[i] === undefined) return -1
      if (parsedB[i] === undefined) return 1
      if (parsedA[i] < parsedB[i]) return 1
      if (parsedA[i] > parsedB[i]) return -1
    }
    return 0
  })

  // Filter versions by category
  const versionsInCategory = sortedVersions.filter((v) => categorizeVersion(v) === currentCategory)
  const latestInCategory = versionsInCategory[0]

  if (latestInCategory === currentVersion) {
    // Suggest the latest stable version if current is the latest in its category
    const latestStable = sortedVersions.find((v) => categorizeVersion(v) === 'stable')
    return latestStable || 'No higher stable version available'
  } else {
    // Suggest the latest version in the current category
    return latestInCategory || 'No suitable version found'
  }
}

export async function upgrade(siteDir: string, { userRequestTag }: { userRequestTag: CommonNpmTags }): Promise<void> {
  if (!fs.existsSync(packagePath)) {
    throw new Error('Current directory is not a npm package')
  }

  const commandClient = await CommandRunner(siteDir)

  const { versions, tags } = await getPackageInfo()
  // console.log('versions:', versions)
  verifyRequestedTag(userRequestTag, tags)

  const packageNames = (await getPackageList('@docusaurus')) as unknown as Packages
  verifyPackageName(packageNames.map(({ name }) => name))
  const currentDocusaurusVersion = packageNames.find(({ name }) => name === packageName)!.version.match(/\d+\.\d+\.\d+/g)![0]
  console.log('currentDocusaurusVersion:', currentDocusaurusVersion)
  const suggestedVersion = suggestVersion(currentDocusaurusVersion, versions)
  console.log('suggestedVersion:', suggestedVersion)

  const packageNamesWithTag = packageNames.map((name) => [name, userRequestTag] as const)
  console.log(`Upgrading ${packageNames.length} package(s) ${packageNames} code=${`${commandClient} ${packageNames.join(' ')}`}`)

  packageNamesWithTag.forEach(([name, tag]) => {
    const version = tags[tag]
    console.log(`Upgrading ${name} to ${version}`)
    execa(commandClient, [`${name}@${version}`], { cwd: siteDir, stdio: 'inherit' })
  })
}

upgrade(cwd, { userRequestTag: 'latest' })
