import formatter from "./formatter.js";
import { getFileIndex, getFile, decodeData, encodeData, saveFile, deleteFile } from "./filesystem.js";

// ////////////////////////////////////////////////////////////////////////////
// Interfaces
// ////////////////////////////////////////////////////////////////////////////

interface FunctionData {
    argCount: number,
    localCount: number,
    codePosition: number,
    types: Array<number>
};
interface FunctionDef {
    ident: number,
    data: FunctionData,
    sourceName: number,
    sourceFile: number,
    sourceLine: number,
    marked?: boolean
};

interface ListDef {
    ident: number,
    static: boolean,
    data: Array<Value>,
    sourceFile: number,
    sourceLine: number,
    marked?: boolean
};

interface MapDef {
    ident: number,
    static: boolean,
    data: Record<string, Value>,
    sourceFile: number,
    sourceLine: number,
    marked?: boolean
};

interface ObjectDef {
    ident: number,
    parent: number,
    child: number,
    sibling: number,
    static: boolean,
    data: Record<number, Value>,
    sourceName: number,
    sourceFile: number,
    sourceLine: number,
    marked?: boolean
};

interface StringDef {
    ident: number,
    static: boolean,
    data: string,
    marked?: boolean
};

interface VocabDef {
    data: string
};

interface DialogInfo {
    elementId: string;
    closer: () => void;
    allowSpace: boolean;
};


// ////////////////////////////////////////////////////////////////////////////
// Global Constant values
// ////////////////////////////////////////////////////////////////////////////

const propInternalName = 1;
const propIdent = 2;
const propParent = 3;


// ////////////////////////////////////////////////////////////////////////////
// ENum Values
// ////////////////////////////////////////////////////////////////////////////

enum OptionType {
    MenuItem    = 0,
    KeyInput    = 1,
    LineInput   = 2,
};

enum Setting {
    InfobarLeft     = 1,
    InfobarRight    = 2,
    InfobarFooter   = 3,
    Title           = 4,
};

enum ValueType {
    None        = 0,
    Integer     = 1,
    String      = 2,
    List        = 3,
    Map         = 4,
    Function    = 5,
    Node        = 5,
    Object      = 6,
    Property    = 7,
    TypeId      = 8,
    JumpTarget  = 9,
    VarRef      = 10,
    Vocab       = 11,
    LocalVar    = 15,
    MaxType     = 15,
    Any         = 32,
};

enum Opcode {
    Return                = 0,
    Push0                 = 1,
    Push1                 = 2,
    PushNone              = 3,
    Push8                 = 4,
    Push16                = 5,
    Push32                = 6,
    Store                 = 7,
    CollectGarbage        = 8,
    SayUCFirst            = 9,
    Say                   = 10,
    SayUnsigned           = 11,
    SayChar               = 12,
    StackPop              = 13, // remove the top item from the stack
    StackDup              = 14, // duplicate the top item on the stack
    StackPeek             = 15, // peek at the stack item X items from the top
    StackSize             = 16, // get the current size of the stack
    Call                  = 17, // call a value as a function
    IsValid               = 18,
    ListPush              = 19, // add item to end of list
    ListPop               = 20, // remove and return item from end of list
    Sort                  = 21, // sorts a list
    GetItem               = 22, // get item from list (index) or map (key)
    HasItem               = 23, // check if index (for list) or key (for map) exists
    GetSize               = 24, // get size of list or map
    SetItem               = 25, // set item in list (by index) of map (by key)
    TypeOf                = 26, // get value type
    DelItem               = 27, // remove an item from a list or a key from a map
    AddItem               = 28, // add an item to a list (use set-item for maps)
    AsType                = 29, // type coercion
    Equal                 = 30, // compare two values and push the result
    NotEqual              = 31, // compare two values and push the negated result
    LessThan              = 32, // jump if top of stack < 0
    LessThanEqual         = 33, // jump if top of stack <= 0
    GreaterThan           = 34, // jump if top of stack > 0
    GreaterThanEqual      = 35, // jump if top of stack >= 0
    Jump                  = 36, // unconditional jump
    JumpZero              = 37, // jump if top of stack == 0
    JumpNotZero           = 38, // jump if top of stack != 0
    Not                   = 39,
    Add                   = 40,
    Sub                   = 41,
    Mult                  = 42,
    Div                   = 43,
    Mod                   = 44,
    Pow                   = 45,
    BitLeft               = 46,
    BitRight              = 47,
    BitAnd                = 48,
    BitOr                 = 49,
    BitXor                = 50,
    BitNot                = 51,
    Random                = 52,
    NextObject            = 53,
    IndexOf               = 54,
    GetRandom             = 55,
    GetKeys               = 56,
    StackSwap             = 57,
    GetSetting            = 58,
    SetSetting            = 59,
    GetKey                = 60,
    GetOption             = 61,
    GetLine               = 62,
    AddOption             = 63,
    StringClear           = 65,
    StringAppend          = 66,
    // unused:            = 67,
    StringCompare         = 68,
    Error                 = 69,
    Origin                = 70,
    // unused             = 71,
    // unused             = 72,
    // unused             = 73,
    New                   = 74,
    StringAppendUF        = 75,
    IsStatic              = 76,
    EncodeString          = 77,
    DecodeString          = 78,
    FileList              = 79,
    FileRead              = 80,
    FileWrite             = 81,
    FileDelete            = 82,
    Tokenize              = 83,
    GetParent             = 84,
    GetFirstChild         = 85,
    GetSibling            = 86,
    GetChildren           = 87,
    GetChildCount         = 88,
    MoveTo                = 89,
};

// ////////////////////////////////////////////////////////////////////////////
// Runtime Error Class
// ////////////////////////////////////////////////////////////////////////////
class RuntimeError {
    message: string;

    constructor(message: string) {
        this.message = message;
    }

    toString() {
        return "RuntimeError: " + this.message;
    }
};


// ////////////////////////////////////////////////////////////////////////////
// Game Option Class
// ////////////////////////////////////////////////////////////////////////////
class GameOption {
    displayText: Value;
    value: Value;
    extra: Value;
    hotkey: number;

    constructor(displayText: Value, value: Value, extraValue: Value, hotkey: Value) {
        this.displayText = displayText;
        this.value = value;
        this.extra = extraValue || noneValue;
        if (hotkey && hotkey.type === ValueType.Integer) {
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
};


// ////////////////////////////////////////////////////////////////////////////
// Stack class
// ////////////////////////////////////////////////////////////////////////////
class Stack {
    stack: Array<Value>;

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
            dumpStr.push(item.toString());
            dumpStr.push("\n");
        };
        dumpStr.push("===");
        return dumpStr.join("");
    }
    peek(position: number) {
        if (position < 0 || position >= this.stack.length) {
            throw new RuntimeError("Invalid stack position.");
        }
        return this.stack[this.stack.length - 1 - position];
    }
    pop() {
        const v = this.stack.pop();
        if (typeof v === "undefined") return noneValue;
        return v;
    }
    push(value: Value | number | string) {
        if (!(value instanceof Value)) {
            if (typeof value === "number") {
                value = new Value(ValueType.Integer, value);
            // } else if (typeof value === "string") {
            //     value = new Value(ValueType.String, value);
            } else {
                throw new RuntimeError("Bad Stack values; found "
                                        + typeof value + ".");
            }
        }
        this.stack.push(value);
    }
    top() {
        if (this.stack.length <= 0) {
            throw new RuntimeError("Stack underflow.");
        }
        return this.stack[this.stack.length - 1];
    }
}


// ////////////////////////////////////////////////////////////////////////////
// CallStack class
// ////////////////////////////////////////////////////////////////////////////
class CallStackFrame {
    functionId: number;
    baseAddress: number;
    returnAddress: number;
    stack: Stack;
    locals: Array<Value>;

    constructor(functionId: number, baseAddress: number, returnAddress: number) {
        this.functionId = functionId;
        this.baseAddress = baseAddress;
        this.returnAddress = returnAddress;
        this.stack = new Stack();
        this.locals = [];
    }
}

class CallStack {
    frames: Array<CallStackFrame>;

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
            const localStr: Array<string> = [];
            const stackStr: Array<string> = [];
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
            if (State.functions.hasOwnProperty(line.functionId)) {
                const value = new Value(ValueType.Function, line.functionId);
                const sourceStr = getSource(value);
                callStr.push(" @ ");
                callStr.push(getString(sourceStr.value));
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
            return noneValue;
    }
    get stack() {
        return this.topFrame().stack;
    }
    get stackSize() {
        return this.topFrame().stack.length;
    }

    evaluate(value: Value) {
        while (value.type === ValueType.LocalVar) {
            if (value.value < 0 || value.value > this.locals.length) {
                throw new RuntimeError("evaluate: Invalid local number " + value.value + ".");
            }
            value = this.locals[value.value];
        }
        return value;
    }

    buildLocals(argList: Array<Value>, maxArgs: number, totalLocals: number) {
        for (var i = 0; i < totalLocals; ++i) {
            if (i < argList.length && i < maxArgs) {
                this.locals.push(argList[i]);
            } else {
                this.locals.push(noneValue);
            }
        }
    }
    get(position: number) {
        if (position < 0 || position > this.locals.length) {
            throw new RuntimeError("Tried to read invalid local number " + position + ".");
        }
        return this.locals[position];
    }
    set(position: number, newValue: Value) {
        newValue = newValue || noneValue;
        if (position < 0 || position > this.locals.length) {
            throw new RuntimeError("Tried to update invalid local number " + position + ".");
        }
        this.locals[position] = newValue;
    }

    peek(pos: number = 0) {
        pos = pos || 0;
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to pop with empty callstack.");
        }
        if (pos < 0 || pos >= this.stackSize) {
            throw new RuntimeError("Tried to peek invalid stack position.");
        }
        const result = this.stack.stack[this.stackSize - 1 - pos];
        return result;
    }
    pop() {
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to pop with empty callstack.");
        }
        const result = this.popRaw();
        if (result.type == ValueType.LocalVar) {
            return this.evaluate(result);
        } else {
            return result;
        }
    }
    popRaw() {
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to pop with empty callstack.");
        }
        return this.stack.pop();
    }
    push(value: Value) {
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to pop with empty callstack.");
        }
        this.stack.push(value);
    }

    popFrame() {
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to pop frame from empty callstack.");
        }
        return this.frames.pop()
    }
    pushFrame(functionId: number, baseAddress: number, returnAddress: number) {
        this.frames.push(new CallStackFrame(functionId, baseAddress, returnAddress));
    }
    topFrame() {
        if (this.frames.length === 0) {
            throw new RuntimeError("Tried to get top frame of empty callstack.");
        }
        return this.frames[this.frames.length - 1];
    }

}

// ////////////////////////////////////////////////////////////////////////////
// Value class
// ////////////////////////////////////////////////////////////////////////////
class Value {
    type: ValueType;
    value: number;
    realSelfobj: Value | undefined;

    constructor(type: ValueType, value: number) {
        this.type = type;
        this.value = value;
        // this.selfobj = new Value(ValueType.None, 0);
    }

    get selfobj() {
        if (this.realSelfobj) return this.realSelfobj;
        return noneValue;
    }
    set selfobj(newSelf: Value) {
        this.realSelfobj = newSelf;
    }

