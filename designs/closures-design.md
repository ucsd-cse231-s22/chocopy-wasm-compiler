# Closures Design Document

## What we implemented

We implemented what we committed to with the exception of free and nonlocal variables. We 
mostly stuck to our original plan.

If expressions are fully implemented, however once inheritance is implemented
more work may need to be done.

First class functions are implemented except for methods.

Lambdas are implemented via the mklambda function.

Nested functions are implemented.

There is a new Callable type which lambdas and functions both are.

The main IDE and REPL fully works with the new features.

Look to our new tests to see what interesting things should be run.

## Callable Type

**Parsing requires <ins>"@lezer/python": "^0.16.0"</ins> (or elbow grease)**

### Grammar

```text
callable := Callable[[ [<type> [, <type>]* ]? ], <type> ]
type := ...
| <callable>
```

### AST

```ts
type Type = ...
| { tag: "callable", params: Array<Type>, ret: Type }
```

---

## Lambda expression (`mklambda`)

### Grammar

```text
lambda_expr := lambda [<name> [, <name>]*]? : <expr>
expr := ...
| mklambda(<callable>, <lambda_expr>)

scopedef := nonlocal <name>
fundef := ...
   <vardef | scopedef>*
```

### AST

```ts
type FunDef<A> = {
  ...
  nonlocals: Array<string>,
  parent?: FunDef<A>
}
type Lambda<A> = {
  a?: A,
  tag: "lambda",
  params: Array<Parameter<A>>,
  expr: Expr<A>,
  parent?: Lambda<A> | FunDef<A>
}

type Expr<A> =
  ...
  | Lambda<A>
type Stmt<A> =
  ...
  | FunDef<A>
```

We keep a reference to the parent function definition, if any, so that we are able to resolve variables that aren't parameters or locally declared. During type checking, we search recursively up the tree, checking parameters and local variables along the way. During the `lower` step, we handle captured variables by storing them as fields in the closure class ([see below](#handling-captured-variables)).

Non-locals are put in a separate array which is checked on any assignment statements of the closure body. Here, `nonlocal` simply designates that a non-local variable is mutable.

---

## `if` expression

We would like to have `if` expressions to express ternary/conditional logic in lambda bodies.

### Grammar

```text
expr := ...
| <expr> if <expr> else <expr>
```

### AST

```ts
type Expr<A> = ...
| { a?: A, tag: "if-expr", cond: Expr<A>, thn: Expr<A>, els: Expr<A> }
```

---

## Representation of `Callable`

Each function definition (including builtins) is wrapped in a class so that we can store references to them. A function definition in code is transformed into a class definition and a variable definition as follows:

```python
def a():
  print("hello")
```

```python
class a_$closure(object):
  def apply():
    print("hello")
a: a_$closure = a_$closure()
```

The name is mangled to avoid aliasing with user-defined classes.

Anonymous functions are transformed identically, sans variable definition as they are nameless. To reference these functions in WASM, we generate a unique name for each.

```python
lambda: print("hello")
```

```python
class lambda_$123(object):
  def apply():
    print("hello")
lambda_$123()
```

Callables are nullable because we may want to store a function reference without creating a dummy lambda in the declaration. Calling a `None` function results in a runtime error. We will represent `None` callables as zeros, which is the same way we represent `None` objects.

---

## Handling captured variables

Nested functions have `parent` fields that reference the function that contains it (one level up), and writes to fields of parent objects carry reference semantics, getting desired `nonlocal` behavior.

```python
def f(x: int) -> int:
  def g(y: int) -> int:
    return h(y) + x
  def h(z: int) -> int:
    nonlocal x
    x = z
    return x + 1
  return g(10) + g(7)
print(f(6))
```

```python
class f_$closure:
  x: int = 0
  def apply(self: f_$closure, x: int) -> int:
    self.x = x
    g: g_$closure = None
    h: h_$closure = None
    g = g().setParent(self)
    h = h().setParent(self)
    return g.apply(10) + g.apply(7)
class g_$closure:
  parent: f_$closure = None
  def apply(self: g_$closure, y: int) -> int:
    return self.parent.h.apply(y) + self.parent.x
  def setParent(self: g_$closure, parent: f_$closure) -> g_$closure:
    self.parent = parent
    return self
class h_$closure:
  parent: f_$closure = None
  def apply(self: h_$closure, z: int) -> int:
    self.parent.x = z
    return self.parent.x + 1
  def setParent(self: h_$closure, parent: f_$closure) -> h:
    self.parent = parent
    return self
f: f_$closure = None
f = f_$closure()
print(f.apply(6))
```

In general, variable definitions in the immediate scope of a function definition are stored as fields of the resulting closure class so that nested functions can read and write these values by reference.

Other than global variables and functions, since nested functions can only read variables in the scope of direct ancestors (parent, grandparent, etc.), and they can only call functions that are siblings of direct ancestors, it is sufficient to only store references to parent closures.

