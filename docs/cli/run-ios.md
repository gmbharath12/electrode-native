## `ern run-ios`

#### Description

* Runs a MiniApp on an iOS emulator or connected device  

#### Syntax

`ern run-ios`

**Options**  

`--baseComposite <compositePath>`

* Git or File System path, to the custom Composite repository (refer to the [custom  Composite] documentation for more information).

 `--dev [true|false]`
 * Enable or disable React Native dev support
 
 `--miniapps/m`
 * One or more MiniApps to combine in the Runner Container

 `--descriptor, -d`
 * complete native application descriptor
 
 `--mainMiniAppName`
 * Name of the MiniApp to launch when starting the Runner application
 
 `--usePreviousDevice/-u`
 * Use the previously selected device to avoid prompt

`--host`
* Host or ip to launch the local packager on.
* By default it will use the IP address that is returned by the `ipconfig getifaddr en0` command, and fallback to `localhost` in the case the command fails.

`--port`
* Port on which the local packager should listen on *(default: 8081)*

#### Remarks

* You can launch the MiniApp located in the current working directory or on a connected iOS device or running emulator if available. If a connected iOS device is not available, the command prompts you to select an emulator to launch from the list of installed emulator images.  
* The first time you run this command from within a MiniApp directory, it generates an iOS directory containing the iOS Runner application project. If the iOS folder already exists (it is not the first run of the `ern run-ios` command for this MiniApp), the existing runner project is used.  
* After the runner project is generated, you can safely make native code modifications to it, knowing that the next time the `ern run-ios` command is issued, the project and your changes will remain.  
* If you want to regenerate the runner project from scratch, remove the iOS directory.  
* The miniapp can be any Yarn package descriptor, including Git or other file system path schemes.  
* The `ern run-ios` command is the `ern` equivalent of the `react-native run-ios` command.

[custom Composite]: ./platform-parts/composite/index.md