    clone() {
        const theClone = new Value(this.type, this.value);
        theClone.realSelfobj = this.realSelfobj;
        return theClone;
    }
    isFalse() {
        return !this.isTrue();
    }
    isTrue() {
        if (this.type === ValueType.None || this.value === 0) {
            return false;
        } else {
            return true;
        }
    }
    forbidType(type: ValueType) {
        if (this.type === type) {
            throw new RuntimeError(ValueType[type] + " is forbidden here.");
        }
    }
    requireType(type: ValueType) {
        if (this.type !== type) {
            throw new RuntimeError(
                "Expected " + ValueType[type] + ", but found " +
                ValueType[this.type] + ".");
        }
    }
    requireEitherType(type1: ValueType, type2: ValueType) {
        if (this.type !== type1 && this.type !== type2) {
            throw new RuntimeError(
                "Expected " + ValueType[type1] + " or " + ValueType[type2] +
                ", but found " +
                ValueType[this.type] + ".");
        }
    }
    toKey() {
        return this.type + ":" + this.value;
    }
    toString() {
        const dumpStr = [ "<" ]
        if (this.type < 0 || this.type > ValueType.MaxType) {
            dumpStr.push("invalid");
        } else {
            dumpStr.push(ValueType[this.type]);
        }
        dumpStr.push(": ");
        dumpStr.push(this.value.toString());
        dumpStr.push(">");
        return dumpStr.join("");
    }
};


// ////////////////////////////////////////////////////////////////////////////
// Standardized None value
// ////////////////////////////////////////////////////////////////////////////
const noneValue = new Value(ValueType.None, 0);

// ////////////////////////////////////////////////////////////////////////////
// Global data Objects
// ////////////////////////////////////////////////////////////////////////////
const defaultDialogInfo: DialogInfo = {
    elementId: "",
    closer: ui_closeSettings,
    allowSpace: false,
};

const Config = {
    gameDir: "./games/",
    showEventDuration: false,
    showOperationsCount: false,
    showGarbageCollectionDuration: false,
    garbageCollectionFrequency: 5,
    limitWidth: true,

    inDialog: false,
    dialogInfo: defaultDialogInfo,
};

interface StateData {
    dataRaw: ArrayBuffer | null,
    dataSrc: DataView | null,
    bytecode: DataView | null,

    gameId: number,
    InfobarLeft: string,
    InfobarRight: string,
    InfobarFooter: string,
    textBuffer: Array<string>,
    optionType: OptionType,
    options: Array<GameOption>,

    extraValue: Value,
    callStack: CallStack | undefined,
    stack: Stack | undefined,
    operations: number,
    nextIP: number,
    eventIsUpdateOnly: boolean,
    eventStartTime: number,

    mainFunction: number,
    functions: Record<number, FunctionDef>,
    lists: Record<number, ListDef>,
    maps: Record<number, MapDef>,
    objects: Record<number, ObjectDef>,
    strings: Record<number, StringDef>,
    vocab: Array<VocabDef>,

    gameLoaded: boolean,
    nextIdent: number,
    eventCount: number
};

const State:StateData = {
    dataRaw: null,
    dataSrc: null,
    bytecode: null,

    gameId: -1,
    InfobarLeft: "",
    InfobarRight: "",
    InfobarFooter: "",
    textBuffer: [],
    optionType: OptionType.MenuItem,
    options: [],

    extraValue: noneValue,
    callStack: undefined,
    stack: undefined,
    operations: 0,
    nextIP: -1,
    eventIsUpdateOnly: false,
    eventStartTime: -1,

    mainFunction: -1,
    functions: {},
    lists: {},
    maps: {},
    objects: {},
    strings: {},
    vocab: [],

    gameLoaded: false,
    nextIdent: 0,
    eventCount: 0,
};




function asString(aValue: Value) {
    switch(aValue.type) {
        case ValueType.String:
            return getString(aValue.value);
        case ValueType.Vocab:
            return getVocab(aValue.value);
        case ValueType.Integer:
            return aValue.value.toString();
        default:
            var text = "<" + ValueType[aValue.type];
            if (aValue.type != ValueType.None) {
                text += " " + aValue.value;
            }
            text += ">";
            return text;
    }
}

function doCompare(left: Value, right: Value) {
    if (left.type !== right.type) {
        return 1;
    } else {
        switch(right.type) {
            case ValueType.Integer:
                return left.value - right.value;
            case ValueType.None:
                return 0;
            default:
                return (right.value === left.value) ? 0 : 1;
        }
    }
}

function doEvent(pushValue?: Value) {
    let updateOnly = false;
    if (!State.eventIsUpdateOnly) {
        State.optionType = -1;
        if (State.eventStartTime <= 0)
            State.eventStartTime = performance.now();
        State.options = [];
        State.textBuffer = [];
    }

    let errorDiv = "";
    try {
        if (resumeExec(pushValue) === 1) {
            updateOnly = true;
        }
    } catch (error) {
        if (!(error instanceof RuntimeError)) throw error;
        const errorMessage = [];
        console.error("VM Error: ", error);

        if (State.callStack) {
            errorMessage.push(State.callStack.toString());
        }
        if (State.stack) {
            errorMessage.push("\n");
            errorMessage.push(State.stack.toString());
        }

        errorDiv = error.toString() + "\n" + errorMessage.join("");
    }

    const end = performance.now();
    if (updateOnly) {
        const runtime = Math.round((end - State.eventStartTime) * 1000) / 1000000;
        doEventUpdateStatus(runtime, State.operations, -1, 0);
        setTimeout(doEvent, 0);
        State.eventIsUpdateOnly = true;
        return;
    }
    State.eventIsUpdateOnly = false;

    doOutput(errorDiv);
    ++State.eventCount;
    const runGC = State.eventCount % Config.garbageCollectionFrequency ===  0;
    const gcStart = performance.now();
    let gcCollected = 0;
    if (runGC) {
        gcCollected = collectGarbage();
    }
    const gcEnd = performance.now();

    const eventRuntime = Math.round((end - State.eventStartTime) * 1000) / 1000000;
    const gcRuntime    = Math.round((gcEnd - gcStart) * 1000) / 1000000;
    doEventUpdateStatus(eventRuntime, State.operations, runGC ? gcRuntime : -1, gcCollected);
    State.eventStartTime = 0;
}

function doEventUpdateStatus(eventRuntime: number, operations: number, gcRuntime: number, gcCollected: number) {
    const systemInfo = [];
    if (Config.showEventDuration) {
        systemInfo.push("Runtime: " + eventRuntime + "s");
    }
    if (Config.showOperationsCount) {
        systemInfo.push(operations.toLocaleString() + " opcodes");
    }
    if (gcRuntime >= 0 && Config.showGarbageCollectionDuration) {
        systemInfo.push("GC: " + gcRuntime + "s");
        systemInfo.push(gcCollected + " collected");
    }
    setTextContent("bottom-left", systemInfo.join("; "));
}

function doOutput(errorMessage?: string) {
    let line = State.textBuffer.join("").replace(/&/g, "&amp;");
    line = line.replace(/</g, "&lt;");
    line = line.replace(/>/g, "&gt;");

    const errorMessageArr:Array<string> = [];
    if (errorMessage) errorMessageArr.push(errorMessage);

    const result = formatter(line);
    if (result.errors.length > 0) {
        errorMessageArr.push("<span class='errorTitle'>Formatting Errors Occured</span><br>");
        result.errors.forEach(function(err) {
            errorMessageArr.push(err, "<br>");
        });
    }

    const nextDiv = document.createElement("div");
    nextDiv.classList.add("sceneNode");
    nextDiv.innerHTML = result.text;
    appendChild("text", nextDiv);

    if (errorMessageArr.length > 0) {
        const eErrorDiv = document.createElement("pre");
        eErrorDiv.classList.add("error");
        eErrorDiv.innerHTML = errorMessageArr.join("");
        appendChild("text", eErrorDiv);
        eErrorDiv.scrollIntoView();
    } else {
        showOptions();
        nextDiv.scrollIntoView();
    }
}

function getFunction(functionNumber: number) {
    if (State.functions.hasOwnProperty(functionNumber)) {
        return State.functions[functionNumber].data;
    }
    throw new RuntimeError("Tried to access invalid function #" + functionNumber + ".");
}

function getList(listNumber: number) {
    if (State.lists.hasOwnProperty(listNumber)) {
        return State.lists[listNumber].data;
    }
    throw new RuntimeError("Tried to access invalid list #" + listNumber + ".");
}

function getMap(mapNumber: number) {
    if (State.maps.hasOwnProperty(mapNumber)) {
        return State.maps[mapNumber].data;
    }
    throw new RuntimeError("Tried to access invalid map #" + mapNumber + ".");
}

function getObject(objectNumber: number) {
    if (State.objects.hasOwnProperty(objectNumber)) {
        return State.objects[objectNumber].data;
    }
    throw new RuntimeError("Tried to access invalid object #" + objectNumber + ".");
}

function getObjectDef(objectNumber: number) {
    if (State.objects.hasOwnProperty(objectNumber)) {
        return State.objects[objectNumber];
    }
    throw new RuntimeError("Tried to access invalid object #" + objectNumber + ".");
}

function getString(stringNumber: number) {
    if (State.strings.hasOwnProperty(stringNumber)) {
        return State.strings[stringNumber].data;
    }
    throw new RuntimeError("Tried to access invalid string #" + stringNumber + ".");
}

function getObjectProperty(objectId: number, propertyId: number):Value {
    const theObject = getObject(objectId);
    if (!theObject) return new Value(ValueType.Integer, 0);

    if (theObject.hasOwnProperty(propertyId)) {
        const result = theObject[propertyId];
        result.selfobj = new Value(ValueType.Object, objectId);
        return result;
    } else {
        if (theObject.hasOwnProperty(propParent) && theObject[propParent].type == ValueType.Object) {
            return getObjectProperty(theObject[propParent].value, propertyId);
        } else {
            return new Value(ValueType.Integer, 0);
        }
    }
}

function getSetting(settingNumber: Setting) {
    switch(settingNumber) {
        default:
            throw new RuntimeError("Tried to get unknown setting " + settingNumber + ".");
    }
}

function getSource(ofWhat: Value) {
    var data;
    switch(ofWhat.type) {
        case ValueType.String:        return noneValue;
        case ValueType.Integer:       return noneValue;
        case ValueType.JumpTarget:    return noneValue;
        case ValueType.LocalVar:      return noneValue;
        case ValueType.VarRef:        return noneValue;
        case ValueType.Property:      return noneValue;
        case ValueType.Map:
            if (!State.maps.hasOwnProperty(ofWhat.value))
                throw new RuntimeError("Tried to get origin of invalid map.");
            data = State.maps[ofWhat.value];
            break;
        case ValueType.List:
            if (!State.lists.hasOwnProperty(ofWhat.value))
                throw new RuntimeError("Tried to get origin of invalid list.");
            data = State.lists[ofWhat.value];
            break;
        case ValueType.Object:
            if (!State.objects.hasOwnProperty(ofWhat.value))
                throw new RuntimeError("Tried to get origin of invalid object.");
            data = State.objects[ofWhat.value];
            break;
        case ValueType.Function:
            if (!State.functions.hasOwnProperty(ofWhat.value))
                throw new RuntimeError("Tried to get origin of invalid function.");
            data = State.functions[ofWhat.value];
            break;
        default:
            const newStr = makeNew(ValueType.String);
            State.strings[newStr.value].data = "(unhandled type " + ValueType[ofWhat.type] + ")";
            return newStr;
    }

    let stringData = "";
    const newStr = makeNew(ValueType.String);
    if (data.sourceFile === -1)
        stringData = "no debug info";
    else if (data.sourceFile === -2)
        stringData = "dynamic";
    else {
        if (data.hasOwnProperty("sourceName")) {
            stringData = "\"" + getString((data as FunctionDef).sourceName) + "\" ";
        } else {
            stringData = "";
        }

        if (data.sourceLine === -1)
            stringData += getString(data.sourceFile);
        else
            stringData += getString(data.sourceFile) + ":" + data.sourceLine;
    }

    State.strings[newStr.value].data = stringData;
    return newStr;
}

