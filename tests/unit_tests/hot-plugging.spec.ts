import { expect } from 'chai';
import { EventEmitter } from 'events';
import { basename, dirname, resolve } from 'path';
import { createApp, resolveConfig } from '@archetyped/index';
import Archetyped from '@archetyped/archetyped';
import { ArchetypedConfig } from '@archetyped/lib';

describe('Archetyped Hot Plugging', () => {
  let appConfig: ArchetypedConfig;
  let basePath: string;

  before(() => {
    basePath = resolve(dirname(__dirname), 'build', 'demos', 'tests');
    appConfig = resolveConfig([{ packagePath: 'math' }], basePath);
  });

  it('should create an instance of Archetyped', () => {
    createApp(appConfig, (err, app) => {
      expect(app).to.not.be.null;
      expect(app instanceof EventEmitter).to.be.true;
      expect(app instanceof Archetyped).to.be.true;
    });
  });

  it('should load and register new services', () => {
    const app = createApp(appConfig);
    app!.on('ready', () => {
      const math = app!.services.math;
      expect(math).to.be.ok;
      app!.removeAllListeners();

      const newConfig = resolveConfig(
        [{ packagePath: './extensions/calculator' }],
        basePath
      );
      app!.on('ready', () => {
        const math2 = app!.services.math;
        const calculator = app!.services.calculator;
        expect(math).to.equal(math2);
        expect(calculator).to.be.ok;
      });
      app!.load(newConfig);
    });
  });

  it("should not load an extension if its dependencies aren't met", () => {
    const app = createApp([]);
    app!.on('ready', () => {
      app!.removeAllListeners();

      app!.on('error', (event: { error?: string; [key: string]: any }) => {
        expect(event.extensions.length).to.equal(0);
      });

      const newConfig = resolveConfig(
        [{ packagePath: './extensions/calculator' }],
        basePath
      );
      app!.on('ready', () => {
        const calculator = app!.services.calculator;
        expect(calculator).to.be.undefined;
        expect(app!.extensions.length).to.equal(0);
      });
      app!.load(newConfig);
    });
  });
});
