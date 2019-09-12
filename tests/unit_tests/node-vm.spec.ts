import { expect } from 'chai';
import { basename, dirname, resolve } from 'path';
import { VMError } from 'vm2';
import { createApp, resolveConfig } from '@archetyped/index';
import Archetyped from '@archetyped/archetyped';
import { ArchetypedConfig } from '@archetyped/lib';
import { EventEmitter } from 'events';

describe('Node VM', () => {
  let basePath: string;

  before(() => {
    basePath = resolve(dirname(__dirname), 'build', 'demos', 'node-vm');
  });

  it('should create an instance of Archetyped with a trusted extension' , () => {
    const appConfig = resolveConfig([
      {packagePath: 'trusted-extension', trusted: true},
    ], basePath);

    createApp(appConfig, (err, app) => {
      expect(app).to.not.be.null;
      expect(app instanceof EventEmitter).to.be.true;
      expect(app instanceof Archetyped).to.be.true;
    });
  });

  it('should create an instance of Archetyped with an extension trusted at runtime' , () => {
    const appConfig = resolveConfig([
      {packagePath: 'trusted-extension', trusted: () => true},
    ], basePath);

    createApp(appConfig, (err, app) => {
      expect(app).to.not.be.null;
      expect(app instanceof EventEmitter).to.be.true;
      expect(app instanceof Archetyped).to.be.true;
    });
  });

  it('should throw when we choose to not trust a trusted extension' , () => {
    expect(() => {
      resolveConfig([
        {packagePath: 'trusted-extension'},
      ], basePath);
    }).throw(VMError);
  });

  it('should throw when untrusted extension tries to acces "fs"' , () => {
    expect(() => {
      resolveConfig([
        {packagePath: './extensions/untrusted-extension'},
      ], basePath);
    }).throw(VMError);
  });
});