function getVocab(index: number) {
    if (index < 0 || index >= State.vocab.length) {
        return "invalid vocab " + index;
    }
    return State.vocab[index].data;
}
function getVocabNumber(theWord: string) {
    let i = 0;
    while (i < State.vocab.length) {
        if (State.vocab[i].data === theWord) return i;
        ++i;
    }
    return -1;
}

function isStatic(what: Value) {
    switch(what.type) {
        case ValueType.Object:
            if (State.objects.hasOwnProperty(what.value)) return State.objects[what.value].static;
            return false;
        case ValueType.Map:
            if (State.maps.hasOwnProperty(what.value)) return State.maps[what.value].static;
            return false;
        case ValueType.List:
            if (State.lists.hasOwnProperty(what.value)) return State.lists[what.value].static;
            return false;
        case ValueType.String:
            if (State.strings.hasOwnProperty(what.value)) return State.strings[what.value].static;
            return false;
        default:
            return true;
    }
}

function isValid(value: Value) {
    switch(value.type) {
        case ValueType.None:
        case ValueType.Integer:
        case ValueType.Property:
        case ValueType.JumpTarget:
        case ValueType.VarRef:
        case ValueType.LocalVar:
        case ValueType.TypeId:
            return true;

        case ValueType.Vocab:
            if (value.value < 0 || value.value >= State.vocab.length) return false;
            return true;

        case ValueType.List:
            if (State.lists.hasOwnProperty(value.value)) return true;
            if (State.lists[value.value] === undefined) return false;
            return true;
        case ValueType.Map:
            if (State.maps.hasOwnProperty(value.value)) return true;
            if (State.maps[value.value] === undefined) return false;
            return true;
        case ValueType.Object:
            if (State.objects.hasOwnProperty(value.value)) return true;
            if (State.objects[value.value] === undefined) return false;
            return true;
        case ValueType.String:
            if (State.strings.hasOwnProperty(value.value)) return true;
            if (State.strings[value.value] === undefined) return false;
            return true;
        case ValueType.Function:
            if (State.functions.hasOwnProperty(value.value)) return true;
            if (State.functions[value.value] === undefined) return false;
            return true;
    }
    return false;
}

function moveObject(objectToMove: Value, newParent: Value) {
    if (isIndirectLoop(objectToMove, newParent)) {
        throw new RuntimeError("Tried to create circular containment.");
    }

    const toMove = getObjectDef(objectToMove.value);
    const oldParent = toMove.parent;
    toMove.parent = 0;
    if (oldParent > 0) {
        const oldParentObj = getObjectDef(oldParent);
        if (oldParentObj.child == toMove.ident) {
            oldParentObj.child = toMove.sibling;
        } else {
            let child = oldParentObj.child;
            while (child > 0) {
                const c = getObjectDef(child);
                if (c.sibling == toMove.ident) {
                    c.sibling = toMove.sibling;
                    break;
                }
                child = c.sibling;
            }
        }
    }
    toMove.sibling = 0;

    if (newParent.type !== ValueType.None) {
        toMove.parent = newParent.value;
        const parent = getObjectDef(newParent.value);
        if (parent.child === 0) {
            parent.child = objectToMove.value;
        } else {
            let childId = parent.child;
            while (1) {
                let child = getObjectDef(childId);
                if (child.sibling > 0) {
                    childId = child.sibling;
                } else {
                    child.sibling = objectToMove.value;
                    break;
                }
            }
        }
    }

}

function isIndirectLoop(childId: Value, parentId: Value) {
    if (childId.value == 0 || parentId.value == 0) return false;
    if (childId == parentId) return true;

    const object = getObjectDef(childId.value);
    if (object.parent == parentId.value) return true;
    const parent = getObjectDef(parentId.value);

    let superParentId = parent.parent;
    while (superParentId > 0) {
        if (superParentId === object.ident) {
            return true;
        } else {
            const superParent = getObjectDef(superParentId);
            superParentId = superParent.parent;
        }
    }
    return false;
}

function makeNew(type: ValueType) {
    const nextId = State.nextIdent;
    State.nextIdent++;
    switch (type) {
        case ValueType.List: {
            const newList:ListDef = {
                ident: nextId,
                data:[],
                sourceFile: -2,
                sourceLine: -1,
                static: false
            };
            State.lists[nextId] = newList;
            return new Value(ValueType.List, nextId); }
        case ValueType.Map: {
            const newMap:MapDef = {
                ident: nextId,
                data: {},
                sourceFile: -2,
                sourceLine: -1,
                static: false
            };
            State.maps[nextId] = newMap;
            return new Value(ValueType.Map, nextId); }
        case ValueType.Object: {
            const newObject:ObjectDef = {
                ident: nextId,
                parent: 0,
                child: 0,
                sibling: 0,
                data: {},
                sourceName: -1,
                sourceFile: -2,
                sourceLine: -1,
                static: false
            };
            State.objects[nextId] = newObject;
            return new Value(ValueType.Object, nextId); }
        case ValueType.String: {
            const newString:StringDef = {
                ident: nextId,
                data: "",
                static: false
            };
            State.strings[nextId] = newString;
            return new Value(ValueType.String, nextId); }
        default:
            throw new RuntimeError("Cannot instantiate objects of type " + ValueType[type]);
    }
}

function say(value: Value | string | number, doUcFirst?: boolean) {
    doUcFirst = doUcFirst || false;
    if (!(value instanceof Value)) {
        if (typeof value === "string" || typeof value === "number") {
            State.textBuffer.push(value.toString());
        }
        return;
    }

    let text = asString(value);
    if (doUcFirst) text = ucFirst(text);
    State.textBuffer.push(text);
}

function setExtra(newExtraValue: Value) {
    if (State.callStack && State.extraValue && State.extraValue.type === ValueType.VarRef) {
        State.callStack.set(State.extraValue.value, newExtraValue);
    }
}

function setObjectProperty(objectId:Value, propertyId:Value, newValue:Value) {
    objectId.requireType(ValueType.Object);
    propertyId.requireType(ValueType.Property);
    const theObject = getObject(objectId.value);
    theObject[propertyId.value] = newValue;
}

function setSetting(settingNumber: Setting, settingValue: Value) {
    switch(settingNumber) {
        case Setting.InfobarLeft:
            setTextContent("top-left", getString(settingValue.value));
            break;
        case Setting.InfobarRight:
            setTextContent("top-right", getString(settingValue.value));
            break;
        case Setting.InfobarFooter:
            setTextContent("bottom-right", getString(settingValue.value));
            break;
        case Setting.Title:
            document.title = getString(settingValue.value);
            break;
        default:
            throw new RuntimeError("Tried to set unknown setting " + settingNumber + ".");
    }
}

function sortList(theList: Array<Value>) {
    theList.sort(function(left, right) {
        if (left.type < right.type) return -1;
        if (left.type > right.type) return 1;
        if (left.type === ValueType.String) {
            const l = getString(left.value).toLowerCase();
            const r = getString(right.value).toLowerCase();
            if (l < r) return -1;
            if (l > r) return 1;
            return 0;
        } else {
            return left.value - right.value;
        }
    });
}

function stringAppend(left:Value, right:Value, wantUcFirst?:boolean) {
    left.requireType(ValueType.String);
    if (isStatic(left)) {
        throw new RuntimeError("Cannot modify static string.");
    }

    let text = asString(right);
    if (wantUcFirst) text = ucFirst(text);
    const result = State.strings[left.value].data + text;
    State.strings[left.value].data = result.normalize("NFC");
}

function objectByIdent(objectId: number) {
    // if (objectId <= 0) return noneValue;
    // for (var i = 1; i < objects.length; ++i) {
    //     const thisIdent = getObjectProperty(i, propIdent);
    //     if (thisIdent.value === objectId) {
    //         return new Value(ValueType.Object, i);
    //     }
    // }
    return noneValue;
}

function objectHasProperty(objectId:Value, propertyId:Value) {
    objectId.requireType(ValueType.Object);
    propertyId.requireType(ValueType.Property);
    const theObject = getObject(objectId.value);
    if (theObject.hasOwnProperty(propertyId.value)) {
        return new Value(ValueType.Integer, 1);
    } else {
        return new Value(ValueType.Integer, 0);
    }
}

