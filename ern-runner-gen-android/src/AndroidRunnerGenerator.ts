import { RunnerGenerator, RunnerGeneratorConfig } from 'ern-runner-gen'
import {
  mustacheUtils,
  NativePlatform,
  shell,
  injectReactNativeVersionKeysInObject,
  log,
} from 'ern-core'
import readDir from 'fs-readdir-recursive'
import path from 'path'
import { android } from 'ern-core'

const defaultReactNativePackagerHost = 'localhost'
const defaultReactNativePackagerPort = '8081'
const runnerHullPath = path.join(__dirname, 'hull')

export default class AndroidRunnerGenerator implements RunnerGenerator {
  public get platform(): NativePlatform {
    return 'android'
  }

  public async generate(config: RunnerGeneratorConfig): Promise<void> {
    let mustacheView: any = {}
    mustacheView = configureMustacheView(config, mustacheView)
    shell.cp('-R', path.join(runnerHullPath, '*'), config.outDir)
    shell.mv(
      path.join(config.outDir, 'app/src/main/java/com/walmartlabs/ern/miniapp'),
      path.join(
        config.outDir,
        'app/src/main/java',
        config.extra.androidConfig.packageFilePath
      )
    )
    const files = readDir(
      config.outDir,
      f => !f.endsWith('.jar') && !f.endsWith('.png')
    )
    for (const file of files) {
      await mustacheUtils.mustacheRenderToOutputFileUsingTemplateFile(
        path.join(config.outDir, file),
        mustacheView,
        path.join(config.outDir, file)
      )
    }
  }

  public async regenerateRunnerConfig(
    config: RunnerGeneratorConfig
  ): Promise<void> {
    let mustacheView: any = {}
    mustacheView = configureMustacheView(config, mustacheView)

    const subPathToRunnerConfig =
      'app/src/main/java/com/walmartlabs/ern/miniapp/RunnerConfig.java'

    const pathToRunnerConfigHull = path.join(
      runnerHullPath,
      subPathToRunnerConfig
    )
    const pathToRunnerConfig = path.join(
      config.outDir,
      'app/src/main/java',
      config.extra.androidConfig.packageFilePath,
      'RunnerConfig.java'
    )
    shell.cp(pathToRunnerConfigHull, pathToRunnerConfig)
    await mustacheUtils.mustacheRenderToOutputFileUsingTemplateFile(
      pathToRunnerConfig,
      mustacheView,
      pathToRunnerConfig
    )
  }
}

// Given a string returns the same string with its first letter capitalized
function pascalCase(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

function configureMustacheView(
  config: RunnerGeneratorConfig,
  mustacheView: any
) {
  const versions = android.resolveAndroidVersions(
    config.extra && config.extra.androidConfig
  )
  mustacheView = Object.assign(mustacheView, versions)

  mustacheView.isReactNativeDevSupportEnabled =
    config.reactNativeDevSupportEnabled === true ? 'true' : 'false'
  mustacheView.miniAppName = config.mainMiniAppName
  mustacheView.packagerHost =
    config.reactNativePackagerHost || defaultReactNativePackagerHost
  mustacheView.packagerPort =
    config.reactNativePackagerPort || defaultReactNativePackagerPort
  mustacheView.pascalCaseMiniAppName = pascalCase(config.mainMiniAppName)
  mustacheView.lowerCaseMiniAppName = config.mainMiniAppName.toLowerCase()
  mustacheView.artifactId = config.extra.androidConfig.artifactId
  mustacheView.groupId = config.extra.androidConfig.groupId
  mustacheView.isOldRunner = config.extra.androidConfig.isOldRunner
  injectReactNativeVersionKeysInObject(mustacheView, config.reactNativeVersion)

  return mustacheView
}
