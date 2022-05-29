import { BinOp, Parameter, Type, UniOp } from "../ast";
import { Stmt, Expr, Value, VarInit, BasicBlock, Program, FunDef, Class } from "../ir";
import { constantPropagateAndFoldProgramBody, constantPropagateAndFoldProgramFuns } from "./optimizations_prop_fold";
import { copyPropagateProgramBody, copyPropagateProgramFuns } from "./optimization_copy_prop";

import { isTagBoolean, isTagNone, isTagId, isTagBigInt, isTagEqual, checkValueEquality, checkPropagateValEquality, checkStmtEquality, duplicateEnv } from "./optimization_utils";

class Env {

    //General basic block environment class for dataflow analysis

    get(arg: any): any {
        // Get the value of arg from the Environment map
        return;
    }
    has(arg: any): any {
        // Check if the environment map has the arg
        return;
    }
    set(arg: any, value: any) {
        // Set the value of arg in the environment map
        return;
    }
    duplicateEnv(): Env {
        // Return a duplicate of the calling environment object
        return;
    }
    checkEqual(b: Env): boolean {
        // Check if calling environment object and arg are equal
        return;
    }
    updateEnvironmentByBlock(block: BasicBlock<any>): Env {
        // Return an updated environment
        return;
    }
    mergeEnvironment(b: Env): Env {
        // Return a new environment which merges the calling environment object and arg
        return;
    }

}

const varDefEnvTag: string = "$$VD$$";

//Assuming jumps if it occurs will occur at the last statement of the block
export function computePredecessorSuccessor(basicBlocks: Array<BasicBlock<any>>): [Map<string, string[]>, Map<string, string[]>, Map<string, BasicBlock<any>>] {
    let succs: Map<string, string[]> = new Map<string, string[]>();
    let preds: Map<string, string[]> = new Map<string, string[]>();
    let blockMapping: Map<string, BasicBlock<any>> = new Map<string, BasicBlock<any>>();
    basicBlocks.forEach(basicBlock => {
        blockMapping.set(basicBlock.label, basicBlock);
        const lastStmt = basicBlock.stmts[basicBlock.stmts.length - 1];
        if (lastStmt !== undefined && lastStmt.tag === "ifjmp") {
            //Assigning successors
            if (succs.has(basicBlock.label) && !succs.get(basicBlock.label).includes(lastStmt.thn))
                succs.set(basicBlock.label, [...succs.get(basicBlock.label), lastStmt.thn]);
            else if (!succs.has(basicBlock.label))
                succs.set(basicBlock.label, [lastStmt.thn]);


            if (succs.has(basicBlock.label) && !succs.get(basicBlock.label).includes(lastStmt.els))
                succs.set(basicBlock.label, [...succs.get(basicBlock.label), lastStmt.els]);
            else if (!succs.has(basicBlock.label))
                succs.set(basicBlock.label, [lastStmt.els]);

            //Assigning predecessors
            if (preds.has(lastStmt.thn) && !preds.get(lastStmt.thn).includes(basicBlock.label))
                preds.set(lastStmt.thn, [...preds.get(lastStmt.thn), basicBlock.label]);
            else if (!preds.has(lastStmt.thn))
                preds.set(lastStmt.thn, [basicBlock.label]);

            if (preds.has(lastStmt.els) && !preds.get(lastStmt.els).includes(basicBlock.label))
                preds.set(lastStmt.els, [...preds.get(lastStmt.els), basicBlock.label]);
            else if (!preds.has(lastStmt.els))
                preds.set(lastStmt.els, [basicBlock.label]);
        }
        else if (lastStmt !== undefined && lastStmt.tag === "jmp") {
            //Assigning successors
            if (succs.has(basicBlock.label) && !succs.get(basicBlock.label).includes(lastStmt.lbl))
                succs.set(basicBlock.label, [...succs.get(basicBlock.label), lastStmt.lbl]);
            else if (!succs.has(basicBlock.label))
                succs.set(basicBlock.label, [lastStmt.lbl]);

            //Assigning predecessors
            if (preds.has(lastStmt.lbl) && !preds.get(lastStmt.lbl).includes(basicBlock.label))
                preds.set(lastStmt.lbl, [...preds.get(lastStmt.lbl), basicBlock.label]);
            else if (!preds.has(lastStmt.lbl))
                preds.set(lastStmt.lbl, [basicBlock.label]);
        }
    });
    return [preds, succs, blockMapping];

}

function addParamsToEnv(params: Array<Parameter<any>>, env: Env, dummyEnv: boolean) {
    params.forEach(p => {
        if (dummyEnv) {
            env.set(p.name, { tag: "undef" });
        }
        else {
            env.set(p.name, { tag: "nac" });
        }
    });
}

export function optimizeFunction(func: FunDef<any>): FunDef<any> {
    var [funDef, functionOptimized] = constantPropagateAndFoldProgramFuns(func);
    [funDef, functionOptimized] = copyPropagateProgramFuns(func);
    // [funDef, functionOptimized] = deadCodeProgramFuns(func);

    /* NOTE(joe): taking out all recursive optimization because there is no easy
     * way to add fallthrough cases above */
    if (functionOptimized) return optimizeFunction(funDef);

    return funDef;
}

export function optimizeClass(c: Class<any>): Class<any> {
    var optimizedMethods: Array<FunDef<any>> = c.methods.map(m => {
        return optimizeFunction(m);
    })
    return { ...c, methods: optimizedMethods };
}

