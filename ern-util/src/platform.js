// @flow

import {
  execSync
} from 'child_process'
import config from './config.js'
import Dependency from './Dependency.js'
import fs from 'fs'
import _ from 'lodash'

const npmModuleRe = /(.*)@(.*)/
const HOME_DIRECTORY = process.env['HOME']

export default class Platform {
  static get rootDirectory () : string {
    if (!HOME_DIRECTORY) {
      throw new Error(`process.env['HOME'] is undefined !!!`)
    }
    return `${HOME_DIRECTORY}/.ern`
  }

  static get repositoryDirectory () : string {
    return `${this.rootDirectory}/ern-platform`
  }

  static get versionCacheDirectory () : string {
    return `${this.rootDirectory}/cache`
  }

  static get latestVersion () : string {
    return this.versions.slice(-1)[0]
  }

  static get currentPlatformVersionPath () : string {
    return this.getPlatformVersionPath(this.currentVersion)
  }

  static get currentVersion () : string {
    return config.getValue('platformVersion', '1000')
  }

  static get currentGitCommitSha () : string {
    return execSync(`git -C ${this.currentPlatformVersionPath} rev-parse HEAD`).slice(0, 7).toString()
  }

  static switchPlatformRepositoryToMaster () {
    execSync(`git -C ${this.repositoryDirectory} checkout master`)
  }

  static switchPlatformRepositoryToVersion (version: string) {
    execSync(`git -C ${this.repositoryDirectory} fetch origin --tags`)
    execSync(`git -C ${this.repositoryDirectory} checkout tags/v${version}`)
  }

  static isPlatformVersionAvailable (version: string) {
    return this.versions.includes('' + version)
  }

  static isPlatformVersionInstalled (version: string) {
    return fs.existsSync(this.getPlatformVersionPath(version))
  }

  static getPlatformVersionPath (version: string) {
    return `${this.versionCacheDirectory}/v${version}`
  }

  // Return an array of versions (ex: [1,2,3,4,5])
  // representing all the available versions of the platform
  // Doing this by looking at all remote branches of the platform
  // matching `vX` where x is a number.
  static get versions () : Array<string> {
    const branchVersionRe = /tags\/v(\d+.\d+.*\d*)/
    const versions = execSync(`git --git-dir ${this.repositoryDirectory}/.git ls-remote --tags`)
      .toString()
      .split('\n')
      .filter(v => branchVersionRe.test(v))

    return _.map(versions, v => branchVersionRe.exec(v)[1])
  }

  // Install a given platform version
  // If version is not installed yet and available it will just checkout
  // the version branch in the platform repository and call its install script
  static installPlatform (version: string) {
    if (this.isPlatformVersionInstalled(version)) {
      return log.warn(`Version ${version} of ern platform is already installed`)
    }

    if (!this.isPlatformVersionAvailable(version)) {
      throw new Error(`Version ${version} of ern platform is not available`)
    }

    this.switchPlatformRepositoryToVersion(version)

    require(`${this.repositoryDirectory}/install.js`).install()
  }

  // Uninstall a given platform version
  // If version is installed yet and not the currently activated version it will
  // just checkout the version branch in the platform repository and call its
  // uninstall script
  static uninstallPlatform (version: string) {
    if (!this.isPlatformVersionInstalled(version)) {
      return log.warn(`Version ${version} of ern platform is not installed`)
    }

    if (this.currentVersion === version) {
      return log.error(`Version ${version} is currently activated. Cannot uninstall`)
    }

    this.switchPlatformRepositoryToVersion(version)

    require(`${this.repositoryDirectory}/uninstall.js`).uninstall()
  }

  // Switch to / activate a given version
  // If the version is not installed yet, it will install it beforehand, then
  // it will just update the config file with new activated version number
  static switchToVersion (version: string) {
    if (version === this.currentVersion) {
      return log.info(`v${version} is already the version in use`)
    }

    if (!this.isPlatformVersionInstalled(version)) {
      log.info(`v${version} is not installed yet. Trying to install now`)
      this.installPlatform(version)
    }

    config.setValue('platformVersion', version)
  }

  static get currentVersionManifest () : Object {
    return JSON.parse(fs.readFileSync(`${this.currentPlatformVersionPath}/manifest.json`, 'utf-8'))
  }

  static get repositoryManifest () : Object {
    return JSON.parse(fs.readFileSync(`${this.repositoryDirectory}/manifest.json`, 'utf-8'))
  }

  // Returns the manifest of a given platform version
  // If no version is specified, returns the manifest of the currently activated
  // platform version
  static getManifest (version?: string) : Object {
    if ((!version && version !== 0) || (version === this.currentVersion)) {
      return this.currentVersionManifest
    } else {
      if (!this.isPlatformVersionAvailable(version)) {
        throw new Error(`Version ${version} does not exists`)
      }
      this.switchPlatformRepositoryToVersion(version)
      return this.repositoryManifest
    }
  }

  // Returns the list of plugins listed in manifest for a given platform version
  // If version is currently activated one, it just looks in the current
  // version manifest.
  // Otherwise it just switch the platform repository to the given version branch
  // and then build the array based on the manifest
  static getManifestPlugins (version: string) : Array<Dependency> {
    const manifest = this.getManifest(version)
    return _.map(manifest.supportedPlugins, d => Dependency.fromString(d))
  }

  // Returns the list of javascript dependencies listed in manifest for a given
  // platform version
  // If version is currently activated one, it just looks in the current
  // version manifest.
  // Otherwise it just switch the platform repository to the given version branch
  // and then build the array based on the manifest
  static getManifestJsDependencies (version: string) : Array<Dependency> {
    const manifest = this.getManifest(version)
    return _.map(manifest.jsDependencies, d => Dependency.fromString(d))
  }

  static getManifestPluginsAndJsDependencies (version: string) : Array<Dependency> {
    const manifest = this.getManifest(version)
    const manifestDeps = _.union(manifest.jsDependencies, manifest.supportedPlugins)
    return _.map(manifestDeps, d => Dependency.fromString(d))
  }

  static getPlugin (pluginString: string) : ?Dependency {
    const plugin = Dependency.fromString(pluginString)
    return _.find(this.getManifestPlugins(this.currentVersion),
      d => (d.name === plugin.name) && (d.scope === plugin.scope))
  }

  static getJsDependency (dependencyString: string) : ?Dependency {
    const jsDependency = Dependency.fromString(dependencyString)
    return _.find(this.getManifestJsDependencies(this.currentVersion),
      d => (d.name === jsDependency.name) && (d.scope === jsDependency.scope))
  }

  static getDependency (dependencyString: string) : ?Dependency {
    const dependency = Dependency.fromString(dependencyString)
    return _.find(this.getManifestPluginsAndJsDependencies(this.currentVersion),
      d => (d.name === dependency.name) && (d.scope === dependency.scope))
  }

  static get reactNativeVersionFromManifest () : ?string {
    if (this.reactNativeDependencyFromManifest) {
      return npmModuleRe.exec(this.reactNativeDependencyFromManifest)[2]
    }
  }

  static get reactNativeDependencyFromManifest () : ?string {
    return _.find(this.currentVersionManifest.supportedPlugins, d => d.startsWith('react-native@'))
  }
}