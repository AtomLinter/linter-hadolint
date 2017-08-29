'use babel';

// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';

// Dependencies
let helpers;
let path;
let fs;

const getRuleURI = (errorCode) => {
  if (errorCode.startsWith('DL')) {
    return `https://github.com/lukasmartinelli/hadolint/wiki/${errorCode}`;
  } else if (errorCode.startsWith('SC')) {
    return `https://github.com/koalaman/shellcheck/wiki/${errorCode}`;
  }
  return '';
};

const applySubstitutions = (givenExecPath, projDir) => {
  let execPath = givenExecPath;
  const projectName = path.basename(projDir);
  execPath = execPath.replace(/\$PROJECT_NAME/ig, projectName);
  execPath = execPath.replace(/\$PROJECT/ig, projDir);
  const paths = execPath.split(';');
  const foundPath = paths.find(testPath => fs.existsSync(testPath));
  if (foundPath) {
    return foundPath;
  }
  return execPath;
};

const loadDeps = () => {
  if (!helpers) {
    helpers = require('atom-linter');
  }
  if (!path) {
    path = require('path');
  }
  if (!fs) {
    fs = require('fs-plus');
  }
};

const processHadolintMessage = (message) => {
  const patterns = [
    {
      // </path/to/file>:<line-number> <error-code> <message>
      regex: /(.+):(\d+) (\S+) (.+)/,
      cb: m => ({ lineNumber: m[2], rule: m[3], excerpt: m[4] }),
    },
    {
      // </path/to/file> <error-code> <message>
      // specifying DL|SH so it won't break when the path to file has whitespaces
      regex: /(.+) ((?:DL|SH)\d+) (.+)/,
      cb: m => ({ lineNumber: 1, rule: m[2], excerpt: m[3] }),
    },
  ];
  // eslint-disable-next-line no-restricted-syntax
  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      return pattern.cb(match);
    }
  }
  return null;
};

module.exports = {
  activate() {
    this.idleCallbacks = new Set();
    let depsCallbackID;
    const installLinterHadolintDeps = () => {
      this.idleCallbacks.delete(depsCallbackID);
      if (!atom.inSpecMode()) {
        require('atom-package-deps').install('linter-hadolint');
      }
      loadDeps();
    };
    depsCallbackID = window.requestIdleCallback(installLinterHadolintDeps);
    this.idleCallbacks.add(depsCallbackID);

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-hadolint.ignoreErrorCodes', (value) => {
        this.ignoreCodes = value;
      }),
      atom.config.observe('linter-hadolint.executablePath', (value) => {
        this.executablePath = value;
      }),
      atom.config.observe('linter-hadolint.showRuleIdInMessage', (value) => {
        this.showRuleId = value;
      }),
    );
  },

  deactivate() {
    this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'hadolint',
      scope: 'file',
      grammarScopes: ['source.dockerfile'],
      lintsOnChange: false,
      lint: async (textEditor) => {
        loadDeps();
        const filePath = textEditor.getPath();
        if (!filePath) {
          // Editor has no valid path, linting can't continue
          return [];
        }

        let projectPath = atom.project.relativizePath(filePath)[0];
        if (projectPath === null) {
          // Default project directory to file directory if path cannot be determined
          projectPath = path.dirname(filePath);
        }

        const parameters = [];
        parameters.push(`${filePath}`);

        if (this.ignoreCodes.length > 0) {
          this.ignoreCodes.forEach((code) => {
            parameters.push(`--ignore=${code}`);
          });
        }

        const execPath = fs.normalize(applySubstitutions(this.executablePath, projectPath));
        const execOpts = {
          ignoreExitCode: true,
        };

        const output = await helpers.exec(execPath, parameters, execOpts);
        if (!output) {
          return [];
        }

        const lines = output.split('\n');
        const results = lines.map((line) => {
          const lineResults = processHadolintMessage(line);
          return lineResults;
        });

        const listOfMessages = results.reduce((messages, match) => {
          if (!match) {
            return messages;
          }
          const linePosition = Number.parseInt(match.lineNumber, 10) - 1;
          const excerpt = this.showRuleId ? `${match.excerpt} (${match.rule})` : match.excerpt;

          messages.push({
            severity: 'error',
            excerpt,
            location: {
              file: filePath,
              position: helpers.generateRange(textEditor, linePosition),
            },
            url: getRuleURI(match.rule),
          });
          return messages;
        }, []);

        return listOfMessages;
      },
    };
  },
};
