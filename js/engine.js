
const G = {
    UI: {
        inDialog: false,
    },
    noneValue: undefined,
    strings: [],
    objects: [],
    lists: [],
    maps: [],
    functions: [],
    raw: {
        objects: [],
        lists: [],
        maps: []
    },

    eOutput: undefined,
    eTopLeft: undefined,
    eTopRight: undefined,
    eBottomLeft: undefined,
    eBottomRight: undefined,
    eButtons: undefined,
    eSaveButton: undefined,
    eNoSaveButton: undefined,

    textBuffer: [],

    optionFunction: undefined,
    optionType: -1,
    options: [],
    gameLoaded: false,

    lastNode: "",
    inPage: false,
    pages: {},
    stored: {
        textBuffer: undefined,
        options: undefined,
    },
    saveAllowed: false,

    garbageCollectionFrequency: 5,
    eventCount: 0,
    operations: 0,
    callStack: undefined,

    showEventDuration: true,
    showOperationsCount: true,
    showGarbageCollectionDuration: true,

    propInternalName: 1,
    propIdent: 2,
    propParent: 3,
    propSave: 4,
    propLoad: 5,
};

(function() {
    "use strict";

// ////////////////////////////////////////////////////////////////////////////
// ENum Values
// ////////////////////////////////////////////////////////////////////////////
    G.StartupSource = {
        NewGame:        0,
        Restore:        1,
    }
    G.Settings = {
        SaveAllowed:    0,
        InfobarLeft:    1,
        InfobarRight:   2,
        InfobarFooter:  3,
        Title:          4,
    };
    Object.freeze(G.Settings);

    G.ValueType = {
        None:         0,
        Integer:      1,
        String:       2,
        List:         3,
        Map:          4,
        Function:     5,
        Node:         5,
        Object:       6,
        Property:     7,
        JumpTarget:   9,
        VarRef:       10,
        LocalVar:     15,
        MaxType:      15,
    };
    Object.freeze(G.ValueType);

    G.typeNames = [
        "None",         // 0
        "Integer",      // 1
        "String",       // 2
        "List",         // 3
        "Map",          // 4
        "Function",     // 5
        "Object",       // 6
        "Property",     // 7
        "(unused)",     // 8
        "JumpTarget",   // 9
        "Reference",    // 10
        "(unused)",     // 11
        "(unused)",     // 12
        "(unused)",     // 13
        "(unused)",     // 14
        "LocalVar",     // 15
    ];
    Object.freeze(G.typeNames);

    G.OptionType = {
        MenuItem:   0,
        KeyInput:   1,
        LineInput:  2,
    };
    Object.freeze(G.OptionType);


// ////////////////////////////////////////////////////////////////////////////
// Option class
// ////////////////////////////////////////////////////////////////////////////
    G.Option = class Option {
        constructor(displayText, value, extraValue, hotkey) {
            this.displayText = displayText;
            this.value = value;
            this.extra = extraValue || G.noneValue;
            if (hotkey && hotkey.type === G.ValueType.Integer) {
                this.hotkey = hotkey.value;
            } else {
                this.hotkey = 0;
            }
        }

        toString() {
            const dumpStr = [ "(option: \"", this.displayText,
                            "\" -> ", this.value, ")" ];
            return dumpStr.join("");
        }
    }

// ////////////////////////////////////////////////////////////////////////////
// RuntimeError class
// ////////////////////////////////////////////////////////////////////////////
    G.RuntimeError = class RuntimeError {
        constructor(message) {
            this.message = message;
        }

        toString() {
            return "RuntimeError: " + this.message;
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// Stack class
// ////////////////////////////////////////////////////////////////////////////
    G.Stack = class Stack {
        constructor() {
            this.stack = [];
        }

        get length() {
            return this.stack.length;
        }

        toString() {
            const dumpStr = ["STACK:\n    Size:", this.stack.length, "\n"];
            for (var i = 0; i < this.stack.length; ++i) {
                const item = this.stack[i];
                dumpStr.push("    ");
                dumpStr.push(item);
                dumpStr.push("\n");
            };
            dumpStr.push("===");
            return dumpStr.join("");
        }
        peek(position) {
            if (position < 0 || position >= this.stack.length) {
                throw new G.RuntimeError("Invalid stack position.");
            }
            return this.stack[this.stack.length - 1 - position];
        }
        pop() {
            if (this.stack.length <= 0) {
                throw new G.RuntimeError("Stack underflow.");
            }
            return this.stack.pop();
        }
        push(value) {
            if (!(value instanceof G.Value)) {
                if (typeof value === "number") {
                    value = new G.Value(G.ValueType.Integer, value);
                } else if (typeof value === "string") {
                    value = new G.Value(G.ValueType.String, value);
                } else {
                    throw new G.RuntimeError("Bad Stack values; found "
                                             + typeof value + ".");
                }
            }
            this.stack.push(value);
        }
        top() {
            if (this.stack.length <= 0) {
                throw new G.RuntimeError("Stack underflow.");
            }
            return this.stack[this.stack.length - 1];
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// CallStack class
// ////////////////////////////////////////////////////////////////////////////
    G.CallStack = class CallStack {
        constructor() {
            this.frames = [];
        }

        get frameCount() {
            return this.frames.length;
        }

        toString() {
            const callStr = [];
            callStr.push("\nCALL STACK:\n");
            for (var i = 0; i < this.frameCount; ++i) {
                const line = this.frames[i];
                const localStr = [];
                const stackStr = [];
                line.locals.forEach(function(value) {
                    localStr.push(value.toString());
                });
                line.stack.stack.forEach(function(value) {
                    stackStr.push(value.toString());
                });
                callStr.push("  ");
                callStr.push(i);
                callStr.push(" FunctionID:");
                callStr.push(line.functionId);
                if (line.functionId < G.functions.length) {
                    const value = new G.Value(G.ValueType.Function, line.functionId);
                    const sourceStr = G.getSource(value);
                    callStr.push(" @ ");
                    callStr.push(G.getString(sourceStr));
                } else {
                    callStr.push(" (invalid)");
                }
                callStr.push("\n    LOCALS:[");
                callStr.push(localStr.join(", "));
                callStr.push("]\n    STACK:[");
                callStr.push(stackStr.join(", "));
                callStr.push("]\n");
            }
            return callStr.join("");
        }

        get base() {
            return this.topFrame().baseAddress;
        }
        get id() {
            return this.topFrame().functionId;
        }
        get length() {
            return this.frames.length;
        }
        get locals() {
            return this.topFrame().locals;
        }
        get returnAddress() {
            return this.topFrame().returnAddress;
        }
        get returnValue() {
            if (this.stack.length > 0)
                return this.evaluate(this.stack.pop());
            else
                return G.noneValue;
        }
        get stack() {
            return this.topFrame().stack;
        }
        get stackSize() {
            return this.topFrame().stack.length;
        }

        evaluate(value) {
            while (value.type === G.ValueType.LocalVar) {
                if (value.value < 0 || value.value > this.locals.length) {
                    throw new G.RuntimeError("evaluate: Invalid local number " + value.value + ".");
                }
                value = this.locals[value.value];
            }
            return value;
        }

        buildLocals(argList, maxArgs, totalLocals) {
            for (var i = 0; i < totalLocals; ++i) {
                if (i < argList.length && i < maxArgs) {
                    this.locals.push(argList[i]);
                } else {
                    this.locals.push(G.noneValue);
                }
            }
        }
        get(position) {
            if (position < 0 || position > this.locals.length) {
                throw new G.RuntimeError("Tried to read invalid local number " + position + ".");
            }
            return this.locals[position];
        }
        set(position, newValue) {
            newValue = newValue || G.noneValue;
            if (position < 0 || position > this.locals.length) {
                throw new G.RuntimeError("Tried to update invalid local number " + position + ".");
            }
            this.locals[position] = newValue;
        }

        peek(pos) {
            pos = pos || 0;
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to pop with empty callstack.");
            }
            if (pos < 0 || pos >= this.stackSize) {
                throw new G.RuntimeError("Tried to peek invalid stack position.");
            }
            const result = this.stack.stack[this.stackSize - 1 - pos];
            return result;
        }
        pop() {
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to pop with empty callstack.");
            }
            const result = this.popRaw();
            if (result.type == G.ValueType.LocalVar) {
                return this.evaluate(result);
            } else {
                return result;
            }
        }
        popRaw() {
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to pop with empty callstack.");
            }
            return this.stack.pop();
        }
        push(value) {
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to pop with empty callstack.");
            }
            this.stack.push(value);
        }

        popFrame() {
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to pop frame from empty callstack.");
            }
            return this.frames.pop()
        }
        pushFrame(functionId, baseAddress, returnAddress) {
            this.frames.push(new G.CallStackFrame(functionId, baseAddress, returnAddress));
        }
        topFrame() {
            if (this.frames.length === 0) {
                throw new G.RuntimeError("Tried to get top frame of empty callstack.");
            }
            return this.frames[this.frames.length - 1];
        }

    }
    G.CallStackFrame = class CallStackFrame {
        constructor(functionId, baseAddress, returnAddress) {
            this.functionId = functionId;
            this.baseAddress = baseAddress;
            this.returnAddress = returnAddress;
            this.stack = new G.Stack();
            this.locals = [];
        }

    }

// ////////////////////////////////////////////////////////////////////////////
// Value class
// ////////////////////////////////////////////////////////////////////////////
    G.Value = class Value {
        constructor(type, value) {
            if (type == undefined || typeof type !== "number")
                throw new G.RuntimeError("Value must have type, but found "
                                         + typeof type);
            else if (type < 0 || type > G.ValueType.MaxType)
                throw new G.RuntimeError("Value must have valid type; found "
                                         + type);
            if (value == undefined)
                throw new G.RuntimeError("Value must have value");
            this.type = type;
            this.value = value;
            this.selfobj = G.noneValue;
        }

        get type() {
            return this.mType;
        }
        get value() {
            return this.mValue;
        }
        set type(newType) {
            this.mType = newType;
        }
        set value(newValue) {
            this.mValue = newValue;
        }

        clone() {
            return new G.Value(this.mType, this.mValue, this.selfobj);
        }
        isFalse() {
            return !this.isTrue();
        }
        isTrue() {
            if (this.type === G.ValueType.None || this.value === 0) {
                return false;
            } else {
                return true;
            }
        }
        forbidType(type) {
            if (this.type === type) {
                throw new G.RuntimeError(
                    G.typeNames[type] + " is forbidden here.");
            }
        }
        requireType(type) {
            if (this.type !== type) {
                throw new G.RuntimeError(
                    "Expected " + G.typeNames[type] + ", but found " +
                    G.typeNames[this.type] + ".");
            }
        }
        toKey() {
            return this.mType + ":" + this.mValue;
        }
        toString() {
            const dumpStr = [ "<" ]
            if (this.type < 0 || this.type > G.ValueType.MaxType) {
                dumpStr.push("invalid");
            } else {
                dumpStr.push(G.typeNames[this.type]);
            }
            dumpStr.push(": ");
            dumpStr.push(this.value);
            dumpStr.push(">");
            return dumpStr.join("");
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// Core Engine Functions
// ////////////////////////////////////////////////////////////////////////////
    G.addPage = function addPage(pageInfo) {
        const pageId = pageInfo.title.value;
        if (G.pages.hasOwnProperty(pageId)) {
            throw new G.RuntimeError("Tried to add page \"" + G.getString(pageId) + "\" but page already exists.");
        }
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("pageButton");
        button.textContent = G.getString(pageId);
        button.title = G.getString(pageId) + " (" + String.fromCodePoint(pageInfo.hotkey.value) + ")";
        button.addEventListener("click", function() {
            G.doPage(pageId);
        });
        G.eButtons.appendChild(button);
        pageInfo.button = button;
        G.pages[pageId] = pageInfo;
    }

    G.clearOutput = function clearOutput() {
        while (G.eOutput.childElementCount > 0) {
            G.eOutput.removeChild(G.eOutput.firstChild);
        }
    }

    G.collectGarbage = function collectGarbage() {
        ////////////////////////////////////////
        // UNMARK ALL
        G.objects.forEach(function(item) { if (item) item.marked = false; });
        G.lists.forEach(function(item)   { if (item) item.marked = false; });
        G.maps.forEach(function(item)    { if (item) item.marked = false; });
        G.strings.forEach(function(item) { if (item) item.marked = false; });

        ////////////////////////////////////////
        // COLLECTING
        function markObject(object, xtra) {
            if (!object || object.marked || !object.data) return;
            object.marked = true;
            const keys = Object.keys(object.data);
            keys.forEach(function(key) {
                markValue(object.data[key]);
            });
        };
        function markList(list) {
            if (!list || list.marked || !list.data) return;
            list.marked = true;
            list.data.forEach(function(value) {
                markValue(value);
            });
        };
        function markMap(map) {
            if (!map || map.marked || !map.data) return;
            map.marked = true;

            const rawKeys = Object.keys(map.data);
            rawKeys.forEach(function(key) {
                const keySep = key.indexOf(":");
                const keyType = +key.substring(0, keySep);
                const keyValue = +key.substring(keySep + 1);
                const value = new G.Value(keyType, keyValue);
                markValue(value);
                markValue(map.data[key]);
            })
        };
        function markString(string) {
            if (!string || string.marked || string.data == undefined) return;
            string.marked = true;
        }
        function markValue(what) {
            if (!what || !(what instanceof G.Value)) return;
            switch(what.type) {
                case G.ValueType.String:
                    markString(G.strings[what.value]);
                    break;
                case G.ValueType.Object:
                    markObject(G.getObject(what.value));
                    break;
                case G.ValueType.List:
                    markList(G.getList(what.value));
                    break;
                case G.ValueType.Map:
                    markMap(G.getMap(what.value));
                    break;
                case G.ValueType.None:
                case G.ValueType.Integer:
                case G.ValueType.Function:
                case G.ValueType.Property:
                    // no need to mark
                    break;
                default:
                    console.error("Found unknown type ", what.type, " during garbage collection.");
            }
            what.marked = true;
        }
        for (var i = 0; i <= G.objectCount; ++i)    markObject(G.objects[i]);
        for (var i = 0; i <= G.listCount; ++i)      markList(G.lists[i]);
        for (var i = 0; i <= G.mapCount; ++i)       markMap(G.maps[i]);
        G.options.forEach(function(option) {
            markValue(option.displayText);
            markValue(option.extra);
            markValue(option.value);
        });

        ////////////////////////////////////////
        // COLLECTING
        function collect(theList,start) {
            for (var i = start; i < theList.length; ++i) {
                if (!theList[i] || theList[i].data == undefined) {
                    continue;
                }
                if (!theList[i].marked) {
                    theList[i] = undefined;
                }
            }
        }
        collect(G.objects,  G.objectCount + 1);
        collect(G.lists,    G.listCount + 1);
        collect(G.maps,     G.mapCount + 1);
        collect(G.strings,  G.stringCount);

        ////////////////////////////////////////
        // TRIMMING
        while (G.objects.length > 0
                && G.objects[G.objects.length - 1] == undefined) {
            G.objects.pop();
        }
        while (G.maps.length > 0
                && G.maps[G.maps.length - 1] == undefined) {
            G.maps.pop();
        }
        while (G.strings.length > 0
                && G.strings[G.strings.length - 1] == undefined) {
            G.strings.pop();
        }
        while (G.lists.length > 0
                && G.lists[G.lists.length - 1] == undefined) {
            G.lists.pop();
        }

    }

    G.delPage = function delPage(pageId) {
        if (G.pages.hasOwnProperty(pageId.value)) {
            G.eButtons.removeChild(G.pages[pageId.value].button);
            delete G.pages[pageId.value];
        }
    }

    G.doEvent = function doEvent(functionId, argsList) {
        argsList = argsList || [];
        argsList.unshift(G.noneValue);
        if (G.inPage) {
            G.doPage(G.inPage, argsList, functionId);
            return;
        }

        const start = performance.now();
        G.options = [];
        G.textBuffer = [];

        let errorDiv = undefined;
        try {
            if (functionId instanceof G.Value) {
                functionId.requireType(G.ValueType.Node);
                functionId = functionId.value;
            }

            G.callFunction(G, functionId, argsList);
        } catch (error) {
            if (!(error instanceof G.RuntimeError))    throw error;
            errorDiv = document.createElement("pre");
            errorDiv.classList.add("error");
            const errorMessage = [];

            if (G.callStack) {
                errorMessage.push(G.callStack.toString());
            }
            if (G.stack) {
                errorMessage.push("\n");
                errorMessage.push(G.stack.toString());
            }

            errorDiv.textContent = errorMessage.join("");
            const fatalErrorText = document.createElement("span");
            fatalErrorText.classList.add("errorTitle");
            fatalErrorText.textContent = error.toString() + "\n";
            errorDiv.insertBefore(fatalErrorText, errorDiv.firstChild);
        }

        G.doOutput(errorDiv);
        ++G.eventCount;
        const end = performance.now();
        const runGC = G.eventCount % G.garbageCollectionFrequency ===  0;
        const gcStart = performance.now();
        if (runGC) {
            G.collectGarbage();
        }
        const gcEnd = performance.now();

        const systemInfo = [];
        if (G.showEventDuration) {
            const runtime = Math.round((end - start) * 1000) / 1000000;
            systemInfo.push("Runtime: " + runtime + "s");
        }
        if (G.showOperationsCount) {
            systemInfo.push(G.operations + " opcodes");
        }
        if (runGC && G.showGarbageCollectionDuration) {
            const runtime = Math.round((gcEnd - gcStart) * 1000) / 1000000;
            systemInfo.push("GC: " + runtime + "s");
        }
        G.eBottomLeft.textContent = systemInfo.join("; ");
    }

    G.doOutput = function doOutput(errorMessage) {
        const nextDiv = document.createElement("div");
        nextDiv.classList.add("sceneNode");
        const outputText = G.textBuffer.join("").split("\n");
        outputText.forEach(function(line) {
            line = line.trim();
            if (line === "") return;

            if (line.match(/^---+$/) !== null) {
                const p = document.createElement("hr");
                nextDiv.appendChild(p);
            } else {
                line = line.replace(/&/g, "&amp;");
                line = line.replace(/</g, "&lt;");
                line = line.replace(/>/g, "&gt;");
                line = line.replace(/\[b](.*?)\[\/b]/g, "<b>$1</b>");
                line = line.replace(/\[i](.*?)\[\/i]/g, "<i>$1</i>");
                line = line.replace(/\[br]/g, "<br>");

                const p = document.createElement("p");
                if (line.substring(0,1) === "#") {
                    p.innerHTML = line.substring(1);
                    p.classList.add("headerParagraph")
                } else {
                    p.innerHTML = line;
                }
                nextDiv.appendChild(p);
            }
        });
        G.eOutput.appendChild(nextDiv);
        if (errorMessage)   G.eOutput.appendChild(errorMessage);
        else                G.showOptions();
        nextDiv.scrollIntoView();
    }

    G.doPage = function doPage(pageId, argsList, fromEvent) {
        if (G.inPage && G.inPage !== pageId) return;
        if (!G.inPage) {
            G.stored.textBuffer = G.textBuffer;
            G.stored.options = G.options;
            G.stored.optionType = G.optionType;
            G.stored.optionFunction = G.optionFunction;
            G.inPage = pageId;
        }
        G.options = [];
        G.textBuffer = [];
        while (G.eOutput.childElementCount > 0) {
            G.eOutput.removeChild(G.eOutput.firstChild);
        }
        G.textBuffer.push("# ");
        G.textBuffer.push(G.getString(pageId));
        G.textBuffer.push("\n");
        if (fromEvent) {
            G.callFunction(G, fromEvent, argsList);
        } else {
            G.callFunction(G, G.pages[pageId].callback, argsList);
        }
        G.doOutput();
        G.eBottomLeft.textContent = "Event run time: (unavailable)";
    }

    G.endPage = function endPage() {
        if (!G.inPage) {
            throw new G.RuntimeError("Tried to end page while not in a page");
        }
        G.textBuffer = G.stored.textBuffer;
        G.options = G.stored.options;
        G.optionType = G.stored.optionType;
        G.optionFunction = G.stored.optionFunction;
        G.stored = {};
        G.inPage = false;
    }

    G.getData = function getData(type, dataArray, index) {
        if (index instanceof G.Value) {
            index.requireType(type);
            index = index.value;
        }
        if (index < 0 || index >= dataArray.length || (type !== G.ValueType.String && index === 0)) {
            throw new G.RuntimeError("Tried to access invalid " + G.typeNames[type] + " #" + index);
        }
        return dataArray[index].data;
    }

    G.getFunction = function getString(functionNumber) {
        return G.getData(G.ValueType.Function, G.functions, functionNumber);
    }

    G.getList = function getList(listNumber) {
        return G.getData(G.ValueType.List, G.lists, listNumber);
    }

    G.getMap = function getMap(mapNumber) {
        return G.getData(G.ValueType.Map, G.maps, mapNumber);
    }

    G.getObject = function getString(objectNumber) {
        return G.getData(G.ValueType.Object, G.objects, objectNumber);
    }

    G.getObjectProperty = function getObjectProperty(objectId, propertyId) {
        if (objectId instanceof G.Value) {
            objectId.requireType(G.ValueType.Object);
            objectId = objectId.value;
        }
        if (propertyId instanceof G.Value) {
            propertyId.requireType(G.ValueType.Property);
            propertyId = propertyId.value;
        }
        const theObject = G.getObject(objectId);
        if (theObject.hasOwnProperty(propertyId)) {
            const result = theObject[propertyId];
            result.selfobj = new G.Value(G.ValueType.Object, objectId);
            return result;
        } else {
            if (theObject.hasOwnProperty(G.propParent)) {
                return G.getObjectProperty(theObject[G.propParent], propertyId);
            } else {
                return new G.Value(G.ValueType.Integer, 0);
            }
        }
    }

    G.getSetting = function getSetting(settingNumber) {
        switch(settingNumber.value) {
            case 0:
                return new G.Value(G.ValueType.Integer, +G.saveAllowed);
            default:
                throw new G.RuntimeError("Tried to get unknown setting " + settingNumber.value + ".");
        }
    }

    G.getSource = function getSource(ofWhat) {
        var stringData = undefined;
        var data;
        switch(ofWhat.type) {
            case G.ValueType.String:        return G.noneValue;
            case G.ValueType.Integer:       return G.noneValue;
            case G.ValueType.JumpTarget:    return G.noneValue;
            case G.ValueType.LocalVar:      return G.noneValue;
            case G.ValueType.VarRef:        return G.noneValue;
            case G.ValueType.Property:      return G.noneValue;
            case G.ValueType.Map:
                if (ofWhat.value < 0 || ofWhat.value >= G.maps.length)
                    throw new G.RuntimeError("Tried to get origin of invalid map.");
                data = G.maps[ofWhat.value];
                break;
            case G.ValueType.List:
                if (ofWhat.value < 0 || ofWhat.value >= G.lists.length)
                    throw new G.RuntimeError("Tried to get origin of invalid list.");
                data = G.lists[ofWhat.value];
                break;
            case G.ValueType.Object:
                if (ofWhat.value < 0 || ofWhat.value >= G.objects.length)
                    throw new G.RuntimeError("Tried to get origin of invalid object.");
                data = G.objects[ofWhat.value];
                break;
            case G.ValueType.Function:
                if (ofWhat.value < 0 || ofWhat.value >= G.functions.length)
                    throw new G.RuntimeError("Tried to get origin of invalid function.");
                data = G.functions[ofWhat.value];
                break;
            default:
                stringData = "(unhandled type " + G.typeNames[ofWhat.type] + ")";
        }
        const newStr = G.makeNew(G.ValueType.String);
        if (stringData === undefined) {
            if (data.sourceFile === -1)
                stringData = "no debug info";
            else if (data.sourceFile === -2)
                stringData = "dynamic";
            else {
                if (data.hasOwnProperty("sourceName")) {
                    stringData = "\"" + G.getString(data.sourceName) + "\" ";
                } else {
                    stringData = "";
                }

                if (data.sourceLine === -1)
                    stringData += G.getString(data.sourceFile);
                else
                    stringData += G.getString(data.sourceFile) + ":" + data.sourceLine;
            }
        }
        G.strings[newStr.value].data = stringData;
        return newStr;
    }

    G.getString = function getString(stringNumber) {
        if (stringNumber instanceof G.Value) {
            stringNumber.requireType(G.ValueType.String);
            stringNumber = stringNumber.value;
        }
        return G.getData(G.ValueType.String, G.strings, stringNumber);
    }

    G.isStatic = function isStatic(what) {
        if (!(what instanceof G.Value)) {
            throw new G.RuntimeError("Used isStatic on non-Value");
        }
        switch(what.type) {
            case G.ValueType.Object:
                if (what.value >= G.objectCount)
                    return new G.Value(G.ValueType.Integer, 0);
                else
                    return new G.Value(G.ValueType.Integer, 1);
            case G.ValueType.Map:
                if (what.value >= G.mapCount)
                    return new G.Value(G.ValueType.Integer, 0);
                else
                    return new G.Value(G.ValueType.Integer, 1);
            case G.ValueType.List:
                if (what.value >= G.listCount)
                    return new G.Value(G.ValueType.Integer, 0);
                else
                    return new G.Value(G.ValueType.Integer, 1);
            case G.ValueType.String:
                if (what.value >= G.stringCount)
                    return new G.Value(G.ValueType.Integer, 0);
                else
                    return new G.Value(G.ValueType.Integer, 1);
            default:
                return new G.Value(G.ValueType.Integer, 1);
        }
    }

    G.makeNew = function makeNew(type) {
        if (type instanceof G.Value) {
            type.requireType(G.ValueType.Integer);
            type = type.value;
        }
        let nextId = -1;
        switch (type) {
            case G.ValueType.List:
                nextId = G.lists.length;
                G.lists[nextId] = {data:[], sourceFile: -2, sourceLine: -1};
                return new G.Value(G.ValueType.List, nextId);
            case G.ValueType.Map:
                nextId = G.maps.length;
                G.maps[nextId] = {data:{}, sourceFile: -2, sourceLine: -1};
                return new G.Value(G.ValueType.Map, nextId);
            case G.ValueType.Object:
                nextId = G.objects.length;
                G.objects[nextId] = {data:{}, sourceFile: -2, sourceLine: -1};
                return new G.Value(G.ValueType.Object, nextId);
            case G.ValueType.String:
                nextId = G.strings.length;
                G.strings[nextId] = {data:""};
                return new G.Value(G.ValueType.String, nextId);
            default:
                throw new G.RuntimeError("Cannot instantiate objects of type "
                                        + G.typeNames[type]);
        }
    }

    G.say = function say(value, ucFirst) {
        ucFirst = ucFirst || false;
        if (!(value instanceof G.Value)) {
            if (typeof value === "string" || typeof value === "number") {
                G.textBuffer.push(value);
            }
            return;
        }

        switch(value.type) {
            case G.ValueType.String: {
                let theString = G.getString(value.value);
                if (ucFirst) {
                    theString = theString.substring(0,1).toUpperCase()
                                + theString.substring(1);
                }
                G.textBuffer.push(theString);
                break; }
            case G.ValueType.Integer:
                G.textBuffer.push(value.value);
                break;
            default:
                var text = "<" + G.typeNames[value.type];
                if (value.type != G.ValueType.None) {
                    text += " " + value.value;
                }
                text += ">";
                G.textBuffer.push(text);
        }
    }

    G.setObjectProperty = function setObjectProperty(objectId, propertyId,
                                                     newValue) {
        if (objectId instanceof G.Value) {
            objectId.requireType(G.ValueType.Object);
            objectId = objectId.value;
        }
        if (propertyId instanceof G.Value) {
            propertyId.requireType(G.ValueType.Property);
            propertyId = propertyId.value;
        }
        if (!(newValue instanceof G.Value)) {
            throw new RuntimeError("Tried to set property value to non-Value");
        }
        const theObject = G.getObject(objectId);
        theObject[propertyId] = newValue;
    }

    G.setSetting = function setSetting(settingNumber, settingValue) {
        if (settingNumber instanceof G.Value) {
            settingNumber.requireType(G.ValueType.Integer);
            settingNumber = settingNumber.value;
        }

        switch(settingNumber) {
            case G.Settings.SaveAllowed:
                if (settingValue.isTrue()) {
                    G.eSaveButton.style.display = 'inline';
                    G.eNoSaveButton.style.display = 'none';
                    G.saveAllowed = true;
                } else {
                    G.eSaveButton.style.display = 'none';
                    G.eNoSaveButton.style.display = 'inline';
                    G.saveAllowed = false;
                }
                break;
            case G.Settings.InfobarLeft:
                if (settingValue instanceof G.Value)
                    G.eTopLeft.textContent = G.getString(settingValue);
                else
                    G.eTopLeft.textContent = settingValue;
                break;
            case G.Settings.InfobarRight:
                if (settingValue instanceof G.Value)
                    G.eTopRight.textContent = G.getString(settingValue);
                else
                    G.eTopRight.textContent = settingValue;
                break;
            case G.Settings.InfobarFooter:
                if (settingValue instanceof G.Value)
                    G.eBottomRight.textContent = G.getString(settingValue);
                else
                    G.eBottomRight.textContent = settingValue;
                break;
            case G.Settings.Title:
                if (settingValue instanceof G.Value)
                    document.title = G.getString(settingValue);
                else
                    document.title = settingValue;
                break;
            default:
                throw new G.RuntimeError("Tried to set unknown setting " + settingNumber + ".");
        }
    }

    G.setStatus = function setStatus(toValue) {
        if (toValue instanceof G.Value) {
            toValue.requireType(G.ValueType.String);
            toValue = G.getString(toValue.value);
        }
        G.eBottomLeft = toValue;
    }

    G.objectByIdent = function objectByIdent(objectId) {
        if (objectId instanceof G.Value) {
            objectId.requireType(G.ValueType.Integer);
            objectId = objectId.value;
        }
        if (objectId <= 0) return G.noneValue;

        for (var i = 1; i < G.objects.length; ++i) {
            const thisIdent = G.getObjectProperty(i, G.propIdent);
            if (thisIdent.value === objectId) {
                return new G.Value(G.ValueType.Object, i);
            }
        }
        return G.noneValue;
    }

    G.objectHasProperty = function objectHasProperty(objectId, propertyId) {
        if (objectId instanceof G.Value) {
            objectId.requireType(G.ValueType.Object);
            objectId = objectId.value;
        }
        if (propertyId instanceof G.Value) {
            propertyId.requireType(G.ValueType.Property);
            propertyId = propertyId.value;
        }
        const theObject = G.getObject(objectId);
        if (theObject.hasOwnProperty(propertyId)) {
            return new G.Value(G.ValueType.Integer, 1);
        } else {
            return new G.Value(G.ValueType.Integer, 0);
        }
    }

    G.showOptions = function showOptions() {
        const oldOptionsCore = document.getElementById("optionsCore");
        if (oldOptionsCore) {
            oldOptionsCore.parentElement.removeChild(oldOptionsCore);
        }

        const optionsCore = document.createElement("div");
        optionsCore.id = "optionsCore";
        G.eOutput.appendChild(optionsCore);

        if (G.options.length === 0) return;

        switch(G.optionType) {
            case G.OptionType.MenuItem:
                const optionsList = document.createElement("div");
                optionsList.id = "optionslist";
                const standardOptions = [];
                const hotkeyOptions = [];
                var nextNum = 1;

                G.options.forEach(function(option, optionIndex) {
                    option.displayText.requireType(G.ValueType.String);
                    const button = document.createElement("button");
                    button.type = "button";
                    button.optionIndex = optionIndex;
                    var keyString;
                    if (option.hotkey) {
                        keyString = String.fromCharCode(option.hotkey).toUpperCase();
                        hotkeyOptions.push(button);
                    } else {
                        if (nextNum < 10) {
                            option.hotkey = 48 + nextNum;
                        } else if (nextNum == 10) {
                            option.hotkey = 48;
                        }
                        keyString = ""+nextNum;
                        ++nextNum;
                        standardOptions.push(button);
                    }
                    button.textContent = keyString + ") " + G.getString(option.displayText.value);
                    button.classList.add("optionsButton");
                    button.addEventListener("click", G.optionClickHandler);
                });

                function appendOption(optionElement) {
                    if (optionElement) {
                        optionsList.appendChild(optionElement);
                    }
                    const newBr = document.createElement("br");
                    optionsList.appendChild(newBr);
                }
                standardOptions.forEach(appendOption);
                hotkeyOptions.forEach(appendOption);
                optionsCore.appendChild(optionsList);
                break;

            case G.OptionType.LineInput: {
                const theOption = G.options[0];
                const options = document.createElement("div");
                options.id = "optionslist";
                options.classList.add("optionslist");
                options.classList.add("optionslineinput");

                const prompt = document.createElement("label");
                prompt.for = "lineinput";
                prompt.textContent = G.getString(theOption.displayText.value);
                options.append(prompt);

                const textLine = document.createElement("input");
                textLine.type = "text";
                textLine.id = "lineinput";
                options.appendChild(textLine);

                const goButton = document.createElement("button");
                goButton.type = "button";
                goButton.id = "gobutton";
                goButton.textContent = "Enter";
                goButton.addEventListener("click", G.goButtonHandler);
                options.appendChild(goButton);

                optionsCore.appendChild(options);
                textLine.focus();
                break; }
            case G.OptionType.KeyInput:
                const theOption = G.options[0];
                const options = document.createElement("p");
                options.id = "optionslist";
                options.classList.add("optionslist");
                options.textContent = G.getString(theOption.displayText.value);
                optionsCore.appendChild(options);
                break;
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// Keyboard input handler
// ////////////////////////////////////////////////////////////////////////////
    G.execOption = function(optionNumber) {
        const optionText = document.createElement("p");
        optionText.classList.add("optionNode");
        optionText.textContent = "> " + G.getString(G.options[optionNumber].displayText.value);
        G.eOutput.appendChild(optionText);
        G.doEvent(G.optionFunction, [G.options[optionNumber].value, G.options[optionNumber].extra]);
    }
    G.goButtonHandler = function goButtonHandler() {
        if (G.options.length >= 1) {
            const eInput = document.getElementById("lineinput");

            const optionText = document.createElement("p");
            optionText.classList.add("optionNode");
            optionText.textContent = G.getString(G.options[0].displayText.value) + " " + eInput.value;
            G.eOutput.appendChild(optionText);

            const newStr = G.makeNew(G.ValueType.String);
            G.strings[newStr.value].data = eInput.value;

            G.doEvent(G.optionFunction, [newStr]);
        }
    }
    G.optionClickHandler = function optionClickHandler(event) {
        G.execOption(event.target.optionIndex);
    }
    G.keyPressHandler = function keyPressHandler(event) {
        // handle dialog keyboard events
        if (G.UI.inDialog) {
            if (event.key === "Enter" || event.key === "Escape"
                    || (event.key === " " && G.UI.inDialog.allowSpace)) {
                G.UI.inDialog.close();
                event.preventDefault();
            }
            return;
        }

        // only handle events if the game is actually running
        if (!G.gameLoaded) return;

        var code = -1;
        if (event.key.length === 1) code = event.key.toLowerCase().codePointAt(0);

        if (G.optionType === G.OptionType.LineInput) {
            if (event.key === "Enter") {
                G.goButtonHandler();
                return;
            }
            document.getElementById("lineinput").focus();
            return;
        }

        if (G.options.length === 0) return;

        switch (G.optionType) {
            case G.OptionType.MenuItem:
                // handle space/enter for activating single options
                if (code == 32 || event.key === "Enter") {
                    if (G.options.length == 1) {
                        G.execOption(0);
                        event.preventDefault();
                    }
                    return;
                }

                if (code <= 0) break;
                for (var i = 0; i < G.options.length; ++i) {
                    if (G.options[i].hotkey === code) {
                        G.execOption(i);
                        event.preventDefault();
                        break;
                    }
                }
                break;
            case G.OptionType.KeyInput:
                if (code === -1) {
                    switch(event.key) {
                        case "Backspace":   code = 8;   break;
                        case "Tab":         code = 9;   break;
                        case "Enter":       code = 10;  break;
                        case "Spacebar":    code = 32;  break;
                        case "ArrowLeft":   code = -1;  break;
                        case "ArrowRight":  code = -2;  break;
                        case "ArrowDown":   code = -3;  break;
                        case "ArrowUp":     code = -4;  break;
                        case "End":         code = -5;  break;
                        case "Home":        code = -6;  break;
                        case "PageDown":    code = -7;  break;
                        case "PageUp":      code = -8;  break;
                        case "Delete":      code = -9;  break;
                        default:            return;
                    }
                }

                const func = G.options[0].value;
                func.requireType(G.ValueType.Node);
                G.doEvent(func.value, [new G.Value(G.ValueType.Integer, code)]);
                event.preventDefault();
                return;
        }

        if (code == 111) {
            G.UI.showSettings();
            event.preventDefault();
            return;
        }

        const pageKeys = Object.keys(G.pages);
        for (var i = 0; i < pageKeys.length; ++i) {
            const page = G.pages[pageKeys[i]];
            if (page.hotkey.value == code) {
                G.doPage(page.title.value);
                event.preventDefault();
            }
        }
    }

})();
