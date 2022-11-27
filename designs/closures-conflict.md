# Conflicts (Compiler A)
## Bignums

Since binops now compile to calls to JavaScript, there could be issues with if-expressions if the return value is different than in native WASM. However it appears that the value put on the stack is consistent so there should be no issue here. Our current tests should be sufficient to test basic functionality. We may have to add tests to ensue large numbers work in the condition part of if-expressions.

```python
x: int = 4000000000
y: int = 3000000000
print(x if x > y else y)
>>> 4000000000
```

It should not be an issue that this is greater than a 32 bit number. Addresses of bignums as results should also be passed correctly.
```python
x: Callable[[int, int], int] = None
x = mkLambda(Callable[[int, int], int], lambda a, b: a + b)
print(x(1, 1))
>>> 2
```

## Built-in libraries

The Built-ins group proposes adding a new stage called "import handling" to create an "Expanded AST". If this stage is a drop-in replacement like they claim, there should be no issue. Since this stage comes before type-check, it is possible that those functions could become first-class functions.

Here is an example that will not currently work:

```python
x: Callable[[int, int], int] = None
x = gcd
```

A workaround is to wrap built-ins with lambda expressions.

```python
gcdLambda: Callable[[int, int], int] = None
gcdLambda = mkLambda(Callable[[int, int], int], lambda a, b: gcd(a, b))
gcdLambda(10, 5)
```
 
## Comprehensions

There should be no conflicts with list comprehensions. If the first-class function / if-expression returns a list to iterate over, it should just work since the expression is evaluated once, then the result is iterated over.

There may be some testing to do for the case where there is an if-expression in the condition part of the list-comprehension.

```python
[a for a in range(1, 11) if (True if a == 2 else False)]
```

First-class functions should be checked in the condition as well.

```python
x: Callable[[int], bool] = None
x = mkLambda(Callable[[int], bool], lambda q: q == 2)
[a for a in range(1, 11) if x(a)]
```

The final thing, that should work, is:

```python
x: Callable[[], [int]] = None
x = mkLambda(Callable[[], [int]], lambda: range(1, 11))
[a for a in x() if a == 2]
```

## Destructuring assignment
Destructuring assignment is orthogonal to closures and first class functions.  Assigning muliple first class functions should be possible since they only have to store the refrence to the function.

```py
def foo(a: int, b: int) -> bool:
    return a == b
def bar(a: bool, b: bool) -> bool:
    return a == b 
x: Callable[[int, int], bool] = None
y: Callable[[bool, bool], bool] = None
x, y = foo, bar
```

One case to consider is assignment based on if-expressions.
```py
x: int = 0
y: int = 0
x, y = 1 if True else 0, 4 if False else 6
```

`x` should be 1 and `y` should be 6.

## Error reporting

We already handled our merge conflicts with this team. There were a lot more conflicts than expected due to their changing of `Type` to `Annotation` everywhere and their changing of a builtin. 

## Fancy calling conventions

We anticipate the biggest issues to happen with this team. The main source of conflict would be how 'call' is handled, since we transform calls into a construct and a method call, which interferes greatly with what they are doing with having default arguments, and any other features they add. We first considered splitting the AST into a normal call and a first class call so that these features could be separate. We decided that this would be incredibly cumbersome because then we would have to keep track of different types of functions, and we could get into situations where we don't know at the function definition what kind of function it is. We contacted this team and asked them if they would be able to work with our changes, and they said that they would, so we will be relying on them to implement their features to be compatible with ours.

## for loops/iterators

For common cases, I don't see much interference between us and this group. It is possible to get in the following situation:

```
def f() -> List[int]:
  a = [1,2,3]
  for i in a:
    if i == 2:
      return a
print(f().next())
```

It seems like their `hasnext` method is callable directly, so we would want this to print `1`.

## Front-end user interface

