import { dirname, resolve } from 'path';
import { existsSync, realpathSync } from 'fs';
import { NodeVM } from 'vm2';
import Archetyped from './archetyped';
import { ArchetypedConfig, ArchetypedExtension, ExtensionConfig, ExtendedError } from './lib';
import { ExtensionDefinition, ExtensionModuleDefinition } from './lib/config';


/**
 * Returns an event emitter that represents the app.
 * @param config A list of [[ArchetypedExtension]] configurations.
 * @param callback A callback function that is called when the app is either
 *   ready or has thrown an error.
 * @returns An instance of `Archetyped`
 */
export function createApp(config: ArchetypedConfig, callback?: (err?: Error, app?: Archetyped) => void): Archetyped | null {

  let app: Archetyped | null = null;

  const onReady = (app: Archetyped) => {
    done();
  };

  const done = (err?: Error) => {
    if (!app) return;
    if (err) app.destroy();
    app.removeListener('error', done);
    app.removeListener('ready', onReady);
    if (callback) callback(err, app);
  };

  try {
    app = new Archetyped(config);
    if (callback) {
      app.on('error', done);
      app.on('ready', onReady);
    }
  } catch (err) {
    if (!callback) throw err;
    callback(err, undefined);
  }

  return app;
}

/**
 * Resolves each [[ExtensionConfig]] by importing the config's module.
 * @param config A list of [[ExtensionConfig]]
 * @param base The base path of where to check for installed modules.
 * @returns An instance of [[ArchetypedConfig]] that contains module data
 *   of [[ArchetypedExtension]]s.
 */
export function resolveConfig(config: ExtensionConfig[], base?: string): ArchetypedConfig {
  const baseDir = base ? base : __dirname;
  return config.map((ext: ExtensionConfig, index: number) => {
    // Shortcut where string is used for extension without any options.
    if (typeof ext === 'string') {
      ext = config[index] = {packagePath: ext};
    }
    // The extension is a package on the disk.  We need to load it.
    const modDef: ExtensionModuleDefinition = resolveModuleSync(
      baseDir, ext.packagePath);
    // Allow default extension configs in the module definition
    Object.keys(modDef).forEach((key: string) => {
      if (!ext[key]) ext[key] = modDef[key] as any;
    });

    const {resolvedPath} = modDef;
    let {trusted} = ext;
    if (typeof ext.trusted === 'function' && ext.trusted.call) {
      trusted = ext.trusted();
    }

    let cls: ArchetypedExtension;
    if (trusted === true) {
      cls = require(resolvedPath).default;
    } else {
      // If extension is not trusted, let's run in a VM
      // TODO: Use common or configurable VM settings
      const vm = new NodeVM({
        console: 'inherit',
        sandbox: {},
        require: {
          context: 'sandbox',
          external: true,
          builtin: ['path'],
        }
      });
      cls = vm.require(resolvedPath).default;
    }

    return {
      ...modDef,
      ...ext,
      provides: [...modDef.provides],
      consumes: [...modDef.consumes],
      trusted,
      class: cls,
      checked: false,
    };
  });
}

/**
 * Loads a module, getting metadata from either it's package.json or export
 * object.
 */
function resolveModuleSync(base: string, modulePath: string): ExtensionModuleDefinition {
  let packagePath;
  try {
    packagePath = resolvePackageSync(base, `${modulePath}/package.json`);
  }
  catch (err) {
    console.error('ResolvePackage error');
    if (err.code !== 'ENOENT') throw err;
  }
  const modDef: ExtensionModuleDefinition =
    (packagePath && require(packagePath).archetypeExtension) || {};

  let resolvedPath: string;
  if (packagePath) {
    resolvedPath = dirname(packagePath);
  } else {
    resolvedPath = resolvePackageSync(base, modulePath);
  }

  const ext: ExtensionModuleDefinition = {
    // Defaults
    consumes: [],
    provides: [],
    // Module specified overrides
    ...modDef,
    // Not allowed to modify
    resolvedPath,
    packagePath: modulePath,
  };
  // TODO: Run in vm and get its providers and consumers
  // const module = require(modulePath);
  // ext.provides = ext.provides || module.provides || [];
  // ext.consumes = ext.consumes || module.consumes || [];
  return ext;
}

/** A cache of loaded package modules. */
const packagePathCache: {[packagePath: string]: any} = {};

/**
 * Node style package resolving so that plugins' package.json can be found
 * relative to the config file.
 * It's not the full node require system algorithm, but it's the 99% case.
 * This throws, make sure to wrap in try..catch
 * @param base The base path of where to check for installed modules.
 * @param packagePath The path to the package module, relative to `base`.
 * @throws [[ExtendedError]]
 */
function resolvePackageSync(base: string, packagePath: string): string {
  const originalBase = base;
  if (!(base in packagePathCache)) {
    packagePathCache[base] = {};
  }
  const cache = packagePathCache[base];
  if (packagePath in cache) {
    return cache[packagePath];
  }
  const err: ExtendedError = new Error(
    `Can't find "${packagePath}" relative to "${originalBase}"`);
  err.code = 'ENOENT';
  let newPath;
  if (packagePath[0] === '.' || packagePath[0] === '/') {
    // If `packagePath` is relative to `base`
    newPath = resolve(base, packagePath);
    if (!existsSync(newPath)) {
      newPath = `${newPath}.js`;
    }
    if (existsSync(newPath)) {
      newPath = realpathSync(newPath);
      cache[packagePath] = newPath;
      return newPath;
    }
  }
  else {
    // Check if package is installed in `node_modules` relative to `base`.
    while (base) {
      newPath = resolve(base, 'node_modules', packagePath);
      if (existsSync(newPath)) {
        newPath = realpathSync(newPath);
        cache[packagePath] = newPath;
        return newPath;
      }
      const parent = resolve(base, '..');
      if (parent === base) throw err;
      base = parent;
    }
  }
  throw err;
}
