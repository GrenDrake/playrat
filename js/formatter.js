
(function() {
    "use strict";

    G.formatter = function formatter(sourceText) {
        const results = { "errors": [] };
        const tokens = parseSourceText(sourceText, results);
        const root = buildParseTree(tokens, results);
        results.text = formatAsText(root, results).join("");
        return results;
    }

    // // // // // // // // // // // // // // // // // // // // // // // // //
    // TAG DEFINITIONS

    const tags = [
        { "name": "b",      "hasContent": true,     "topLevel": false,  "hasAttributes": false },
        { "name": "br",     "hasContent": false,    "topLevel": false,  "hasAttributes": false },
        { "name": "hr",     "hasContent": false,    "topLevel": true,   "hasAttributes": false },
        { "name": "i",      "hasContent": true,     "topLevel": false,  "hasAttributes": false },
        { "name": "color",  "hasContent": true,     "topLevel": false,  "hasAttributes": true  },
    ];

    function getTag(tagName) {
        for (let i = 0; i < tags.length; ++i) {
            if (tags[i].name == tagName) return tags[i];
        }
    }

    // // // // // // // // // // // // // // // // // // // // // // // // //
    // LEXING

    const TextTokenType = {
        Text: 0,
        Paragraph: 1,
        Tag: 2,
        TagEnd: 3,
        End: 99
    };
    Object.freeze(TextTokenType);

    function TextParseState(text) {
        this.text = text;
        this.pos = 0;
    }
    TextParseState.prototype.end = function() {
        return this.pos >= this.text.length;
    }
    TextParseState.prototype.here = function() {
        if (this.end()) return 0;
        return this.text[this.pos];
    }
    TextParseState.prototype.advance = function() {
        if (!this.end()) ++this.pos;
    }

    function parseSourceText(sourceText, results) {
        const state = new TextParseState(sourceText);
        const nodes = [];
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
                const node = {};
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
                const node = {};
                node.type = TextTokenType.Text;
                node.text = state.text.substring(start, end);
                nodes.push(node);
            }
        }

        return nodes;
    }

    // // // // // // // // // // // // // // // // // // // // // // // // //
    // PARSING

    const TextNodeType = {
        Root: 0,
        Text: 1,
        Tag: 2,
        Paragraph: 3,
    };
    Object.freeze(TextNodeType);

    function TextBuildState(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }
    TextBuildState.prototype.end = function() {
        return this.pos >= this.tokens.length;
    }
    TextBuildState.prototype.here = function() {
        if (this.end()) return {"type":TextTokenType.End, "text":""};
        return this.tokens[this.pos];
    }
    TextBuildState.prototype.advance = function() {
        if (!this.end()) ++this.pos;
    }

    function TextNode() {
        this.type = TextNodeType.Text;
        this.text = "";
        this.tagInfo = undefined;
        this.attributes = [];
        this.children = [];
    }
    TextNode.prototype.add = function(textNode) {
        if (textNode) this.children.push(textNode);
    }
    TextNode.prototype.addParagraph = function() {
        if (this.children.length === 0) return;
        if (this.children[this.children.length - 1].type == TextNodeType.Paragraph) return;
        const newNode = new TextNode();
        newNode.type = TextNodeType.Paragraph;
        this.children.push(newNode);
    }

    function DArray() {
        this.arr = [];
    }
    DArray.prototype.empty = function() {
        return this.arr.length === 0;
    }
    DArray.prototype.push = function(value) {
        this.arr.push(value);
    }
    DArray.prototype.top = function() {
        if (this.arr.length === 0) return undefined;
        return this.arr[this.arr.length - 1];
    }
    DArray.prototype.pop = function() {
        if (this.arr.length === 0) return undefined;
        return this.arr.pop();
    }


    function buildParseTree(tokens, results) {
        const state = new TextBuildState(tokens);
        const root = new TextNode();
        root.type = TextNodeType.Root;

        const parent = new DArray();
        parent.push(root);
        const tags = new DArray();

        while (!state.end()) {
            if (state.here().type == TextTokenType.Text) {
                const newNode = new TextNode();
                newNode.type = TextNodeType.Text;
                newNode.text = state.here().text;
                parent.top().add(newNode);
            } else if (state.here().type == TextTokenType.Paragraph) {
                if (!tags.empty()) results.errors.push("Paragraph break may only occur at top level.");
                parent.top().addParagraph();
            } else if (state.here().type == TextTokenType.Tag) {
                const parts = state.here().text.split(" ");
                if (parts.length > 0) {
                    const tag = getTag(parts[0]);
                    if (tag.name !== "") {
                        if (tag.topLevel) {
                            if (!tags.empty()) {
                                results.errors.push("Tag " + tag.name + " may only occur at top level.");
                            }
                            parent.top().addParagraph();
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
                        parent.top().add(newNode);

                        if (tag.topLevel) parent.top().addParagraph();
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
                    if (tagName !== tags.top().text) {
                        results.errors.push("Close tag " + tagName + " does not match opening tag " + tags.top().text + ".");
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
    function formatAsText(root, results) {
        let text = [];
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
})();