Similarly, it isn't likely that we will interfere with the frontend team's work. However for the case of autocomplete there might be some iteractions to be aware of. Their autocomplete isn't type-driven, but if it was we would want to be able to use the Callable type to infer which kinds variables can be autocompleted. For example:

```
first: int = 4
firth: bool = False
a: Callable[[int], None] = None
a = mklambda(Callable[[int], None], lambda a: None)
a(fi <- this should autocomplete to first and not firth)
```

## Generics and polymorphism

We thought we would conflict with this team in use of call-indirect, however instead of using dynamic dispatch they simply do another monomorphizing pass which creates separate functions for each templated type, so this won't be an issue.

We would, however, want the following to type-check:

```python
def id[T](a: T) -> T:
  a
a: Callable[[int], int] = None
a = id[int]
```

This will take additional work for us to allow in the type-checking phase, though not having this feature shouldn't break anything.

## I/O, files

We don't forsee many conflicts with this group. The only thing is that we may want to represent their builtins as callables. This may be hard because they make the decision of implementing some of their builtins in the IR, past the type-checking step. We could remedy this by hard-coding their builtins into the env, though I think they may be working to fix this by implementing them in python or js.

## Inheritance

Inheritance will cause a couple conflicts with our changes. The first one being the use of call-indirect for dynamic dispatch. I checked their implementation of compile for this and we have slightly differing implementations. That said, we are similar enough that it would be easy for us to use their implementation or vice-versa. The big difference is that we use and expr and they use a value to represent the offset.

Another interaction with inheritance is that we want to be able to type-check the following:
```python
class A(object):
    pass
class B(A):
    pass
class C(A):
    pass
a: A = None
a = B() if True else C()
```
To get this to work, we need to type-check by having a middle step for the type where we have union type B | C, then when we assign this we need to verify that both are assignable to A.

## Lists

List types should be orthogonal to closures and first-class functions. An interesting combination of features could be the following:

```python
bitmap: [bool] = [True, False, False, True]
upTo: Callable[[int], [bool]] = None
upTo = mklambda(Callable[[int], [bool]], lambda x: bitmap[...x])
print(upTo[2])
```

An issue could arise in trying to merge our parser implementations, since the Lists team has opted to use `[type]` to denote a list of `type` objects, instead of the canonical `List[type]` type hint in Python. There is an ambiguity here between the list of argument types in `Callable` type hints and the spelling of list types.

## Memory management
Nested functions store references to parent functions (up-tree) to maintain read/write access to non-local variables. The reference counting metadata added by the Memory Management group should already reflect this structure and not collect/delete closure instances for, e.g., escaping closures.

## Optimization
The addition of a new type (with type parameters) to the AST shouldn't affect optimization of the IR since `Callable` types become instnaces of closure classes, which are treated like other class instances / reference objects, and should get the benefits of constant propagation & folding without additional work. Indirect calls may be able to be reduced to known function/method calls if a closure has a definite type, e.g. declaring a lambda and immediately calling it.

## Sets and/or tuples and/or dictionaries
Set types should be orthogonal to closures and first-class functions. An interesting combination of features could be the following:

```python
def apply(f: Callable[[int], bool], x: int) -> bool:
  return f(s)
a: set[int] = {1, 2, 3}
print(apply(a.has, 5))
>>> False
```

In order for this to work properly, we need to ensure that methods of custom objects added by the Sets group (and other teams) are added as `Callable` instance fields (with a bound `self` parameter).

## Strings

String types should be orthogonal to closures and first-class functions. An interesting combination of features could be the following:

```python
def apply(f: Callable[[str], int], s: str) -> int:
  return f(s)
print(apply(len, 'abc'))
>>> 3
```

In order for this to work properly, we need to ensure that built-in functions added by the Strings group (and other teams) are added as `Callable` global variables as well as top-level functions. For functions such as `print` or `len` that are overloaded with multiple type signatures (different argument types), we would have to get clever about how to represent them using a shared name.