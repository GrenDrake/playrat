(function() {
    "use strict";

    const Opcode = {
        Return:                 0,
        Push0:                  1,
        Push1:                  2,
        PushNeg1:               3,
        Push8:                  4,
        Push16:                 5,
        Push32:                 6,
        Store:                  7,
        Say:                    10,
        SayUCFirst:             9,
        SayUnsigned:            11,
        SayChar:                12,
        StackPop:               13, // remove the top item from the stack
        StackDup:               14, // duplicate the top item on the stack
        StackPeek:              15, // peek at the stack item X items from the top
        StackSize:              16, // get the current size of the stack
        Call:                   17, // call a value as a function
        CallMethod:             18, // call an object property as a function
        Self:                   19, // get object the current function is a property of
        GetProp:                20,
        HasProp:                21, // check if property is set on object
        SetProp:                22, // set object property to value
        GetItem:                23, // get item from list (index) or map (key)
        HasItem:                24, // check if index (for list) or key (for map) exists
        GetSize:                25, // get size of list or map
        SetItem:                26, // set item in list (by index) of map (by key)
        TypeOf:                 27, // get value type
        DelItem:                28, // remove an item from a list or a key from a map
        AddItem:                29, // add an item to a list (use set-item for maps)
        AsType:                 30, // type coercion
        Compare:                31, // compare two values and push the result
        Jump:                   32, // unconditional jump
        JumpZero:               33, // jump if top of stack == 0
        JumpNotZero:            34, // jump if top of stack != 0
        JumpLessThan:           35, // jump if top of stack < 0
        JumpLessThanEqual:      36, // jump if top of stack <= 0
        JumpGreaterThan:        37, // jump if top of stack > 0
        JumpGreaterThanEqual:   38, // jump if top of stack >= 0
        Not:                    39,
        Add:                    40,
        Sub:                    41,
        Mult:                   42,
        Div:                    43,
        Mod:                    44,
        Pow:                    45,
        BitLeft:                46,
        BitRight:               47,
        BitAnd:                 48,
        BitOr:                  49,
        BitXor:                 50,
        BitNot:                 51,
        Random:                 52,
        Inc:                    53,
        Dec:                    54,
        GetRandom:              55,
        GetKeys:                56,
        GetKey:                 60,
        GetOption:              61,
        GetLine:                62,
        AddOption:              63,
        AddOptionExtra:         64,
        StringCopy:             65,
        StringAppend:           66,
        StringLength:           67,
        StringCompare:          68,
        SetInfo:                70,
        AddPage:                71,
        DeletePage:             72,
        EndPage:                73,
        New:                    74,
        IsStatic:               76,
    };
    Object.freeze(Opcode);

    const maxOperationCount = 10000;

    G.callFunction = function callFunction(G, selfObj, functionId, argList) {
        "use strict";
        argList = argList || [];

        if (functionId instanceof G.Value) {
            functionId.requireType(G.ValueType.Node);
            functionId = functionId.value;
        }
        const functionDef = G.getFunction(functionId);

        G.operations = 0;
        G.callStack = new G.CallStack();
        G.callStack.pushFrame(functionId, functionDef[2]);

        for (var i = 0; i < functionDef[0] + functionDef[1]; ++i) {
            if (i < argList.length && i < functionDef[0]) {
                G.callStack.locals.push(argList[i]);
            } else {
                G.callStack.locals.push(new G.Value(0,0));
            }
        }
        var IP = functionDef[2];
        var rawType, rawValue, v1, v2, v3, target;

        while (1) {
            const opcode = G.bytecode.getUint8(IP);
            ++IP;
            ++G.operations;
            if (G.operations > maxOperationCount) {
                throw new G.RuntimeError("Script exceeded maximum runtime.");
            }

            switch(opcode) {
                case Opcode.Return: {
                    const top = G.callStack.returnValue;
                    const oldFrame = G.callStack.popFrame();
                    if (G.callStack.frameCount === 0) {
                        return top;
                    } else {
                        IP = oldFrame.returnAddress;
                        selfObj = oldFrame.self;
                        G.callStack.stack.push(top);
                    }
                    break;
                }
                case Opcode.Push0:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    G.callStack.stack.push(new G.Value(rawType,0));
                    break;
                case Opcode.Push1:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    G.callStack.stack.push(new G.Value(rawType,1));
                    break;
                case Opcode.PushNeg1:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    G.callStack.stack.push(new G.Value(rawType,-1));
                    break;
                case Opcode.Push8:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    rawValue = G.bytecode.getInt8(IP);
                    ++IP;
                    G.callStack.stack.push(new G.Value(rawType,rawValue));
                    break;
                case Opcode.Push16:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    rawValue = G.bytecode.getInt16(IP, true);
                    IP += 2;
                    G.callStack.stack.push(new G.Value(rawType,rawValue));
                    break;
                case Opcode.Push32:
                    rawType = G.bytecode.getUint8(IP);
                    ++IP;
                    rawValue = G.bytecode.getInt32(IP, true);
                    IP += 4;
                    G.callStack.stack.push(new G.Value(rawType, rawValue));
                    break;

                case Opcode.Store:
                    var localId = G.callStack.stack.pop();
                    var value = G.callStack.pop(G.callStack.locals);
                    localId.requireType(G.ValueType.LocalVar);
                    if (localId.value < 0 || localId.value >= G.callStack.locals.length) {
                        throw new G.RuntimeError("Opcode.Store: Invalid local number " + localId.value + ".");
                    }
                    G.callStack.locals[localId.value] = value;
                    break;

                case Opcode.Say:
                    v1 = G.callStack.pop(G.callStack.locals);
                    G.say(v1);
                    break;
                case Opcode.SayUCFirst:
                    v1 = G.callStack.pop(G.callStack.locals);
                    G.say(v1, true);
                    break;
                case Opcode.SayUnsigned:
                    var value = G.callStack.pop(G.callStack.locals);
                    value.requireType(G.ValueType.Integer);
                    G.say(value.value>>>0);
                    break;
                case Opcode.SayChar:
                    var value = G.callStack.pop(G.callStack.locals);
                    value.requireType(G.ValueType.Integer);
                    G.say(String.fromCodePoint(value.value));
                    break;

                case Opcode.StackPop:
                    G.callStack.stack.pop();
                    break;
                case Opcode.StackDup:
                    G.callStack.stack.push(G.callStack.stack.top().clone());
                    break;
                case Opcode.StackPeek:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(G.callStack.stack.peek(v1.value).clone());
                    break;
                case Opcode.StackSize:
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, G.callStack.stack.length));
                    break;

                case Opcode.CallMethod:
                case Opcode.Call: {
                    let theFunc = undefined;
                    let mySelf = G.noneValue;
                    if (opcode == Opcode.CallMethod) {
                        //        v1       v2       target
                        // [args] argcount property object call-method
                        target = G.callStack.pop();
                        v2 = G.callStack.pop(G.callStack.locals);
                        v1 = G.callStack.pop(G.callStack.locals);
                        target.requireType(G.ValueType.Object);
                        v1.requireType(G.ValueType.Integer);
                        v2.requireType(G.ValueType.Property);
                        const funcValue = G.getObjectProperty(target, v2);
                        theFunc = G.getFunction(funcValue.value);
                        mySelf = target;
                    } else {
                        //        v1       target
                        // [args] argcount function call
                        target = G.callStack.pop(G.callStack.locals);
                        v1 = G.callStack.pop(G.callStack.locals);
                        target.requireType(G.ValueType.Node);
                        v1.requireType(G.ValueType.Integer);
                        theFunc = G.getFunction(target.value);
                    }
                    const theArgs = [];
                    while (v1.value > 0) {
                        theArgs.push(G.callStack.pop(G.callStack.locals));
                        v1.value -= 1;
                    }
                    while (theArgs.length > theFunc[0]) {
                        theArgs.pop();
                    }
                    while (theArgs.length < theFunc[0] + theFunc[1]) {
                        theArgs.push(G.noneValue);
                    }
                    G.callStack.pushFrame(target.value, theFunc[2], IP, mySelf);
                    G.callStack.topFrame().locals = theArgs;
                    IP = theFunc[2];
                    break; }
                case Opcode.Self:
                    G.callStack.stack.push(G.callStack.self);
                    break;

                case Opcode.GetProp:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Object);
                    v2.requireType(G.ValueType.Property);
                    const propValue = G.getObjectProperty(v1, v2);
                    G.callStack.stack.push(propValue);
                    break;
                case Opcode.HasProp:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Object);
                    v2.requireType(G.ValueType.Property);
                    const propExists = G.objectHasProperty(v1, v2);
                    G.callStack.stack.push(propExists);
                    break;
                case Opcode.SetProp:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v3 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Object);
                    v2.requireType(G.ValueType.Property);
                    G.setObjectProperty(v1, v2, v3);
                    break;

                case Opcode.GetItem:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    if (v1.type === G.ValueType.List) {
                        v2.requireType(G.ValueType.Integer);
                        const theList = G.getList(v1.value);
                        if (v2.value < 0 || v2.value >= theList.length) {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                        } else {
                            G.callStack.stack.push(theList[v2.value]);
                        }
                    } else if (v1.type === G.ValueType.Map) {
                        const theMap = G.getMap(v1.value);
                        const mapKey = v2.toKey();
                        if (theMap.hasOwnProperty(mapKey)) {
                            G.callStack.stack.push(theMap[mapKey]);
                        } else {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                        }
                    } else {
                        throw new G.RuntimeError("get-item requires list or map.");
                    }
                    break;
                case Opcode.HasItem:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    if (v1.type === G.ValueType.List) {
                        v2.requireType(G.ValueType.Integer);
                        if (v2.value < 1 || v2.value > G.getList(v1.value).length) {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                        } else {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 1));
                        }
                    } else if (v1.type === G.ValueType.Map) {
                        const theMap = G.getMap(v1.value);
                        const mapKey = v2.toKey();
                        if (theMap.hasOwnProperty(mapKey)) {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 1));
                        } else {
                            G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                        }
                    } else {
                        throw new G.RuntimeError("has-item requires list or map.");
                    }
                    break;
                case Opcode.GetSize:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.List);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, G.getList(v1.value).length));
                    break;
                case Opcode.SetItem:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v3 = G.callStack.pop(G.callStack.locals);
                    if (v1.type === G.ValueType.List) {
                        v2.requireType(G.ValueType.Integer);
                        G.getList(v1.value)[v2.value] = v3;
                    } else if (v1.type === G.ValueType.Map) {
                        const theMap = G.getMap(v1.value);
                        const mapKey = v2.toKey();
                        theMap[mapKey]= v3;
                    } else {
                        throw new G.RuntimeError("set-item requires list or map.");
                    }
                    break;
                case Opcode.TypeOf:
                    v1 = G.callStack.pop(G.callStack.locals);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, v1.type));
                    break;
                case Opcode.DelItem: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    if (v1.type === G.ValueType.List) {
                        v2.requireType(G.ValueType.Integer);
                        const theList = G.getList(v1.value);
                        if (v2.value <= 0) v2.value = 0;
                        theList.splice(v2.value, 1);
                    } else {
                        v1.requireType(G.ValueType.Map);
                        const theMap = G.getMap(v1.value);
                        delete theMap[v2.toKey()];
                    }
                    break; }
                case Opcode.AddItem: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v3 = G.callStack.pop(G.callStack.locals);
                    if (v1.type === G.ValueType.Map) {
                        throw new G.RuntimeError("attempted to use add-item on map; use set-item instead");
                    }
                    v1.requireType(G.ValueType.List);
                    v2.requireType(G.ValueType.Integer);
                    const theList = G.getList(v1.value);
                    if (v2.value <= 0) v2.value = 0;
                    theList.splice(v2.value, 0, v3);
                    break; }

                case Opcode.AsType: {
                    const value = G.callStack.pop(G.callStack.locals);
                    const type = G.callStack.pop(G.callStack.locals);
                    type.requireType(G.ValueType.Integer);
                    value.type = type.value;
                    G.callStack.stack.push(value);
                    break; }

                case Opcode.Compare: {
                    // LHS RHS cmp
                    // 5   10  cmp   5 gt
                    const rhs = G.callStack.pop(G.callStack.locals);
                    const lhs = G.callStack.pop(G.callStack.locals);
                    if (lhs.type !== rhs.type) {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 1));
                    } else {
                        switch(rhs.type) {
                            case G.ValueType.Integer:
                                G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                    lhs.value - rhs.value));
                                break;
                            case G.ValueType.None:
                                G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                                break;
                            default:
                                G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                    (rhs.value === lhs.value) ? 0 : 1));
                                break;
                        }
                    }
                    break; }

                case Opcode.Jump:
                    target = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    IP = G.callStack.base + target.value;
                    break;
                case Opcode.JumpZero:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value === 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpNotZero:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value !== 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpLessThan:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value < 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpLessThanEqual:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value <= 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpGreaterThan:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value > 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpGreaterThanEqual:
                    target = G.callStack.pop(G.callStack.locals);
                    v1 = G.callStack.pop(G.callStack.locals);
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value >= 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;

                case Opcode.Not:
                    v1 = G.callStack.pop(G.callStack.locals);
                    if (v1.isTrue()) {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                    } else {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 1));
                    }
                    break;
                case Opcode.Add:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value + v2.value) | 0));
                    break;
                case Opcode.Sub:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v2.value - v1.value) | 0));
                    break;
                case Opcode.Mult:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value * v2.value) | 0));
                    break;
                case Opcode.Div:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v2.value / v1.value) | 0));
                    break;
                case Opcode.Mod:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v2.value % v1.value) | 0));
                    break;
                case Opcode.Pow:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (Math.pow(v2.value, v1.value)) | 0));
                    break;
                case Opcode.BitLeft:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value << v1.value));
                    break;
                case Opcode.BitRight:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value >>> v1.value));
                    break;
                case Opcode.BitAnd:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value & v1.value));
                    break;
                case Opcode.BitOr:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value | v1.value));
                    break;
                case Opcode.BitXor:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value ^ v1.value));
                    break;
                case Opcode.BitNot:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, ~v1.value));
                    break;
                case Opcode.Random:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    const randomValue = Math.floor(Math.random()
                                                   * (v1.value - v2.value)
                                                   + v2.value);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, randomValue));
                    break;
                case Opcode.Dec:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v1.value -= 1;
                    G.callStack.stack.push(v1);
                    break;
                case Opcode.Inc:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    v1.value += 1;
                    G.callStack.stack.push(v1);
                    break;
                case Opcode.GetRandom: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.List);
                    const theList = G.getList(v1.value);
                    if (theList.length === 0) {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                    } else {
                        const choice = Math.floor(Math.random() * theList.length);
                        G.callStack.stack.push(theList[choice]);
                    }
                    break; }

                case Opcode.GetKeys: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Map);
                    v2 = G.makeNew(G.ValueType.List);
                    const theList = G.getMap(v1.value);
                    const keys = Object.keys(theList);
                    keys.forEach(function(key) {
                        const keySep = key.indexOf(":");
                        const keyType = +key.substring(0, keySep);
                        const keyValue = +key.substring(keySep + 1);
                        const result = new G.Value(keyType, keyValue);
                        G.getList(v2.value).push(result);
                    })
                    G.callStack.stack.push(v2);
                    break; }

                case Opcode.GetKey:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Node);
                    v2.requireType(G.ValueType.String);
                    G.optionType = G.OptionType.KeyInput;
                    G.optionFunction = v1.value;
                    G.options = [ new G.Option(v2, v1) ];
                    break;
                case Opcode.GetOption:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Node);
                    G.optionType = G.OptionType.MenuItem;
                    G.optionFunction = v1.value;
                    break;
                case Opcode.AddOption:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v2.requireType(G.ValueType.String);
                    G.options.push(new G.Option(v2, v1));
                    break;
                case Opcode.AddOptionExtra:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v3 = G.callStack.pop(G.callStack.locals);
                    v3.requireType(G.ValueType.String);
                    G.options.push(new G.Option(v3, v2, v1));
                    break;

                case Opcode.StringCopy: {
                    // v2  v1       v2 -> v1
                    // 5   10  strcpy
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.String);
                    v2.requireType(G.ValueType.String);
                    if (G.isStatic(v1).value) {
                        throw new G.RuntimeError("Cannot modify static string");
                    }
                    const s2 = G.getString(v2.value);
                    G.strings[v1.value].data = s2;
                    break; }
                case Opcode.StringAppend:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.String);
                    v2.requireType(G.ValueType.String);
                    if (G.isStatic(v1).value) {
                        throw new G.RuntimeError("Cannot modify static string");
                    }
                    const s2 = G.getString(v2.value);
                    G.strings[v1.value].data += s2;
                    break;
                case Opcode.StringLength: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.String);
                    const theString = G.getString(v1.value);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, theString.length));
                    break; }
                case Opcode.StringCompare: {
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.String);
                    v2.requireType(G.ValueType.String);
                    const s1 = G.getString(v1.value);
                    const s2 = G.getString(v2.value);
                    const theResult = 0 + !(s1 === s2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, theResult));
                    break; }

                case Opcode.SetInfo:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v1.requireType(G.ValueType.Integer);
                    G.setInfo(v1.value, v2);
                    break;
                case Opcode.AddPage:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v2 = G.callStack.pop(G.callStack.locals);
                    v3 = G.callStack.pop(G.callStack.locals);
                    v3.requireType(G.ValueType.String);
                    v2.requireType(G.ValueType.Node);
                    v1.requireType(G.ValueType.Integer);
                    const pageInfo = {
                        title: v3,
                        hotkey: v1,
                        callback: v2,
                    };
                    G.addPage(pageInfo);
                    break;
                case Opcode.DeletePage:
                    v3 = G.callStack.pop(G.callStack.locals);
                    v3.requireType(G.ValueType.String);
                    G.delPage(v3);
                    break;
                case Opcode.EndPage:
                    G.endPage();
                    break;
                case Opcode.New:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1 = G.makeNew(v1);
                    G.callStack.stack.push(v1);
                    break;
                case Opcode.IsStatic:
                    v1 = G.callStack.pop(G.callStack.locals);
                    v1 = G.isStatic(v1);
                    G.callStack.stack.push(v1);
                    break;

                default:
                    throw new G.RuntimeError("Unknown opcode " + opcode + ".");
            }
        }
    }
})();
