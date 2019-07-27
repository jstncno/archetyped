import { ExtensionConfig } from './config';
import { Service, ServicesColection } from './service';

export class ArchetypedExtension {

  /**
   * A mapping of provided services names to its functionality.
   */
  private services: ServicesColection = {}

  constructor(readonly config: ExtensionConfig, readonly imports: any) {}

  /**
   * Saves a [[Service]] to this extension's collection of provided services
   * that will be registered to the host [[Archetyped]] app when this extension
   * is loaded.
   * that this extension provides.
   * @param name Name of the service.
   * @param service Provided [[Service]] to be registered.
   */
  register(name: string, service: Service) {
    this.services[name] = service;
  }

  /**
   * Gets the collection of services that this extension provides.
   */
  getServices(): ServicesColection {
    return this.services;
  }

  /**
   * A function that will be called in the context of this extension when
   * the [[Archetyped]] is ready.
   */
  onAppReady() {}

  /**
   * A function that will be called when [[Archetype.destroy]] is called.
   */
  destroy() {}
}
