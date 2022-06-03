// import { TypeCheckError } from "./type-check";

export type Annotation = {
  type?: Type,
  fromLoc?: Location, // include
  endLoc?: Location, // exclude
  eolLoc?: Location, // loc of the next line break
  src?: string
}
export type Location = {
  row: number,
  col: number,
  srcIdx: number,
}

// export enum Type {NUM, BOOL, NONE, OBJ}; 
export type Callable = {tag: "callable"; params: Array<Type>; ret: Type };
export type Type =
  | {tag: "number"}
  | {tag: "bool"}
  | {tag: "none"}
  | {tag: "class", name: string, params: Array<Type> }
  | {tag: "either", left: Type, right: Type }
  | {tag: "typevar", name: string }
  | Callable
  | {tag: "list", itemType: Type }
  | {tag: "empty"}

export type Parameter<A> = { a?: A, name: string, type: Type }

export type Program<A> = { a?: A, funs: Array<FunDef<A>>, inits: Array<VarInit<A>>, typeVarInits: Array<TypeVar<A>>, classes: Array<Class<A>>, stmts: Array<Stmt<A>> }

export type Class<A> = { a?: A, name: string, fields: Array<VarInit<A>>, methods: Array<FunDef<A>>, typeParams: Array<string> }

export type TypeVar<A> = { a?: A, name: string, canonicalName: string, types: Array<Type> }

export type VarInit<A> = { a?: A, name: string, type: Type, value: Literal<A> }
export type NonlocalVarInit<A> = { a?: A, name: string };

export type FunDef<A> = { a?: A, name: string, parameters: Array<Parameter<A>>, ret: Type, inits: Array<VarInit<A>>, body: Array<Stmt<A>>, nonlocals: Array<NonlocalVarInit<A>>, children: Array<FunDef<A>> }

export type Stmt<A> =
  | {  a?: A, tag: "assign", destruct: DestructuringAssignment<A>, value: Expr<A> }
  | {  a?: A, tag: "return", value: Expr<A> }
  | {  a?: A, tag: "expr", expr: Expr<A> }
  | {  a?: A, tag: "pass" }
  | {  a?: A, tag: "continue" }
  | {  a?: A, tag: "break" }
  | {  a?: A, tag: "field-assign", obj: Expr<A>, field: string, value: Expr<A> }
  | {  a?: A, tag: "index-assign", obj: Expr<A>, index: Expr<A>, value: Expr<A> } // a[0] = 1
  | {  a?: A, tag: "if", cond: Expr<A>, thn: Array<Stmt<A>>, els: Array<Stmt<A>> }
  | {  a?: A, tag: "while", cond: Expr<A>, body: Array<Stmt<A>> }
  | {  a?: A, tag: "nonlocal", name: string }
  | {  a?: A, tag: "for", iterator: string, values: Expr<A>, body: Array<Stmt<A>> }

// isSimple should be true when destruct has no comma(,)
// e.g. a, = 1, -> isSimple = false
// e.g. a = 1   -> isSimple = true
export type DestructuringAssignment<A> = { a?: A, isSimple: boolean, vars: AssignVar<A>[] }

export type Assignable<A> =
  | { a?: A; tag: "id"; name: string }
  | { a?: A; tag: "lookup"; obj: Expr<A>; field: string }

export type AssignVar<A> = { a?: A, target: Assignable<A>, ignorable: boolean, star: boolean }

export type Lambda<A> = {  a?: A, tag: "lambda", params: Array<string>, type: Callable, expr: Expr<A> };
export type Expr<A> =
    {  a?: A, tag: "literal", value: Literal<A> }
  | {  a?: A, tag: "id", name: string }
  | {  a?: A, tag: "binop", op: BinOp, left: Expr<A>, right: Expr<A>}
  | {  a?: A, tag: "uniop", op: UniOp, expr: Expr<A> }
  | {  a?: A, tag: "builtin1", name: string, arg: Expr<A> }
  | {  a?: A, tag: "builtin2", name: string, left: Expr<A>, right: Expr<A>}
  | {  a?: A, tag: "call", fn: Expr<A>, arguments: Array<Expr<A>> } 
  | {  a?: A, tag: "lookup", obj: Expr<A>, field: string }
  | {  a?: A, tag: "index", obj: Expr<A>, index: Expr<A> } // a[0]
  | {  a?: A, tag: "slice", obj: Expr<A>, index_s?: Expr<A>, index_e?: Expr<A> }
  | {  a?: A, tag: "method-call", obj: Expr<A>, method: string, arguments: Array<Expr<A>> }
  | {  a?: A, tag: "construct", name: string }
  // array-expr should be plain format like 1, 2, 3 without brackets
  // TODO: should we make use of AST nodes from list and tuple groups?
  | {  a?: A; tag: "array-expr", elements: Array<Expr<A>> }
  | {  a?: A, tag: "list-comp", typ: string, left: Expr<A>, elem: Expr<A>, iterable: Expr<A>, cond?: Expr<A>}
  | Lambda<A>
  | {  a?: A, tag: "if-expr", cond: Expr<A>, thn: Expr<A>, els: Expr<A> }

// add annotation for reporting row/col in errors
  | {  a?: A, tag: "construct-list", items: Array<Expr<A>> } // [1,2,3] or [A(), A()]


  // add annotation for reporting row/col in errors
export type Literal<A> = 
    { a?: A, tag: "num", value: bigint }
  | { a?: A, tag: "bool", value: boolean }
  | { a?: A, tag: "none" }
  | { a?: A, tag: "zero" }

// TODO: should we split up arithmetic ops from bool ops?
export enum BinOp { Plus, Minus, Mul, IDiv, Mod, Eq, Neq, Lte, Gte, Lt, Gt, Is, And, Or};

export enum UniOp { Neg, Not };

type Op = BinOp | UniOp;


export function stringifyOp(op: Op): string {
  switch (op) {
    case BinOp.Plus: return "+";
    case BinOp.Minus: return "-";
    case BinOp.Mul: return "*";
    case BinOp.IDiv: return "//";
    case BinOp.Mod: return "%";
    case BinOp.Eq: return "==";
    case BinOp.Neq: return "!=";
    case BinOp.Lte: return "<=";
    case BinOp.Gte: return ">=";
    case BinOp.Lt: return "<";
    case BinOp.Gt: return ">";
    case BinOp.Is: return "is";
    case BinOp.And: return "and";
    case BinOp.Or: return "or";
    case UniOp.Neg: return "-";
    case UniOp.Not: return "not";
    default: throw new Error("undefined op");
  }
}

export type Value<A> =
    Literal<A>
  | { a?: A, tag: "object", name: string, address: number}
  