The argument of `setParent` will be `self` or `None` depending on whether the function is nested or in the global scope. We keep track of captured variable scopes during type-checking by recursively searching up the tree.

Global variables can't be assigned to via `nonlocal` within a function, but can be referred to. Because of this, we don't need to do any work to capture them and can simply refer to them by name.

---

## Test Cases

### 1. Nonlocal
(not yet implemented)

```python
def f(x: int):
  def g():
    nonlocal x
    x = x + 1
    print(x)
  g()
  g()
f(5)
```

Should pass, yielding `6\n7`.

### 2. Lambda as argument

```python
def apply(func: Callable[[int], bool], arg: int) -> bool:
    return func(arg)
isEven: Callable[[int], bool] = None
isEven = mklambda(
  Callable[[int], bool],
  lambda num: num % 2 == 0
)
print(apply(isEven, 9))
```

Should pass, yielding `False`.

### 3. Type checking in lambda

```python
isEven: Callable[[int], bool] = None
isEven = mklambda(
  Callable[[int], bool],
  lambda num: num + None == 0
)
```

Should yield type error on BinOp.

### 4. Type checking of lambda itself

```python
isEven: Callable[[int], bool] = None
isEven = mklambda(
  Callable[[int], int],
  lambda num: num
)
```

Should yield type error on assignment.

### 5. Currying
(not yet implemented) (because it uses free variables)

```python
add: Callable[[int], Callable[[int], int]] = None
add_5: Callable[[int], int] = None
add = mklambda(
  Callable[[int], Callable[[int], int]],
  lambda a: mklambda(
    Callable[[int], int],
    lambda b: a + b
  )
)
add_5 = add(5)
print(add_5(6))
```

Should pass, yielding `11`.

### 6. Storing function reference

```python
def add(a: int, b: int) -> int:
    return a + b
add_ref: Callable[[int, int], int] = None
add_ref = add
print(add_ref(5 + 8))
```

Should pass, yielding `13`.

### 7. Two callables, one variable

```python
def add(a: int, b: int) -> int:
    return a + b
add_ref: Callable[[int, int], int] = None
add_ref = add
print(add_ref(5, 8))
add_ref = mklambda(
  Callable[[int, int], int],
  lambda a, b: a + b + 1
)
print(add_ref(5, 8))
```

Should pass, yielding `13\n14`.

### 8. Bad argument to lambda

```python
a: Callable[[int], int] = None
a = mklambda(
  Callable[[int], int],
  lambda a: a
)
print(a(True))
```

Should yield type error on function call.
(This works in mypy, but it shouldn't.)

### 9. No arguments

```python
noop: Callable[[], None] = None
noop = mklambda(
  Callable[[], None],
  lambda: None
)
noop()
```

Should pass.

### 10. Global reference
(not yet implemented)

```python
a: int = 4
def f():
  def g():
    print(a + 1)
  print(a)
  return g
f()()
```

Should print `4\n5`

### 11. Fixed-point Combinator
(not yet implemented) (Uses free variables)

```python
def fix(f: Callable[[Callable[[int], int]], Callable[[int], int]]) -> Callable[[int], int]:
  def f1(x: int) -> int:
    return f(fix(f))(x)
  return f1
def fact_to_fix(rec: Callable[[int], int]) -> Callable[[int], int]:
  def fact(x: int) -> int:
    return 1 if x == 0 else rec(x - 1) * x
  return fact
fact = fix(fact_to_fix)
print(fact(5))
```

Should print `120`

## Milestone 2

For milestone 2, we will be implementing free variables. Variables used within functions do not necessarily have to be local to the function. This includes implementing nonlocal, which allows mutability of nonlocal variables. We will implement this by capturing any variables as fields of functions. Functions will have a reference to their parents, allowing them to access variables in upper scopes.

Our desired functionality is to have the following work, among other tests:

```python
def f(x: int):
  def g():
    nonlocal x
    x = x + 1
    print(x)
  g()
  g()
f(5)
```

Should pass, yielding `6\n7`.

Another feature we want to add is first-class methods. We want to be able to do the following:

```python
class A:
    x: int = 0
    def f(self: A, x: int):
        self.x = self.x + x
        print(self.x)

f: Callable[[A, int], None] = A.f
g: Callable[[int], None] = A().f

a: A = A()

f(a, 3)
f(a, 3)
g(3)
g(3)
```

This should print `3\n6\n3\n6`. The way we will accomplish this is by transforming it to the following:

```python
class A:
    x: int = 0
    def f(self: A, x: int):
        self.x = self.x + x
        print(self.x)

f: Callable[[A, int], None] = A.f
__g: A = A()
g: Callable[[int], None] = lambda x: A.f(__g, x)
a: A = A()

f(a, 3)
f(a, 3)
g(3)
g(3)
```

By wrapping it in a lambda, we bind the first argument of the method to the object of the lookup expression, evaluated before creating the closure and passed as a free (implicit) variable.