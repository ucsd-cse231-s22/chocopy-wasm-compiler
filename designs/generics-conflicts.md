# Generics potential conflicts

## Bignums

Since there are no new AST, Parser or TypeChecker changes we don't see any conflicts. This allows everything that worked with the existing Integer types to now work with BigNums.

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

b1 : Box[int] = None
b1 = Box()
b1.x = 434729842195649546385326856


b2 : Box[int] = None
b2 = Box()
b2.x = 547962875942649797029764986905703

print(b1.x + b2.x) # SHOULD JUST WORK
  
```

---

## Built-In Libraries

- Type-checking uses direct type tag comparisons instead of using `equalType` which could cause issues when type-variables are involved.
- Need to account for a \_\_ZERO\_\_ value for the new `float` and `...` types.

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

b1 : Box[float] = None # Monomorphization doesn't know how to deal with  \_\_ZERO\_\_ having type float
b1 = Box()
```

## First-class functions, Closures

- There would be conflicts in the `traverseType` function, nothing severe. It's as simple as keeping changes from both of our PRs
- Potential conflicts in the `isSubtype`, `isAssignable` functions but can be resolved by keeping both changes.
- Monomorphization needs to handle objects with Callable type.

**Note** : There would be potential conflict in the next Milestone when we will support generic functions.

```python

T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

  def map(self: Box[T], f: Callable[[T], T]): # Will not be monomorphized right now
    self.x = f(x)

inc: Callable[[int], int] = None
b : Box[int] = None

inc = mklambda(Callable[[int], int], lambda x: x + 1)
b = Box()
b.map(inc)
```

---

## Comprehensions

- Use `equalType` when checking the types for the `iterable`, `cond` parts of the `list-comp` expression.

```python
T = TypeVar('T')

class Repeat(Generic[T]):
  elem : T = __ZERO__
  n : int = 0
  i : int = 0

  def hasNext(self: Repeat[T]) -> bool:
    return i < n

  def next(self: Repeat[T]) -> T:
    return elem

r: Repeat[int] = None
m: int = 0

r = Repeat()
r.elem = 100
r.n = 10

[m for m in r] # SHOULD WORK AFTER MINOR CHANGES
```

---

## Destructuring Assignment

- Typechecking Assignable in destructuring needs to account for type-variables when looking up fields.

```python
T = TypeVar('T')
U = TypeVar('U')

class Pair(Generic[T, U]):
  l : T = __ZERO__
  r : U = __ZERO__

p1 : Pair[int, bool] = None
p2 : Pair[int, bool] = None

p1 = Pair()
p2 = Pair()

p1.l, p1.r = p2.l, p2.r # p1.l and p1.r will wrongly have the type "typevar" but needs to be replaced with int/bool

```

## Error Reporting

- Shouldn't have any major design conflicts
- Need to change all the annotations to use the new Annotation type
- Need to change all TypeCheckErrors to use the new constructor

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

  def foo(self: Box[T], other: Box[T]) -> bool:
    return self.x == other.x # Should fail with error message that clearly says "unconstrained" type-variables cannot be compared 
```

## Fancy calling conventions

- Default argument value should allow type-variables to be defaulted to \_\_ZERO\_\_. This should work after `isAssignable` is changed to account for this case.

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

  def set(self: Box[T], x: T = __ZERO__): # Will not work currently
    self.x = x 
```
---

## For loops, iterators

- Use `equalType` when checking the types for the `iterable`, `cond` parts of the `list-comp` expression.
- Return Type of the `next` method on the iterator needs to be specialized to account for type-parameter assignment.

```python
T = TypeVar('T')

class Repeat(Generic[T]):
  elem : T = __ZERO__
  n : int = 0
  i : int = 0

  def hasNext(self: Repeat[T]) -> bool:
    return i < n

  def next(self: Repeat[T]) -> T:
    return elem

r: Repeat[int] = None
i: int = 0

r = Repeat()
r.elem = 100
r.n = 10

for i in r: # will not work because r.hasNext has a return type "typevar"
  print(i)

```

---

## Front-end

- No real conflicts, but may need to parse and understand our convention for monomorphizing classes to properly print Generic Class types in the REPL.

```
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

b : Box[int] = None

// in REPL
>>> b # Should label it as Box[int] instead of just Box$int
```

---

## I/O

- `addFileBuildinClass` : creating class type should be done using the util method `CLASS` since we have added parameters to the class `Type`.


```
export function addFileBuildinClass(cls: Map<string, [Map<string, Type>, Map<string, [Array<Type>, Type]>, Array<string>]>) :Map<string, [Map<string, Type>, Map<string, [Array<Type>, Type]>, Array<string>]> // class is now a 3-tuple with list of type-parameters
```

## Inheritance

The inheritance team needs to be cognizant of how the syntax of Generics looks like in a program
- need to make sure to ignore the declaration of Generics while trying to parse super class fields.
- We have decided to support inheritance in classes from generic classes which would also involve a change in the way super
  classes are represented right now. Instead of `super: Array<string>`, we would need somethig like `super: Array<string, Array<string>>`
  to store the type parameters associated with a generic class.
- Changes to `isSubClass`, `isAssignable` to support type parameters

A simple example that won't work right now:
```python
  T = TypeVar('T')

  class A():
      a: int = 0

  class Box(Generic[T], A):
      x : T = __ZERO__
```

## Lists

Don't see any major conflicts.

- Need to account for \_\_ZERO\_\_ value for List

```python
T = TypeVar('T')

class ListBox(Generic[T]):
  l : [T] = None

  get(self: ListBox[T], i: int) -> T:
    return self.l[i] # Should work seamlessly
```

## Memory Management

Nothing in common as there is no overlap in modified files at all. Monomorphization removes all type variables before lowering which is when memory management comes into picture.

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

b : Box[int] = None
b = Box()
b.x = 10

# number of references to b is 1
```

---

## Optimization

Nothing in common as monomorphization removes all type variables before lowering after which optimizations are applied. All optimizations should continue to be applicable after monomorphization.

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__

  def foo(self: Box[T], v: T):
    i : int = 0
    b : int = 10

    if i + b > 5: # Constant Folding, Propagation still works !!
      self.x = v 

```
---

## Set, Dict, Tuple

- Changes to `equalSet`. Type checking of `Type` should be done some abstract function instead of comparing tags. Specifically, 
  checking equivalence of class types with generics and inheritance would be an issue.
- Similar comment for `equalType`. Just need to make sure this works as expected when doing actual type checking of set elements for generic class types.

- Need to account for \_\_ZERO\_\_ value for Sets, Dicts and Tuples

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__ # Monomorphization will fail here

b: Box[set] = None
b = Box()
b.x = {1,2,3,4}
```
---

## Strings

- Need to account for a \_\_ZERO\_\_ value for strings

```python
T = TypeVar('T')

class Box(Generic[T]):
  x : T = __ZERO__ # Monomorphization will fail here  

b: Box[str] = None
b = Box()
```
