"use strict";

function RuntimeError(origin, message) {
    this.origin = origin;
    this.message = message;
}
RuntimeError.prototype.toString = function() {
    var errorText = "At top level";
    if (this.origin.hasOwnProperty("id"))
        errorText = "Function " + this.origin.id;
    if (this.origin.hasOwnProperty("segment"))
        errorText += "/" + this.origin.segment;
    if (this.origin.hasOwnProperty("IP"))
        errorText += " @ 0x" + this.origin.IP.toString(16).toUpperCase();
    errorText += ": " + this.message;
    return errorText;
}

function say(text) {
    document.getElementById('output').innerHTML += text;
}

function Value(type, value) {
    this.type = type;
    this.value = value;
}
Value.prototype.requireType = function(origin, type) {
    if (this.type !== type) {
        throw new RuntimeError(origin,
            "Expected " + typeNames[type] + ", but found " +
            typeNames[this.type] + ".");
    }
}

const ValueType = {
    None:         0,
    Integer:      1,
    String:       2,
    List:         3,
    Map:          4,
    Node:         5,
    Object:       6,
    Property:     7,
    LocalVar:     8,
    JumpTarget:   9,
};
Object.freeze(ValueType);
const typeNames = [
    "None", "Integer", "String", "List", "Map", "Node", "Object", "Property",
    "LocalVar", "JumpTarget"
];
Object.freeze(typeNames);

const Opcode = {
    Return:       0,
    Push0:        1,
    Push1:        2,
    PushNeg1:     3,
    Push8:        4,
    Push16:       5,
    Push32:       6,
    Store:        7,
    Say:          10,
    StackPop:     13, // remove the top item from the stack
    StackDup:     14, // duplicate the top item on the stack
    StackPeek:    15, // peek at the stack item X items from the top
    StackSize:    16, // get the current size of the stack
    Call:         17, // call a value as a function
    CallMethod:   18, // call an object property as a function
    Self:         19, // get object the current function is a property of
    GetProp:      20,
    HasProp:      21, // check if property is set on object
    SetProp:      22, // set object property to value
    GetItem:      23, // get item from list (index) or map (key)
    HasItem:      24, // check if index (for list) or key (for map) exists
    GetSize:      25, // get size of list or map
    SetItem:      26, // set item in list (by index) of map (by key)
    TypeOf:       27, // get value type
    Jump:         30,
    JumpEq:       31,
    JumpNeq:      32,
    JumpLt:       33,
    JumpLte:      34,
    JumpGt:       35,
    JumpGte:      36,
    JumpTrue:     37, // jump if value is non-zero (true)
    JumpFalse:    38, // jump if value is zero (false)
    Add:          40,
    Sub:          41,
    Mult:         42,
    Div:          43,
};
Object.freeze(Opcode);

function readLocal(state, localId, origin) {
    if (localId.type != 8) {
        return localId;
    }
    if (localId.value < 0 || localId.value > state.locals.length) {
        throw new RuntimeError(origin, "Tried to access invalid local number.");
    }
    return state.locals[localId.value];
}

function callFunction(gameData, functionId) {
    if (!gameData.functions.hasOwnProperty(functionId)) {
        throw new RuntimeError({id:functionId}, "Function does not exist.");
        return;
    }

    const state = {
        stack: [],
        locals: [],
    }
    const functionDef = gameData.functions[functionId];
    for (var i = 0; i < functionDef[0] + functionDef[1]; ++i) {
        state.locals.push(new Value(0,0));
    }
    var IP = functionDef[2];
    var rawType, rawValue, v1, v2;

    while (1) {
        const opcode = gameData.bytecode.getUint8(IP);
        ++IP;
        switch(opcode) {
            case Opcode.Return:
                if (stack.length > 0) {
                    return stack[stack.length - 1];
                } else {
                    return new Value(ValueType.Integer, 0);
                }
            case Opcode.Push0:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                state.stack.push(new Value(rawType,0));
                break;
            case Opcode.Push1:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                state.stack.push(new Value(rawType,1));
                break;
            case Opcode.PushNeg1:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                state.stack.push(new Value(rawType,-1));
                break;
            case Opcode.Push8:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                rawValue = gameData.bytecode.getInt32(IP);
                ++IP;
                state.stack.push(new Value(rawType,rawValue));
                break;
            case Opcode.Push16:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                rawValue = gameData.bytecode.getInt32(IP);
                IP += 2;
                state.stack.push(new Value(rawType,rawValue));
                break;
            case Opcode.Push32:
                rawType = gameData.bytecode.getUint8(IP);
                ++IP;
                rawValue = gameData.bytecode.getInt32(IP);
                IP += 4;
                state.stack.push(new Value(rawType,rawValue));
                break;

            case Opcode.Store:
                var localId = state.stack.pop();
                var value = state.stack.pop();
                localId.requireType({id:functionId, IP:IP, segment:"/store"}, ValueType.LocalVar);
                state.locals[localId.value] = value;
                break;

            case Opcode.Add:
                v1 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v2 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v1.requireType({id:functionId, IP:IP, segment:"/add"}, ValueType.Integer);
                v2.requireType({id:functionId, IP:IP, segment:"/add"}, ValueType.Integer);
                state.stack.push(new Value(ValueType.Integer, v1.value + v2.value));
                break;
            case Opcode.Sub:
                v1 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v2 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v1.requireType({id:functionId, IP:IP, segment:"/sub"}, ValueType.Integer);
                v2.requireType({id:functionId, IP:IP, segment:"/sub"}, ValueType.Integer);
                state.stack.push(new Value(ValueType.Integer, v1.value - v2.value));
                break;
            case Opcode.Mult:
                v1 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v2 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v1.requireType({id:functionId, IP:IP, segment:"/mult"}, ValueType.Integer);
                v2.requireType({id:functionId, IP:IP, segment:"/mult"}, ValueType.Integer);
                state.stack.push(new Value(ValueType.Integer, v1.value * v2.value));
                break;
            case Opcode.Div:
                v1 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v2 = readLocal(state, state.stack.pop(), {id:functionId, IP:IP, segment:"/add"});
                v1.requireType({id:functionId, IP:IP, segment:"/div"}, ValueType.Integer);
                v2.requireType({id:functionId, IP:IP, segment:"/div"}, ValueType.Integer);
                state.stack.push(new Value(ValueType.Integer, v1.value / v2.value));
                break;

            case Opcode.Say:
                say("test");
                break;
            default:
                throw new RuntimeError({id:functionId, IP:IP}, "Unknown opcode " + opcode + ".");
        }
    }
}
