'use babel';

import * as path from 'path';
import sinon from 'sinon';

const fixturesDir = path.join(__dirname, 'fixtures');
const goodPath = path.join(fixturesDir, 'good', 'Dockerfile');
const emptyPath = path.join(fixturesDir, 'empty', 'Dockerfile');
const badPath1 = path.join(fixturesDir, 'bad1', 'Dockerfile');
const badPath2 = path.join(fixturesDir, 'bad2', 'Dockerfile');
const badPath3 = path.join(fixturesDir, 'bad3', 'Dockerfile');

describe('The hadolint provider for Linter', () => {
  const lint = require('../lib/main').provideLinter().lint;

  beforeEach(async () => {
    global.atom = global.buildAtomEnvironment();
    await atom.packages.loadPackage(path.join(__dirname, '..'));
    await atom.packages.activatePackage('linter-hadolint');
  });

  afterEach(() => {
    global.atom.destroy();
  });

  it('should be in the packages list', () =>
    expect(atom.packages.isPackageLoaded('linter-hadolint')).to.equal(true),
  );

  it('should be an active package', () =>
    expect(atom.packages.isPackageActive('linter-hadolint')).to.equal(true),
  );

  it('finds nothing wrong with a valid file', async () => {
    // await atom.packages.activatePackage('linter-hadolint');
    const editor = await atom.workspace.open(goodPath);
    const messages = await lint(editor);
    expect(messages.length).to.equal(0);
  });

  it('finds nothing wrong with an empty file', async () => {
    const editor = await atom.workspace.open(emptyPath);
    const messages = await lint(editor);
    expect(messages.length).to.equal(0);
  });

  it('shows file level error in an a file with issues', async () => {
    const editor = await atom.workspace.open(badPath1);
    const expected = 'Multiple `CMD` instructions found. Only the first instruction will take effect. (DL4003)';
    const messages = await lint(editor);

    expect(messages[0].severity).to.equal('error');
    expect(messages[0].excerpt).to.equal(expected);
    expect(messages[0].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL4003');
    expect(messages[0].location.file).to.equal(badPath1);
    expect(messages[0].location.position).to.deep.equal([[0, 0], [0, 17]]);
    expect(messages.length).to.equal(1);
  });

  it('shows line level error in an a file with issues', async () => {
    const editor = await atom.workspace.open(badPath2);
    const expected = 'Delete the apt-get lists after installing something (DL3009)';
    const messages = await lint(editor);

    expect(messages[0].severity).to.equal('error');
    expect(messages[0].excerpt).to.equal(expected);
    expect(messages[0].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL3009');
    expect(messages[0].location.file).to.equal(badPath2);
    expect(messages[0].location.position).to.deep.equal([[1, 0], [1, 18]]);
    expect(messages.length).to.equal(1);
  });

  it('shows multiple errors in an a file with many issues', async () => {
    const editor = await atom.workspace.open(badPath3);
    const expected1 = 'Always tag the version of an image explicitly. (DL3006)';
    const expected2 = 'Delete the apt-get lists after installing something (DL3009)';
    const messages = await lint(editor);

    expect(messages[0].severity).to.equal('error');
    expect(messages[0].excerpt).to.equal(expected1);
    expect(messages[0].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL3006');
    expect(messages[0].location.file).to.equal(badPath3);
    expect(messages[0].location.position).to.deep.equal([[0, 0], [0, 11]]);

    expect(messages[1].severity).to.equal('error');
    expect(messages[1].excerpt).to.equal(expected2);
    expect(messages[1].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL3009');
    expect(messages[1].location.file).to.equal(badPath3);
    expect(messages[1].location.position).to.deep.equal([[1, 0], [1, 18]]);
    expect(messages.length).to.equal(2);
  });

  it('respects the configuration showRuleIdInMessage', async () => {
    atom.config.set('linter-hadolint.showRuleIdInMessage', false);

    const editor = await atom.workspace.open(badPath1);
    const expected = 'Multiple `CMD` instructions found. Only the first instruction will take effect.';
    const messages = await lint(editor);

    expect(messages[0].severity).to.equal('error');
    expect(messages[0].excerpt).to.equal(expected);
    expect(messages[0].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL4003');
    expect(messages[0].location.file).to.equal(badPath1);
    expect(messages[0].location.position).to.deep.equal([[0, 0], [0, 17]]);
    expect(messages.length).to.equal(1);
  });

  it('ignores specified rules', async () => {
    atom.config.set('linter-hadolint.ignoreErrorCodes', ['DL3006']);

    const editor = await atom.workspace.open(badPath3);
    const expected = 'Delete the apt-get lists after installing something (DL3009)';
    const messages = await lint(editor);

    expect(messages[0].severity).to.equal('error');
    expect(messages[0].excerpt).to.equal(expected);
    expect(messages[0].url).to.equal('https://github.com/lukasmartinelli/hadolint/wiki/DL3009');
    expect(messages[0].location.file).to.equal(badPath3);
    expect(messages[0].location.position).to.deep.equal([[1, 0], [1, 18]]);
    expect(messages.length).to.equal(1);
  });

  describe('executable path', () => {
    const helpers = require('atom-linter');
    let editor;
    let sinonSandbox;

    beforeEach(async () => {
      sinonSandbox = sinon.sandbox.create();
      sinonSandbox.stub(helpers, 'exec');
      editor = await atom.workspace.open(goodPath);
      atom.project.setPaths([fixturesDir]);
    });

    afterEach(() => {
      sinonSandbox.restore();
    });

    it('finds executable using project name', async () => {
      atom.config.set('linter-hadolint.executablePath', path.join('$PROJECT_NAME', 'hadolint'));
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(path.join('fixtures', 'hadolint'));
    });

    it('finds executable using project names', async () => {
      const paths = [
        path.join('$project_name', 'null'),
        path.join('$pRoJeCt_NaMe', 'hadolint1'),
        path.join('$PrOjEcT_nAmE', 'hadolint2'),
        path.join('$PROJECT_NAME', 'hadolint'),
      ].join(';');
      const correct = [
        path.join('fixtures', 'null'),
        path.join('fixtures', 'hadolint1'),
        path.join('fixtures', 'hadolint2'),
        path.join('fixtures', 'hadolint'),
      ].join(';');
      atom.config.set('linter-hadolint.executablePath', paths);
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(correct);
    });

    it('finds executable relative to project', async () => {
      atom.config.set('linter-hadolint.executablePath', path.join('$PROJECT', 'hadolint'));
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(path.join(fixturesDir, 'hadolint'));
    });

    it('finds executable relative to projects', async () => {
      const paths = [
        path.join('$project', 'null'),
        path.join('$pRoJeCt', 'hadolint1'),
        path.join('$PrOjEcT', 'hadolint2'),
        path.join('$PROJECT', 'hadolint'),
      ].join(';');
      atom.config.set('linter-hadolint.executablePath', paths);
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(path.join(fixturesDir, 'hadolint'));
    });

    it('normalizes executable path', async () => {
      atom.config.set('linter-hadolint.executablePath',
        path.join(fixturesDir, '..', 'fixtures', 'hadolint'),
      );
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(path.join(fixturesDir, 'hadolint'));
    });

    it('finds backup executable', async () => {
      const hadolintNotFound = path.join('$PROJECT', 'hadolint_notfound');
      const hadolintBackup = path.join(fixturesDir, 'hadolint_backup');
      atom.config.set('linter-hadolint.executablePath',
        `${hadolintNotFound};${hadolintBackup}`,
      );
      await lint(editor);
      expect(helpers.exec.getCall(0).args[0]).to.equal(path.join(fixturesDir, 'hadolint_backup'));
    });
  });
});
