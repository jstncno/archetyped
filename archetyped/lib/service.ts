export interface Service {
  [name: string]: any;
}

/**
 * A map of [[Service]]s by their name.
 */
export type ServicesColection = { [name: string]: Service };