function showOptions() {
    removeById("optionsCore");

    const optionsCore = document.createElement("div");
    optionsCore.id = "optionsCore";
    appendChild("text", optionsCore);

    if (State.options.length === 0) return;

    switch(State.optionType) {
        case OptionType.MenuItem:
            const optionsList = document.createElement("div");
            optionsList.id = "optionslist";
            const standardOptions:Array<HTMLElement> = [];
            const hotkeyOptions:Array<HTMLElement> = [];
            var nextNum = 1;

            State.options.forEach(function(option, optionIndex) {
                option.displayText.requireType(ValueType.String);
                const button = document.createElement("button");
                button.type = "button";
                (button as any).optionIndex = optionIndex;
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
                button.textContent = keyString + ") " + getString(option.displayText.value);
                button.classList.add("optionsButton");
                button.addEventListener("click", optionClickHandler);
            });

            function appendOption(optionElement:HTMLElement) {
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

        case OptionType.LineInput: {
            const theOption = State.options[0];
            const options = document.createElement("div");
            options.id = "optionslist";
            options.classList.add("optionslist");
            options.classList.add("optionslineinput");

            const prompt = document.createElement("label");
            (prompt as any).for = "lineinput";
            prompt.textContent = getString(theOption.displayText.value);
            options.append(prompt);

            const textLine = document.createElement("input");
            textLine.type = "text";
            textLine.id = "lineinput";
            options.appendChild(textLine);

            const goButton = document.createElement("button");
            goButton.type = "button";
            goButton.id = "gobutton";
            goButton.textContent = "Enter";
            goButton.addEventListener("click", goButtonHandler);
            options.appendChild(goButton);

            optionsCore.appendChild(options);
            textLine.focus();
            break; }
        case OptionType.KeyInput:
            const theOption = State.options[0];
            const options = document.createElement("p");
            options.id = "optionslist";
            options.classList.add("optionslist");
            options.textContent = getString(theOption.displayText.value);
            optionsCore.appendChild(options);
            break;
    }
}

function ucFirst(strText: string) {
    if (!strText || strText === "") return "";
    return strText.substring(0,1).toUpperCase() + strText.substring(1);
}



/* ********** ********** ********** ********** ********** ********** ********** ********** *
 * UI Helper Functions                                                                     */
function ui_isChecked(elementId: string) {
    const e = document.getElementById(elementId);
    if (e) return (e as HTMLFormElement).checked;
    return false;
}
function ui_setChecked(elementId: string, isChecked: boolean) {
    const e = document.getElementById(elementId);
    if (e) (e as HTMLFormElement).checked = isChecked;
}
function ui_setOnClickForElement(elementId: string, handler: () => void) {
    const e = document.getElementById(elementId);
    if (e) e.addEventListener("click", handler);
}
function ui_toggleClass(elementId: string, className: string, makeOn: boolean) {
    const e = document.getElementById("contentArea");
    if (e) e.classList.toggle("className", makeOn);
}


function appendChild(toElement: string, what: HTMLElement) {
    const e = document.getElementById(toElement);
    if (e) e.appendChild(what);
}

function doAlert(message: string) {
    alert(message);
}

function doConfirm(prompt: string, onYes: () => void) {
    if (confirm(prompt)) {
        onYes();
    }
}

function getValue(elementId: string) {
    const e = document.getElementById(elementId);
    if (e) return (e as HTMLFormElement).value;
    return "";
}

function removeAllChildren(elementId: string) {
    const e = document.getElementById(elementId);
    if (!e) return;

    while (e.firstChild) {
        e.removeChild(e.firstChild);
    }
}

function removeById(elementId:string) {
    const e = document.getElementById(elementId);
    if (e && e.parentElement) e.parentElement.removeChild(e);
}


function setContent(elementId: string, newContent: string) {
    const e = document.getElementById(elementId);
    if (e) e.innerHTML = newContent;
}

function setTextContent(elementId: string, newContent: string) {
    const e = document.getElementById(elementId);
    if (e) e.innerText = newContent;
}

function setValue(elementId: string, newContent: string) {
    const e = document.getElementById(elementId);
    if (e) (e as HTMLFormElement).value = newContent;
}

// ////////////////////////////////////////////////////////////////////////////
// The garbage collector
// ////////////////////////////////////////////////////////////////////////////

function gc_markObject(object:ObjectDef) {
    if (!object || object.marked || !object.data) return;
    object.marked = true;
    const keys = Object.keys(object.data);
    keys.forEach(function(key) {
        key = key.toString();
        gc_markValue(object.data[+key]);
    });
}
function gc_markList(list:ListDef) {
    if (!list || list.marked || !list.data) return;
    list.marked = true;
    list.data.forEach(function(value) {
        gc_markValue(value);
    });
}
function gc_markMap(map:MapDef) {
    if (!map || map.marked || !map.data) return;
    map.marked = true;

    const rawKeys = Object.keys(map.data);
    rawKeys.forEach(function(key) {
        const keySep = key.indexOf(":");
        const keyType = +key.substring(0, keySep);
        const keyValue = +key.substring(keySep + 1);
        const value = new Value(keyType, keyValue);
        gc_markValue(value);
        gc_markValue(map.data[key]);
    })
}
function gc_markString(string:StringDef) {
    if (!string || string.marked || string.data == undefined) return;
    string.marked = true;
}
function gc_markValue(what:Value) {
    switch(what.type) {
        case ValueType.String:
            gc_markString(State.strings[what.value]);
            break;
        case ValueType.Object:
            gc_markObject(State.objects[what.value]);
            break;
        case ValueType.List:
            gc_markList(State.lists[what.value]);
            break;
        case ValueType.Map:
            gc_markMap(State.maps[what.value]);
            break;
        case ValueType.None:
        case ValueType.Integer:
        case ValueType.Function:
        case ValueType.Property:
        case ValueType.TypeId:
        case ValueType.JumpTarget:
        case ValueType.VarRef:
        case ValueType.LocalVar:
        case ValueType.Vocab:
            // no need to mark
            break;
        default:
            console.error("Found unknown type ", what.type, " during garbage collection.");
    }
}
function gc_collect(theList: any) {
    const ids = Object.keys(theList);
    let count = 0;
    ids.forEach(function (id) {
        if (theList[id].static) return;
        if (theList[id].marked) return;
        delete theList[id];
        ++count;
    });
    return count;
}
function collectGarbage() {
    ////////////////////////////////////////
    // GET EXISTING IDENT LISTS
    const listIds = Object.keys(State.lists);
    const mapIds = Object.keys(State.maps);
    const objectIds = Object.keys(State.objects);
    const stringIds = Object.keys(State.strings);

    ////////////////////////////////////////
    // UNMARK ALL
    listIds.forEach(function(ident)   { const item = State.lists[+ident];    if (item) item.marked = false; });
    mapIds.forEach(function(ident)    { const item = State.maps[+ident];     if (item) item.marked = false; });
    objectIds.forEach(function(ident) { const item = State.objects[+ident];  if (item) item.marked = false; });
    stringIds.forEach(function(ident) { const item = State.strings[+ident];  if (item) item.marked = false; });

    ////////////////////////////////////////
    // MARK ACCESSABLE FROM STATIC OBJECTS
    const oKeys = Object.keys(State.objects);
    oKeys.forEach(function(theKey) {
        if (State.objects[+theKey].static) gc_markObject(State.objects[+theKey]);
    })
    const lKeys = Object.keys(State.lists);
    lKeys.forEach(function(theKey) {
        if (State.lists[+theKey].static) gc_markList(State.lists[+theKey]);
    })
    const mKeys = Object.keys(State.maps);
    mKeys.forEach(function(theKey) {
        if (State.maps[+theKey].static) gc_markMap(State.maps[+theKey]);
    })
    ////////////////////////////////////////
    // MARK OTHER ACCESSABLE
    State.options.forEach(function(option) {
        gc_markValue(option.displayText);
        gc_markValue(option.extra);
        gc_markValue(option.value);
    });
    if (State.callStack) {
        State.callStack.frames.forEach(function(callFrame) {
            callFrame.stack.stack.forEach(function(stackItem) {
                gc_markValue(stackItem);
            });
            callFrame.locals.forEach(function(localItem) {
                gc_markValue(localItem);
            });
        });
    }

    ////////////////////////////////////////
    // COLLECTING
    let count = 0;
    count += gc_collect(State.objects);
    count += gc_collect(State.lists);
    count += gc_collect(State.maps);
    count += gc_collect(State.strings);

    // ////////////////////////////////////////
    // // TRIMMING
    // while (G.objects.length > 0
    //         && G.objects[G.objects.length - 1] == undefined) {
    //     G.objects.pop();
    // }
    // while (G.maps.length > 0
    //         && G.maps[G.maps.length - 1] == undefined) {
    //     G.maps.pop();
    // }
    // while (G.strings.length > 0
    //         && G.strings[G.strings.length - 1] == undefined) {
    //     G.strings.pop();
    // }
    // while (G.lists.length > 0
    //         && G.lists[G.lists.length - 1] == undefined) {
    //     G.lists.pop();
    // }

    return count;
}

/* ********** ********** ********** ********** ********** ********** ********** ********** *
 * Primary UI Functions                                                                    */

const settingsDialogInfo: DialogInfo = {
    elementId:  "settings",
    closer:     ui_closeSettings,
    allowSpace: false
}
const creditsDialogInfo: DialogInfo = {
    elementId:  "creditsWindow",
    closer:     ui_closeCredits,
    allowSpace: true
};
// const loadDialogInfo: DialogInfo = {
//     elementId:  "loadDialog",
//     closer:     ui_closeLoadDialog,
//     allowSpace: false
// };
// const saveDialogInfo: DialogInfo = {
//     elementId:  "saveDialog",
//     closer:     ui_closeSaveDialog,
//     allowSpace: false
// };

function ui_showSettings() {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.display = "block";
    const settingsDialog = document.getElementById("settings");
    if (settingsDialog) settingsDialog.style.display = "block";

    Config.inDialog = true;
    Config.dialogInfo = settingsDialogInfo;

    ui_setChecked("limitWidth", Config.limitWidth);
    ui_setChecked("showEventDuration", Config.showEventDuration);
    ui_setChecked("showOperationsCount", Config.showOperationsCount);
    ui_setChecked("showGarbageCollectionDuration", Config.showGarbageCollectionDuration);
};

function ui_closeSettings() {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.display = "none";
    const settingsDialog = document.getElementById("settings");
    if (settingsDialog) settingsDialog.style.display = "none";

    Config.limitWidth = ui_isChecked("limitWidth");
    Config.showEventDuration = ui_isChecked("showEventDuration");
    Config.showOperationsCount = ui_isChecked("showOperationsCount");
    Config.showGarbageCollectionDuration = ui_isChecked("showGarbageCollectionDuration");
    Config.inDialog = false;
    localStorage["ratvm_options"] = JSON.stringify(Config);
    ui_applySettings();
}

function ui_applySettings() {
    const rawResults = localStorage.getItem("ratvm_options");
    if (rawResults) {
        const results = JSON.parse(rawResults);
        ui_toggleClass("contentArea", "limitWidth", results.limitWidth);
        Config.showEventDuration = results.showEventDuration;
        Config.showOperationsCount = results.showOperationsCount;
        Config.showGarbageCollectionDuration = results.showGarbageCollectionDuration;
    }
}

function ui_showCredits() {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.display = "block";
    const creditsDialog = document.getElementById("creditsWindow");
    if (creditsDialog) creditsDialog.style.display = "block";
    Config.inDialog = true;
    Config.dialogInfo = creditsDialogInfo
};

function ui_closeCredits() {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.display = "none";
    const creditsDialog = document.getElementById("creditsWindow");
    if (creditsDialog) creditsDialog.style.display = "none";
    Config.inDialog = false;
}


// function ui_refreshSaveList() {
//     const savedGames = getSaveIndex();
//     const saveListRaw = document.getElementById("saveList");
//     if (!saveListRaw) return;
//     const saveList = saveListRaw as HTMLFormElement;

//     while (saveList.childElementCount > 0) {
//         if (saveList.firstChild) saveList.removeChild(saveList.firstChild);
//     }
//     savedGames.forEach(function(saveData: any, saveIndex: any) {
//         const item = document.createElement("option");
//         item.textContent = saveData.name;
//         item.id = "savegamelist__" + saveIndex;
//         saveList.appendChild(item);
//     });
//     if (saveList.childElementCount > 0) {
//         saveList.options[0].selected = true;
//     }
// }

// function ui_showSaveGame() {
//     setValue("savegamename", "");
//     ui_refreshSaveList();

//     const overlay = document.getElementById("overlay");
//     if (overlay) overlay.style.display = "block";
//     const saveDialog = document.getElementById("saveDialog");
//     if (saveDialog) saveDialog.style.display = "block";
//     Config.inDialog = true;
//     Config.dialogInfo = saveDialogInfo;
// }

// function ui_saveNewGame() {
//     const savedGameName = getValue("savegamename");
//     if (!savedGameName) {
//         doAlert("Please name your saved game.");
//         return;
//     }
//     const fileSaveName = savedGameName;
//     saveGame([fileSaveName, -1]);
//     ui_closeSaveDialog();
// }

// function ui_overwriteSavedGame() {
//     const saveListRaw = document.getElementById("saveList");
//     if (!saveListRaw) return;
//     const saveList = saveListRaw as HTMLFormElement;

//     const selected = saveList.selectedIndex;
//     if (selected < 0) {
//         doAlert("Please select game to overwrite first.");
//         return;
//     }
//     const fileSaveName = saveList.options[selected].textContent;
//     doConfirm("Overwrite game \"" + fileSaveName + "\"?", function() {
//         saveGame([fileSaveName, selected]);
//         ui_closeSaveDialog();
//     });
// }

// function ui_deleteSavedGame() {
//     const saveListRaw = document.getElementById("saveList");
//     if (!saveListRaw) return;
//     const saveList = saveListRaw as HTMLFormElement;

//     const selected = saveList.selectedIndex;
//     if (selected < 0) {
//         doAlert("Please select game to delete first.");
//         return;
//     }
//     const fileSaveName = saveList.options[selected].textContent;
//     doConfirm("Permanently delete game \"" + fileSaveName + "\"?", function() {
//         const savedGames = getSaveIndex();
//         const deletedGame = savedGames[selected];
//         savedGames.splice(selected, 1);
//         localStorage.removeItem("savedgame_" + deletedGame.index);
//         saveSaveIndex(savedGames);
//         ui_refreshSaveList();
//     });
// }

// function ui_closeSaveDialog() {
//     const overlay = document.getElementById("overlay");
//     if (overlay) overlay.style.display = "none";
//     const saveDialog = document.getElementById("saveDialog");
//     if (saveDialog) saveDialog.style.display = "none";
//     Config.inDialog = false;
// }

// function ui_showLoadGame() {
//     setValue("savegamename", "");
//     const savedGames = getSaveIndex();

//     const loadList = document.getElementById("loadList");
//     if (!loadList) return;
//     while (loadList.childElementCount > 0) {
//         if (loadList.firstChild) loadList.removeChild(loadList.firstChild);
//     }

//     savedGames.forEach(function(saveData: any, saveIndex: number) {
//         const item = document.createElement("option");
//         item.textContent = saveData.name;
//         item.id = "savegamelist__" + saveIndex;
//         loadList.appendChild(item);
//     });
//     if (loadList.childElementCount > 0) {
//         loadList.options[0].selected = true;
//         if (loadList.childElementCount === 1) {
//             ui_pickLoadGame();
//             return;
//         }
//     } else {
//         doAlert("You do not have any saved games.");
//         return;
//     }

//     const overlay = document.getElementById("overlay");
//     if (overlay) overlay.style.display = "block";
//     const loadDialog = document.getElementById("loadDialog");
//     if (loadDialog) loadDialog.style.display = "block";
//     Config.inDialog = true;
//     Config.dialogInfo = loadDialogInfo;
// }

// function ui_pickLoadGame() {
//     const loadListRaw = document.getElementById("loadList");
//     if (!loadListRaw) return;
//     const loadList = loadListRaw as HTMLFormElement;

//     const selected = loadList.selectedIndex;
//     if (selected < 0) {
//         doAlert("Please select game to load first.");
//         return;
//     }
//     const fileSaveName = loadList.options[selected].textContent;
//     doConfirm("Abandon current game to load \"" + fileSaveName + "\"?", function() {
//         loadGame(selected);
//         ui_closeLoadDialog();
//     });
// }

// function ui_closeLoadDialog() {
//     const overlay = document.getElementById("overlay");
//     if (overlay) overlay.style.display = "none";
//     const saveDialog = document.getElementById("loadDialog");
//     if (saveDialog) saveDialog.style.display = "none";
//     Config.inDialog = false;
// }

// function getSaveIndex() {
//     let savedGames = [];
//     let savedGameStr = localStorage.getItem("save_index");
//     if (savedGameStr) savedGames = JSON.parse(savedGameStr);
//     return savedGames;
// }
// function saveSaveIndex(newIndex) {
//     const saveIndex = JSON.stringify(newIndex);
//     localStorage.setItem("save_index", saveIndex);
// }


function newGame() {
    const emptyString = makeNew(ValueType.String);
    setSetting(Setting.InfobarLeft, emptyString);
    setSetting(Setting.InfobarRight, emptyString);
    setSetting(Setting.InfobarFooter, emptyString);

    State.gameLoaded = false;
    // State.strings.length = stringCount;
    State.callStack = undefined;

    parseGameFile();
}

// ////////////////////////////////////////////////////////////////////////////
// Game file parser
// ////////////////////////////////////////////////////////////////////////////

function parseGameFile() {
    console.info("Parsing game data.", (new Date).toLocaleTimeString());
    if (!State.dataRaw || !State.dataSrc) throw new RuntimeError("Data loader failed to set data sources.");

    ///////////////////////////////////////////////////////////////////////
    // Ensure data structures are empty
    State.functions = {};
    State.lists = {};
    State.maps = {};
    State.objects = {};
    State.strings = {};
    State.vocab = [];

    ///////////////////////////////////////////////////////////////////////
    // Read header data from datafile
    const magicNumber = State.dataSrc.getUint32(0, true);
    const formatVersion = State.dataSrc.getUint32(4, true);
    State.mainFunction = State.dataSrc.getUint32(8, true);
    const gamenameId = State.dataSrc.getUint32(16, true);
    const authorId = State.dataSrc.getUint32(20, true);
    const versionId = State.dataSrc.getUint32(24, true);
    State.gameId = State.dataSrc.getUint32(28, true);
    const buildNumber = State.dataSrc.getUint32(32, true);

    ///////////////////////////////////////////////////////////////////////
    // Read strings from datafile
    var filePos = 64;
    const stringCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    const decoder = new TextDecoder('utf8');
    for (var i = 0; i < stringCount; ++i) {
        const stringLength = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        const rawStringData = new Uint8Array(State.dataRaw, filePos,
                                             stringLength);
        for (let i = 0; i < stringLength; ++i) {
            rawStringData[i] ^= 0x7B;
        }
        filePos += stringLength;
        const newString: StringDef = {
            ident: i,
            static: true,
            data: decoder.decode(rawStringData)
        };

        State.strings[i] = newString;
        if (i >= State.nextIdent) State.nextIdent = i + 1;
    }

    ///////////////////////////////////////////////////////////////////////
    // Read vocab from datafile
    const vocabCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < vocabCount; ++i) {
        const stringLength = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        const rawStringData = new Uint8Array(State.dataRaw, filePos,
                                             stringLength);
        for (let i = 0; i < stringLength; ++i) {
            rawStringData[i] ^= 0x7B;
        }
        filePos += stringLength;
        State.vocab.push({data:decoder.decode(rawStringData)});
    }

    ///////////////////////////////////////////////////////////////////////
    // Read lists from datafile
    const listCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < listCount; ++i) {
        const thisList:Array<Value> = [];
        const sourceFileIdx = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceLine = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const ident = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const listSize = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < listSize; ++j) {
            const itemType = State.dataSrc.getUint8(filePos);
            filePos += 1;
            const itemValue = State.dataSrc.getInt32(filePos, true);
            filePos += 4;
            thisList.push(new Value(itemType, itemValue));
        }
        if (State.lists.hasOwnProperty(ident)) {
            console.error("Duplicate list ident");
        }
        const newList:ListDef = {
            ident: ident,
            static: true,
            data: thisList,
            sourceFile: sourceFileIdx,
            sourceLine: sourceLine
        };
        State.lists[ident] = newList;
        if (ident >= State.nextIdent) State.nextIdent = ident + 1;
    }

    ///////////////////////////////////////////////////////////////////////
    // Read maps from datafile
    const mapCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < mapCount; ++i) {
        const thisMap:Record<string, Value> = {};
        const sourceFileIdx = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceLine = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const ident = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const mapSize = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < mapSize; ++j) {
            const item1Type = State.dataSrc.getUint8(filePos);
            filePos += 1;
            const item1Value = State.dataSrc.getInt32(filePos, true);
            filePos += 4;
            const valueOne = new Value(item1Type, item1Value);

            const item2Type = State.dataSrc.getUint8(filePos);
            filePos += 1;
            const item2Value = State.dataSrc.getInt32(filePos, true);
            filePos += 4;
            const valueTwo = new Value(item2Type, item2Value);

            thisMap[valueOne.toKey()] = valueTwo;
        }
        if (State.maps.hasOwnProperty(ident)) {
            console.error("Duplicate map ident");
        }
        State.maps[ident] = {
            ident: ident,
            static: true,
            data: thisMap,
            sourceFile: sourceFileIdx,
            sourceLine: sourceLine
        };
        if (ident >= State.nextIdent) State.nextIdent = ident + 1;
    }

    ///////////////////////////////////////////////////////////////////////
    // Read game objects from datafile
    const objectCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < objectCount; ++i) {
        const thisObject:Record<number, Value> = {};
        const sourceName = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceFileIdx = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceLine = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const ident = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const parent = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const child = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sibling = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const objectSize = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < objectSize; ++j) {
            const propId = State.dataSrc.getUint16(filePos, true);
            filePos += 2;
            const itemType = State.dataSrc.getUint8(filePos);
            filePos += 1;
            const itemValue = State.dataSrc.getInt32(filePos, true);
            filePos += 4;
            thisObject[propId] = new Value(itemType, itemValue);
        }
        if (State.objects.hasOwnProperty(ident)) {
            console.error("Duplicate object ident");
        }
        State.objects[ident] = {
            ident: ident,
            parent: parent,
            child: child,
            sibling: sibling,
            static: true,
            data: thisObject,
            sourceName: sourceName,
            sourceFile: sourceFileIdx,
            sourceLine: sourceLine
        };
        if (ident >= State.nextIdent) State.nextIdent = ident + 1;
    }

    ///////////////////////////////////////////////////////////////////////
    // Read function headers from datafile
    const functionCount = State.dataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < functionCount; ++i) {
        const sourceName = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceFileIdx = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const sourceLine = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const ident = State.dataSrc.getInt32(filePos, true);
        filePos += 4;
        const argCount = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        const localCount = State.dataSrc.getUint16(filePos, true);
        filePos += 2;
        const totalCount = argCount + localCount;
        const types = [];
        for (let j = 0; j < totalCount; ++j) {
            const type = State.dataSrc.getUint8(filePos);
            filePos += 1;
            types.push(type);
        }
        const codePosition = State.dataSrc.getUint32(filePos, true);
        filePos += 4;
        if (State.functions.hasOwnProperty(ident)) {
            console.error("Duplicate function ident");
        }
        State.functions[ident] = {
            ident: ident,
            data: {
                argCount: argCount,
                localCount: localCount,
                codePosition: codePosition,
                types: types,
            },
            sourceName: sourceName,
            sourceFile: sourceFileIdx,
            sourceLine: sourceLine
        };
    }

    ///////////////////////////////////////////////////////////////////////
    // Read bytecode section from datafile
    // const bytecodeSize = State.dataSrc.getInt32(filePos, true);
    filePos += 4;
    const bytecodeBuffer = State.dataRaw.slice(filePos);
    State.bytecode = new DataView(bytecodeBuffer);

    ///////////////////////////////////////////////////////////////////////
    // Store the none value for ease of use
    // noneValue = new Value(ValueType.None, 0);

    //////////////////////////////////////////////
    // Update the credits window
    const gameNameStr = getString(gamenameId);
    setTextContent("gamename", gameNameStr);
    document.title = gameNameStr;
    setSetting(Setting.InfobarLeft, new Value(ValueType.String, gamenameId));
    setTextContent("version", versionId.toString());
    setTextContent("authorline", getString(authorId));
    setTextContent("gameid", getString(State.gameId));
    setTextContent("buildnumber", "0x" + buildNumber.toString(16));

    ///////////////////////////////////////////////////////////////////////
    // Start the game running
    console.info("Parse complete; starting game.", (new Date).toLocaleTimeString());
    removeAllChildren("text");
    State.gameLoaded = true;
    doEvent();
}



