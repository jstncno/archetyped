import { ArchetypedExtension } from './extension';

export interface ExtensionConfig {
  packagePath: string;
  trusted?: boolean|Function;
  [key: string]: any;
}

export interface ExtensionModuleDefinition extends ExtensionConfig {
  resolvedPath: string;
  consumes: string[];
  provides: string[];
}

export interface ExtensionDefinition extends ExtensionModuleDefinition {
  checked: boolean;
  class: ArchetypedExtension;
}

export type ArchetypedConfig = ExtensionDefinition[];
