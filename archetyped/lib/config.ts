export type ExtensionConfig = {
  packagePath: string;
  checked?: boolean;
  class?: any;//Extension;
  provides?: any[];
  consumes?: any[];
  trusted?: boolean;
  [key: string]: any;
};

export type ArchetypedConfig = ExtensionConfig[];
