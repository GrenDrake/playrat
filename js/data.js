
const G = {
    noneValue: undefined,
    strings: [],
    objects: [],
    lists: [],
    maps: [],
    functions: [],

    eOutput: undefined,
    eTopLeft: undefined,
    eTopRight: undefined,
    eBottomLeft: undefined,
    eBottomRight: undefined,
    eButtons: undefined,

    textBuffer: [],

    optionFunction: undefined,
    optionType: -1,
    options: [],
    gameLoaded: false,

    inPage: false,
    pages: {},
    stored: {
        textBuffer: undefined,
        options: undefined,
    },

    garbageCollectionFrequency: 5,
    eventCount: 0,
    operations: 0,
    callStack: undefined,
    stack: undefined,

    showEventDuration: true,
    showOperationsCount: true,
    showGarbageCollectionDuration: true,
};

(function() {
    "use strict";

// ////////////////////////////////////////////////////////////////////////////
// ENum Values
// ////////////////////////////////////////////////////////////////////////////
    G.Info = {
        LeftHeader:     0,
        RightHeader:    1,
        Footer:         2,
        Title:          3,
    };
    Object.freeze(G.Info);

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
        LocalVar:     8,
        JumpTarget:   9,
        MaxType:      9,
    };
    Object.freeze(G.ValueType);

    G.typeNames = [
        "None",
        "Integer",
        "String",
        "List",
        "Map",
        "Function",
        "Object",
        "Property",
        "LocalVar",
        "JumpTarget"
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
        constructor(displayText, value, extraValue) {
            this.displayText = displayText;
            this.value = value;
            this.extra = extraValue || G.noneValue;
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
            this.base = 0;
        }

        get length() {
            return this.stack.length;
        }

        toString() {
            const dumpStr = ["STACK:\n    Size:", this.stack.length, " Base:",
                             this.base, "\n"];
            for (var i = 0; i < this.stack.length; ++i) {
                const item = this.stack[i];
                dumpStr.push("    ");
                dumpStr.push(item);
                dumpStr.push("\n");
                if (i + 1 == this.base) dumpStr.push("---\n");
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
            if (this.stack.length <= this.base) {
                throw new G.RuntimeError("Stack underflow.");
            }
            return this.stack.pop();
        }
        popAsLocal(localsArray) {
            const value = this.pop();
            if (value.type === G.ValueType.LocalVar) {
                if (value.value < 0 || value.value > localsArray.length) {
                    throw new G.RuntimeError("Invalid local number.");
                }
                return localsArray[value.value];
            }
            return value;
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
            if (this.stack.length <= this.base) {
                throw new G.RuntimeError("Stack underflow.");
            }
            return this.stack[this.stack.length - 1];
        }
        resize(newSize) {
            this.base = newSize;
            if (this.stack.length > newSize) {
                this.stack.splice(newSize, this.stack.length);
            } else {
                while (this.stack.length < newSize) {
                    this.stack.push(G.noneValue);
                }
            }
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
            return new G.Value(this.mType, this.mValue);
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
// Game file parser
// ////////////////////////////////////////////////////////////////////////////
    G.parseGameFile = function parseGameFile(event) {
        const rawSource = event.target.response;
        const gamedataSrc = new DataView(rawSource);


        ///////////////////////////////////////////////////////////////////////
        // Read header data from datafile
        G.magicNumber = gamedataSrc.getUint32(0, true);
        G.formatVersion = gamedataSrc.getUint32(4, true);
        G.mainFunction = gamedataSrc.getUint32(8, true);

        ///////////////////////////////////////////////////////////////////////
        // Read strings from datafile
        var filePos = 12;
        G.stringCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        const decoder = new TextDecoder('utf8');
        for (var i = 0; i < G.stringCount; ++i) {
            const stringLength = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const rawStringData = new Uint8Array(rawSource, filePos,
                                                 stringLength);
            filePos += stringLength;
            G.strings.push({data:decoder.decode(rawStringData)});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read lists from datafile
        G.listCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.lists.push(undefined);
        for (var i = 0; i < G.listCount; ++i) {
            const thisList = [];
            const listSize = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < listSize; ++j) {
                const itemType = gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const itemValue = gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                thisList.push(new G.Value(itemType, itemValue));
            }
            G.lists.push({data:thisList});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read maps from datafile
        G.mapCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.maps.push(undefined);
        for (var i = 0; i < G.mapCount; ++i) {
            const thisMap = {};
            const mapSize = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < mapSize; ++j) {
                const item1Type = gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const item1Value = gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                const valueOne = new G.Value(item1Type, item1Value);

                const item2Type = gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const item2Value = gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                const valueTwo = new G.Value(item2Type, item2Value);

                thisMap[valueOne.toKey()] = valueTwo;
            }
            G.maps.push({data:thisMap});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read game objects from datafile
        G.objectCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.objects.push(undefined);
        for (var i = 0; i < G.objectCount; ++i) {
            const thisObject = {};
            // thisObject.key = gamedataSrc.getUint32(filePos, true);
            const objectSize = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < objectSize; ++j) {
                const propId = gamedataSrc.getUint16(filePos, true);
                filePos += 2;
                const itemType = gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const itemValue = gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                thisObject[propId] = new G.Value(itemType, itemValue);
            }
            G.objects.push({data:thisObject});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read function headers from datafile
        G.functionCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.functions.push(undefined);
        for (var i = 0; i < G.functionCount; ++i) {
            const argCount = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const localCount = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const codePosition = gamedataSrc.getUint32(filePos, true);
            filePos += 4;
            G.functions.push({data: [argCount, localCount, codePosition]});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read bytecode section from datafile
        G.bytecodeSize = gamedataSrc.getInt32(filePos, true);
        filePos += 4;
        G.bytecodeBuffer = rawSource.slice(filePos);
        G.bytecode = new DataView(G.bytecodeBuffer);

        G.noneValue = new G.Value(G.ValueType.None, 0);
        document.title = "Untitled Game";
        window.addEventListener("keydown", keyPressHandler);
        G.gameLoaded = true;
        G.doEvent(G.mainFunction);
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
        button.textContent = G.getString(pageId);
        button.title = G.getString(pageId) + " (" + String.fromCodePoint(pageInfo.hotkey.value) + ")";
        button.addEventListener("click", function() {
            G.doPage(pageId);
        });
        G.eButtons.appendChild(button);
        pageInfo.button = button;
        G.pages[pageId] = pageInfo;
    }

    G.collectGarbage = function collectGarbage() {
        ////////////////////////////////////////
        // COLLECTING
        function markObject(object) {
            if (!object || object.marked || !object.data) return;
            object.marked = true;
            const keys = Object.keys(object.data);
            keys.forEach(function(key) {
                markValue(object.data[key].value);
            });
        };
        function markList(list) {
            if (!list || list.marked || !list.data) return;
            list.marked = true;
            list.data.forEach(function(value) {
                markValue(value.value);
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
            }
            if (!what || what.marked || !what.data) return;
            what.marked = true;
        }
        for (var i = 0; i <= G.objectCount; ++i)    markObject(G.objects[i]);
        for (var i = 0; i <= G.listCount; ++i)      markList(G.lists[i]);
        for (var i = 0; i <= G.mapsCount; ++i)      markMap(G.maps[i]);

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
        if (G.inPage) {
            G.doPage(G.inPage, argsList, functionId);
            return;
        }

        const start = performance.now();
        G.options = [];
        G.textBuffer = [];

        while (G.eOutput.childElementCount > 0) {
            G.eOutput.removeChild(G.eOutput.firstChild);
        }

        try {
            if (functionId instanceof G.Value) {
                functionId.requireType(G.ValueType.Node);
                functionId = functionId.value;
            }

            G.callFunction(G, G.noneValue, functionId, argsList);
        } catch (error) {
            if (!(error instanceof G.RuntimeError))    throw error;
            const errorDiv = document.createElement("pre");
            errorDiv.classList.add("error");
            const errorMessage = [];

            if (G.callStack) {
                const callStr = [];
                callStr.push("\nCALL STACK:\n    Size:",G.callStack.length,"\n");
                for (var i = 0; i < G.callStack.length; ++i) {
                    const line = G.callStack[i];
                    const localStr = [];
                    line.locals.forEach(function(value) {
                        localStr.push(value.toString());
                    });
                    callStr.push("    ");
                    callStr.push(i);
                    callStr.push(" FunctionID:");
                    callStr.push(line.who);
                    callStr.push(" SELF:");
                    callStr.push(line.self.toString());
                    callStr.push(" LOCALS:");
                    callStr.push(localStr.join(", "));
                    callStr.push("\n");
                }
                errorMessage.push(callStr.join(""));
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
            G.eOutput.appendChild(errorDiv);
        }

        G.doOutput();
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

    G.doOutput = function doOutput() {
        const outputText = G.textBuffer.join("").split("\n");
        outputText.forEach(function(line) {
            line = line.trim();
            if (line === "") return;

            if (line.match(/^---+$/) !== null) {
                const p = document.createElement("hr");
                G.eOutput.appendChild(p);
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
                G.eOutput.appendChild(p);
            }
        });
        G.showOptions();
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
            G.callFunction(G, G.noneValue, fromEvent, argsList);
        } else {
            G.callFunction(G, G.noneValue, G.pages[pageId].callback, argsList);
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
            index = stringNumber.value;
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
            return theObject[propertyId];
        } else {
            return new G.Value(G.ValueType.Integer, 0);
        }
    }

    G.getString = function getString(stringNumber) {
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
        return new G.Value(G.ValueType.Integer, 0);
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
                G.lists[nextId] = {data:[]};
                return new G.Value(G.ValueType.List, nextId);
            case G.ValueType.Map:
                nextId = G.maps.length;
                G.maps[nextId] = {data:{}};
                return new G.Value(G.ValueType.Map, nextId);
            case G.ValueType.Object:
                nextId = G.objects.length;
                G.objects[nextId] = {data:{}};
                return new G.Value(G.ValueType.Object, nextId);
            case G.ValueType.String:
                nextId = G.strings.length;
                G.strings[nextId] = {data:""};
                return new G.Value(G.ValueType.String, nextId);
            default:
                throw new G.RuntimeError("Cannot instantiate objects of type "
                                        + G.typeNames[type]);
        }
        return new G.Value(G.ValueType.None, 0);
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

    G.setInfo = function setInfo(area, toValue) {
        toValue.requireType(G.ValueType.String);

        var eArea = undefined;
        switch(area) {
            case G.Info.LeftHeader:     eArea = G.eTopLeft;     break;
            case G.Info.RightHeader:    eArea = G.eTopRight;    break;
            case G.Info.Footer:         eArea = G.eBottomRight; break;
            case G.Info.Title:
                document.title = G.getString(toValue.value);
                return;
        }
        if (!eArea) {
            throw new G.RuntimeError("Unknown info area " + area);
        }
        eArea.textContent = G.getString(toValue.value);
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
        if (objectId < 1 || objectId > G.objects.length) {
            throw new G.RuntimeError("Tried to access invalid object ID "
                                     + objectId);
        }
        G.objects[objectId][propertyId] = newValue;
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
        const optionsList = document.getElementById("optionsList");
        if (optionsList) {
            optionsList.parentElement.removeChild(optionsList);
        }

        if (G.options.length === 0) return;

        switch(G.optionType) {
            case G.OptionType.MenuItem:
                const optionsList = document.createElement("ol");
                optionsList.id = "optionslist";
                G.options.forEach(function(option) {
                    option.displayText.requireType(G.ValueType.String);
                    const li = document.createElement("li");
                    const liSpan = document.createElement("span");
                    liSpan.textContent = G.getString(option.displayText.value);
                    liSpan.classList.add("fakeLink");
                    liSpan.addEventListener("click", function() {
                        G.doEvent(G.optionFunction, [option.value, option.extra]);
                    });
                    li.appendChild(liSpan);
                    optionsList.appendChild(li);
                });
                G.eOutput.appendChild(optionsList);
                break;
            case G.OptionType.KeyInput:
                const theOption = G.options[0];
                const options = document.createElement("p");
                options.id = "optionslist";
                options.classList.add("optionslist");
                options.textContent = G.getString(theOption.displayText.value);
                G.eOutput.appendChild(options);
                break;
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// Keyboard input handler
// ////////////////////////////////////////////////////////////////////////////
    function keyPressHandler(event) {
        var code = -1;
        if (event.key.length === 1) code = event.key.codePointAt(0);

        if (G.options.length === 0) return;

        switch (G.optionType) {
            case G.OptionType.MenuItem:
                // handle space/enter for activating single options
                if (code == 32 || event.key === "Enter") {
                    if (G.options.length == 1) {
                        G.doEvent(G.optionFunction, [G.options[0].value, G.options[0].extra]);
                    }
                    return;
                }

                // handle number keys for activiting specific options
                var choice = -1;
                if (code === 48) {
                    choice = 9;
                } else if (code >= 49 && code <= 57) {
                    choice = code - 49;
                }
                if (choice < 0 || choice >= G.options.length) {
                    break;
                }

                G.doEvent(G.optionFunction, [G.options[choice].value, G.options[choice].extra]);
                event.preventDefault();
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

        const pageKeys = Object.keys(G.pages);
        for (var i = 0; i < pageKeys.length; ++i) {
            const page = G.pages[pageKeys[i]];
            if (page.hotkey.value == code) {
                G.doPage(page.title.value);
                event.preventDefault();
            }
        }
    }


// ////////////////////////////////////////////////////////////////////////////
// Engine Startup Code
// ////////////////////////////////////////////////////////////////////////////
    if (typeof QUnit === "undefined") {
        window.addEventListener("load", function() {
            G.eOutput = document.getElementById("text");
            G.eTopLeft = document.getElementById("top-left");
            G.eTopRight = document.getElementById("top-right");
            G.eBottomLeft = document.getElementById("bottom-left");
            G.eBottomRight = document.getElementById("bottom-right");
            G.eButtons = document.getElementById("bottom-centre");

            if (!G.eOutput || !G.eTopLeft || !G.eTopRight || !G.eButtons ||
                    !G.eBottomLeft || !G.eBottomRight) {
                this.console.error("Failed to find all display regions.");
                return;
            }

            const settingsBtn = document.getElementById("settingsButton");
            if (!settingsBtn) {
                this.console.error("Failed to find settings button.");
                return;
            }
            settingsBtn.addEventListener("click", function() {
                const overlay = document.getElementById("overlay");
                overlay.style.display = "block";
                const settingsDialog = document.getElementById("settings");
                settingsDialog.style.display = "block";

                document.getElementById("limitWidth").checked = document.getElementById("contentArea").classList.contains("limitWidth");
                document.getElementById("showEventDuration").checked = G.showEventDuration;
                document.getElementById("showOperationsCount").checked = G.showOperationsCount;
                document.getElementById("showGarbageCollectionDuration").checked = G.showGarbageCollectionDuration;
            });

            const notImplemented = function() {
                alert("Not implemented yet.");
            }
            document.getElementById("newButton").addEventListener("click", notImplemented);
            document.getElementById("loadButton").addEventListener("click", notImplemented);
            document.getElementById("saveButton").addEventListener("click", notImplemented);

            const closeSettingsBtn = document.getElementById("closeSettings");
            closeSettingsBtn.addEventListener("click", function() {
                const overlay = document.getElementById("overlay");
                overlay.style.display = "none";
                const settingsDialog = document.getElementById("settings");
                settingsDialog.style.display = "none";

                document.getElementById("contentArea").classList.toggle("limitWidth", document.getElementById("limitWidth").checked);
                G.showEventDuration = document.getElementById("showEventDuration").checked;
                G.showOperationsCount = document.getElementById("showOperationsCount").checked;
                G.showGarbageCollectionDuration = document.getElementById("showGarbageCollectionDuration").checked;
            });

            var loadGameData = new XMLHttpRequest();
            loadGameData.addEventListener("load", G.parseGameFile);
            loadGameData.addEventListener("error", G.failedToLoadGameData);
            loadGameData.addEventListener("abort", G.failedToLoadGameData);
            loadGameData.open("GET", "./game.bin");
            loadGameData.responseType = "arraybuffer";
            loadGameData.send();
        })

        G.failedToLoadGameData = function failedToLoadGameData(event) {
            G.eOutput.innerHTML += "<div class='error'>[Failed to load game data.]</div>";
        }
    }
})();
