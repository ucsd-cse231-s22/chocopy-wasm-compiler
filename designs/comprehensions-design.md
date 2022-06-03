# Comprehensions Team Design Doc

## Final Design Updates:

As for the final milestone, we planned the following goals:
 - Storing the list comprehensions as lists
 - Adding support for other types of comprehensions

Regarding the latter goal, we have added support for sets/dicts comprehensions as well as generator comprehensions which use the ```{}``` and ```()``` formats respectively. An additional field 'typ' has been added to the list-comp ast which is used to determine the type of comprehension. This field is determined in the parsing phase itself and will later be used to do different form of type-check and lowering based on its value. This will depend on the implementation of these data types by other teams and the functions will need to be modified accordingly.

We faced a couple of roadblocks (merge conflicts with the list team's changes and bignums team's changes) in order to complete the first goal. One major issue that we faced is that, whenever we were storing numbers as variables, the numbers were stored as bignums. The variable (or id) instead of storing the number was actually storing the address of the bignum. What we have done to get around this is to convert these bignums values to i32 constants to get their actual values instead of the address values.

As of now, comprehensions only work with a class (Range() in our test cases) that have methods like ```next()```, ```hasNext()```,```len()```,```iterator()```, and unfortunately we did not have sufficient time to expand it to lists, strings or sets (for example: [a for a in [1,2,3]]). Some additional functionalities from the lists team would have been very helpful (such as - len() and append() or concat()).

## Week 8 Milestones:

We plan on trying to support the below example programs:

1. store comprehensions in a variable of type list (use code by lists team)
```
A = [j for a in range(5,7)]
```

2. extend comprehension expression to use lists (use code by lists team)
```
A = [j for a in [1,2,3,4]]
```
```
B = [1,2,3,4]
A = [j for a in B]
```

3. extend comprehension expression to use strings (use code by string team)
```
A = [j for a in "compilers"]
```

4. extend comprehension expression to use sets (use code by sets/tuples/dictionaries team)
```
A = [j for a in {1,2,2,3,3,4,4,5}]
```

5. extend comprehension expression to use tuples (use code by sets/tuples/dictionaries team)
```
A = [j for a in (1,2,3,3,4,4,5)]
```

6. extend comprehension expression to use dictionaries (use code by sets/tuples/dictionaries team)
```
courses = {"cse 250A":"fall 2021","cse 231":"spring 2022"}
A = [i for i in courses]
```

7. nested comprehension expressions
```
A = [[j for j in Range.new(0,2)] for i in Range.new(0,3)]
```

To be able to store comprehensions as lists, we will use add the code from the lists team into our implementation to help contruct and store comprehensions as lists in the memory, instead of our current implementation of just printing them. To support comprehensions for additional data structures, we plan on adding another field in the ast of the list-comp and call it comp-type which would state what kind of list comprehension it contains(set/tuple/dictionary). Any additional merge conflicts that arise due to merging code from PRs from other teams will also be handled in the upcoming week. Also, few additional test cases have been added in the test file which include functions and classes.


## Week 7:
### Test cases implemented and passed:
All test cases were written in the tests/comprehension.test.ts file. Upon running this file, 15/15 teste cases passed. The following are the test cases that pass and produce the required output:

1. simple comprehension output with min and max range
```j: int = 2```
```[j for a in range(5,7)]```
Output: ```['2', '2']```

2. simple comprehension output with only max range
```j: int = 7```
```[j for b in range(5)]```
Output: ```['7', '7', '7', '7', '7']```

3. simple comprehension output with bool values
```j: bool = True```
```[j for c in range(1,5)]```
Output: ```['True', 'True', 'True', 'True']```

4. simple comprehension output with expr values
```j: int = 5```
```[j*2 for d in range(1,5)]```
Output: ```['10', '10', '10', '10']```

5. simple comprehension output using iterable class methods
```[e for e in range(1,5)]```
Output: ```['1', '2', '3', '4']```

6. simple comprehension output using iterable class methods and expr values
```[f*3 for f in range(1,5)]```
Output: ```['3', '6', '9', '12']```

7. simple comprehension output with if condition
```[g for g in range(1,5) if g!= 3]```
Output: ```['1', '2', '4']```

8. simple comprehension output with bool binop expr values and if condition
```j: int = 3```
```[j<i for i in range(6) if i>3]```
Output: ```['False', 'False', 'True']```

9. simple comprehension output with function call as expr values
```def f(x:int)->int: return x*5```
```[f(l) for l in range(5)]```
Output: ```['0', '5', '10', '15', '20']```

10. simple comprehension output with function call using counter variable as expr values
```def f(x:int)->int: return x*5```
```j: int = 5```
```[f(j) for l in range(5)]```
Output: ```['25', '25', '25', '25', '25]```

11. Two comprehension expressions
```[m for m in range(5,6)]```
```[m for m in range(10,15)]```
Output: ```['5', '6', '10', '11', '12', '13', '14']```

12. simple function calls 1
```def f():```
```    a:Range=None```
```    m: int = 0```
```    a=Range().new(5)```
```   [m for m in a]```
```f()```
Output: ```['0', '1', '2', '3', '4']```

