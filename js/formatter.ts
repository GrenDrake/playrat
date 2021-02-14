
enum TextNodeType {
    Root,
    Text,
    Tag,
    Paragraph
};

enum TextTokenType {
    Text,
    Paragraph,
    Tag,
    TagEnd,
    End
};

interface NodeData {
    type: TextTokenType,
    text: string
};

interface ResultData {
    errors: Array<string>;
    text: string;
};

interface TagData {
    name: string,
    hasContent: boolean,
    topLevel: boolean,
    hasAttributes: boolean
};

export default function formatter(sourceText: string) {
    const results:ResultData = {
        "errors": [],
        text: ""
    };
    const tokens = parseSourceText(sourceText, results);
    const root = buildParseTree(tokens, results);
    results.text = formatAsText(root, results).join("");
    return results;
}

// // // // // // // // // // // // // // // // // // // // // // // // //
// TAG DEFINITIONS

const tags:Array<TagData> = [
    { "name": "b",      "hasContent": true,     "topLevel": false,  "hasAttributes": false },
    { "name": "br",     "hasContent": false,    "topLevel": false,  "hasAttributes": false },
    { "name": "hr",     "hasContent": false,    "topLevel": true,   "hasAttributes": false },
    { "name": "i",      "hasContent": true,     "topLevel": false,  "hasAttributes": false },
    { "name": "color",  "hasContent": true,     "topLevel": false,  "hasAttributes": true  },
];

function getTag(tagName: string) {
    for (let i = 0; i < tags.length; ++i) {
        if (tags[i].name == tagName) return tags[i];
    }
}

// // // // // // // // // // // // // // // // // // // // // // // // //
// LEXING



class TextParseState {
    text: string;
    pos: number;

    constructor(text: string) {
        this.text = text;
        this.pos = 0;
    }

    end() {
        return this.pos >= this.text.length;
    }
    here() {
        if (this.end()) return 0;
        return this.text[this.pos];
    }
    advance() {
        if (!this.end()) ++this.pos;
    }
};

function parseSourceText(sourceText: string, results:ResultData) {
    const state = new TextParseState(sourceText);
    const nodes:Array<NodeData> = [];
    if (state.end()) return nodes;

    while (!state.end()) {
        if (state.here() === "[") {
            state.advance();
            const start = state.pos;
            while (!state.end() && state.here() != ']') {
                state.advance();
            }
            const end = state.pos;
            state.advance();
            const node:NodeData = {
                type: TextTokenType.End,
                text: ""
            };
            const nodetext = state.text.substring(start, end);
            if (nodetext[0] === "/")    node.type = TextTokenType.TagEnd;
            else                        node.type = TextTokenType.Tag;
            node.text = nodetext;
            nodes.push(node);
        } else if (state.here() == '\n') {
            state.advance();
            nodes.push({"type": TextTokenType.Paragraph, "text": ""});
        } else {
            const start = state.pos;
            while (!state.end() && state.here() != '\n' && state.here() != '[') {
                state.advance();
            }
            const end = state.pos;
            const node:NodeData = {
                type: TextTokenType.Text,
                text: state.text.substring(start, end)
            };
            nodes.push(node);
        }
    }

    return nodes;
}

// // // // // // // // // // // // // // // // // // // // // // // // //
// PARSING


class TextBuildState {
    tokens: Array<NodeData>;
    pos: number;

    constructor(tokens: Array<NodeData>) {
        this.tokens = tokens;
        this.pos = 0;
    }
    end() {
        return this.pos >= this.tokens.length;
    }
    here() {
        if (this.end()) return {"type":TextTokenType.End, "text":""};
        return this.tokens[this.pos];
    }
    advance() {
        if (!this.end()) ++this.pos;
    }
};

class TextNode {
    type: TextNodeType;
    text: string;
    tagInfo: TagData | undefined;
    attributes: Array<string>;
    children: Array<TextNode>;

    constructor() {
        this.type = TextNodeType.Text;
        this.text = "";
        this.tagInfo = undefined;
        this.attributes = [];
        this.children = [];
    }
    add(textNode: TextNode) {
        if (textNode) this.children.push(textNode);
    }
    addParagraph() {
        if (this.children.length === 0) return;
        if (this.children[this.children.length - 1].type == TextNodeType.Paragraph) return;
        const newNode = new TextNode();
        newNode.type = TextNodeType.Paragraph;
        this.children.push(newNode);
    }
};

class DArray {
    arr: Array<TextNode>;

