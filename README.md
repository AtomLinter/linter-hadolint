# linter-hadolint

[![Build Status](https://travis-ci.org/AtomLinter/linter-hadolint.svg)](https://travis-ci.org/AtomLinter/linter-hadolint)
[![Dependency Status](https://david-dm.org/AtomLinter/linter-hadolint.svg)](https://david-dm.org/AtomLinter/linter-hadolint)


This linter plugin for [Linter](https://github.com/AtomLinter/Linter) provides
an interface to [hadolint](https://github.com/lukasmartinelli/hadolint).
It will be used with files that have the "source.dockerfile" syntax.

## Installation

### Hadolint installation

You must have [hadolint](https://github.com/lukasmartinelli/hadolint) installed
to use this plugin.

### Plugin installation

```ShellSession
apm install linter-hadolint
```

Note that if you do not have the `linter` package installed it will be
installed for you.

## Contributing

See the [contributing guidelines](./CONTRIBUTING.md) to get started.

## Settings

You can configure linter-hadolint from the settings menu:

*   **executablePath** Path to your hadolint executable. By default it will
    use `hadolint` as the executable.

*   **ignoreErrorCodes** A list of error codes to ignore.

    Example: To ignore `DL3000` and `DL3002` you would enter something
    like this:

    ```
    DL3000, DL3002
    ```
