(function() {
    "use strict";

    const Opcode = {
        Return:                 0,
        Push0:                  1,
        Push1:                  2,
        PushNone:               3,
        Push8:                  4,
        Push16:                 5,
        Push32:                 6,
        Store:                  7,
        SayUCFirst:             9,
        Say:                    10,
        SayUnsigned:            11,
        SayChar:                12,
        StackPop:               13, // remove the top item from the stack
        StackDup:               14, // duplicate the top item on the stack
        StackPeek:              15, // peek at the stack item X items from the top
        StackSize:              16, // get the current size of the stack
        Call:                   17, // call a value as a function
        ListPush:               19, // add item to end of list
        ListPop:                20, // remove and return item from end of list
        Sort:                   21, // sorts a list
        GetItem:                22, // get item from list (index) or map (key)
        HasItem:                23, // check if index (for list) or key (for map) exists
        GetSize:                24, // get size of list or map
        SetItem:                25, // set item in list (by index) of map (by key)
        TypeOf:                 26, // get value type
        DelItem:                27, // remove an item from a list or a key from a map
        AddItem:                28, // add an item to a list (use set-item for maps)
        AsType:                 29, // type coercion

        Equal:                  30, // compare two values and push the result
        NotEqual:               31, // compare two values and push the negated result
        LessThan:               32, // jump if top of stack < 0
        LessThanEqual:          33, // jump if top of stack <= 0
        GreaterThan:            34, // jump if top of stack > 0
        GreaterThanEqual:       35, // jump if top of stack >= 0

        Jump:                   36, // unconditional jump
        JumpZero:               37, // jump if top of stack == 0
        JumpNotZero:            38, // jump if top of stack != 0

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
        GetRandom:              55,
        GetKeys:                56,
        StackSwap:              57,
        GetSetting:             58,
        SetSetting:             59,
        GetKey:                 60,
        GetOption:              61,
        GetLine:                62,
        AddOption:              63,
        StringClear:            65,
        StringAppend:           66,
        StringLength:           67,
        StringCompare:          68,
        Error:                  69,
        Origin:                 70,
        AddPage:                71,
        DeletePage:             72,
        EndPage:                73,
        New:                    74,
        StringAppendUF:         75,
        IsStatic:               76,
    };
    Object.freeze(Opcode);

    G.resumeExec = function resumeExec(pushValue) {
        "use strict";

        if (!G.callStack) {
            const functionDef = G.getFunction(G.mainFunction);
            G.callStack = new G.CallStack();
            G.callStack.pushFrame(G.mainFunction, functionDef[2], 0);
            G.callStack.buildLocals([], functionDef[0], functionDef[0] + functionDef[1]);
            G.nextIP = functionDef[2];
        }

        G.extraValue = undefined;
        let IP = G.nextIP;
        if (pushValue) {
            if (pushValue instanceof G.Value) {
                G.callStack.stack.push(pushValue);
            }
        }

        var rawType, rawValue, v1, v2, v3, v4, target;

        while (1) {
            const opcode = G.bytecode.getUint8(IP);
            ++IP;
            ++G.operations;
            if (G.operations % 500000 === 0) {
                return 1;
            }

            switch(opcode) {
                case Opcode.Return: {
                    const top = G.callStack.returnValue;
                    const oldFrame = G.callStack.popFrame();
                    if (G.callStack.frameCount === 0) {
                        return top;
                    } else {
                        IP = oldFrame.returnAddress;
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
                case Opcode.PushNone:
                    G.callStack.stack.push(G.noneValue);
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
                    var localId = G.callStack.popRaw();
                    var value = G.callStack.pop();
                    localId.requireType(G.ValueType.VarRef);
                    value.forbidType(G.ValueType.VarRef);
                    G.callStack.set(localId.value, value);
                    break;

                case Opcode.Say:
                    v1 = G.callStack.pop();
                    G.say(v1);
                    break;
                case Opcode.SayUCFirst:
                    v1 = G.callStack.pop();
                    G.say(v1, true);
                    break;
                case Opcode.SayUnsigned:
                    var value = G.callStack.pop();
                    value.requireType(G.ValueType.Integer);
                    G.say(value.value>>>0);
                    break;
                case Opcode.SayChar:
                    var value = G.callStack.pop();
                    value.requireType(G.ValueType.Integer);
                    G.say(String.fromCodePoint(value.value));
                    break;

                case Opcode.StackPop:
                    G.callStack.popRaw();
                    break;
                case Opcode.StackDup:
                    G.callStack.stack.push(G.callStack.peek().clone());
                    break;
                case Opcode.StackPeek:
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(G.callStack.peek(v1.value).clone());
                    break;
                case Opcode.StackSize:
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, G.callStack.stackSize));
                    break;

                case Opcode.Call: {
                    //        v1       target
                    // [args] argcount function call
                    target = G.callStack.pop();
                    v1 = G.callStack.pop();
                    target.requireType(G.ValueType.Node);
                    v1.requireType(G.ValueType.Integer);

                    const theFunc = G.getFunction(target.value);
                    const theArgs = [target.selfobj];
                    while (v1.value > 0) {
                        theArgs.push(G.callStack.pop());
                        v1.value -= 1;
                    }
                    G.callStack.pushFrame(target.value, theFunc[2], IP, null);
                    G.callStack.buildLocals(theArgs, theFunc[0], theFunc[0] + theFunc[1]);
                    IP = theFunc[2];
                    break; }

                case Opcode.ListPush: {
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.List);
                    const theList = G.getList(v1);
                    theList.push(v2);
                    break; }
                case Opcode.ListPop: {
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.List);
                    const theList = G.getList(v1);
                    if (theList.length > 0) {
                        G.callStack.push(theList.pop());
                    } else {
                        throw new G.RuntimeError("used list_pop on empty list.");
                    }
                    break; }
                case Opcode.Sort: {
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.List);
                    const theList = G.getList(v1.value);
                    G.sortList(theList);
                    break; }
                case Opcode.GetItem:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    if (v1.type === G.ValueType.Object) {
                        v2.requireType(G.ValueType.Property);
                        const propValue = G.getObjectProperty(v1, v2);
                        G.callStack.stack.push(propValue);
                    } else if (v1.type === G.ValueType.List) {
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
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    if (v1.type === G.ValueType.Object) {
                        v2.requireType(G.ValueType.Property);
                        const propExists = G.objectHasProperty(v1, v2);
                        G.callStack.stack.push(propExists);
                    } else if (v1.type === G.ValueType.List) {
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
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.List);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, G.getList(v1.value).length));
                    break;
                case Opcode.SetItem:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v3 = G.callStack.pop();
                    v3.forbidType(G.ValueType.VarRef);
                    if (v1.type === G.ValueType.Object) {
                        v2.requireType(G.ValueType.Property);
                        v3.forbidType(G.ValueType.VarRef);
                        G.setObjectProperty(v1, v2, v3);
                    } else if (v1.type === G.ValueType.List) {
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
                    v1 = G.callStack.pop();
                    G.callStack.stack.push(new G.Value(G.ValueType.TypeId, v1.type));
                    break;
                case Opcode.DelItem: {
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
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
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v3 = G.callStack.pop();
                    if (v1.type === G.ValueType.Map) {
                        throw new G.RuntimeError("attempted to use add-item on map; use set-item instead");
                    }
                    v1.requireType(G.ValueType.List);
                    v2.requireType(G.ValueType.Integer);
                    v3.forbidType(G.ValueType.VarRef);
                    const theList = G.getList(v1.value);
                    if (v2.value <= 0) v2.value = 0;
                    theList.splice(v2.value, 0, v3);
                    break; }

                case Opcode.AsType: {
                    const value = G.callStack.pop();
                    const type = G.callStack.pop();
                    type.requireType(G.ValueType.TypeId);
                    const newValue = new G.Value(type.value, value.value);
                    G.callStack.stack.push(newValue);
                    break; }

                case Opcode.Equal: {
                    // LHS RHS cmp
                    // 5   10  cmp   5 gt
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target === 0)));
                    break; }
                case Opcode.NotEqual: {
                    // LHS RHS cmp
                    // 5   10  cmp   5 gt
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target !== 0)));
                    break; }

                case Opcode.Jump:
                    target = G.callStack.pop();
                    target.requireType(G.ValueType.JumpTarget);
                    IP = G.callStack.base + target.value;
                    break;
                case Opcode.JumpZero:
                    target = G.callStack.pop();
                    v1 = G.callStack.pop();
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value === 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.JumpNotZero:
                    target = G.callStack.pop();
                    v1 = G.callStack.pop();
                    target.requireType(G.ValueType.JumpTarget);
                    if (v1.value !== 0) {
                        IP = G.callStack.base + target.value;
                    }
                    break;
                case Opcode.LessThan:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target < 0)));
                    break;
                case Opcode.LessThanEqual:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target <= 0)));
                    break;
                case Opcode.GreaterThan:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target > 0)));
                    break;
                case Opcode.GreaterThanEqual:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    target = G.doCompare(v1, v2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, +(target >= 0)));
                    break;

                case Opcode.Not:
                    v1 = G.callStack.pop();
                    if (v1.isTrue()) {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 0));
                    } else {
                        G.callStack.stack.push(new G.Value(G.ValueType.Integer, 1));
                    }
                    break;
                case Opcode.Add:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value + v2.value) | 0));
                    break;
                case Opcode.Sub:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value - v2.value) | 0));
                    break;
                case Opcode.Mult:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value * v2.value) | 0));
                    break;
                case Opcode.Div:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value / v2.value) | 0));
                    break;
                case Opcode.Mod:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (v1.value % v2.value) | 0));
                    break;
                case Opcode.Pow:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           (Math.pow(v1.value, v2.value)) | 0));
                    break;
                case Opcode.BitLeft:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v1.value << v2.value));
                    break;
                case Opcode.BitRight:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v1.value >>> v2.value));
                    break;
                case Opcode.BitAnd:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value & v1.value));
                    break;
                case Opcode.BitOr:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value | v1.value));
                    break;
                case Opcode.BitXor:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer,
                                           v2.value ^ v1.value));
                    break;
                case Opcode.BitNot:
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, ~v1.value));
                    break;
                case Opcode.Random:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2.requireType(G.ValueType.Integer);
                    const randomValue = Math.floor(Math.random()
                                                   * (v1.value - v2.value)
                                                   + v2.value);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, randomValue));
                    break;
                case Opcode.GetRandom: {
                    v1 = G.callStack.pop();
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
                    v1 = G.callStack.pop();
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

                case Opcode.StackSwap: {
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.Integer);
                    if (v1.value < 0 || v1.value >= G.callStack.stackSize
                        || v2.value < 0 || v2.value >= G.callStack.stackSize) {
                        throw new G.RuntimeError("Invalid stack position.");
                    }
                    const stackTop = G.callStack.stack.stack.length - 1;
                    const tmp = G.callStack.stack.stack[stackTop - v1.value];
                    G.callStack.stack.stack[stackTop - v1.value] = G.callStack.stack.stack[stackTop - v2.value];
                    G.callStack.stack.stack[stackTop - v2.value] = tmp;
                    break; }

                case Opcode.GetSetting: {
                    const settingNo = G.callStack.pop();
                    settingNo.requireType(G.ValueType.Integer);
                    G.getSetting(settingNo);
                    break; }
                case Opcode.SetSetting: {
                    const settingNo = G.callStack.pop();
                    const newValue  = G.callStack.pop();
                    G.setSetting(settingNo, newValue);
                    break; }

                case Opcode.GetKey:
                    v2 = G.callStack.pop();
                    v2.requireType(G.ValueType.String);
                    G.optionType = G.OptionType.KeyInput;
                    G.options = [ new G.Option(v2, v1) ];
                    G.nextIP = IP;
                    return;
                case Opcode.GetOption:
                    v2 = G.callStack.pop();
                    if (v2.type == G.ValueType.None) {
                        G.extraValue = G.noneValue;
                    } else {
                        v2.requireType(G.ValueType.VarRef);
                        G.extraValue = v2;
                    }
                    G.optionType = G.OptionType.MenuItem;
                    G.nextIP = IP;
                    return;
                case Opcode.GetLine:
                    v2 = G.callStack.pop();
                    v2.requireType(G.ValueType.String);
                    G.optionType = G.OptionType.LineInput;
                    G.options = [ new G.Option(v2) ];
                    G.nextIP = IP;
                    return;
                case Opcode.AddOption:
                    v4 = G.callStack.pop();
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v3 = G.callStack.pop();
                    v3.requireType(G.ValueType.String);
                    if (v4.type !== G.ValueType.None)
                        v4.requireType(G.ValueType.Integer);
                    G.options.push(new G.Option(v3, v2, v1, v4));
                    break;

                case Opcode.StringClear: {
                    // v2  v1       v2 -> v1
                    // 5   10  strcpy
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.String);
                    if (G.isStatic(v1).value) {
                        throw new G.RuntimeError("Cannot modify static string");
                    }
                    G.strings[v1.value].data = "";
                    break; }
                case Opcode.StringAppend:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    G.stringAppend(v1, v2, false);
                    break;
                case Opcode.StringAppendUF:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    G.stringAppend(v1, v2, true);
                    break;
                case Opcode.StringLength: {
                    v1 = G.callStack.pop();
                    v1.requireType(G.ValueType.String);
                    const theString = G.getString(v1.value);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, theString.length));
                    break; }
                case Opcode.StringCompare: {
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v1.requireType(G.ValueType.String);
                    v2.requireType(G.ValueType.String);
                    const s1 = G.getString(v1.value);
                    const s2 = G.getString(v2.value);
                    const theResult = 0 + !(s1 === s2);
                    G.callStack.stack.push(new G.Value(G.ValueType.Integer, theResult));
                    break; }

                case Opcode.Error:
                    if (G.callStack.stackSize === 0) {
                        throw new G.RuntimeError("User Error: Thrown with wmpty stack.");
                    }
                    v1 = G.callStack.pop();
                    if (v1.type === G.ValueType.String) {
                        throw new G.RuntimeError("User Error: " + G.getString(v1.value));
                    } else {
                        throw new G.RuntimeError("User Error: " + v1.toString());
                    }
                case Opcode.Origin:
                    v1 = G.callStack.pop();
                    G.callStack.stack.push(G.getSource(v1));
                    break;

                case Opcode.AddPage:
                    v1 = G.callStack.pop();
                    v2 = G.callStack.pop();
                    v3 = G.callStack.pop();
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
                    v3 = G.callStack.pop();
                    v3.requireType(G.ValueType.String);
                    G.delPage(v3);
                    break;
                case Opcode.EndPage:
                    G.endPage();
                    break;
                case Opcode.New:
                    v1 = G.callStack.pop();
                    v1 = G.makeNew(v1);
                    G.callStack.stack.push(v1);
                    break;
                case Opcode.IsStatic:
                    v1 = G.callStack.pop();
                    v1 = G.isStatic(v1);
                    G.callStack.stack.push(v1);
                    break;

                default:
                    throw new G.RuntimeError("Unknown opcode " + opcode + ".");
            }
        }
    }
})();