    constructor() {
        this.arr = [];
    }
    empty() {
        return this.arr.length === 0;
    }
    push(value: TextNode) {
        this.arr.push(value);
    }
    top() {
        if (this.arr.length === 0) return undefined;
        return this.arr[this.arr.length - 1];
    }
    pop() {
        if (this.arr.length === 0) return undefined;
        return this.arr.pop();
    }
};


function buildParseTree(tokens:Array<NodeData>, results:ResultData) {
    const state = new TextBuildState(tokens);
    const root = new TextNode();
    root.type = TextNodeType.Root;

    const parent = new DArray();
    parent.push(root);
    const tags = new DArray();

    while (!state.end()) {
        const parentTop = parent.top();
        if (!parentTop) break;
        if (state.here().type == TextTokenType.Text) {
            const newNode = new TextNode();
            newNode.type = TextNodeType.Text;
            newNode.text = state.here().text;
            parentTop.add(newNode);
        } else if (state.here().type == TextTokenType.Paragraph) {
            if (!tags.empty()) results.errors.push("Paragraph break may only occur at top level.");
            parentTop.addParagraph();
        } else if (state.here().type == TextTokenType.Tag) {
            const parts = state.here().text.split(" ");
            if (parts.length > 0) {
                const tag = getTag(parts[0]);
                if (tag && tag.name !== "") {
                    if (tag.topLevel) {
                        if (!tags.empty()) {
                            results.errors.push("Tag " + tag.name + " may only occur at top level.");
                        }
                        parentTop.addParagraph();
                    }

                    const newNode = new TextNode();
                    newNode.type = TextNodeType.Tag;
                    newNode.text = tag.name;
                    newNode.tagInfo = tag;
                    if (parts.length > 1) {
                        if (tag.hasAttributes) {
                            parts.shift();
                            newNode.attributes = parts;
                        } else {
                            results.errors.push("Tag " + tag.name + " does not take attributes.");
                        }
                    }
                    parentTop.add(newNode);

                    if (tag.topLevel) parentTop.addParagraph();
                    if (tag.hasContent) {
                        tags.push(newNode);
                        parent.push(newNode);
                    }
                } else {
                    results.errors.push("Unknown tag " + parts[0] + ".");
                }
            } else {
                results.errors.push("Empty tag name.");
            }
        } else if (state.here().type == TextTokenType.TagEnd) {
            if (tags.empty()) results.errors.push("Orphan closing tag.");
            else {
                const tagName = state.here().text.substring(1);
                const tagsTop = tags.top();
                if (tagsTop && tagName !== tagsTop.text) {
                    results.errors.push("Close tag " + tagName + " does not match opening tag " + tagsTop.text + ".");
                } else {
                    parent.pop();
                    tags.pop();
                }
            }
        }
        state.advance();
    }

    if (!tags.empty()) {
        tags.arr.forEach(function(tag) {
            results.errors.push("Tag " + tag.text + " not closed.");
        });
    }

    return root;
}

const validColourList = [ "red", "green", "yellow", "blue", "magenta", "cyan", "default"];
Object.freeze(validColourList);
function formatAsText(root: TextNode, results: ResultData) {
    let text: Array<string> = [];
    if (!root) {
        results.errors.push("Null parse tree.");
        return [];
    }

    switch(root.type) {
        case TextNodeType.Root:
            if (root.children.length <= 0) break;
            while (root.children[root.children.length-1].type == TextNodeType.Paragraph) {
                root.children.pop();
            }
            text.push("<p>");
            break;
        case TextNodeType.Paragraph:
            text.push("<p>");
            break;
        case TextNodeType.Text:
            text.push(root.text);
            break;
        case TextNodeType.Tag:
            if (root.text === "br") text.push("<br>");
            else if (root.text === "hr") text.push("<hr>");
            else if (root.text === "b") text.push("<b>");
            else if (root.text === "i") text.push("<i>");
            else if (root.text === "color") {
                if (root.attributes.length === 0) results.errors.push("Color tag requires name of color.");
                else if (root.attributes.length > 1) results.errors.push("Too many arguments to color tag.");
                else {
                    const colourName = root.attributes[0];
                    if (validColourList.indexOf(colourName) !== -1) {
                        text.push("<span class='textcol-");
                        text.push(colourName);
                        text.push("'>");
                    } else {
                        results.errors.push("Not a valid color: " + colourName + ".");
                    }
                }
            }
            break;
    }

    root.children.forEach(function(node) {
        const arr = formatAsText(node, results);
        text = text.concat(arr);
    });

    if (root.type == TextNodeType.Tag) {
        if (root.text === "b") text.push("</b>");
        else if (root.text === "i") text.push("</i>");
        else if (root.text === "color") text.push("</span>");
    }

    return text;
}
