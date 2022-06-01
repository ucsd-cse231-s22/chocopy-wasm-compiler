import { Template } from "webpack";
import { Annotation, Type } from "./ast";
import { Value } from "./ir";
import { importObject } from "./tests/import-object.test";
import { load_bignum } from "./utils";

export type memAddr = number;
export type ref = number;
export const heapStart = 4;
export const metadataAmt = 4;


// Below can be implemented as a class and has some additonal
// https://github.com/WebAssembly/interface-types/issues/18


// Below is a similar approach but does not require mapping to objects
// if this looks a bit hacky, take a look at the issue above



// temporary class for mem mgmt errors
// will be deprecated when error reporting is integrated
class MemError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "MemoryError"
    }
}

export const refNumOffset = 0;
export const sizeOffset = 3;
export const typeOffset =  2;
export const amountOffset = 1;
export const dataOffset = 4;

// mapping for reference number to actual address
// this allows the memory management module to move memory blocks around
export let refMap: Map<ref, memAddr> = new Map(); 

let refNum = 0; // immutable reference number for objects
let memHeap: Int32Array;
let activeStack: Set<ref>[]; // maintains objects created in the local scope
//let recRefSet: Set<ref> = new Set();
let inactiveRefList: ref[] = [];
let reclaimable: number = 0;

// clean slate for each run
export function memInit(memory: Int32Array) {
    refMap = new Map();
    refNum = 0;
    memHeap = memory;
    activeStack = [new Set()];
    reclaimable = 0;
    inactiveRefList = [];
}

// generate a reference number for the memory address
export function memGenRef(addr: memAddr): ref {
    let r;
    if (inactiveRefList.length !== 0) {
        r = inactiveRefList.pop();
    } else {
        refNum++;
        if (refNum > 2147483647) {
            throw new MemError("maximum references allocated");
        }
        r = refNum;
    }
    
    activeStack[activeStack.length - 1].add(r);
    refMap.set(r, addr);
    return r;    
}

// get memory address from reference number
export function refLookup(r: ref) :  ref {
    if (refMap.has(r)) {
        return refMap.get(r);
    }
    throw new MemError(`invalid reference: ${r}`)
}

// traverse nodes in a BFS manner amking updates to reference counts
export function traverseUpdate(r: ref, assignRef: ref, update: number): ref { // returns r so that stack state can be maintained
    //console.log(`ref: ${r}, assgnRef: ${assignRef}, update: ${update}`);
    if (r === 0) {
        return r
    }
    let explored = new Set();
    explored.add(assignRef); // assignRef fixes issues for cycles in the ref chain
    let travQueue = [r];
    if (update > 0) {
        activeStack[activeStack.length - 1].add(r);
    }

    while (travQueue.length > 0) {
        const curr = travQueue.shift();
        const addr = refLookup(curr) / 4;

        memHeap[addr + refNumOffset] += update;
        if (memHeap[addr + refNumOffset] < 0) { 
            memHeap[addr + refNumOffset] = 0;
        }
        if (memHeap[addr + refNumOffset] === 0) {
            reclaimable += memHeap[addr + amountOffset] + metadataAmt;
        } 
        explored.add(curr);

        let types = memHeap[addr + typeOffset];
        let size = memHeap[addr + sizeOffset]; 
        const amt = memHeap[addr + amountOffset];

        for (let i = 0; i < size; i++) {
            if ((types & (1 << i)) !== 0) {
                for (let a = 0; a < amt / size; a++) {
                    let temp = memHeap[addr + dataOffset + size*a + i];
                    if (temp !== 0 && !explored.has(temp)) { // 0 is None
                        travQueue.push(temp); 
                    }
                }
            }
        }
    }
    return r
}

export function compact(): memAddr {
    let free: memAddr = heapStart;
    //console.log(refMap);
    function isGarbage(r: ref): boolean {
        const addr = refLookup(r) / 4;
        return memHeap[addr + refNumOffset] === 0;
    }
    function move(fromAddr: memAddr, toAddr: memAddr, amount: number) {
        fromAddr /= 4;
        toAddr /= 4;
        //const amount = memHeap[fromAddr + amountOffset];
        for (let i = 0; i < amount + metadataAmt; i++) {
            memHeap[toAddr + i] = memHeap[fromAddr + i];
        }
    }
    for (const [r, addr] of refMap) {
        if (!isGarbage(r)) {
            const amount = memHeap[addr / 4 + amountOffset];
            move(addr, free, amount);
            refMap.set(r, free);
            free += (amount + metadataAmt) * 4;
        } else {
            refMap.delete(r);
            inactiveRefList.push(r);
        }
    }
    //console.log(memHeap);
    return free;
}

export function memReclaim(heap: number, amount: number): memAddr {
    const memSize = memHeap.length;
    const memfits = () => heap/4 + amount + metadataAmt < memSize;
    if (!memfits()) {
        heap = compact();
        if (!memfits()) {
            throw new MemError("out of memory :(");
        }
    } else if (reclaimable > memHeap.length / 2) {
        heap = compact();
    }
    return heap;
}


export function addScope() {
    activeStack.push(new Set());
}

export function removeScope() {
    activeStack[activeStack.length - 1].forEach(r => traverseUpdate(r, 0, -1));
    activeStack.pop();
}

export function getTypeInfo(fields: Value<Annotation>[]): number {
    const binArr : number[] = fields.map(f => {
        if (f.tag  === "none" || f.tag === "num") {
          return 1;
        }
        return 0;
      });

    if (binArr.length === 0) {
        return 0;
    }
    return parseInt(binArr.reverse().join(""), 2);
}


//debug function for tests
export function debugId(id: number, offset: number) { // id should be of type int and the first field in the object
    //console.log(memHeap);
    //console.log(refMap);
    
    for (const [_, addr] of refMap) {
        //console.log("addr", memHeap[addr/4 + dataOffset + 1]);
        let n = load_bignum(memHeap[addr/4 + dataOffset + 1], importObject.libmemory.load);
        //console.log("n", n);
        if (n as any == id) {
            return memHeap[addr/4 + offset];
        }
    }
    throw new Error(`no such id: ${id}`);
}


