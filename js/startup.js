(function() {
    "use strict";
// ////////////////////////////////////////////////////////////////////////////
// UI Code
// ////////////////////////////////////////////////////////////////////////////
    G.UI.showSettings = function showSettings() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "block";
        const settingsDialog = document.getElementById("settings");
        settingsDialog.style.display = "block";

        G.UI.inDialog = {id:"settings",close:G.UI.closeSettings, allowSpace:false};
        document.getElementById("limitWidth").checked = document.getElementById("contentArea").classList.contains("limitWidth");
        document.getElementById("showEventDuration").checked = G.showEventDuration;
        document.getElementById("showOperationsCount").checked = G.showOperationsCount;
        document.getElementById("showGarbageCollectionDuration").checked = G.showGarbageCollectionDuration;
    };

    G.UI.closeSettings = function closeSettings() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "none";
        const settingsDialog = document.getElementById("settings");
        settingsDialog.style.display = "none";

        const results = {
            limitWidth: document.getElementById("limitWidth").checked,
            showEventDuration: document.getElementById("showEventDuration").checked,
            showOperationsCount: document.getElementById("showOperationsCount").checked,
            showGarbageCollectionDuration: document.getElementById("showGarbageCollectionDuration").checked,
        };
        G.UI.inDialog = false;
        localStorage["gtrpge_options"] = JSON.stringify(results);
        G.UI.applySettings();
    }

    G.UI.applySettings = function applySettings() {
        const rawResults = localStorage.getItem("gtrpge_options");
        if (rawResults) {
            const results = JSON.parse(rawResults);
            document.getElementById("contentArea").classList.toggle("limitWidth", results.limitWidth);
            G.showEventDuration = results.showEventDuration;
            G.showOperationsCount = results.showOperationsCount;
            G.showGarbageCollectionDuration = results.showGarbageCollectionDuration;
        }
    }

    G.UI.showCredits = function showCredits() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "block";
        const settingsDialog = document.getElementById("creditsWindow");
        settingsDialog.style.display = "block";
        G.UI.inDialog = {id:"creditsWindow", close:G.UI.closeCredits, allowSpace:true};
    };

    G.UI.closeCredits = function closeCredits() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "none";
        const settingsDialog = document.getElementById("creditsWindow");
        settingsDialog.style.display = "none";
        G.UI.inDialog = false;
    }

    G.UI.doConfirm = function doConfirm(prompt, onYes) {
        if (confirm(prompt)) {
            onYes();
        }
    }

