import { ExtendedError } from '@archetyped/lib';
import { ExtensionDefinition } from '@archetyped/lib/config';


export interface Dependency extends ExtensionDefinition {
  id: number;
}


export class DependencyGraph {
  /**
   * A graph represented as an adjacency map.
   * Each key represents a node in the graph and
   * maps to a list of its dependencies (aka children).
   */
  private graph: {[key: string]: string[]} = {};
  private resolved: Set<string> = new Set();
  private visited: Set<string> = new Set();
  private deps: Dependency[];
  private dependencyIds: {[dependency: string]: number} = {};
  private mapped: {[id: number]: ExtensionDefinition} = {};
  constructor(deps: ExtensionDefinition[]) {
    this.deps = deps.map((dep: ExtensionDefinition, index: number) => {
      const dep_ = {
        ...dep,
        consumes: [...(dep.consumes || [])],
        provides: [...(dep.provides || [])],
        id: index,
      };
      this.mapped[index] = dep_;
      dep_.provides.forEach((provided: string) =>
        this.dependencyIds[provided] = index);
      return dep_;
    });
  }

  resolve(): ExtensionDefinition[]|undefined {
    let graph = this.buildGraph();
    if (!graph) return undefined;
    for (let dep of Object.keys(this.graph)) {
      if (this.resolved.has(dep)) {
        continue;
      }
      const resolved = this.resolveRecur(dep);
      if (!resolved) return undefined;
    }
    const orderedIds: Set<number> = Array.from(this.resolved)
      .reduce((prev, curr) => {
        prev.add(this.dependencyIds[curr]);
        return prev;
      }, new Set<number>());
    const sorted = Array.from(orderedIds).map(id => this.mapped[id]);
    return sorted;
  }

  buildGraph(): {[key: string]: string[]}|undefined {
    this.clear();
    for (let dep of this.deps) {
      for (let provided of dep.provides!) {
        // Fail if duplicate
        if (provided in this.graph) {
          console.error(`Duplicate extension provided for "${provided}"`);
          return;
        }
        this.graph[provided] = [...dep.consumes!];
        // Resolve if there no dependencies
        if (dep.consumes!.length == 0) this.resolved.add(provided);
      }
    }
    return {...this.graph};
  }

  clear() {
    this.graph = {};
    this.resolved.clear();
    this.visited.clear();
  }

  /**
   * DEPRECATED
   */
  resolveIter(config: ExtensionDefinition[], lookup?: Function) {
    let extensions: Dependency[] = config
      .map((extensionConfig: ExtensionDefinition, index: number) => {
        return {
          ...extensionConfig,
          id: index,
        };
      });

    let resolved: any = {
      hub: true,
    };
    let changed = true;
    let sorted: ExtensionDefinition[] = [];

    while(extensions.length && changed) {
      changed = false;
      let extensions_ =  [...extensions];
      extensions_.forEach((extension: Dependency) => {
        let consumes = [...extension.consumes!];
        let resolvedAll = true;

        consumes.forEach((service: string) => {
          if (!resolved[service] && (!lookup || !lookup(service))) {
            resolvedAll = false;
          } else {
            // Remove the service if already resolved
            extension.consumes!.splice(extension.consumes!.indexOf(service), 1);
          }
        });

        if (!resolvedAll) return;

        extensions.splice(extensions.indexOf(extension), 1);
        extension.provides!.forEach((service: string) => {
          resolved[service] = true;
        });
        sorted.push(config[extension.i]);
        changed = true;
      });
    }

    if (extensions.length) {
      let unresolved_: {[key: string]: string[]|null} = {};
      extensions.forEach((extensionConfig: Dependency) => {
        delete extensionConfig.config;
        extensionConfig.consumes!.forEach((service: string) => {
          if (unresolved_[service] === null) return;
          if (!unresolved_[service]) unresolved_[service] = [];
          unresolved_[service]!.push(extensionConfig.packagePath);
        });
        extensionConfig.provides!.forEach((service: string) => {
          unresolved_[service] = null;
        });
      });

      let unresolved: {[key: string]: string[]} = Object.keys(unresolved_)
        .filter((service: string) => unresolved_[service] !== null)
        .reduce((prev: {[key: string]: string[]}, service: string) => {
          prev[service] = unresolved_[service]!;
          return prev;
        }, {});

      let unresolvedList = Object.keys(unresolved);
      let resolvedList = Object.keys(resolved);
      let err: ExtendedError = new Error(`Could not resolve dependencies\n`
        + (unresolvedList.length ? `Missing services: ${unresolvedList}`
        : 'Config contains cyclic dependencies' // TODO print cycles
        ));
      err.unresolved = unresolvedList;
      err.resolved = resolvedList;
      throw err;
    }

    return sorted;
  }

  private resolveRecur(item: string): boolean {
    if (this.resolved.has(item)) return true;
    this.visited.add(item);
    const dependencies = [...this.graph[item]];
    if (dependencies.length == 0) {
      if (this.resolved.has(item)) return false;
      this.visited.delete(item);
      this.resolved.add(item);
      return true;
    }
    // Depth-First Search
    for (let dep of dependencies) {
      if (this.visited.has(dep)) {
        // Circular dependency
        return false;
      }
      if (!this.resolveRecur(dep)) return false;
    }
    this.visited.delete(item);
    this.resolved.add(item);
    return true;
  }
}