// ////////////////////////////////////////////////////////////////////////////
// Loading the game file
// ////////////////////////////////////////////////////////////////////////////
let loadGameData: XMLHttpRequest | null = null;

function loadProgress(event: ProgressEvent) {
    if (event.lengthComputable) {
        setContent("loadingText", "<p>Loading: " + Math.round(event.loaded / event.total * 100) + "%");
        const eProgress = document.getElementById("loadingProgress");
        if (eProgress) {
            const progressBar = eProgress as HTMLProgressElement;
            progressBar.max = event.total;
            progressBar.value = event.loaded;
        }
    } else {
        setContent("loadingText", "<p>Loading: " + event.loaded + " bytes");
    }
}

function failedToLoadGameData() {
    console.info("Failed to load game data.", (new Date).toLocaleTimeString());
    setContent("text", "<div class='error'>[Failed to load game data.]</div>");
}

function loadedDataFile() {
    if (!loadGameData) throw new RuntimeError("loadGameData not set when loading data.");

    if (loadGameData.status !== 200) {
        console.info("Failed to load game data (error ", loadGameData.status, ").", (new Date).toLocaleTimeString());
        setContent("text",
            "<div class='error'>Failed to load game data: "
            + loadGameData.status + " "
            + loadGameData.statusText + "</div>");
        return;
    }
    console.info("Game data loaded.", (new Date).toLocaleTimeString());
    State.dataRaw = loadGameData.response;
    if (State.dataRaw) State.dataSrc = new DataView(State.dataRaw);
    parseGameFile();
}

