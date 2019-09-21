import { expect } from 'chai';
import { EventEmitter } from 'events';
import { dirname, resolve } from 'path';
import { createApp, resolveConfig } from '@archetyped/index';
import Archetyped from '@archetyped/archetyped';
import { ArchetypedConfig, ExtensionConfig } from '@archetyped/lib';
import { Dependency, DependencyGraph } from '@archetyped/utils/dependency-graph';

describe('Archetyped utilities', () => {
  let deps: ExtensionConfig[]|undefined;
  let graph: DependencyGraph|undefined;

  afterEach(() => {
    deps = undefined;
    graph = undefined;
  });

  it('should be created', () => {
    deps = [];
    graph = new DependencyGraph(deps);
    expect(graph).to.not.be.undefined;
  });

  it('should resolve in simple case', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['A'], provides: ['B']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    expect(graph.resolve()).to.be.ok;
  });

  it('should reject a simple circular dependency', () => {
    deps = [
      {consumes: ['B'], provides: ['A']},
      {consumes: ['A'], provides: ['B']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    expect(graph.resolve()).to.not.be.ok;
  });

  it('should resolve a slightly more complex case', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['A', 'C'], provides: ['B']},
      {consumes: ['A'], provides: ['C']},
      {consumes: ['B'], provides: ['D']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    expect(graph.resolve()).to.be.ok;
  });

  it('should reject a slightly more complex circular dependency', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['A', 'C'], provides: ['B']},
      {consumes: ['A', 'D'], provides: ['C']},
      {consumes: ['B'], provides: ['D']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    expect(graph.resolve()).to.not.be.ok;
  });

  it('should reject a duplicate provider', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['A', 'C'], provides: ['B']},
      {consumes: ['A'], provides: ['C']},
      {consumes: ['A'], provides: ['B']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    expect(graph.resolve()).to.not.be.ok;
  });

  it('should return an ordered set of dependencies', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: [], provides: ['B']},
      {consumes: ['D', 'F'], provides: ['C']},
      {consumes: ['A', 'B'], provides: ['D']},
      {consumes: ['A', 'D'], provides: ['E']},
      {consumes: ['B'], provides: ['F']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    const orderedDepIds = graph.resolve()!.map(dep => dep.id);
    expect(orderedDepIds).to.have.ordered
      .members([0, 1, 3, 5, 2, 4]);
  });

  it('should return an ordered set of dependencies', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['D', 'F'], provides: ['C']},
      {consumes: [], provides: ['B']},
      {consumes: ['A', 'B'], provides: ['D']},
      {consumes: ['A', 'D'], provides: ['E']},
      {consumes: ['E'], provides: ['F']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    const orderedDepIds = graph.resolve()!.map(dep => dep.id);
    expect(orderedDepIds).to.have.ordered
      .members([0, 2, 3, 4, 5, 1]);
  });

  it('should resolve multiple providers', () => {
    deps = [
      {consumes: [], provides: ['A']},
      {consumes: ['D', 'F'], provides: ['C', 'Z']},
      {consumes: [], provides: ['B', 'Y']},
      {consumes: ['A', 'B'], provides: ['D', 'X']},
      {consumes: ['A', 'D'], provides: ['E']},
      {consumes: ['E'], provides: ['F']},
    ] as ExtensionConfig[];
    graph = new DependencyGraph(deps);
    const orderedDepIds = graph.resolve()!.map(dep => dep.id);
    expect(orderedDepIds).to.have.ordered
      .members([0, 2, 3, 4, 5, 1]);
  });
});
