
QUnit.module("Stack Class");
QUnit.test("Create stack (new)", function(assert) {
    const callstack = new G.CallStack();
    assert.ok(callstack, "Created successfully");
    assert.strictEqual(callstack.length, 0, "Starts empty");

    callstack.pushFrame();
    assert.strictEqual(callstack.length, 1, "Push frame");
    assert.strictEqual(callstack.stackSize, 0, "Frame stack is empty");

    callstack.popFrame();
    assert.strictEqual(callstack.length, 0, "Pop frame");
});

QUnit.test("Push items (.push)", function(assert) {
    const callstack = new G.CallStack();
    callstack.pushFrame();
    callstack.push(new G.Value(G.ValueType.Integer, 4));
    assert.strictEqual(callstack.stackSize, 1, "Stack has one item");
    callstack.push(new G.Value(G.ValueType.String, 8));
    callstack.push(new G.Value(G.ValueType.List, 16));
    callstack.push(new G.Value(G.ValueType.Map, 20000));
    assert.strictEqual(callstack.stackSize, 4, "Stack has four items");
});

QUnit.test("Pop items (.pop)", function(assert) {
    const callstack = new G.CallStack();
    callstack.pushFrame();
    callstack.push(new G.Value(G.ValueType.Integer, 4));
    callstack.push(new G.Value(G.ValueType.String, 8));
    callstack.push(new G.Value(G.ValueType.List, 16));
    callstack.push(new G.Value(G.ValueType.Map, 20000));
    assert.strictEqual(callstack.stackSize, 4, "Initial size correct");

    let poppedValue = callstack.pop();
    assert.strictEqual(callstack.stackSize, 3, "New size correct");
    assert.strictEqual(poppedValue.type, G.ValueType.Map, "Popped value correct type");
    assert.strictEqual(poppedValue.value, 20000, "Popped value correct value");

    poppedValue = callstack.pop();
    assert.strictEqual(callstack.stackSize, 2, "New size correct");
    assert.strictEqual(poppedValue.type, G.ValueType.List, "Popped value correct type");
    assert.strictEqual(poppedValue.value, 16, "Popped value correct value");
});

QUnit.test("Peek items (.peek)", function(assert) {
    const callstack = new G.CallStack();
    callstack.pushFrame();
    callstack.push(new G.Value(G.ValueType.Integer, 4));
    callstack.push(new G.Value(G.ValueType.String, 8));
    callstack.push(new G.Value(G.ValueType.List, 16));
    callstack.push(new G.Value(G.ValueType.Map, 20000));
    assert.strictEqual(callstack.stackSize, 4, "Initial size correct");

    let value = callstack.peek();
    assert.strictEqual(callstack.stackSize, 4, "Size unchanged");
    assert.strictEqual(value.type, G.ValueType.Map, "Peek() value correct type");
    assert.strictEqual(value.value, 20000, "Peek() value correct value");

    value = callstack.peek(1);
    assert.strictEqual(callstack.stackSize, 4, "Size unchanged");
    assert.strictEqual(value.type, G.ValueType.List, "Peek(1) value correct type");
    assert.strictEqual(value.value, 16, "Peek(1) value correct value");

    value = callstack.peek(3);
    assert.strictEqual(value.type, G.ValueType.Integer, "Peek(3) value correct type");
    assert.strictEqual(value.value,4, "Peek(3) value correct value");
});

QUnit.test("Push and pop with local values", function(assert) {
    const callstack = new G.CallStack();
    callstack.pushFrame();
    callstack.locals.push(new G.Value(G.ValueType.String, 22));
    callstack.locals.push(new G.Value(G.ValueType.String, 43));
    callstack.locals.push(new G.Value(G.ValueType.String, 67));
    callstack.locals.push(new G.Value(G.ValueType.String, 99));

    callstack.push(new G.Value(G.ValueType.Integer, 4));
    callstack.push(new G.Value(G.ValueType.LocalVar, 1));
    callstack.push(new G.Value(G.ValueType.LocalVar, 2));
    assert.strictEqual(callstack.stackSize, 3, "Initial size correct");

    const value = callstack.pop();
    assert.strictEqual(callstack.stackSize, 2, "pop: correct size");
    assert.strictEqual(value.type, G.ValueType.String, "pop: correct type");
    assert.strictEqual(value.value, 67, "pop: correct value");

    const rawValue = callstack.popRaw();
    assert.strictEqual(callstack.stackSize, 1, "popRaw: size correct");
    assert.strictEqual(rawValue.type, G.ValueType.LocalVar, "popRaw: correct type");
    assert.strictEqual(rawValue.value, 1, "popRaw: correct value");
});


