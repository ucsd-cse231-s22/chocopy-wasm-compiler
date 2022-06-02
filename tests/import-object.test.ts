import { readFileSync } from "fs";
import { binop_bignum, binop_comp_bignum, builtin_bignum, builtin_float, binop_float, binop_comp_float, load_bignum, load_float, des_check, bignum_to_i32 } from "../utils";
import { bigMath, floatMath } from "../utils";
import { importObjectErrors } from "../errors";
import { generateImportMap } from "../builtins";

enum Type { Num, Float, Bool, None }

function stringify(typ: Type, arg: any, loader: WebAssembly.ExportValue): string {
  switch (typ) {
    case Type.Num:
      return load_bignum(arg, loader).toString();
    case Type.Float:
      return load_float(arg, loader).toString();
    case Type.Bool:
      return (arg as boolean) ? "True" : "False";
    case Type.None:
      return "None";
  }
}

function print(typ: Type, arg: any, loader: WebAssembly.ExportValue): any {
  importObject.output += stringify(typ, arg, loader);
  importObject.output += "\n";
  if(typ === Type.Num)
    return Number(load_bignum(arg, loader));
  else if(typ === Type.Float)
    return Number(load_float(arg, loader));
  return arg;
}

// function assert_not_none(arg: any) : any {
//   if (arg === 0)
//     throw new Error("RUNTIME ERROR: cannot perform operation on none");
//   return arg;
// }

export async function addLibs() {
  const bytes = readFileSync("build/memory.wasm");
  const memory = new WebAssembly.Memory({initial:10, maximum:100});
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory } })
  importObject.libmemory = memoryModule.instance.exports,
  importObject.memory_values = memory;
  importObject.js = {memory};
  // empty import map because we don't have source now
  generateImportMap(new Map(), importObject);
  // console.log(importObject)
  return importObject;
}

export const importObject : any = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    //assert_not_none: (arg: any) => assert_not_none(arg),
    print_num: (arg: number) => print(Type.Num, arg, importObject.libmemory.load),
    print_float: (arg: number) => print(Type.Float, arg, importObject.libmemory.load_float),
    print_bool: (arg: number) => print(Type.Bool, arg, null),
    print_none: (arg: number) => print(Type.None, arg, null),
    destructure_check: (hashNext: boolean) => des_check(hashNext),
    // abs:  (arg: number) => builtin_bignum([arg], bigMath.abs, importObject.libmemory),
    // min: (arg1: number, arg2: number) => builtin_bignum([arg1, arg2], bigMath.min, importObject.libmemory),
    // max: (arg1: number, arg2: number) => builtin_bignum([arg1, arg2], bigMath.max, importObject.libmemory),
    // pow: (arg1: number, arg2: number) => builtin_bignum([arg1, arg2], bigMath.pow, importObject.libmemory),
    $add: (arg1: number, arg2: number) => binop_bignum([arg1, arg2], bigMath.add, importObject.libmemory),
    $sub: (arg1: number, arg2: number) => binop_bignum([arg1, arg2], bigMath.sub, importObject.libmemory),
    $mul: (arg1: number, arg2: number) => binop_bignum([arg1, arg2], bigMath.mul, importObject.libmemory),
    $div: (arg1: number, arg2: number) => binop_bignum([arg1, arg2], bigMath.div, importObject.libmemory),
    $mod: (arg1: number, arg2: number) => binop_bignum([arg1, arg2], bigMath.mod, importObject.libmemory),
    $eq: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.eq, importObject.libmemory),
    $neq: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.neq, importObject.libmemory),
    $lte: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.lte, importObject.libmemory),
    $gte: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.gte, importObject.libmemory),
    $lt: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.lt, importObject.libmemory),
    $gt: (arg1: number, arg2: number) => binop_comp_bignum([arg1, arg2], bigMath.gt, importObject.libmemory),
    $add_float: (arg1: number, arg2: number) => binop_float([arg1, arg2], floatMath.add, importObject.libmemory),
    $sub_float: (arg1: number, arg2: number) => binop_float([arg1, arg2], floatMath.sub, importObject.libmemory),
    $mul_float: (arg1: number, arg2: number) => binop_float([arg1, arg2], floatMath.mul, importObject.libmemory),
    $div_float: (arg1: number, arg2: number) => binop_float([arg1, arg2], floatMath.div, importObject.libmemory),
    $eq_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.eq, importObject.libmemory),
    $neq_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.neq, importObject.libmemory),
    $lte_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.lte, importObject.libmemory),
    $gte_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.gte, importObject.libmemory),
    $lt_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.lt, importObject.libmemory),
    $gt_float: (arg1: number, arg2: number) => binop_comp_float([arg1, arg2], floatMath.gt, importObject.libmemory),
    $bignum_to_i32: (arg: number) => bignum_to_i32(arg, importObject.libmemory.load), 
  },
  errors: importObjectErrors,

  output: "",
};

