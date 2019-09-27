import { ArchetypedExtension } from './extension';

export interface ExtensionConfig {
  packagePath: string;
  trusted?: boolean | Function;
  key?: string;
  [key: string]: any;
}

export interface ExtensionManifest extends ExtensionConfig {
  consumes: string[];
  provides: string[];
}

export interface ExtensionModuleDefinition extends ExtensionManifest {
  resolvedPath: string;
}

export interface ExtensionDefinition extends ExtensionModuleDefinition {
  checked: boolean;
  class: ArchetypedExtension;
}

export type ArchetypedConfig = ExtensionDefinition[];
