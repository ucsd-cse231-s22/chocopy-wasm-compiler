import { assertPrint, assertFail, assertTCFail, assertTC, assertParseFail} from "./asserts.test";



describe("Calling Convention Stage1 basic function tests", ()=>{
  const funcdef= 
  `
  def f(x:int, y:int = 5, z:int = 10):
    print(x)
    print(y)
    print(z)
  `
  //1
  assertPrint("func: parameter assign and default parameter value", funcdef + `f(1,)`, [`1`,`5`,`10`]);
  //2
  assertPrint("func: default parameter assign", funcdef + `f(1,2)`, [`1`,`2`,`10`]);
  //3
  assertPrint("func: specify parameter assign1", funcdef + `f(1, y=3)`, [`1`,`3`,`10`]);
  //4
  assertPrint("func: specify parameter assign2", funcdef + `f(1,z=5)`, [`1`,`5`,`5`]);
  //5
  assertPrint("func: specify parameter assign3", funcdef + `f(1,z=5, y=3)`, [`1`,`3`,`5`]);
})

describe("Calling Convention Stage1 function argument tests", ()=>{
  const funcdef= 
  `
  def f(x:int, y:int = 5, z:int = 10):
    print(x)
    print(y)
    print(z)
  `
  //1
  assertTCFail("func: missing argument", funcdef + `f()`);
  //2
  assertParseFail("func: keyword argument repeated", funcdef + `f(x=1, x=1)`)
  //3
  assertTCFail("func: multiple values", funcdef + `f(1, 2, 3, z=4)`);
  //4
  assertTCFail("func: unexpected keyword argument", funcdef + `f(n=3)`);
  //5
  assertParseFail("func: positional argument follows keyword argument", funcdef + `f(1, y=2, 3)`)
  //6
  assertTCFail("func: assign wrong type", funcdef + `f(1, 2, False)`)
})

describe("Calling Convention Stage1 function define tests", ()=>{
  //1
  var funcdef= 
  `
  def f(x: int, x:int = 5, z:int = 10):
    print(x)
    print(y)
    print(z)
  `
  assertParseFail("func: duplicate argument", funcdef)

  //2
  var funcdef= 
  `
  def f(x: int=5, y:int, z:int = 10):
    print(x)
    print(y)
    print(z)
  `
  assertParseFail("func: non-default argument follows default argument", funcdef)

  //3
  var funcdef= 
  `
  def f(x: int, y:bool = 1<3, z:int = 1 + 2):
    print(x)
    print(y)
    print(z)
  `
  assertPrint("func: expr parameters", funcdef + `f(1)`, [`1`,`True`,`3`]);

  //4
  var classdef=
  `
  class C(object):
    x:int = 100
  `
  var funcdef= 
  `
  def f(c : C):
    print(c.x)
  `
  var body = 
  `
  c:C = None
  c = C()
  f(c)
  `
  assertPrint("func: class parameters", classdef + funcdef + body , [`100`]);

  //5
  var funcdef1= 
  `
  def d()->int:
    return 1
  `
  var funcdef2=
  `
  def f(x : int = d()):
    print(x)
  `
  assertPrint("func: func return parameters", funcdef1 + funcdef2 + `f()`, [`1`]);
})
