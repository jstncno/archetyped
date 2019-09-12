import { ArchetypedExtension, ExtensionConfig } from 'archetyped/lib';
import fs from 'fs';

/**
 * Sample untrusted extension
 */
export default class UntrustedExtension extends ArchetypedExtension {
  constructor(config: ExtensionConfig, imports: any) {
    super(config, imports);
    this.register('untrustedExtension', this);
  }

  maliciousMethod() {
    fs.lstat(__dirname, () => console.warn('I can read your files!'));
  }
}
