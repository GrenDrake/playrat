
QUnit.module("Stack Class");
QUnit.test("Create stack (new)", function(assert) {
    const newStack = new G.Stack();
    assert.ok(newStack, "Created successfully");
    assert.strictEqual(newStack.length, 0, "Starts empty");
});

QUnit.test("Push items (.push)", function(assert) {
    const newStack = new G.Stack();
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    assert.strictEqual(newStack.stack.length, 1, "Stack has one item");
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    assert.strictEqual(newStack.stack.length, 4, "Stack has four items");
});

QUnit.test("Pop items (.pop)", function(assert) {
    const newStack = new G.Stack();
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.Integer, 8));
    newStack.push(new G.Value(G.ValueType.Integer, 16));
    newStack.push(new G.Value(G.ValueType.Integer, 20000));
    assert.strictEqual(newStack.stack.length, 4, "Initial size correct");

    let poppedValue = newStack.pop();
    assert.strictEqual(newStack.stack.length, 3, "New size correct");
    assert.strictEqual(poppedValue.type, G.ValueType.Integer, "Popped value correct type");
    assert.strictEqual(poppedValue.value, 20000, "Popped value correct value");

    poppedValue = newStack.pop();
    assert.strictEqual(newStack.stack.length, 2, "New size correct");
    assert.strictEqual(poppedValue.type, G.ValueType.Integer, "Popped value correct type");
    assert.strictEqual(poppedValue.value, 16, "Popped value correct value");
});

QUnit.test("Peek items (.peek)", function(assert) {
    const newStack = new G.Stack();
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.Integer, 8));
    newStack.push(new G.Value(G.ValueType.Integer, 16));
    newStack.push(new G.Value(G.ValueType.Integer, 20000));
    assert.strictEqual(newStack.stack.length, 4, "Initial size correct");

    let value = newStack.peek(1);
    assert.strictEqual(newStack.stack.length, 4, "Size unchanged");
    assert.strictEqual(value.type, G.ValueType.Integer, "Peek value correct type");
    assert.strictEqual(value.value, 16, "Peek value correct value");

    value = newStack.peek(3);
    assert.strictEqual(value.type, G.ValueType.Integer, "Peek value correct type");
    assert.strictEqual(value.value,4, "Peek value correct value");
});

QUnit.test("Get top item (.top)", function(assert) {
    const newStack = new G.Stack();
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.Integer, 8));
    newStack.push(new G.Value(G.ValueType.Integer, 16));
    newStack.push(new G.Value(G.ValueType.Integer, 20000));
    assert.strictEqual(newStack.stack.length, 4, "Initial size correct");

    let poppedValue = newStack.top();
    assert.strictEqual(newStack.stack.length, 4, "Size unchanged");
    assert.strictEqual(poppedValue.type, G.ValueType.Integer, "Top value correct type");
    assert.strictEqual(poppedValue.value, 20000, "Top value correct value");
    assert.strictEqual(poppedValue, newStack.stack[newStack.stack.length - 1], "Return value is same object");
});

QUnit.test("Pop item with translated locals (.popAsLocal)", function(assert) {
    const localArray = [
        new G.Value(G.ValueType.String, 22),
        new G.Value(G.ValueType.String, 43),
        new G.Value(G.ValueType.String, 67),
        new G.Value(G.ValueType.String, 99),
    ];

    const newStack = new G.Stack();
    newStack.push(new G.Value(G.ValueType.Integer, 4));
    newStack.push(new G.Value(G.ValueType.LocalVar, 2));
    assert.strictEqual(newStack.stack.length, 2, "Initial size correct");

    const value = newStack.popAsLocal(localArray);
    assert.strictEqual(newStack.stack.length, 1, "New size correct");
    assert.strictEqual(value.type, G.ValueType.String, "Top value correct type");
    assert.ok(value.value, 67, "Top value correct value");
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
