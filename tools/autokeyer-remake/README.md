# AutoKeyer Remake

A small macOS menu bar auto-typer built from this Swift source. It does not use the downloaded AutoKeyer executable or make network requests.

## Build

From the `tandem-trails` repository root, run:

```sh
sh tools/autokeyer-remake/build.sh
```

Or double-click `Build AutoKeyer.command` in this folder. Xcode must be installed. The app is created at `dist/AutoKeyer Remake.app`. Running `sh build.sh` works only after you first change into this folder.

The build script skips rebuilding when the source has not changed.

## Use

1. Open the app and grant Accessibility permission in System Settings when prompted. The permission lets macOS accept the keystrokes it sends.
2. Copy text. For a timed run, check **Finish all text in** and enter `60` minutes; otherwise set the per-character typing delay.
3. Choose a typing action and focus the target text field during the countdown. Hold Control to stop, or use **Pause Typing** and **Stop Typing** in the menu bar.

For the quickest one-hour setup, choose **Type in PyCharm Over 1 Hour** from the menu. The first character is typed after the countdown and the last is scheduled close to one hour later. The app shows progress and time remaining. It pauses when PyCharm loses focus or the Mac sleeps or locks; use **Resume in 3 Seconds** when the editor is ready. Pauses extend the total wall-clock time, so the one-hour setting means approximately one hour of active typing.

### PyCharm

Open a file in PyCharm and put the cursor in its editor. Copy the text you want typed, then select **Type Clipboard in PyCharm** or **Type in PyCharm Over 1 Hour** in the AutoKeyer menu. The app brings PyCharm forward; click the target spot in its editor during the three-second countdown. This mode pauses if you switch away from PyCharm. The general **Type Clipboard in 3 Seconds** action still works in other apps. If PyCharm's automatic indentation or completion changes code while it is typed, use PyCharm's normal paste for exact code formatting.

The app reads the clipboard only when it opens the preview or you press Start. It stores the typing delay and duration setting, but not the copied text. It is locally signed for development, not notarized or signed with an Apple Developer ID.

## Accessibility permission

macOS treats each changed, locally signed build as a different app for privacy permissions. The build script now skips rebuilding when the source has not changed, which keeps its permission identity stable. After a source change and rebuild, quit the old AutoKeyer Remake process, reopen the new app, and allow **AutoKeyer Remake** in **System Settings → Privacy & Security → Accessibility**. If an old entry already appears enabled but the app still says permission is missing, remove that old entry, add the current `dist/AutoKeyer Remake.app`, enable it, and quit and reopen the app. The app prompts at most once per launch while access is missing.