// ////////////////////////////////////////////////////////////////////////////
// Keyboard input handler
// ////////////////////////////////////////////////////////////////////////////
function execOption(optionNumber: number) {
    const optionText = document.createElement("p");
    optionText.classList.add("optionNode");
    optionText.textContent = "> " + getString(State.options[optionNumber].displayText.value);
    appendChild("text", optionText);
    setExtra(State.options[optionNumber].extra);
    doEvent(State.options[optionNumber].value);
}

function goButtonHandler() {
    if (State.options.length >= 1) {
        const eInputRaw = document.getElementById("lineinput");
        if (!eInputRaw) return;
        const eInput = eInputRaw as HTMLFormElement;

        const optionText = document.createElement("p");
        optionText.classList.add("optionNode");
        optionText.textContent = getString(State.options[0].displayText.value) + " " + eInput.value;
        appendChild("text", optionText);

        const newStr = makeNew(ValueType.String);
        State.strings[newStr.value].data = eInput.value;

        doEvent(newStr);
    }
}

function optionClickHandler(event:MouseEvent) {
    if (!event.target) return;
    execOption((event.target as any).optionIndex);
}

function keyPressHandler(event: KeyboardEvent) {
    // handle dialog keyboard events
    if (Config.inDialog) {
        if (event.key === "Enter" || event.key === "Escape"
                || (event.key === " " && Config.inDialog && Config.dialogInfo.allowSpace)) {
            Config.dialogInfo.closer();
            event.preventDefault();
        }
        return;
    }

    // only handle events if the game is actually running
    if (!State.gameLoaded) return;

    let code = -1;
    if (event.key.length === 1) {
        const raw = event.key.toLowerCase().codePointAt(0);
        if (raw) code = raw;
    }

    if (State.optionType === OptionType.LineInput) {
        if (event.key === "Enter") {
            goButtonHandler();
            return;
        }
        const eLineInput = document.getElementById("lineinput");
        if (eLineInput) eLineInput.focus();
        return;
    }

    if (State.options.length === 0) return;

    switch (State.optionType) {
        case OptionType.MenuItem:
            // handle space/enter for activating single options
            if (code == 32 || event.key === "Enter") {
                if (State.options.length == 1) {
                    execOption(0);
                    event.preventDefault();
                }
                return;
            }

            if (code <= 0) break;
            for (var i = 0; i < State.options.length; ++i) {
                if (State.options[i].hotkey === code) {
                    execOption(i);
                    event.preventDefault();
                    break;
                }
            }
            break;
        case OptionType.KeyInput:
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

            const keyValue = new Value(ValueType.Integer, code);
            doEvent(keyValue);
            event.preventDefault();
            return;
    }

    if (code == 111) {
        ui_showSettings();
        event.preventDefault();
        return;
    }
}

// ////////////////////////////////////////////////////////////////////////////
// Trigger execution when page finishes loading
// ////////////////////////////////////////////////////////////////////////////
window.addEventListener("load", function() {
    // if (typeof QUnit !== "undefined") return;

    ui_setOnClickForElement("settingsButton", ui_showSettings);
    ui_setOnClickForElement("closeSettings", ui_closeSettings);
    ui_setOnClickForElement("creditsButton", ui_showCredits);
    ui_setOnClickForElement("closeCredits", ui_closeCredits);

    ui_setOnClickForElement("newButton", (): void => { doConfirm("Are you sure you want to start a new game?", newGame); });
    // ui_setOnClickForElement("loadCancel", ui_closeLoadDialog);
    // ui_setOnClickForElement("loadGameButton", ui_pickLoadGame);
    // ui_setOnClickForElement("newSaveButton", ui_saveNewGame);
    // ui_setOnClickForElement("overwriteSaveButton", ui_overwriteSavedGame);
    // ui_setOnClickForElement("deleteSaveButton", ui_deleteSavedGame);
    // ui_setOnClickForElement("saveCancel", ui_closeSaveDialog);

    window.addEventListener("keydown", keyPressHandler);

    ui_applySettings();

    // code for Electron (TODO: needs updating)
    // if (this.window.api) {
    //     window.api.receive("loadGameData", (data) => {
    //         console.info("Received game data of ", data.byteLength, " bytes.");
    //         rawSource = data;
    //         State.dataSrc = new DataView(rawSource);
    //         parseGameFile();
    //     });
    //     window.api.send("requestGameData", "some data");
    // } else {

    loadGameData = new XMLHttpRequest();
    loadGameData.addEventListener("load", loadedDataFile);
    loadGameData.addEventListener("progress", loadProgress);
    loadGameData.addEventListener("error", failedToLoadGameData);
    loadGameData.addEventListener("abort", failedToLoadGameData);

    let gameFile = Config.gameDir + "game.rvm";
    if ("URLSearchParams" in window) {
        const args = new URLSearchParams(window.location.search);
        if (args.has("game")) {
            let newName = args.get("game");
            const valid = newName && newName.match(/^[a-zA-Z0-9_]+$/) !== null;
            if (valid) {
                gameFile = Config.gameDir + newName + ".rvm";
            } else {
                setContent("text", "<div class='error'>[Game file not valid: " + newName + ".]</div>");
            }
        }
    }

    console.info("Loading game file ", gameFile, (new Date).toLocaleTimeString());
    loadGameData.open("GET", gameFile);
    loadGameData.responseType = "arraybuffer";
    loadGameData.send();
});