QUnit.module("Value Class");
QUnit.test("Create value (new)", function(assert) {
    const value = new G.Value(G.ValueType.String, 53);
    assert.ok(value, "Created successfully");
    assert.strictEqual(value.type, G.ValueType.String, "Correct type");
    assert.strictEqual(value.value, 53, "Correct value");

    // assert.throws(new G.Value(), G.RuntimeError, "Produce error if no type provided");
    // assert.throws(new G.Value(1), G.RuntimeError, "Produce error if no value provided");
});

QUnit.test("Clone value (.clone)", function(assert) {
    const value = new G.Value(G.ValueType.String, 53);
    assert.ok(value, "Created successfully");
    const theClone = value.clone();
    assert.ok(theClone, "Created successfully");
    assert.notStrictEqual(value, theClone, "Clone is different object");
    assert.strictEqual(value.type, theClone.type, "Copied type");
    assert.strictEqual(value.value, theClone.value, "Copied value");
});

// QUnit.test("Require type (.requireType)", function(assert) {
//     const value = new G.Value(G.ValueType.String, 53);
//     assert.ok(value, "Created successfully");
//     assert.throws(value.requireType(G.ValueType.String), G.RuntimeError,
//                   "requiresType raises error on failure");
// });

QUnit.test("Truthfulness (.isTrue / .isFalse)", function(assert) {
    let value = new G.Value(G.ValueType.None, 67);
    assert.ok(!value.isTrue(), "None values are not true.");
    assert.ok(value.isFalse(), "None values are false.");

    value = new G.Value(G.ValueType.String, 4);
    assert.ok(value.isTrue(), "Strings are true.");
    assert.ok(!value.isFalse(), "Strings are not false.");
    value = new G.Value(G.ValueType.List, 4);
    assert.ok(value.isTrue(), "Lists are true.");
    assert.ok(!value.isFalse(), "Lists are not false.");
    value = new G.Value(G.ValueType.Map, 4);
    assert.ok(value.isTrue(), "Maps are true.");
    assert.ok(!value.isFalse(), "Maps are not false.");
    value = new G.Value(G.ValueType.Object, 4);
    assert.ok(value.isTrue(), "Objects are true.");
    assert.ok(!value.isFalse(), "Objects are not false.");
    value = new G.Value(G.ValueType.Node, 4);
    assert.ok(value.isTrue(), "Functions are true.");
    assert.ok(!value.isFalse(), "Functions are not false.");
    value = new G.Value(G.ValueType.Property, 4);
    assert.ok(value.isTrue(), "Properties are true.");
    assert.ok(!value.isFalse(), "Properties are not false.");
    value = new G.Value(G.ValueType.Integer, 0);
    assert.ok(!value.isTrue(), "Integer 0 is not true.");
    assert.ok(value.isFalse(), "Integer 0 is false.");
    value = new G.Value(G.ValueType.Integer, 4);
    assert.ok(value.isTrue(), "Non-zero integers are true.");
    assert.ok(!value.isFalse(), "Non-zero integers are not false.");

    value = new G.Value(G.ValueType.String, 0);
    assert.ok(!value.isTrue(), "String 0 is not true.");
    assert.ok(value.isFalse(), "String 0 is false.");
    value = new G.Value(G.ValueType.List, 0);
    assert.ok(!value.isTrue(), "List 0 is not true.");
    assert.ok(value.isFalse(), "List 0 is false.");
    value = new G.Value(G.ValueType.Map, 0);
    assert.ok(!value.isTrue(), "Map 0 is not true.");
    assert.ok(value.isFalse(), "Map 0 is false.");
    value = new G.Value(G.ValueType.Object, 0);
    assert.ok(!value.isTrue(), "Object 0 is not true.");
    assert.ok(value.isFalse(), "Object 0 is false.");
    value = new G.Value(G.ValueType.Node, 0);
    assert.ok(!value.isTrue(), "Function 0 is not true.");
    assert.ok(value.isFalse(), "Function 0 is false.");
    value = new G.Value(G.ValueType.Property, 0);
    assert.ok(!value.isTrue(), "Property 0 is not true.");
    assert.ok(value.isFalse(), "Property 0 is false.");
});