13. simple function calls 2
```def f(j:int):```
```    a:Range=None```
```    m: int = 0```
```    a=Range().new(5)```
```   [j*5 for m in a]```
```f(10)```
Output: ```['50', '50', '50', '50', '50']```

14. simple comprehension output with step
```[k for k in range(10,20,2)])```
Output: ```['10', '12', '14', '16', '18']```

15. invalid expression in comprehension
```[j for a in range(1,5) if a!=1])```
Output: ```Error: j is undefined```

16. invalid range in comprehension
```j: int = 2```
```[j for a in range(2,1)])```
Output: ```Error```

17. only if condition allowed in comprehension
```j: int = 2```
```[j for a in range(1,5) for a!=1]```
Output: ```Error```

18. invalid condition in comprehension
```j: int = 2```
```[j for a in range(1,5) if a+2]```
Output: ```Error```

19. invalid iterable in comprehension
```j: int = 2```
```k: int = 3```
```[j for a in k if a!=2]```
Output: ```Error```

Test cases that does not work yet is the following:

1. ```[[j for j in range(3)] for i in range(3)]```
2. 
```
 a : List = None
a = [i for i in range(5,10)]
print(a)
```
In case of the second test case, we skipped it because as suggested by proffesor, we plan on using the implementation by the lists team. For this week, we only worked on iterables using the range class.

## Limitation so far (plan on fixing in week 8)

1. We made an assumption that the list comprehension expressions will only be used globally, and not locally inside any function. (UPDATE: This has been fixed)
2. The explicit range class inside each of our test cases has a class member as curr. If we have an expression as [a for a in range(10)], then we assign a to range.curr (curr refers to the current element in the iteration). However, we are assigning a as a global variable, instead of giving it a local scope(ie, scope of variable a should only be within the comprehension). Because of this, every time we want to use a different comprehension expression, we are using a new counter variable. (UPDATE: This has been fixed)


## Workflow Details:

Since, we have not yet collaborated with the lists group, we are only printing the elements of the list (constructed by the comprehension expression). We plan to collaborate with the lists team in the upcoming week, and display the lists in the proper format. For example:

```[1 for a in range(1,5)]``` gives the following output instead of ```[1,1,1,1,1]```::
```
1
1
1
1
1
```
We have added two new fields to the ast structure for list-comp: iterable_cond? and body. iterable condition checks if range.hasNext() returns true or not. body stores the following statements:: 1. print the current element, 2. call the next method. (UPDATE: The extra fields are no longer needed).

In the lower.ts file, we have converted the ast structure into an array of basic blocks. 

Also, as of this week, we are explicitly adding a range class in our test cases, but we would remove this as part of our next milestones. 

## Important Notes on Test Cases:

1. The test cases are more detailed in the comprehension.test.ts file. In order to see how our current code is performing, please refer to the mentioned file.





## Week 6:
## Test cases

```
a : List = None
a = [i for i in range(10)]
print(a)
```
This should output ```[0,1,2,3,4,5,6,7,8,9]```

```
a : List = None
j : int = 9
a = [j for i in range(5)]
print(a)
```
This should output ```[9,9,9,9,9]```

```
a : List = None
a = [j for i in range(10)]
print(a)
```
This should output ```Error: j is not defined```

```
a : List = None
a = [i for i in range(5,10)]
print(a)
```
This should output ```[5,6,7,8,9]```

```
a : List = None
a = [i for i in range(10,5)]
print(a)
```
This should output ```Error: list range is invalid```

```
a : List = None
a = [i for i in range(10) if i < 5]
print(a)
```
This should output ```[0,1,2,3,4]```

```
a : List = None
a = [i for i in range(10) return]
print(a)
```
This should output ```Error: only if condition allowed```

```
a : List = None
b : List = None
a = [1,2,3]
b = [i*2 for i in a]
print(b)
```
This should output ```[2,4,6]```

```
a : List = None
a = [[j for j in range(3)] for i in range(3)]
print(a)
```
This should output ```[[0, 1, 2], [0, 1, 2], [0, 1, 2]]```

```
a : List = None
b : List = None
a = [1,2,3]
j : bool = True
b = [j for i in a]
print(b)
```
This should output ```[True,True,True]```

```
a : int = 5
b : List = None
b = [i for i in a]
print(b)
```
This should output ```Error: variable a is not an iterable```

## Code changes

We plan to have an external class Iterable for now with corresponding ```next()``` and ```hasNext()``` methods. Every time a list comprehension will be done, a new instance of this class will be created and used to assign values to the new list variable. We want to create a seperate file to construct the range class under the directory models. We can talk about the range class in more details after we have a discussion with the lists group and once we start our implementation.

In the ast.ts file,  we plan to add a new Type for lists:
```
{ tag: "list", listitems : Array<Type>}
```

We also add the following to Expr<A>:
```
{  a?: A, tag: "list-construct", items: Array<Expr<A>> } // implemented by the list team. 
{  a?: A, tag: "list-comp", left: Expr<A>, elem: Expr<A>, iterable: Expr<A>, cond?: Stmt<A> }
```
