import AppKit
import ApplicationServices

@MainActor
final class AutoKeyerApp: NSObject, NSApplicationDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let menu = NSMenu()
    private let startItem = NSMenuItem(title: "Type Clipboard in 3 Seconds", action: nil, keyEquivalent: "")
    private let pyCharmItem = NSMenuItem(title: "Type Clipboard in PyCharm", action: nil, keyEquivalent: "")
    private let oneHourItem = NSMenuItem(title: "Type in PyCharm Over 1 Hour", action: nil, keyEquivalent: "")
    private let pauseItem = NSMenuItem(title: "Pause Typing", action: nil, keyEquivalent: "")
    private let resumeItem = NSMenuItem(title: "Resume in 3 Seconds", action: nil, keyEquivalent: "")
    private let stopItem = NSMenuItem(title: "Stop Typing", action: nil, keyEquivalent: "")
    private let stateItem = NSMenuItem(title: "Ready", action: nil, keyEquivalent: "")
    private var window: NSWindow?
    private var previewLabel: NSTextField?
    private var stateLabel: NSTextField?
    private var permissionLabel: NSTextField?
    private var speedLabel: NSTextField?
    private var speedSlider: NSSlider?
    private var durationCheckbox: NSButton?
    private var durationField: NSTextField?
    private var startButton: NSButton?
    private var pyCharmButton: NSButton?
    private var pauseButton: NSButton?
    private var resumeButton: NSButton?
    private var stopButton: NSButton?
    private var timer: Timer?
    private var statusTimer: Timer?
    private var characters: [Character] = []
    private var position = 0
    private var countdown = 0
    private var phase: Phase = .ready
    private var pyCharmOnly = false
    private var permissionPromptShown = false
    private var targetDuration: TimeInterval?
    private var elapsedBeforePause: TimeInterval = 0
    private var segmentStart: TimeInterval = 0
    private let speedKey = "keystrokeDelayMilliseconds"
    private let durationEnabledKey = "useTotalDuration"
    private let durationMinutesKey = "totalDurationMinutes"

    private enum Phase { case ready, countdown, typing, paused }

    private var delayMilliseconds: Double {
        let stored = UserDefaults.standard.double(forKey: speedKey)
        return stored == 0 ? 90 : min(max(stored, 25), 500)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(pauseForSystemEvent), name: NSWorkspace.willSleepNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(pauseForSystemEvent), name: NSWorkspace.sessionDidResignActiveNotification, object: nil)
        statusItem.button?.image = NSImage(systemSymbolName: "keyboard", accessibilityDescription: "AutoKeyer Remake")
        statusItem.button?.toolTip = "AutoKeyer Remake"

        stateItem.isEnabled = false
        menu.addItem(stateItem)
        menu.addItem(.separator())
        startItem.target = self
        startItem.action = #selector(startTyping)
        menu.addItem(startItem)
        pyCharmItem.target = self
        pyCharmItem.action = #selector(startTypingInPyCharm)
        menu.addItem(pyCharmItem)
        oneHourItem.target = self
        oneHourItem.action = #selector(startOneHourInPyCharm)
        menu.addItem(oneHourItem)
        menu.addItem(.separator())
        pauseItem.target = self
        pauseItem.action = #selector(pauseTyping)
        menu.addItem(pauseItem)
        resumeItem.target = self
        resumeItem.action = #selector(resumeTyping)
        menu.addItem(resumeItem)
        stopItem.target = self
        stopItem.action = #selector(stopTyping)
        menu.addItem(stopItem)
        menu.addItem(.separator())
        let settings = NSMenuItem(title: "Open AutoKeyer Remake…", action: #selector(showWindow), keyEquivalent: "")
        settings.target = self
        menu.addItem(settings)
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit AutoKeyer Remake", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
        statusItem.menu = menu
        updateUI()
        showWindow()
    }

    @objc private func quitApp() {
        stopTyping()
        NSApp.terminate(nil)
    }

    @objc private func pauseForSystemEvent() {
        pause(reason: "Paused because the Mac slept or the session locked.")
    }

    @objc private func showWindow() {
        if window == nil { buildWindow() }
        refreshPreview()
        refreshPermissionStatus()
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func buildWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 440, height: 465),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "AutoKeyer Remake"
        window.center()
        window.isReleasedWhenClosed = false
        let root = NSVisualEffectView(frame: window.contentView!.bounds)
        root.material = .windowBackground
        root.state = .active
        root.autoresizingMask = [.width, .height]
        window.contentView = root

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 13
        stack.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 25),
            stack.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -25),
            stack.topAnchor.constraint(equalTo: root.topAnchor, constant: 25)
        ])

        let title = label("Type copied text, one character at a time", size: 19, bold: true)
        stack.addArrangedSubview(title)
        let subtitle = label("Copy text, choose a pace, then focus the field you want to type into.", size: 12)
        subtitle.textColor = .secondaryLabelColor
        stack.addArrangedSubview(subtitle)

        let previewTitle = label("CLIPBOARD", size: 10, bold: true)
        previewTitle.textColor = .secondaryLabelColor
        stack.addArrangedSubview(previewTitle)
        let preview = label("", size: 13)
        preview.lineBreakMode = .byTruncatingTail
        preview.maximumNumberOfLines = 2
        preview.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        preview.widthAnchor.constraint(equalToConstant: 390).isActive = true
        stack.addArrangedSubview(preview)
        previewLabel = preview

        let speed = label("Typing delay: 90 ms per character", size: 12, bold: true)
        stack.addArrangedSubview(speed)
        speedLabel = speed
        let slider = NSSlider(value: delayMilliseconds, minValue: 25, maxValue: 500, target: self, action: #selector(speedChanged(_:)))
        slider.widthAnchor.constraint(equalToConstant: 380).isActive = true
        stack.addArrangedSubview(slider)
        speedSlider = slider

        let durationRow = NSStackView()
        durationRow.orientation = .horizontal
        durationRow.spacing = 7
        let durationToggle = NSButton(checkboxWithTitle: "Finish all text in", target: self, action: #selector(durationModeChanged(_:)))
        durationToggle.state = UserDefaults.standard.bool(forKey: durationEnabledKey) ? .on : .off
        durationRow.addArrangedSubview(durationToggle)
        durationCheckbox = durationToggle
        let minutes = UserDefaults.standard.integer(forKey: durationMinutesKey)
        let field = NSTextField(string: String(minutes == 0 ? 60 : minutes))
        field.alignment = .right
        field.widthAnchor.constraint(equalToConstant: 52).isActive = true
        field.target = self
        field.action = #selector(durationValueChanged(_:))
        durationRow.addArrangedSubview(field)
        durationField = field
        durationRow.addArrangedSubview(label("minutes (60 = 1 hour)", size: 12))
        stack.addArrangedSubview(durationRow)

        let buttons = NSStackView()
        buttons.orientation = .horizontal
        buttons.spacing = 10
        let start = NSButton(title: "Type Clipboard in 3 Seconds", target: self, action: #selector(startTyping))
        start.bezelStyle = .rounded
        start.keyEquivalent = "\r"
        buttons.addArrangedSubview(start)
        startButton = start
        let pyCharm = NSButton(title: "Type in PyCharm", target: self, action: #selector(startTypingInPyCharm))
        pyCharm.bezelStyle = .rounded
        buttons.addArrangedSubview(pyCharm)
        pyCharmButton = pyCharm
        let stop = NSButton(title: "Stop", target: self, action: #selector(stopTyping))
        stop.bezelStyle = .rounded
        buttons.addArrangedSubview(stop)
        stopButton = stop
        stack.addArrangedSubview(buttons)

        let controlButtons = NSStackView()
        controlButtons.orientation = .horizontal
        controlButtons.spacing = 10
        let pause = NSButton(title: "Pause", target: self, action: #selector(pauseTyping))
        pause.bezelStyle = .rounded
        controlButtons.addArrangedSubview(pause)
        pauseButton = pause
        let resume = NSButton(title: "Resume in 3 Seconds", target: self, action: #selector(resumeTyping))
        resume.bezelStyle = .rounded
        controlButtons.addArrangedSubview(resume)
        resumeButton = resume
        stack.addArrangedSubview(controlButtons)

        let state = label("Ready", size: 12)
        state.textColor = .secondaryLabelColor
        stack.addArrangedSubview(state)
        stateLabel = state
        let note = label("Hold Control to abort. If PyCharm loses focus, typing pauses until you resume. Accessibility permission is needed.", size: 11)
        note.textColor = .secondaryLabelColor
        stack.addArrangedSubview(note)
        let permission = label("Checking Accessibility permission…", size: 11)
        permission.textColor = .secondaryLabelColor
        stack.addArrangedSubview(permission)
        permissionLabel = permission
        self.window = window
        updateUI()
    }

    private func refreshPermissionStatus() {
        permissionLabel?.stringValue = AXIsProcessTrusted()
            ? "Accessibility: allowed for this build"
            : "Accessibility: not allowed for this build"
    }

    private func label(_ text: String, size: CGFloat, bold: Bool = false) -> NSTextField {
        let field = NSTextField(labelWithString: text)
        field.font = .systemFont(ofSize: size, weight: bold ? .semibold : .regular)
        field.lineBreakMode = .byWordWrapping
        return field
    }

    private func refreshPreview() {
        let text = NSPasteboard.general.string(forType: .string) ?? ""
        let compact = text.replacingOccurrences(of: "\n", with: " ↵ ")
        previewLabel?.stringValue = compact.isEmpty ? "No copied text yet" : String(compact.prefix(250))
    }

    @objc private func speedChanged(_ slider: NSSlider) {
        UserDefaults.standard.set(slider.doubleValue, forKey: speedKey)
        speedLabel?.stringValue = "Typing delay: \(Int(slider.doubleValue)) ms per character"
    }

    @objc private func durationModeChanged(_ checkbox: NSButton) {
        UserDefaults.standard.set(checkbox.state == .on, forKey: durationEnabledKey)
        updateUI()
    }

    @objc private func durationValueChanged(_ field: NSTextField) {
        if let minutes = Int(field.stringValue), (1...1440).contains(minutes) {
            UserDefaults.standard.set(minutes, forKey: durationMinutesKey)
        } else {
            setMessage("Enter a duration from 1 to 1440 minutes.")
        }
    }

    @objc private func startTyping() {
        beginTyping(inPyCharm: false, durationOverride: nil)
    }

    @objc private func startTypingInPyCharm() {
        beginTyping(inPyCharm: true, durationOverride: nil)
    }

    @objc private func startOneHourInPyCharm() {
        beginTyping(inPyCharm: true, durationOverride: 3600)
    }

    private func beginTyping(inPyCharm: Bool, durationOverride: TimeInterval?) {
        guard phase == .ready else { return }
        let pyCharm = inPyCharm ? NSRunningApplication.runningApplications(withBundleIdentifier: "com.jetbrains.pycharm").first : nil
        if inPyCharm && pyCharm == nil {
            setMessage("Open PyCharm and a file first, then try again.")
            return
        }
        let text = NSPasteboard.general.string(forType: .string) ?? ""
        guard !text.isEmpty else {
            setMessage("Copy some text first, then try again.")
            refreshPreview()
            return
        }
        var selectedDuration = durationOverride
        if selectedDuration == nil && durationCheckbox?.state == .on {
            guard let minutes = Int(durationField?.stringValue ?? ""), (1...1440).contains(minutes) else {
                setMessage("Enter a duration from 1 to 1440 minutes.")
                return
            }
            UserDefaults.standard.set(minutes, forKey: durationMinutesKey)
            selectedDuration = TimeInterval(minutes * 60)
        }
        if let selectedDuration, text.count > 1,
           selectedDuration / Double(text.count - 1) < 0.025 {
            setMessage("That text needs more than 25 ms per character. Increase the duration.")
            return
        }
        guard AXIsProcessTrusted() else {
            if !permissionPromptShown {
                permissionPromptShown = true
                _ = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary)
            }
            refreshPermissionStatus()
            setMessage("Allow this build in Accessibility, then quit and reopen the app.")
            return
        }
        refreshPermissionStatus()
        characters = Array(text)
        position = 0
        countdown = 3
        pyCharmOnly = inPyCharm
        targetDuration = selectedDuration
        elapsedBeforePause = 0
        phase = .countdown
        window?.orderOut(nil)
        if inPyCharm { _ = pyCharm?.activate(options: [.activateAllWindows]) }
        updateUI()
        schedule(after: 1) { [weak self] in self?.countdownTick() }
    }

    private func countdownTick() {
        guard phase == .countdown else { return }
        countdown -= 1
        if countdown > 0 {
            updateUI()
            schedule(after: 1) { [weak self] in self?.countdownTick() }
        } else {
            phase = .typing
            segmentStart = ProcessInfo.processInfo.systemUptime
            statusTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                Task { @MainActor [weak self] in self?.checkFocusAndUpdate() }
            }
            if let statusTimer { RunLoop.main.add(statusTimer, forMode: .common) }
            if targetDuration == nil || position == 0 { typeNext() } else { scheduleNextDurationCharacter() }
        }
    }

    private func activeElapsed() -> TimeInterval {
        let currentSegment = phase == .typing ? ProcessInfo.processInfo.systemUptime - segmentStart : 0
        return elapsedBeforePause + currentSegment
    }

    private func scheduleNextDurationCharacter() {
        guard let duration = targetDuration, !characters.isEmpty else { return }
        let due = duration * Double(position) / Double(max(1, characters.count - 1))
        schedule(after: max(0.025, due - activeElapsed())) { [weak self] in self?.typeNext() }
    }

    private func checkFocusAndUpdate() {
        guard phase == .typing else { return }
        if CGEventSource.flagsState(.combinedSessionState).contains(.maskControl) {
            finish("Stopped by Control key.")
        } else if pyCharmOnly && NSWorkspace.shared.frontmostApplication?.bundleIdentifier != "com.jetbrains.pycharm" {
            pause(reason: "Paused because PyCharm lost focus.")
        } else {
            updateUI()
        }
    }

    private func typeNext() {
        guard phase == .typing else { return }
        if pyCharmOnly && NSWorkspace.shared.frontmostApplication?.bundleIdentifier != "com.jetbrains.pycharm" {
            pause(reason: "Paused because PyCharm lost focus.")
            return
        }
        if CGEventSource.flagsState(.combinedSessionState).contains(.maskControl) {
            finish("Stopped by Control key.")
            return
        }
        guard position < characters.count else {
            finish("Finished typing \(characters.count) characters.")
            return
        }
        let character = characters[position]
        if character == "\n" || character == "\r" {
            postKey(36)
        } else if character == "\t" {
            postKey(48)
        } else {
            postUnicode(String(character))
        }
        position += 1
        if position == characters.count {
            finish("Finished typing \(characters.count) characters.")
        } else {
            updateUI()
            if targetDuration == nil {
                schedule(after: delayMilliseconds / 1000) { [weak self] in self?.typeNext() }
            } else {
                scheduleNextDurationCharacter()
            }
        }
    }

    @objc private func pauseTyping() {
        pause(reason: "Paused. Resume when the target editor is ready.")
    }

    private func pause(reason: String) {
        guard phase == .typing || phase == .countdown else { return }
        if phase == .typing { elapsedBeforePause += ProcessInfo.processInfo.systemUptime - segmentStart }
        timer?.invalidate()
        timer = nil
        statusTimer?.invalidate()
        statusTimer = nil
        phase = .paused
        updateUI()
        setMessage("\(reason) \(position)/\(characters.count) typed.")
    }

    @objc private func resumeTyping() {
        guard phase == .paused else { return }
        let pyCharm = pyCharmOnly ? NSRunningApplication.runningApplications(withBundleIdentifier: "com.jetbrains.pycharm").first : nil
        if pyCharmOnly && pyCharm == nil {
            setMessage("Open PyCharm before resuming.")
            return
        }
        countdown = 3
        phase = .countdown
        window?.orderOut(nil)
        if pyCharmOnly { _ = pyCharm?.activate(options: [.activateAllWindows]) }
        updateUI()
        schedule(after: 1) { [weak self] in self?.countdownTick() }
    }

    private func postKey(_ keyCode: CGKeyCode) {
        let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true)
        let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false)
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)
    }

    private func postUnicode(_ text: String) {
        let units = Array(text.utf16)
        let down = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true)
        let up = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false)
        units.withUnsafeBufferPointer { buffer in
            guard let base = buffer.baseAddress else { return }
            down?.keyboardSetUnicodeString(stringLength: units.count, unicodeString: base)
            up?.keyboardSetUnicodeString(stringLength: units.count, unicodeString: base)
        }
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)
    }

    @objc private func stopTyping() {
        guard phase != .ready else { return }
        finish("Stopped.")
    }

    private func finish(_ message: String) {
        timer?.invalidate()
        timer = nil
        statusTimer?.invalidate()
        statusTimer = nil
        characters = []
        position = 0
        pyCharmOnly = false
        targetDuration = nil
        elapsedBeforePause = 0
        phase = .ready
        updateUI()
        setMessage(message)
    }

    private func schedule(after delay: TimeInterval, _ action: @escaping () -> Void) {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { _ in action() }
        if let timer { RunLoop.main.add(timer, forMode: .common) }
    }

    private func setMessage(_ text: String) {
        stateItem.title = text
        stateLabel?.stringValue = text
    }

    private func timeText(_ seconds: TimeInterval) -> String {
        let value = max(0, Int(ceil(seconds)))
        return String(format: "%d:%02d:%02d", value / 3600, (value % 3600) / 60, value % 60)
    }

    private func updateUI() {
        let message: String
        switch phase {
        case .ready: message = "Ready"
        case .countdown: message = "Focus the target field — typing starts in \(countdown)…"
        case .typing:
            if let duration = targetDuration {
                message = "Typing \(position)/\(characters.count) · \(timeText(duration - activeElapsed())) remaining"
            } else {
                message = "Typing \(position) of \(characters.count) characters…"
            }
        case .paused:
            if let duration = targetDuration {
                message = "Paused \(position)/\(characters.count) · \(timeText(duration - activeElapsed())) remaining"
            } else {
                message = "Paused \(position) of \(characters.count) characters"
            }
        }
        setMessage(message)
        startItem.isEnabled = phase == .ready
        pyCharmItem.isEnabled = phase == .ready
        oneHourItem.isEnabled = phase == .ready
        pauseItem.isEnabled = phase == .countdown || phase == .typing
        resumeItem.isEnabled = phase == .paused
        stopItem.isEnabled = phase != .ready
        startButton?.isEnabled = phase == .ready
        pyCharmButton?.isEnabled = phase == .ready
        pauseButton?.isEnabled = phase == .countdown || phase == .typing
        resumeButton?.isEnabled = phase == .paused
        stopButton?.isEnabled = phase != .ready
        speedLabel?.stringValue = "Typing delay: \(Int(delayMilliseconds)) ms per character"
        speedSlider?.isEnabled = durationCheckbox?.state != .on
        durationField?.isEnabled = durationCheckbox?.state == .on && phase == .ready
        durationCheckbox?.isEnabled = phase == .ready
    }
}

@main
struct Main {
    @MainActor static func main() {
        let app = NSApplication.shared
        let delegate = AutoKeyerApp()
        app.delegate = delegate
        app.run()
    }
}
