<!-- Markdown Template Credits: https://github.com/othneildrew/Best-README-Template/blob/master/README.md -->

<h1 align="center">
  <strong>ChocoPy Design Document</strong>
</h1>
<p align="center">
  by Arpit Gupta and Rishabh Mittal
</p>

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [Expected Behaviours and Scenarios](#expected-behaviours-and-scenarios)
- [Proposed Changes to ast.ts](#proposed-changes-to-ast)
- [Proposed Changes to ir.ts](#proposed-changes-to-ir)
- [Milestone Test Cases](#test-cases)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
***
<br/>

## **Introduction**

This document outlines the behaviours, scenarios and test cases that we intend to build as part of the compiler, during the course of the project for CSE231 - Advanced Compiler Design (Spring 22).

## **Plan for Next Week**

We are planning to implement following features this week:

1. Inheritance
1. Lists
1. Nested functions

<br/>

***

<br/>

## **Expected Behaviours and Scenarios**

- [ ] Inheritance
  - [ ] Extending any defined class
  - [ ] Method override
  - [ ] Virtual table implementation
  
- [ ] Lists
  - [ ] Declarations and Assignments
  - [ ] Subscripting and Lookup Elements
  - [ ] Concatenation and Printing Size of List

- [ ] Nested functions
  - [ ] Declaration of nested functions inside functions/methods
  - [ ] Declaration variables in nested functions with `nonlocal`/`global` keyword

<br/>

***

<br/>

## **Proposed Changes to AST**

```
export type Type =
  ....
  | { tag: 'list',   type: Type }
  ....

export type Parameter<A> = 
{ .... }

export type Program<A> = 
  ....

export type FunDef<A> = {
  a?: A,
  name: string,
  parameters: TypedVar<A>[],
  ret: Type,
  inits: VarInit<A>[],
  body: Stmt<A>[],
  nestedFunDefs: FunDef<A>[],
  isNested: boolean,
  nonlocals: Set<string>,
  globals: Set<string>,
}

export type ClassDef<A> = {
  a?: A,
  name: string,
  superClass: string,
  methods: FunDef<A>[], // all the methods defined in the class
  fields: VarInit<A>[], // all the fields (including inherited ones)
  fieldToIndex: Map<string, number>, // field to index mapping (created this to have a O(1) lookup. could have used `fields` too)
  methodToVtableIndex: Map<string, number>, // map with key as all the methods (including inherited ones) to their relative index within the class
  vTablePointer: number, // reference to the vtable entries of this class' methods
};
  ....

export type VarInit<A> =
  ....

export type Stmt<A> =
  ....
  | { a?: A, tag: "list-assign", object: Expr<A>, index: Expr<A>, value: Expr<A>, typ: Type }
  ....

export type Expr<A> =
  ....
  | { a?: A, tag: 'subscript', object: Expr<A>, index: Expr<A> }  
  | { a?: A, tag: 'listexpr', elements: Array<Expr<A>> }
  ....

export type Value =
    Literal<Type>
  | { tag: "object", name: string, address: number}

export type Literal<A> =
  ....

```

<br/>

***

<br/>

## **Proposed Changes to IR**

```
export type Program<A> = 
{ .... }

export type Class<A> = 
{
  ....
  methodToVtableIndex: Map<string, number>,
  vTablePointer: number,
  ....
 }

export type VarInit<A> = 
{ .... }

export type FunDef<A> = 
{ .... }

export type BasicBlock<A> = 
  ....

export type Stmt<A> =
  ....

export type Expr<A> =
  ...
  | {
      a?: A,
      tag: "call-indirect",
      name: string,
      arguments: Array<Value<A>>,
      vtableAddress: Value<A> // reference to the vtable index of the method
    } 
  ....

export type Value<A> = 
  ....

```


<br/>

***

<br/>

## **Test Cases**

<details>

  <summary> Inheritance </summary>
  <br/>

  - **Extending a Class** - overriding methods
  ```
  class List(object):
    def sum(self : List) -> int:
      return 1 // 0 

  class Empty(List):
    def sum(self : Empty) -> int:
      return 0

  l : List = None
  l = Empty()
  
  print(l.sum())
  ```
  > The above program must print `0`

  <br/>

  - **Overriding Methods** - overriding constructor
  ```
  class Animal(object):
    legs: int = 0

  class Human(Animal):
    def __init__(self: Human):
      self.legs = 2

  human : Animal = None
  human = Human()
  
  print(human.legs)
  ```
  > The above program must print `2`

  <br/>

  - **Overriding Fields**
  ```
  class Animal(object):
    legs: int = 0

  class Human(Animal):
    pass

  human : Animal = None
  human = Human()
  
  print(human.legs)
  ```
  > The above program must print `0`

  <br/>

  - **Overriding Fields**
  ```
  class Animal(object):
    legs: int = 0

  class Human(Animal):
    legs: int = 2
  ```
  > The above program must throw a `TYPE ERROR` because overriding a field is not allowed in ChocoPy

  <br/>

  - **Overriding Fields** - accessing inherited and private field
  ```
  class Animal(object):
    brain: int = 1
    legs: int = 0

  class Human(Animal):
    hands: int = 2
    def __init__(self: Human):
      self.legs = 2
    
  human: Animal = None
  human = Human()
  
  print(human.brain)
  print(human.hands)
  ```
  > The above program must print -
  ```
  1
  2
  ```

  <br/>

  - **Accessing Super Class' Method**
  ```
  class Animal(object):
    brain: int = 1
    legs: int = 0

    def getLegs(self: Animal) -> int:
      return self.legs

  class Human(Animal):
    hands: int = 2
    def __init__(self: Human):
      self.legs = 2
    
  human: Animal = None
  human = Human()
  
  print(human.getLegs())
  ```

  > The above program must print `2`

  <br/>

  - **Accessing Overridden Method**
  ```
  class Animal(object):
    brain: int = 1
    legs: int = 0

    def getLegs(self: Animal) -> int:
      return self.legs
    
    def walk(self: Animal) -> int:
      return 1 // 0

  class Human(Animal):
    hands: int = 2
    def __init__(self: Human):
      self.legs = 2
    
    def walk(self: Human) -> int:
      return 1
    
  human: Animal = None
  human = Human()
  
  print(human.walk())
  ```

  > The above program must print `1`

  - **Linked List Example**
  ```
  class List(object):
    def sum(self : List) -> int:
      return 1 // 0 

  class Empty(List):
    def sum(self : Empty) -> int:
      return 0

  class Link(List):
    val : int = 0
    next : List = None
    
    def sum(self : Link) -> int:
      return self.val + self.next.sum()
    
    def new(self : Link, val : int, next : List) -> Link:
      self.val = val
      self.next = next
      return self

  l : List = None
  l = Link().new(5, Link().new(13, Empty()))
  
  print(l.sum())
  ```
  > The above program must print `18`

  <br/>

</details>

<details>
  <summary> List </summary>

  <br/>

  - **List Declaration and Assignment** - of primitive Data Type
  ```
  myList : [[int]] = None
  myList = [[1, 2], [3, 4], [5], [6, 7, 8, 9]]

  print(myList[3][3])
  ```
  > The above program must print `9`

  <br/>

  - **List Declaration and Assignment** - of unknown Data Type
  ```
  myList : [[cls]] = None
  myList = [[1, 2], [3, 4], [5], [6, 7, 8, 9]]

  print(myList[3][3])
  ```
  > The above program must throw a `TYPE ERROR` because `cls` is not a defined class

  <br/>

  - **List Declaration and Assignment** - of incompatible Data Type
  ```
  myList : [bool] = None
  myList = [True, False, True, 1]

  print(myList[0])
  ```
  > The above program must throw a `TYPE ERROR` because `1` is not a valid element for integer list

  <br/>

  - **List Subscripting** - valid index
  ```
  myList : [int] = None
  myList = [99, 88, 77, 66, 55]

  print(myList[2])
  ```
  > The above program must print `77`

  <br/>

  - **List Subscripting** - index out of bounds
  ```
  myList : [int] = None
  myList = [99, 88, 77, 66, 55]

  print(myList[20])
  ```
  > The above program must return a `RUNTIME ERROR`

  <br/>

  - **List Length** - printing size of list
  ```
  myList : [int] = None
  myList = [99, 88, 77, 66, 55]

  print(len(myList))
  ```
  > The above program must print `5`

  <br/>

  - **List Concatenation** - compatible list types
  ```
  myList1 : [int] = None
  myList2 : [int] = None
  myList3 : [int] = None

  myList1 = [1, 2, 3]
  myList2 = [4, 5, 6]
  myList3 = myList1 + myList2

  print(myList1[3])
  ```
  > The above program must compile successfully, and print `4`

  <br/>

  - **List Concatenation** - incompatible list types
  ```
  myList1 : [int] = None
  myList2 : [bool] = None
  myList3 : [int] = None

  myList1 = [1, 2, 3]
  myList2 = [True, False, True]
  myList3 = myList1 + myList2

  print(myList1[3])
  ```
  > The above program must throw a `TYPE ERROR` because an list of integers cannot be concatenated with a list of booleans

  <br/>

</details>

<details>
  <summary> Nested Functions </summary>
  <br/>

  - **Singly Nested Function** - basic test case
  ```
  def f(x: int) -> int:
    def g(y: int) -> int:
      return x + y
    return g(2)
  
  print(f(1))
  ```
  > The above program must print `3`

  <br/>

   - **Calling Nested Function Twice**
   ```
    def f(x: int) -> int:
      def g(y: int) -> int:
        return x + y
      return g(10) + g(7)
    
    print(f(6))
  ```
  > The above program must print `29`

  <br/>

  - **Multiple Nested Functions**
  ```
  def f(x: int) -> int:
    def g(y: int) -> int:
      return x + y
    
    def h(z: int) -> int:
      return x + z
    
    return g(10) + h(7)
  
  print(f(6))
  ```
  > The above program must print `29`

  <br/>

  - **Multiple Nested Functions** - one calling the other
  ```
  def f(x: int) -> int:
    def g(y: int) -> int:
      return x + y
    
    def h(z: int) -> int:
      return g(z + x) + 11
    
    return g(10) + h(7)
  
  print(f(6))
  ```
  > The above program must print `46`

  <br/>

  - **Recursion in Nested Functions**
  ```
  def f(x: int) -> int:
    def factorial(n: int) -> int:
      if n <= 1:
        return 1
      return n * factorial(n - 1)
    return factorial(x)
  
  print(f(5))
  ```
  > The above program must print `120`

  <br/>

  - **Nested Functions with IF Statements**
  ```
  def f(x : int) -> int:
    def g(y : int) -> int:
      if y > 10:
        return h(y + n)
      else:
        return x
    
    def h(z : int) -> int:
      n : int = 0
      n = 100 + z
      return x + n
    
    n : int = 0
    n = 500
    
    return g(15) + g(7)
  
  print(f(6))
  ```
  > The above program must print `627`
  
  <br/>

  - **Shadowing Nested Functions** - redeclaring `f()` as a nested function inside `g()`, with different signature than original
  ```
  def f() -> int:
    def g(y: int) -> int:
      def f(x: int) -> int:
          return x + 1
      return y + f(2)
    return g(4)
  
  print(f())
  ```
  > The above program must print `7`

  <br/>

  - **Incorrect Return Type in Nested Function** - function signature returns `int`, but body returns `None`
  ```
  def f(x: int) -> int:
    def g(y: int) -> int:
      return
  
  print(g(2))
  ```
  > The above program must throw a `TYPE ERROR`

  <br/>

  - **Incorrect Return Type in Nested Function** - function signature returns `None`, but body returns `int`
  ```
  def f(x: int) -> int:
    def g(y: int):
      return y
    return g(2)
  ```
  > The above program must throw a `TYPE ERROR`

  <br/>

  - **`nonlocal` Keyword Overrides `local` Variable** - overrides parameter
  ```
  def fun():
    def f(x: int):
      nonlocal x
      pass
    pass
  ```
  > The above program must throw a `TYPE ERROR`

  <br/>

  - **`nonlocal` Keyword Overrides `local` Variable** - overrides local variable
  ```
  def fun():
    def f(x: int):
      z: int = 2
      nonlocal z
      pass
    pass
  ```
  > The above program must throw a `TYPE ERROR`

  <br/>

  - **`nonlocal` Keyword in a Function that is not Nested**
  ```
  z: int = 3
  def fun():
    nonlocal z
    def f(x: int):
      pass
    pass
  ```
  > The above program must throw a `TYPE ERROR`

  <br/>

  - **Forward Reference to `nonlocal` Variables**
  ```
  def f() -> int:
    def g() -> int:
      nonlocal x
      x = 2
      return x

    x: int = 0
    g()
    return x

  print(f())
  ```
  > The above program must print `2`

  <br/>

- **`nonlocal` Keyword Tests**
  ```
  def f(x: int) -> int:
    def g(y: int) -> int:
      nonlocal x
      x = x + y
      return x
    return g(2) + x
  
  print(f(7))
  ```
  > The above program must print `18`

  <br/>

  - **`nonlocal` Keyword in Triple Nested Functions**
  ```
  def f(x : int) -> int:
    def g(z: int):
      def h(y: int):
        nonlocal x
        nonlocal z
        x = 4
        return
      
      h(z)
      return
    
    g(1)
    return x
  
  print(f(1))
  ```
  > The above program must print `4`

  <br/>

</details>

<br/>

***
