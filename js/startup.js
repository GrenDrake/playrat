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

    G.UI.doAlert = function doConfirm(message) {
        alert(message);
    }
    G.UI.doConfirm = function doConfirm(prompt, onYes) {
        if (confirm(prompt)) {
            onYes();
        }
    }

    G.UI.refreshSaveList = function refreshSaveList() {
        const savedGames = G.getSaveIndex();
        const saveList = document.getElementById("saveList");
        while (saveList.childElementCount > 0) {
            saveList.removeChild(saveList.firstChild);
        }
        savedGames.forEach(function(saveData, saveIndex) {
            const item = document.createElement("option");
            item.textContent = saveData.name;
            item.id = "savegamelist__" + saveIndex;
            saveList.appendChild(item);
        });
        if (saveList.childElementCount > 0) {
            saveList.options[0].selected = true;
        }
    }
    G.UI.showSaveGame = function showSaveGame() {
        document.getElementById("savegamename").value = "";
        G.UI.refreshSaveList();

        const overlay = document.getElementById("overlay");
        overlay.style.display = "block";
        const saveDialog = document.getElementById("saveDialog");
        saveDialog.style.display = "block";
        G.UI.inDialog = {id:"saveDialog", close:G.UI.closeSaveDialog, allowSpace:false};
    }
    G.UI.saveNewGame = function saveNewGame() {
        const savedGameName = document.getElementById("savegamename").value;
        if (!savedGameName) {
            G.UI.doAlert("Please name your saved game.");
            return;
        }
        const fileSaveName = savedGameName;
        G.saveGame([fileSaveName, -1]);
        G.UI.closeSaveDialog();
    }
    G.UI.overwriteSavedGame = function overwriteSavedGame() {
        const saveList = document.getElementById("saveList");
        const selected = saveList.selectedIndex;
        if (selected < 0) {
            G.UI.doAlert("Please select game to overwrite first.");
            return;
        }
        const fileSaveName = saveList.options[selected].textContent;
        G.UI.doConfirm("Overwrite game \""+fileSaveName+"\"?", function() {
            G.saveGame([fileSaveName, selected]);
            G.UI.closeSaveDialog();
        });
    }
    G.UI.deleteSavedGame = function deleteSavedGame() {
        const saveList = document.getElementById("saveList");
        const selected = saveList.selectedIndex;
        if (selected < 0) {
            G.UI.doAlert("Please select game to delete first.");
            return;
        }
        const fileSaveName = saveList.options[selected].textContent;
        G.UI.doConfirm("Permanently delete game \""+fileSaveName+"\"?", function() {
            const savedGames = G.getSaveIndex();
            const deletedGame = savedGames[selected];
            savedGames.splice(selected, 1);
            localStorage.removeItem("savedgame_" + deletedGame.index);
            G.saveSaveIndex(savedGames);
            G.UI.refreshSaveList();
        });
    }
    G.UI.closeSaveDialog = function closeSaveDialog() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "none";
        const saveDialog = document.getElementById("saveDialog");
        saveDialog.style.display = "none";
        G.UI.inDialog = undefined;
    }

    G.UI.showLoadGame = function showLoadGame() {
        document.getElementById("savegamename").value = "";
        const savedGames = G.getSaveIndex();

        const loadList = document.getElementById("loadList");
        while (loadList.childElementCount > 0) {
            loadList.removeChild(loadList.firstChild);
        }
        savedGames.forEach(function(saveData, saveIndex) {
            const item = document.createElement("option");
            item.textContent = saveData.name;
            item.id = "savegamelist__" + saveIndex;
            loadList.appendChild(item);
        });
        if (loadList.childElementCount > 0) {
            loadList.options[0].selected = true;
            if (loadList.childElementCount === 1) {
                G.UI.pickLoadGame();
                return;
            }
        } else {
            G.UI.doAlert("You do not have any saved games.");
            return;
        }

        const overlay = document.getElementById("overlay");
        overlay.style.display = "block";
        const loadDialog = document.getElementById("loadDialog");
        loadDialog.style.display = "block";
        G.UI.inDialog = {id:"loadDialog", close:G.UI.closeloadDialog, allowSpace:false};
    }
    G.UI.pickLoadGame = function pickLoadGame() {
        const loadList = document.getElementById("loadList");
        const selected = loadList.selectedIndex;
        if (selected < 0) {
            G.UI.doAlert("Please select game to load first.");
            return;
        }
        const fileSaveName = loadList.options[selected].textContent;
        G.UI.doConfirm("Abandon current game to load \""+fileSaveName+"\"?", function() {
            G.loadGame(selected);
            G.UI.closeLoadDialog();
        });
    }
    G.UI.closeLoadDialog = function closeLoadDialog() {
        const overlay = document.getElementById("overlay");
        overlay.style.display = "none";
        const saveDialog = document.getElementById("loadDialog");
        saveDialog.style.display = "none";
        G.UI.inDialog = undefined;
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
            .addEventListener("click", G.UI.showLoadGame);
        document.getElementById("loadCancel")
            .addEventListener("click", G.UI.closeLoadDialog);
        document.getElementById("loadGameButton")
            .addEventListener("click", G.UI.pickLoadGame);

        G.eNoSaveButton.addEventListener("click", function() {
            alert("You cannot save the game at this time.");
        });
        G.eSaveButton.addEventListener("click", G.UI.showSaveGame);
        document.getElementById("newSaveButton")
            .addEventListener("click", G.UI.saveNewGame);
        document.getElementById("overwriteSaveButton")
            .addEventListener("click", G.UI.overwriteSavedGame);
        document.getElementById("deleteSaveButton")
            .addEventListener("click", G.UI.deleteSavedGame);
        document.getElementById("saveCancel")
            .addEventListener("click", G.UI.closeSaveDialog);

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
            const sourceFileIdx = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const listSize = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < listSize; ++j) {
                const itemType = gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const itemValue = gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                thisList.push(new G.Value(itemType, itemValue));
            }
            G.raw.lists.push({
                data: thisList,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read maps from datafile
        G.mapCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        for (var i = 0; i < G.mapCount; ++i) {
            const thisMap = {};
            const sourceFileIdx = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
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
            G.raw.maps.push({
                data: thisMap,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read game objects from datafile
        G.objectCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        for (var i = 0; i < G.objectCount; ++i) {
            const thisObject = {};
            const sourceFileIdx = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
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
            G.raw.objects.push({
                data: thisObject,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read function headers from datafile
        G.functionCount = gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.functions.push(undefined);
        for (var i = 0; i < G.functionCount; ++i) {
            const sourceFileIdx = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const argCount = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const localCount = gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const codePosition = gamedataSrc.getUint32(filePos, true);
            filePos += 4;
            G.functions.push({
                data: [argCount, localCount, codePosition],
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
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

    G.getSaveIndex = function getSaveIndex() {
        let savedGames = [];
        let savedGameStr = localStorage.getItem("save_index");
        if (savedGameStr) savedGames = JSON.parse(savedGameStr);
        return savedGames;
    }
    G.saveSaveIndex = function saveSaveIndex(newIndex) {
        const saveIndex = JSON.stringify(newIndex);
        localStorage.setItem("save_index", saveIndex);
    }

    G.newGame = function newGame(callMain) {
        callMain = callMain || true;
        G.setSetting(G.Settings.InfobarLeft, "");
        G.setSetting(G.Settings.InfobarRight, "");
        G.setSetting(G.Settings.InfobarFooter, "");

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
            oldList.data.forEach(function(value) {
                newList.push(value.clone());
            });
            G.lists.push({
                data:newList,
                sourceFile: oldList.sourceFile,
                sourceLine: oldList.sourceLine
            });
        });

        G.maps = [ undefined ];
        G.raw.maps.forEach(function(oldMap) {
            const newMap = [];
            const mapKeys = Object.getOwnPropertyNames(oldMap.data);
            mapKeys.forEach(function(key) {
                newMap[key] = oldMap.data[key].clone();
            });
            G.maps.push({
                data: newMap,
                sourceFile: oldMap.sourceFile,
                sourceLine: oldMap.sourceLine
            });
        });

        G.objects = [ undefined ];
        G.raw.objects.forEach(function(oldObject) {
            const newObject = [];
            const objectProperties = Object.getOwnPropertyNames(oldObject.data);
            objectProperties.forEach(function(propId) {
                newObject[propId] = oldObject.data[propId].clone();
            });
            G.objects.push({
                data: newObject,
                sourceFile: oldObject.sourceFile,
                sourceLine: oldObject.sourceLine
            });
        });

        G.gameLoaded = true;
        if (callMain) G.doEvent(G.mainFunction, [new G.Value(G.ValueType.Integer, G.StartupSource.NewGame)]);
    }

    G.saveGame = function saveGame(saveInfo) {
        if (!G.saveAllowed) {
            alert("You cannot save the game at this time.");
            return;
        }

        const indexData = { name: saveInfo[0], ts: Date.now() };
        const saveIndex = G.getSaveIndex();
        if (saveInfo[1] < 0) {
            indexData.index = Date.now() + Math.random();
            saveInfo[1] = saveIndex.length;
        } else {
            indexData.index = saveIndex[saveInfo[1]].index;
        }
        saveIndex[saveInfo[1]] = indexData;
        saveIndex.sort(function(left, right) {
            return right.ts - left.ts;
        });
        const saveGameKey = "savedgame_" + indexData.index;

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
        G.saveSaveIndex(saveIndex);
        localStorage.setItem(saveGameKey, saveDataStr);
        G.setStatus("Game saved.");
    }

    G.loadGame = function loadGame(loadIndex) {
        const saveIndex = G.getSaveIndex();
        if (loadIndex < 0 || loadIndex >= saveIndex.length) {
            console.error("Tried to load invalid save index.");
            return;
        }
        const indexData = saveIndex[loadIndex];
        const saveGameKey = "savedgame_" + indexData.index;

        const loadDataStr = localStorage.getItem(saveGameKey);
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
        G.setStatus("Game loaded.");
    }

})();