export function generateEnvironmentProgram(
    program: Program<any>,
    computeInitEnv: Function
): [Map<string, Env>, Map<string, Env>] {
    var initialEnv = computeInitEnv(program.inits, false);

    var inEnvMapping: Map<string, Env> = new Map<string, Env>();
    var outEnvMapping: Map<string, Env> = new Map<string, Env>();

    var dummyEnv = computeInitEnv(program.inits, true);

    program.body.forEach(f => {
        inEnvMapping.set(f.label, duplicateEnv(dummyEnv));
        outEnvMapping.set(f.label, duplicateEnv(dummyEnv));
    });

    var [preds, succs, blockMapping]: [Map<string, string[]>, Map<string, string[]>, Map<string, BasicBlock<any>>] = computePredecessorSuccessor(program.body);

    preds.set(program.body[0].label, [varDefEnvTag]);
    succs.set(varDefEnvTag, [program.body[0].label]);
    outEnvMapping.set(varDefEnvTag, initialEnv);

    workListAlgorithm([program.body[0].label], inEnvMapping, outEnvMapping, preds, succs, blockMapping);

    return [inEnvMapping, outEnvMapping];
}

export function generateEnvironmentFunctions(func: FunDef<any>, computeInitEnv: Function): [Map<string, Env>, Map<string, Env>] {
    var initialEnv = computeInitEnv(func.inits, false);
    addParamsToEnv(func.parameters, initialEnv, false);

    var inEnvMapping: Map<string, Env> = new Map<string, Env>();
    var outEnvMapping: Map<string, Env> = new Map<string, Env>();

    var dummyEnv = computeInitEnv(func.inits, true);
    addParamsToEnv(func.parameters, initialEnv, true);

    func.body.forEach(f => {
        inEnvMapping.set(f.label, duplicateEnv(dummyEnv));
        outEnvMapping.set(f.label, duplicateEnv(dummyEnv));
    });

    inEnvMapping.set(func.body[0].label, initialEnv);

    var [preds, succs, blockMapping]: [Map<string, string[]>, Map<string, string[]>, Map<string, BasicBlock<any>>] = computePredecessorSuccessor(func.body);

    preds.set(func.body[0].label, [varDefEnvTag]);
    succs.set(varDefEnvTag, [func.body[0].label]);
    outEnvMapping.set(varDefEnvTag, initialEnv);

    workListAlgorithm([func.body[0].label], inEnvMapping, outEnvMapping, preds, succs, blockMapping);

    return [inEnvMapping, outEnvMapping];
}

export function optimizeProgram(program: Program<any>): Program<any> {
    if (program.body.length == 0) return program;
    // var [program, programOptimized]: [Program<any>, boolean] = constantPropagateAndFoldProgramBody(program);
    // // [program, programOptimized] = copyPropagateProgram(program);
    // // [program, programOptimized] = eliminateDeadCodeProgram(program);

    // /* NOTE(joe): turning this off; it (a) doesn't have fallthrough cases for new
    //  * expressions and (b) when I add fallthrough cases, it stack-overflows */
    // if (programOptimized) program = optimizeProgram(program);

    var program = optimizeProgramBody(program);

    var newClass: Array<Class<any>> = program.classes.map(c => {
        return optimizeClass(c);
    });

    var newFunctions: Array<FunDef<any>> = program.funs.map(f => {
        return optimizeFunction(f);
    });

    return { ...program, classes: newClass, funs: newFunctions };
}

function optimizeProgramBody(program: Program<any>): Program<any> {
    if (program.body.length == 0) return program;
    var [program, programOptimized]: [Program<any>, boolean] = constantPropagateAndFoldProgramBody(program);
    var programOptimizedFromCopy: boolean = false;
    [program, programOptimizedFromCopy] = copyPropagateProgramBody(program);
    // // [program, programOptimized] = eliminateDeadCodeProgram(program);
    if (programOptimized || programOptimizedFromCopy) program = optimizeProgramBody(program);

    return program;
}

function mergeAllPreds(predecessorBlocks: Array<string>, outEnvMapping: Map<string, Env>): Env {
    if (predecessorBlocks.length === 0) {
        throw new Error(`CompileError: Block with predecessors`);
    }
    var inEnv: Env = outEnvMapping.get(predecessorBlocks[0]);

    predecessorBlocks.slice(1).forEach(b => {
        inEnv = inEnv.mergeEnvironment(outEnvMapping.get(b));
    });

    return inEnv;
}

export function workListAlgorithm(
    workList: Array<string>,
    inEnvMapping: Map<string, Env>,
    outEnvMapping: Map<string, Env>,
    preds: Map<string, string[]>,
    succs: Map<string, string[]>,
    blockMapping: Map<string, BasicBlock<any>>
) {
    if (workList.length === 0)
        return;
    const currBlock: string = workList.pop();
    const newInEnv: Env = mergeAllPreds(preds.get(currBlock), outEnvMapping);
    if (inEnvMapping.get(currBlock).checkEqual(newInEnv)) {
        workListAlgorithm(workList, inEnvMapping, outEnvMapping, preds, succs, blockMapping);
        return;
    }
    inEnvMapping.set(currBlock, newInEnv);
    outEnvMapping.set(currBlock, newInEnv.updateEnvironmentByBlock(blockMapping.get(currBlock)));

    const wlAddition: string[] = (succs.get(currBlock) === undefined) ? ([]) : (succs.get(currBlock).map(succBlock => {
        if (succBlock !== varDefEnvTag) return succBlock;
    }));

    workListAlgorithm([...workList, ...wlAddition], inEnvMapping, outEnvMapping, preds, succs, blockMapping);

    return;
}