import declare = require('dojo/_base/declare');

/**
 * A decorator that converts a TypeScript class into a declare constructor.
 * This allows declare constructors to be defined as classes, which nicely
 * hides away the `declare([], {})` boilerplate.
 */
export default function(...mixins: Object[]): Function {
  return function(target: Function): Function {
    //@ts-ignore: The type definition of declare() is wrong
    return declare(mixins, target.prototype);
    //* See docs for declare() https://dojotoolkit.org/api/?qs=1.9/dojo/_base/declare "Example 2"
    //  has an array of classes (mixins here) for `MyDiamond` definition.
    //* This is how esri defined this decorator... but they must have done it with an older version
    //  of typescript that did not complain.
  };
}
