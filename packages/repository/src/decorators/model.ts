// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/repository
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  MetadataInspector,
  ClassDecoratorFactory,
  PropertyDecoratorFactory,
  MetadataMap,
} from '@loopback/context';
import {
  ModelDefinition,
  ModelDefinitionSyntax,
  PropertyDefinition,
} from '../model';

export const MODEL_KEY = 'loopback:model';
export const MODEL_PROPERTIES_KEY = 'loopback:model-properties';
export const MODEL_WITH_PROPERTIES_KEY = 'loopback:model-and-properties';

export type PropertyMap = MetadataMap<PropertyDefinition>;

// tslint:disable:no-any

/**
 * Decorator for model definitions
 * @param definition
 * @returns {(target:any)}
 */
export function model(definition?: Partial<ModelDefinitionSyntax>) {
  return function(target: Function & {definition?: ModelDefinition}) {
    definition = definition || {};
    const def: ModelDefinitionSyntax = Object.assign(definition, {
      name: definition.name || target.name,
    });
    const decorator = ClassDecoratorFactory.createDecorator(
      MODEL_KEY,
      definition,
    );

    decorator(target);

    // Build "ModelDefinition" and store it on model constructor
    const modelDef = new ModelDefinition(def);

    const propertyMap: PropertyMap =
      MetadataInspector.getAllPropertyMetadata(
        MODEL_PROPERTIES_KEY,
        target.prototype,
      ) || {};

    for (const p in propertyMap) {
      const propertyDef = propertyMap[p];
      const designType = MetadataInspector.getDesignTypeForProperty(
        target.prototype,
        p,
      );
      if (!propertyDef.type) {
        propertyDef.type = designType;
      }
      modelDef.addProperty(p, propertyDef);
    }

    target.definition = modelDef;
  };
}

/**
 * Decorator for model properties
 * @param definition
 * @returns {(target:any, key:string)}
 */
export function property(definition?: Partial<PropertyDefinition>) {
  return PropertyDecoratorFactory.createDecorator(
    MODEL_PROPERTIES_KEY,
    Object.assign({}, definition),
  );
}

export namespace property {
  export const ERR_PROP_NOT_ARRAY =
    '@property.array can only decorate array properties!';
  export const ERR_NO_ARGS = 'decorator received less than two parameters';
  export const ERR_PROP_IS_ARRAY = 'Cannot use @property.oneOf on arrays';

  /**
   * Decorator for union type properties
   */
  export function oneOf(...ctors: Function[]) {
    if (ctors.length < 2) {
      throw new Error(ERR_NO_ARGS);
    }
    return function(target: Object, propertyName: string) {
      property({type: ctors, validationKey: 'oneOf'})(target, propertyName);
    };
  }

  /**
   *
   * @param itemType The class of the array to decorate
   * @param definition Optional PropertyDefinition object for additional
   * metadata
   */
  export function array(
    itemType: Function,
    definition?: Partial<PropertyDefinition>,
  ) {
    return function(target: Object, propertyName: string) {
      const propType = MetadataInspector.getDesignTypeForProperty(
        target,
        propertyName,
      );
      if (propType !== Array) {
        throw new Error(ERR_PROP_NOT_ARRAY);
      } else {
        property(
          Object.assign({array: true}, definition, {
            type: itemType,
          }),
        )(target, propertyName);
      }
    };
  }

  export namespace array {
    /**
     * Decorator for properties with type union of arrays
     */
    // tslint:disable-next-line:no-shadowed-variable
    export function oneOf(...ctors: Function[]) {
      if (ctors.length < 1) {
        throw new Error(ERR_NO_ARGS);
      }
      return function(target: Object, propertyName: string) {
        property({type: ctors, validationKey: 'oneOf', array: true})(
          target,
          propertyName,
        );
      };
    }
  }
}