// ////////////////////////////////////////////////////////////////////////////
// Engine Startup Code
// ////////////////////////////////////////////////////////////////////////////
    window.addEventListener("load", function() {
        if (typeof QUnit !== "undefined") return;
        var error = false;

        G.eOutput = document.getElementById("text");
        G.eTopLeft = document.getElementById("top-left");
        G.eTopRight = document.getElementById("top-right");
        G.eBottomLeft = document.getElementById("bottom-left");
        G.eBottomRight = document.getElementById("bottom-right");
        G.eButtons = document.getElementById("bottom-centre");
        G.eSaveButton = document.getElementById("saveButton");
        G.eNoSaveButton = document.getElementById("nosaveButton");

        if (!G.eOutput)         { error = true; this.console.error("Failed to find output area."); }
        if (!G.eTopLeft)        { error = true; this.console.error("Failed to find left header."); }
        if (!G.eTopRight)       { error = true; this.console.error("Failed to find right header."); }
        if (!G.eBottomLeft)     { error = true; this.console.error("Failed to find left footer."); }
        if (!G.eBottomRight)    { error = true; this.console.error("Failed to find right footer."); }
        if (!G.eButtons)        { error = true; this.console.error("Failed to find buttons area."); }
        if (!G.eSaveButton)     { error = true; this.console.error("Failed to find enabled save button."); }
        if (!G.eNoSaveButton)   { error = true; this.console.error("Failed to find disabled save button."); }

        if (error) return;

        document.getElementById("settingsButton")
            .addEventListener("click", G.UI.showSettings);
        document.getElementById("closeSettings")
            .addEventListener("click", G.UI.closeSettings);
        document.getElementById("creditsButton")
            .addEventListener("click", G.UI.showCredits);
        document.getElementById("closeCredits")
            .addEventListener("click", G.UI.closeCredits);
        document.getElementById("newButton")
            .addEventListener("click", function() {
            G.UI.doConfirm("Are you sure you want to start a new game?", G.newGame); });
        document.getElementById("loadButton")
            .addEventListener("click", function() {
            G.UI.doConfirm("Are you sure you want to start a load the saved game?", G.loadGame); });
        G.eNoSaveButton.addEventListener("click", function() {
            alert("You cannot save the game at this time.");
        });
        G.eSaveButton.addEventListener("click", G.saveGame);

        G.UI.applySettings();

        var loadGameData = new XMLHttpRequest();
        loadGameData.addEventListener("load", G.parseGameFile);
        loadGameData.addEventListener("error", failedToLoadGameData);
        loadGameData.addEventListener("abort", failedToLoadGameData);
        loadGameData.open("GET", "./game.bin");
        loadGameData.responseType = "arraybuffer";
        loadGameData.send();

        window.addEventListener("keydown", G.keyPressHandler);
    })

    function failedToLoadGameData(event) {
        G.eOutput.innerHTML += "<div class='error'>[Failed to load game data.]</div>";
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
        G.propInternalName = gamedataSrc.getUint8(12);
        G.propIdent = gamedataSrc.getUint8(13);
        G.propSave = gamedataSrc.getUint8(14);
        G.propLoad = gamedataSrc.getUint8(15);

        ///////////////////////////////////////////////////////////////////////
        // Read strings from datafile
        var filePos = 64;
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
            G.raw.lists.push(thisList);
        }

        ///////////////////////////////////////////////////////////////////////
        // Read maps from datafile
        G.mapCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
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
            G.raw.maps.push(thisMap);
        }

        ///////////////////////////////////////////////////////////////////////
        // Read game objects from datafile
        G.objectCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
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
            G.raw.objects.push(thisObject);
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

        ///////////////////////////////////////////////////////////////////////
        // Store the none value for ease of use
        G.noneValue = new G.Value(G.ValueType.None, 0);

        ///////////////////////////////////////////////////////////////////////
        // Start the game running
        G.newGame();
    }

    G.newGame = function newGame(callMain) {
        callMain = callMain || true;
        G.setInfo(G.Info.LeftHeader, "Untitled Game");
        G.setInfo(G.Info.LeftHeader, "");
        G.setInfo(G.Info.RightHeader, "");
        G.setInfo(G.Info.Footer, "");

        G.gameLoaded = false;
        G.strings.length = G.stringCount;
        G.inPage = false;
        G.pages = {};
        const pageButtons = document.getElementsByClassName("pageButton");
        while (pageButtons.length > 0) {
            pageButtons[0].parentElement.removeChild(pageButtons[0]);
        }

        G.lists = [ undefined ];
        G.raw.lists.forEach(function(oldList) {
            const newList = [];
            oldList.forEach(function(value) {
                newList.push(value.clone());
            });
            G.lists.push({data:newList});
        });

        G.maps = [ undefined ];
        G.raw.maps.forEach(function(oldMap) {
            const newMap = [];
            const mapKeys = Object.getOwnPropertyNames(oldMap);
            mapKeys.forEach(function(key) {
                newMap[key] = oldMap[key].clone();
            });
            G.maps.push({data:newMap});
        });

        G.objects = [ undefined ];
        G.raw.objects.forEach(function(oldObject) {
            const newObject = [];
            const objectProperties = Object.getOwnPropertyNames(oldObject);
            objectProperties.forEach(function(propId) {
                newObject[propId] = oldObject[propId].clone();
            });
            G.objects.push({data:newObject});
        });

        G.gameLoaded = true;
        if (callMain) G.doEvent(G.mainFunction, [new G.Value(G.ValueType.Integer, G.StartupSource.NewGame)]);
    }

    G.saveGame = function saveGame() {
        if (!G.saveAllowed) {
            alert("You cannot save the game at this time.");
            return;
        }

        const saveData = {
            data: {},
        };
        G.objects.forEach(function(theObject, objId) {
            if (!theObject)                             return;
            theObject = theObject.data;
            if (!theObject.hasOwnProperty(G.propIdent)) return;
            if (!theObject.hasOwnProperty(G.propSave))  return;
            const myIdent = theObject[G.propIdent];
            const saveList = G.makeNew(G.ValueType.List);
            try {
                G.callFunction(G, new G.Value(G.ValueType.Object, objId), theObject[G.propSave], [saveList]);
            } catch (error) {
                if (!(error instanceof G.RuntimeError))    throw error;
                alert("An error occured while saving. Check JavaScript console for details.");
                console.error(G.callStack.toString());
                throw new G.RuntimeError("An error occured while saving Object " + objId);
            }
            saveData.data[myIdent.value] = G.lists[saveList.value].data;
        });

        const saveDataStr = JSON.stringify(saveData);
        localStorage.setItem("savegame", saveDataStr);
        console.log(saveDataStr);
        G.setInfo(G.Info.Status, "Game saved.");
    }

    G.loadGame = function loadGame() {
        const loadDataStr = localStorage.getItem("savegame");
        if (!loadDataStr) {
            alert("No saved game to load!");
            return;
        }
        G.newGame();
        const loadData = JSON.parse(loadDataStr);
        const identList = Object.keys(loadData.data);
        const loadListValue = G.makeNew(G.ValueType.List);
        const loadList = G.lists[loadListValue.value].data;
        identList.forEach(function(ident) {
            const objectValue = G.objectByIdent(+ident);
            if (objectValue.type === G.ValueType.None) {
                console.warn("Could not find object with ident " + ident);
                return;
            }
            const theObject = G.objects[objectValue.value].data;
            if (!theObject.hasOwnProperty(G.propLoad)) {
                return;
            }

            loadList.length = 0;
            loadData.data[ident].forEach(function(data) {
                loadList.push(new G.Value(data.mType, data.mValue));
            });

            try {
                G.callFunction(G, objectValue, theObject[G.propLoad], [loadListValue]);
            } catch (error) {
                if (!(error instanceof G.RuntimeError))    throw error;
                alert("An error occured while loading. Check JavaScript console for details.");
                console.error(G.callStack.toString());
                throw new G.RuntimeError("An error occured while loading Object " + objId);
            }
        });

        G.doEvent(G.mainFunction, [new G.Value(G.ValueType.Integer, G.StartupSource.Restore)]);
        G.setInfo(G.Info.Status, "Game loaded.");
    }

})();