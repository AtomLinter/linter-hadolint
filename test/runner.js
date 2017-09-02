'use babel';

import { createRunner } from 'atom-mocha-test-runner';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs-plus';
import * as path from 'path';

chai.use(chaiAsPromised);
global.assert = chai.assert;
global.expect = chai.expect;

// import chai from 'chai';
// import chaiAsPromised from 'chai-as-promised';
// import path from 'path';
//
// chai.use(chaiAsPromised);

module.exports = createRunner(
  {
    htmlTitle: `Linter Package Tests - pid ${process.pid}`,
    reporter: process.env.MOCHA_REPORTER || 'spec',
    testSuffixes: ['-spec.js', 'test.js'],
  }, (mocha) => {},
);
