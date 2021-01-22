// `sortedIndex` performs a binary search and returns index where value was found
//  or should be inserted in the sorted array
//
//  Note:
//  * Interface is similar to underscore's _.sortedIndex()
//    However this implementation uses better binarySearch based on binarySearch.ts
//    that does not overflow.

export const sortedIndex = <A>(
  sortedArray: ArrayLike<A>,
  value: A,
  comparator: (a: A, b: A, index?: number, sortedArray?: ArrayLike<A>) => any,
  // Notes about comparator return value:
  // * when a<b the comparator's returned value should be:
  //   * negative number or a value such that `+value` is a negative number
  //   * examples: `-1` or the string `"-1"`
  // * when a>b the comparator's returned value should be:
  //   * positive number or a value such that `+value` is a positive number
  //   * examples: `1` or the string `"1"`
  // * when a===b
  //    * any value other than the return cases for a<b and a>b
  //    * examples: undefined, NaN, 'abc'
  low?: number,
  high?: number
): number => {
    var mid;
    var cmp;

    if (low === undefined) {
        low = 0;
    } else {
        //eslint-disable-next-line no-bitwise
        low = low | 0;
        if (low < 0 || low >= sortedArray.length) {
            throw new RangeError('invalid lower bound');
        }
    }

    if (high === undefined) {
        high = sortedArray.length - 1;
    } else {
        //eslint-disable-next-line no-bitwise
        high = high | 0;
        if (high < low || high >= sortedArray.length) {
            throw new RangeError('invalid upper bound');
        }
    }

    while (low <= high) {
        //See https://github.com/darkskyapp/binary-search/pull/20
        /* low + high >>> 1 could fail for array lengths > 2**31 because >>>
         * converts its operands to int32. low - (high - low >>> 1) works for
         * array lengths < 2**32 which is also Javascript's max array length. */
        //eslint-disable-next-line no-bitwise
        mid = low + (high - low >>> 1);
        cmp = +comparator(sortedArray[mid], value, mid, sortedArray);

        if (cmp < 0.0) {
            // Too low.
            low = mid + 1;
        } else if (cmp > 0.0) {
            // Too high.
            high = mid - 1;
        } else {
            // Key found.
            return mid;
        }
    }

    //Key is not found. This is place to insert
    return low;
};
