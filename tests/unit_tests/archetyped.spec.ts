import { expect } from 'chai';
import { EventEmitter } from 'events';
import { dirname, resolve } from 'path';
import { createApp, resolveConfig } from '@archetyped/index';
import Archetyped from '@archetyped/archetyped';
import { ArchetypedConfig } from '@archetyped/lib';

describe('Archetyped', () => {
  let appConfig: ArchetypedConfig;
  let basePath: string;

  before(() => {
    basePath = resolve(dirname(__dirname), 'build', 'demos', 'tests');
    appConfig = resolveConfig([
      {packagePath: './extensions/calculator'},
      {packagePath: 'math'},
    ], basePath);
  });

  it('should call callback', () => {
    createApp(appConfig, (err, app) => {
      expect(app).to.not.be.null;
      expect(app instanceof EventEmitter).to.be.true;
      expect(app instanceof Archetyped).to.be.true;
    });
  });

  it('should register services', () => {
    const app = createApp(appConfig);
    app!.on('ready', () => {
      const math = app!.services.math;
      expect(math).to.be.ok;
      const calculator = app!.services.calculator;
      expect(calculator).to.be.ok;
    });
  });

  it('should emit event whenever extensions are registered', () => {
    const app = createApp(appConfig);
    app!.on('extension', (extension) => {
      const instanceName = extension.config.class.name
      switch (instanceName) {
        case 'Math':
          expect(extension.add(2, 2)).to.be.equal(4);
          break;
        case 'Calculator':
          const eight = extension.start(3).add(5).equals();
          expect(eight).to.be.equal(8);
          const sixteen = extension.start(eight).mult(2).equals();
          expect(sixteen).to.be.equal(16);
          const four = extension.start(sixteen).div(4).equals();
          expect(four).to.be.equal(4);
          break;
        default:
          throw new Error(`Unexpected instance: ${instanceName}`);
      }
    });
  });

  it('should raise error for failed dependecy resolution', () => {
    const config = resolveConfig([
      {packagePath: './extensions/calculator'},
    ], basePath);
    const app = createApp(config, (err, app?) => {
      expect(err).to.not.be.undefined;
      expect(app).to.not.be.ok;
    });
    expect(app).to.not.be.ok;
  });
});