// ////////////////////////////////////////////////////////////////////////////
// The core VM loop
// ////////////////////////////////////////////////////////////////////////////
function resumeExec(pushValue?: Value) {
    if (!State.bytecode) throw("Tried to run VM code when no VM code loaded.");

    if (!State.callStack) {
        const functionDef = getFunction(State.mainFunction);
        State.callStack = new CallStack();
        State.callStack.pushFrame(State.mainFunction, functionDef.codePosition, 0);
        State.callStack.buildLocals([], functionDef.argCount, functionDef.argCount + functionDef.localCount);
        State.nextIP = functionDef.codePosition;
    }

    State.extraValue = noneValue;
    let IP = State.nextIP;
    if (pushValue) {
        if (pushValue instanceof Value) {
            State.callStack.stack.push(pushValue);
        }
    }

    let iterations = 0;

    while (1) {
        ++iterations;
        if (iterations > 500000) {
            State.nextIP = IP;
            return 1;
        }

        ++State.operations;
        const opcode = State.bytecode.getUint8(IP);
        ++IP;

        switch(opcode) {
            case Opcode.Return: {
                const top = State.callStack.returnValue;
                const oldFrame = State.callStack.popFrame();
                if (State.callStack.frameCount === 0 || !oldFrame) {
                    return top;
                } else {
                    IP = oldFrame.returnAddress;
                    State.callStack.stack.push(top);
                }
                break;
            }
            case Opcode.Push0: {
                const rawType = State.bytecode.getUint8(IP);
                ++IP;
                State.callStack.stack.push(new Value(rawType,0));
                break; }
            case Opcode.Push1: {
                const rawType = State.bytecode.getUint8(IP);
                ++IP;
                State.callStack.stack.push(new Value(rawType,1));
                break; }
            case Opcode.PushNone:
                State.callStack.stack.push(noneValue);
                break;
            case Opcode.Push8: {
                const rawType = State.bytecode.getUint8(IP);
                ++IP;
                const rawValue = State.bytecode.getInt8(IP);
                ++IP;
                State.callStack.stack.push(new Value(rawType,rawValue));
                break; }
            case Opcode.Push16: {
                const rawType = State.bytecode.getUint8(IP);
                ++IP;
                const rawValue = State.bytecode.getInt16(IP, true);
                IP += 2;
                State.callStack.stack.push(new Value(rawType,rawValue));
                break; }
            case Opcode.Push32: {
                const rawType = State.bytecode.getUint8(IP);
                ++IP;
                const rawValue = State.bytecode.getInt32(IP, true);
                IP += 4;
                State.callStack.stack.push(new Value(rawType, rawValue));
                break; }

            case Opcode.Store: {
                const localId = State.callStack.popRaw();
                const value = State.callStack.pop();
                localId.requireType(ValueType.VarRef);
                value.forbidType(ValueType.VarRef);
                State.callStack.set(localId.value, value);
                break; }
            case Opcode.CollectGarbage:
                State.callStack.stack.push(collectGarbage());
                break;

            case Opcode.Say: {
                const v1 = State.callStack.pop();
                say(v1);
                break; }
            case Opcode.SayUCFirst: {
                const v1 = State.callStack.pop();
                say(v1, true);
                break; }
            case Opcode.SayUnsigned:
                var value = State.callStack.pop();
                value.requireType(ValueType.Integer);
                say(value.value>>>0);
                break;
            case Opcode.SayChar:
                var value = State.callStack.pop();
                value.requireType(ValueType.Integer);
                say(String.fromCodePoint(value.value));
                break;

            case Opcode.StackPop:
                State.callStack.popRaw();
                break;
            case Opcode.StackDup: {
                State.callStack.stack.push(State.callStack.peek().clone());
                break; }
            case Opcode.StackPeek: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                State.callStack.stack.push(State.callStack.peek(v1.value).clone());
                break; }
            case Opcode.StackSize:
                State.callStack.stack.push(new Value(ValueType.Integer, State.callStack.stackSize));
                break;

            case Opcode.Call: {
                //        v1       target
                // [args] argcount function call
                const target = State.callStack.pop();
                const v1 = State.callStack.pop();
                target.requireType(ValueType.Node);
                v1.requireType(ValueType.Integer);

                if (!target.selfobj) throw new RuntimeError("Tried to call reference with no 'this' value.");
                const theFunc = getFunction(target.value);
                const theArgs = [target.selfobj];
                while (v1.value > 0) {
                    theArgs.push(State.callStack.pop());
                    v1.value -= 1;
                }
                while (theArgs.length < theFunc.argCount) theArgs.push(noneValue);
                for (let i = 0; i < theFunc.argCount; ++i) {
                    if (theFunc.types[i] != ValueType.Any && theArgs[i].type !== theFunc.types[i]) {
                        const name = getString(getSource(target).value);
                        throw new RuntimeError("Argument " + i + " of " + name + " requires type of "
                                + ValueType[theFunc.types[i]] + " but receieved "
                                + ValueType[theArgs[i].type] + ".");
                    }
                }
                State.callStack.pushFrame(target.value, theFunc.codePosition, IP);
                State.callStack.buildLocals(theArgs, theFunc.argCount, theFunc.argCount + theFunc.localCount);
                IP = theFunc.codePosition;
                break; }

            case Opcode.IsValid: {
                const v1 = State.callStack.pop();
                State.callStack.stack.push(new Value(ValueType.Integer, isValid(v1) ? 1 : 0));
                break; }

            case Opcode.ListPush: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.List);
                const theList = getList(v1.value);
                theList.push(v2);
                break; }
            case Opcode.ListPop: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.List);
                const theList = getList(v1.value);
                if (theList.length > 0) {
                    const v = theList.pop();
                    if (v)  State.callStack.push(v);
                    else    State.callStack.push(noneValue);
                } else {
                    throw new RuntimeError("used list_pop on empty list.");
                }
                break; }
            case Opcode.Sort: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.List);
                const theList = getList(v1.value);
                sortList(theList);
                break; }
            case Opcode.GetItem: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                if (v1.type === ValueType.Object) {
                    v2.requireType(ValueType.Property);
                    const propValue = getObjectProperty(v1.value, v2.value);
                    State.callStack.stack.push(propValue);
                } else if (v1.type === ValueType.List) {
                    v2.requireType(ValueType.Integer);
                    const theList = getList(v1.value);
                    if (v2.value < 0 || v2.value >= theList.length) {
                        State.callStack.stack.push(new Value(ValueType.Integer, 0));
                    } else {
                        State.callStack.stack.push(theList[v2.value]);
                    }
                } else if (v1.type === ValueType.Map) {
                    const theMap = getMap(v1.value);
                    const mapKey = v2.toKey();
                    if (theMap.hasOwnProperty(mapKey)) {
                        State.callStack.stack.push(theMap[mapKey]);
                    } else {
                        State.callStack.stack.push(new Value(ValueType.Integer, 0));
                    }
                } else {
                    throw new RuntimeError("get-item requires list or map.");
                }
                break; }
            case Opcode.HasItem: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                if (v1.type === ValueType.Object) {
                    v2.requireType(ValueType.Property);
                    const propExists = objectHasProperty(v1, v2);
                    State.callStack.stack.push(propExists);
                } else if (v1.type === ValueType.List) {
                    v2.requireType(ValueType.Integer);
                    if (v2.value < 1 || v2.value > getList(v1.value).length) {
                        State.callStack.stack.push(new Value(ValueType.Integer, 0));
                    } else {
                        State.callStack.stack.push(new Value(ValueType.Integer, 1));
                    }
                } else if (v1.type === ValueType.Map) {
                    const theMap = getMap(v1.value);
                    const mapKey = v2.toKey();
                    if (theMap.hasOwnProperty(mapKey)) {
                        State.callStack.stack.push(new Value(ValueType.Integer, 1));
                    } else {
                        State.callStack.stack.push(new Value(ValueType.Integer, 0));
                    }
                } else {
                    throw new RuntimeError("has-item requires list or map.");
                }
                break; }
            case Opcode.GetSize: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.List);
                State.callStack.stack.push(new Value(ValueType.Integer, getList(v1.value).length));
                break; }
            case Opcode.SetItem: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const v3 = State.callStack.pop();
                v3.forbidType(ValueType.VarRef);
                if (v1.type === ValueType.Object) {
                    v2.requireType(ValueType.Property);
                    v3.forbidType(ValueType.VarRef);
                    setObjectProperty(v1, v2, v3);
                } else if (v1.type === ValueType.List) {
                    v2.requireType(ValueType.Integer);
                    getList(v1.value)[v2.value] = v3;
                } else if (v1.type === ValueType.Map) {
                    const theMap = getMap(v1.value);
                    const mapKey = v2.toKey();
                    theMap[mapKey]= v3;
                } else {
                    throw new RuntimeError("set-item requires list or map.");
                }
                break; }
            case Opcode.TypeOf: {
                const v1 = State.callStack.pop();
                State.callStack.stack.push(new Value(ValueType.TypeId, v1.type));
                break; }
            case Opcode.DelItem: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                if (v1.type === ValueType.List) {
                    v2.requireType(ValueType.Integer);
                    const theList = getList(v1.value);
                    if (v2.value <= 0) v2.value = 0;
                    theList.splice(v2.value, 1);
                } else {
                    v1.requireType(ValueType.Map);
                    const theMap = getMap(v1.value);
                    delete theMap[v2.toKey()];
                }
                break; }
            case Opcode.AddItem: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const v3 = State.callStack.pop();
                if (v1.type === ValueType.Map) {
                    throw new RuntimeError("attempted to use add-item on map; use set-item instead");
                }
                v1.requireType(ValueType.List);
                v2.requireType(ValueType.Integer);
                v3.forbidType(ValueType.VarRef);
                const theList = getList(v1.value);
                if (v2.value <= 0) v2.value = 0;
                theList.splice(v2.value, 0, v3);
                break; }

            case Opcode.AsType: {
                const value = State.callStack.pop();
                const type = State.callStack.pop();
                type.requireType(ValueType.TypeId);
                const newValue = new Value(type.value, value.value);
                State.callStack.stack.push(newValue);
                break; }

            case Opcode.Equal: {
                // LHS RHS cmp
                // 5   10  cmp   5 gt
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const result = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(result === 0)));
                break; }
            case Opcode.NotEqual: {
                // LHS RHS cmp
                // 5   10  cmp   5 gt
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const target = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(target !== 0)));
                break; }

            case Opcode.Jump: {
                const target = State.callStack.pop();
                target.requireType(ValueType.JumpTarget);
                IP = State.callStack.base + target.value;
                break; }
            case Opcode.JumpZero: {
                const target = State.callStack.pop();
                const v1 = State.callStack.pop();
                target.requireType(ValueType.JumpTarget);
                if (v1.value === 0) {
                    IP = State.callStack.base + target.value;
                }
                break; }
            case Opcode.JumpNotZero: {
                const target = State.callStack.pop();
                const v1 = State.callStack.pop();
                target.requireType(ValueType.JumpTarget);
                if (v1.value !== 0) {
                    IP = State.callStack.base + target.value;
                }
                break; }
            case Opcode.LessThan: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const target = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(target < 0)));
                break; }
            case Opcode.LessThanEqual: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const target = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(target <= 0)));
                break; }
            case Opcode.GreaterThan: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const target = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(target > 0)));
                break; }
            case Opcode.GreaterThanEqual: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const target = doCompare(v1, v2);
                State.callStack.stack.push(new Value(ValueType.Integer, +(target >= 0)));
                break; }

            case Opcode.Not: {
                const v1 = State.callStack.pop();
                if (v1.isTrue()) {
                    State.callStack.stack.push(new Value(ValueType.Integer, 0));
                } else {
                    State.callStack.stack.push(new Value(ValueType.Integer, 1));
                }
                break; }
            case Opcode.Add: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (v1.value + v2.value) | 0));
                break; }
            case Opcode.Sub: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (v1.value - v2.value) | 0));
                break; }
            case Opcode.Mult: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (v1.value * v2.value) | 0));
                break; }
            case Opcode.Div: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (v1.value / v2.value) | 0));
                break; }
            case Opcode.Mod: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (v1.value % v2.value) | 0));
                break; }
            case Opcode.Pow: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       (Math.pow(v1.value, v2.value)) | 0));
                break; }
            case Opcode.BitLeft: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       v1.value << v2.value));
                break; }
            case Opcode.BitRight: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       v1.value >>> v2.value));
                break; }
            case Opcode.BitAnd: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       v2.value & v1.value));
                break; }
            case Opcode.BitOr: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       v2.value | v1.value));
                break; }
            case Opcode.BitXor: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer,
                                       v2.value ^ v1.value));
                break; }
            case Opcode.BitNot: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                State.callStack.stack.push(new Value(ValueType.Integer, ~v1.value));
                break; }
            case Opcode.Random: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                v2.requireType(ValueType.Integer);
                const randomValue = Math.floor(Math.random()
                                               * (v1.value - v2.value)
                                               + v2.value);
                State.callStack.stack.push(new Value(ValueType.Integer, randomValue));
                break; }
            case Opcode.NextObject: {
                const v1 = State.callStack.pop();
                let nextValue = 0;
                if (v1.type !== ValueType.None) {
                    v1.requireType(ValueType.Object);
                    if (v1.value > 0) {
                        nextValue = v1.value;
                    }
                }

                while(1) {
                    ++nextValue;
                    if (nextValue >= State.nextIdent) {
                        State.callStack.stack.push(noneValue);
                        break;
                    }
                    if (State.objects.hasOwnProperty(nextValue)) {
                        State.callStack.stack.push(new Value(ValueType.Object, nextValue));
                        break;
                    }
                }
                break; }
            case Opcode.IndexOf: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v2.requireType(ValueType.List);
                const theList = getList(v2.value);
                let result = -1;
                for (let i = 0; i < theList.length; ++i) {
                    if (theList[i].type == v1.type && theList[i].value == v1.value) {
                        result = i;
                        break;
                    }
                }
                State.callStack.stack.push(new Value(ValueType.Integer, result));
                break; }
            case Opcode.GetRandom: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.List);
                const theList = getList(v1.value);
                if (theList.length === 0) {
                    State.callStack.stack.push(new Value(ValueType.Integer, 0));
                } else {
                    const choice = Math.floor(Math.random() * theList.length);
                    State.callStack.stack.push(theList[choice]);
                }
                break; }

            case Opcode.GetKeys: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.Map);
                const v2 = makeNew(ValueType.List);
                const theList = getMap(v1.value);
                const keys = Object.keys(theList);
                keys.forEach(function(key) {
                    const keySep = key.indexOf(":");
                    const keyType = +key.substring(0, keySep);
                    const keyValue = +key.substring(keySep + 1);
                    const result = new Value(keyType, keyValue);
                    getList(v2.value).push(result);
                })
                State.callStack.stack.push(v2);
                break; }

            case Opcode.StackSwap: {
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.Integer);
                if (v1.value < 0 || v1.value >= State.callStack.stackSize
                    || v2.value < 0 || v2.value >= State.callStack.stackSize) {
                    throw new RuntimeError("Invalid stack position.");
                }
                const stackTop = State.callStack.stack.stack.length - 1;
                const tmp = State.callStack.stack.stack[stackTop - v1.value];
                State.callStack.stack.stack[stackTop - v1.value] = State.callStack.stack.stack[stackTop - v2.value];
                State.callStack.stack.stack[stackTop - v2.value] = tmp;
                break; }

            case Opcode.GetSetting: {
                const settingNo = State.callStack.pop();
                settingNo.requireType(ValueType.Integer);
                getSetting(settingNo.value);
                break; }
            case Opcode.SetSetting: {
                const settingNo = State.callStack.pop();
                const newValue  = State.callStack.pop();
                setSetting(settingNo.value, newValue);
                break; }

            case Opcode.GetKey: {
                const v2 = State.callStack.pop();
                v2.requireType(ValueType.String);
                State.optionType = OptionType.KeyInput;
                State.options = [ new GameOption(v2, noneValue, noneValue, noneValue) ];
                State.nextIP = IP;
                return; }
            case Opcode.GetOption: {
                const v2 = State.callStack.pop();
                if (v2.type == ValueType.None) {
                    State.extraValue = noneValue;
                } else {
                    v2.requireType(ValueType.VarRef);
                    State.extraValue = v2;
                }
                State.optionType = OptionType.MenuItem;
                State.nextIP = IP;
                return; }
            case Opcode.GetLine: {
                const v2 = State.callStack.pop();
                v2.requireType(ValueType.String);
                State.optionType = OptionType.LineInput;
                State.options = [ new GameOption(v2, noneValue, noneValue, noneValue) ];
                State.nextIP = IP;
                return; }
            case Opcode.AddOption: {
                const v4 = State.callStack.pop();
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                const v3 = State.callStack.pop();
                v3.requireType(ValueType.String);
                v4.requireEitherType(ValueType.Integer, ValueType.None);
                State.options.push(new GameOption(v3, v2, v1, v4));
                break; }

            case Opcode.StringClear: {
                // v2  v1       v2 -> v1
                // 5   10  strcpy
                const v1 = State.callStack.pop();
                v1.requireType(ValueType.String);
                if (isStatic(v1)) {
                    throw new RuntimeError("Cannot modify static string");
                }
                State.strings[v1.value].data = "";
                break; }
            case Opcode.StringAppend: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                stringAppend(v1, v2, false);
                break; }
            case Opcode.StringAppendUF: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                stringAppend(v1, v2, true);
                break; }
            case Opcode.StringCompare: {
                const v1 = State.callStack.pop();
                const v2 = State.callStack.pop();
                v1.requireType(ValueType.String);
                v2.requireType(ValueType.String);
                const s1 = getString(v1.value);
                const s2 = getString(v2.value);
                const theResult = (s1 === s2) ? 0 : 1;
                State.callStack.stack.push(new Value(ValueType.Integer, theResult));
                break; }

            case Opcode.Error: {
                if (State.callStack.stackSize === 0) {
                    throw new RuntimeError("User Error: Thrown with empty stack.");
                }
                const v1 = State.callStack.pop();
                if (v1.type === ValueType.String) {
                    throw new RuntimeError("User Error: " + getString(v1.value));
                } else {
                    throw new RuntimeError("User Error: " + v1.toString());
                }
            }
            case Opcode.Origin: {
                const v1 = State.callStack.pop();
                State.callStack.stack.push(getSource(v1));
                break; }

            case Opcode.New: {
                const v1 = State.callStack.pop();
                const newItem = makeNew(v1.value);
                State.callStack.stack.push(newItem);
                break; }
            case Opcode.IsStatic: {
                const v1 = State.callStack.pop();
                const result = isStatic(v1);
                State.callStack.stack.push(new Value(ValueType.Integer, result ? 1 : 0));
                break; }

            case Opcode.EncodeString: {
                const stringId = State.callStack.pop();
                stringId.requireType(ValueType.String);
                const rawText = getString(stringId.value);
                const listId = makeNew(ValueType.List);
                State.callStack.push(listId);
                const list = getList(listId.value);

                const text = new TextEncoder().encode(rawText);
                let v = 0;
                let counter = 0;
                text.forEach(function(s) {
                    const byte = s & 0xFF;
                    v <<= 8;
                    v |= byte;
                    ++counter;
                    if (counter >= 4) {
                        list.push(new Value(ValueType.Integer, v));
                        counter = v = 0;
                    }
                });
                if (counter !== 0) {
                    while (counter < 4) {
                        ++counter;
                        v <<= 8;
                    }
                    list.push(new Value(ValueType.Integer, v));
                }
                break; }
            case Opcode.DecodeString: {
                const listId = State.callStack.pop();
                listId.requireType(ValueType.List);
                const list = getList(listId.value);
                const newText = makeNew(ValueType.String);
                State.callStack.push(newText);

                const bytes = [];
                for (let i = 0; i < list.length; ++i) {
                    const value = list[i];
                    value.requireType(ValueType.Integer);
                    const v4 = (value.value >> 24) & 0xFF;
                    if (!v4) break;
                    bytes.push(v4);
                    const v3 = (value.value >> 16) & 0xFF;
                    if (!v3) break;
                    bytes.push(v3);
                    const v2 = (value.value >> 8) & 0xFF;
                    if (!v2) break;
                    bytes.push(v2);
                    const v1 = value.value & 0xFF;
                    if (!v1) break;
                    bytes.push(v1);
                };
                const byteArr = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; ++i) {
                    byteArr[i] = bytes[i];
                }
                State.strings[newText.value].data = new TextDecoder("utf-8").decode(byteArr);
                break; }

            case Opcode.FileList: {
                const gameIdRef = State.callStack.pop();
                gameIdRef.requireEitherType(ValueType.String, ValueType.None);
                const gameId = gameIdRef.type == ValueType.None ? "" : getString(gameIdRef.value);
                const files = getFileIndex();
                const fileListId = makeNew(ValueType.List);
                const fileList = getList(fileListId.value);
                State.callStack.push(fileListId);
                files.forEach(function(aFile) {
                    if (gameId !== "" && aFile.gameid !== gameId) return;
                    const rowId = makeNew(ValueType.List);
                    const row = getList(rowId.value);
                    const nameStr = makeNew(ValueType.String);
                    State.strings[nameStr.value].data = aFile.name;
                    const dateStr = makeNew(ValueType.String);
                    State.strings[dateStr.value].data = (new Date(aFile.timestamp)).toLocaleString();
                    row.push(nameStr, dateStr);
                fileList.push(rowId);
                });
                break; }

            case Opcode.FileRead: {
                const fileNameId = State.callStack.pop();
                fileNameId.requireType(ValueType.String);
                const fileName = getString(fileNameId.value);
                const filedata = getFile(fileName);
                if (!filedata) {
                    State.callStack.push(noneValue);
                } else {
                    const b64data = filedata.file;
                    if (b64data) {
                        const binData = decodeData(b64data);
                        const dataList = makeNew(ValueType.List);
                        const aList = getList(dataList.value);
                        for (let i = 0; i < binData.byteLength; i += 4) {
                            aList.push(new Value(ValueType.Integer, binData.getInt32(i, true)));
                        }
                        State.callStack.push(dataList);
                    }
                }
                break; }

            case Opcode.FileWrite: {
                const fileNameId = State.callStack.pop();
                const dataListId = State.callStack.pop();
                fileNameId.requireType(ValueType.String);
                dataListId.requireType(ValueType.List);
                const fileName = getString(fileNameId.value);
                const gameId = getString(State.gameId);
                const aList = getList(dataListId.value);
                if (aList.length > 0) {
                    const binLength = aList.length * 4;
                    const binData = new ArrayBuffer(binLength);
                    const binView = new DataView(binData);
                    for (let i = 0; i < aList.length; ++i) {
                        aList[i].requireType(ValueType.Integer);
                        binView.setInt32(i * 4, aList[i].value, true);
                    }
                    const finalData = encodeData(binView);
                    saveFile(fileName, gameId, finalData);
                } else {
                    saveFile(fileName, gameId, "");
                }

                State.callStack.push(new Value(ValueType.Integer, 1));
                break; }

            case Opcode.FileDelete: {
                const fileNameId = State.callStack.pop();
                fileNameId.requireType(ValueType.String);
                const fileName = getString(fileNameId.value);
                const file = getFile(fileName);
                if (file) {
                    deleteFile(fileName);
                    State.callStack.push(new Value(ValueType.Integer, 1));
                } else {
                    State.callStack.push(new Value(ValueType.Integer, 0));
                }
                break; }

            case Opcode.Tokenize: {
                const text = State.callStack.pop();
                const strList = State.callStack.pop();
                const vocabList = State.callStack.pop();
                text.requireType(ValueType.String);
                strList.requireEitherType(ValueType.List, ValueType.None);
                vocabList.requireEitherType(ValueType.List, ValueType.None);

                let strDef:Array<Value> | undefined = undefined;
                let vocabDef:Array<Value> | undefined = undefined;
                if (strList.type === ValueType.List) {
                    strDef = getList(strList.value);
                    if (strDef) strDef.length = 0;
                }
                if (vocabList.type === ValueType.List) {
                    vocabDef = getList(vocabList.value);
                    if (vocabDef) vocabDef.length = 0;
                }
                const result = getString(text.value).split(/[ \n\r\t]/);
                result.forEach(function(word) {
                    if (word === "") return;
                    if (strDef) {
                        const nv = makeNew(ValueType.String);
                        State.strings[nv.value].data = word;
                        strDef.push(nv);
                    }
                    if (vocabDef) {
                        vocabDef.push(new Value(ValueType.Vocab, getVocabNumber(word)));
                    }
                });
                break; }

            case Opcode.GetChildCount: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const object = getObjectDef(objectId.value);
                if (object.child === 0) {
                    State.callStack.push(new Value(ValueType.Integer, 0));
                } else {
                    let count = 0;
                    let child = getObjectDef(object.child);
                    while (1) {
                        ++count;
                        if (child.sibling <= 0) break;
                        child = getObjectDef(child.sibling);
                    }
                    State.callStack.push(new Value(ValueType.Integer, count));
                }
                break; }

            case Opcode.GetParent: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const object = getObjectDef(objectId.value);
                if (object.parent === 0) {
                    State.callStack.push(noneValue);
                } else {
                    State.callStack.push(new Value(ValueType.Object, object.parent));
                }
                break; }
            case Opcode.GetFirstChild: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const object = getObjectDef(objectId.value);
                if (object.child === 0) {
                    State.callStack.push(noneValue);
                } else {
                    State.callStack.push(new Value(ValueType.Object, object.child));
                }
                break; }
            case Opcode.GetSibling: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const object = getObjectDef(objectId.value);
                if (object.sibling === 0) {
                    State.callStack.push(noneValue);
                } else {
                    State.callStack.push(new Value(ValueType.Object, object.sibling));
                }
                break; }
            case Opcode.GetChildren: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const object = getObjectDef(objectId.value);
                const listV = makeNew(ValueType.List);
                State.callStack.push(listV);
                const list = getList(listV.value);
                if (object.child > 0) {
                    let child = getObjectDef(object.child);
                    while (1) {
                        list.push(new Value(ValueType.Object, child.ident));
                        if (child.sibling <= 0) break;
                        child = getObjectDef(child.sibling);
                    }
                }
                break; }
            case Opcode.MoveTo: {
                const objectId = State.callStack.pop();
                objectId.requireType(ValueType.Object);
                const newParent = State.callStack.pop();
                newParent.requireEitherType(ValueType.Object, ValueType.None);
                moveObject(objectId, newParent);
                break; }


            default:
                throw new RuntimeError("Unknown opcode " + opcode + ".");
        }
    }
}
