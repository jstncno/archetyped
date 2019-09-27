import { EventEmitter } from 'events';
import { basename } from 'path';
import { ArchetypedConfig, ArchetypedExtension, ExtensionConfig, ExtendedError, Service } from './lib';
import { DependencyGraph, Dependency } from './utils/dependency-graph';
import { ExtensionDefinition } from './lib/config';

/**
 * A subclass of [[EventEmitter]] that dynamically loads
 * [[ArchetypedExtension]]s.
 * @param config A list of [[ArchetypedExtension]] configurations.
 * @event "ready" Emitted when all extensions have loaded
 * @event "service" Emitted when an extension's service has been registered
 * @event "extension" Emitted when an extension is loaded and registered
 * @event "error" Emitted when an error occurs
 */
export default class Archetyped extends EventEmitter {

  /**
   * A mapping of extension names to the names of the services it provides.
   */
  packages: {[name: string]: string[]} = {};

  /**
   * A mapping of provided services to the package it's contained in.
   */
  serviceToPackage: any = {};

  /**
   * A mapping of provided services names to its functionality.
   */
  services: Service = {
    hub: {
      on: this.on.bind(this),
    },
  };

  /**
   * A list of provided extension `destroy` methods.
   */
  private destroyExtensionCallbacks: Function[] = [];

  /**
   * A list of provided extension `onAppReady` methods.
   */
  private appReadyExtensionCallbacks: Function[] = [];

  /**
   * A list of [[ArchetypeExtension]] configurations, sorted by dependencies.
   */
  get extensions(): ArchetypedConfig {
    return this.sortedExtensions;
  }

  /**
   * A list of [[ArchetypeExtension]] configurations, sorted by dependencies.
   */
  private sortedExtensions: ArchetypedConfig;

  constructor(private readonly config: ArchetypedConfig) {
    super();
    this.sortedExtensions = this.checkConfig(this.config);

    // Give createApp some time to subscribe to our "ready" event
    (typeof process === "object" ? process.nextTick : setTimeout)(this.loadExtensions.bind(this));
  }

  /**
   * Hot-plugs a new set of extensions
   */
  load(extensions: ArchetypedConfig) {
    const sorted: ArchetypedConfig = [...this.config, ...extensions];
    this.sortedExtensions = this.checkConfig(sorted);
    this.loadExtensions();
  }

  /**
   * Destroys all extensions that provide destroy methods
   */
  destroy() {
    this.destroyExtensionCallbacks.forEach((destroy: Function) => {
      destroy();
    });
    this.destroyExtensionCallbacks = [];
  }

  /**
   * Checks validity of [[ExtensionConfig]]s and sorts them by dependency.
   * @param config A list of [[ExtensionConfig]].
   * @param lookup A function to check if a services has been registered.
   */
  private checkConfig(config: ArchetypedConfig, lookup?: Function): ExtensionDefinition[] {
    // Check for the required fields in each plugin.
    config.forEach((extension: ExtensionConfig) => {
      if (extension.checked) return;
      const debugMsg = JSON.stringify(extension);
      if (!extension.class) {
        throw new Error(`Extension is missing the class function ${debugMsg}`);
      }
      if (!extension.provides) {
        throw new Error(`Extension is missing the provides array ${debugMsg}`);
      }
      if (!extension.consumes) {
        throw new Error(`Extension is missing the consumes array ${debugMsg}`);
      }
    });

    return this.checkCycles(config, lookup);
  }

  /**
   * Ensure there are no cyclic dependencies among extensions.
   * @param config A list of [[ExtensionConfig]].
   * @param lookup A function to check if a services has been registered.
   */
  private checkCycles(config: ArchetypedConfig, lookup?: Function): ExtensionDefinition[] {
    const graph = new DependencyGraph([...config]);
    const result = graph.resolve();
    if (result.error) {
      this.emit('error', result);
      return [];
    }
    const sorted = result.extensions;
    if (!sorted) {
      const err = 'Error resolving dependency graph';
      console.error(err);
      this.emit('error', {extensions: [], error: err});
      return [];
    }
    return sorted;
  }

  /**
   * Loads each extension by instantiating and registering them.
   */
  private loadExtensions() {
    this.sortedExtensions.forEach((config: ExtensionConfig) => {
      const imports: {[name: string]: Service} = {};

      if (config.consumes) {
        config.consumes.forEach((service: string) => {
          imports[service] = this.services[service];
        });
      }

      const extensionName = basename(config.packagePath);
      if (!this.packages[extensionName])
        this.packages[extensionName] = [];

      try {
        const extension = new config.class(config, imports);
        this.register(extensionName, extension);
        this.appReadyExtensionCallbacks.push(extension.onAppReady.bind(extension));
        this.destroyExtensionCallbacks.push(extension.destroy);
      } catch (err) {
        console.error(err);
        err.extension = config;
        this.emit('error', err);
      }
    });

    this.emit('ready', this);
    this.appReadyExtensionCallbacks.forEach((callback: Function) => {
      callback();
    });
  }

  /**
   * Registers an [[ArchetypedExtension]].
   */
  private register(name: string, extension: ArchetypedExtension) {
    if (extension.config.provides) {
      const provided = extension.getServices();
      extension.config.provides.forEach((service: string) => {
        if (!provided[service]) {
          const debug = JSON.stringify(extension);
          const err = new ExtendedError(
            `Plugin failed to provide ${name} service.\n${debug}`);
          err.extension = extension;
          return this.emit('error', err);
        }
        this.services[service] = provided[service];
        this.serviceToPackage[service] = {
          path: extension.config.packagePath,
          package: name,
          version: extension.config.version,
        };
        this.packages[name].push(service);
        this.emit('service', service, this.services[service], extension);
      });

      this.emit('extension', extension);
    }
  }
}
