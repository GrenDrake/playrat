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
        localStorage["quollvm_options"] = JSON.stringify(results);
        G.UI.applySettings();
    }

    G.UI.applySettings = function applySettings() {
        const rawResults = localStorage.getItem("quollvm_options");
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

        if (!G.eOutput)         { error = true; this.console.error("Failed to find output area."); }
        if (!G.eTopLeft)        { error = true; this.console.error("Failed to find left header."); }
        if (!G.eTopRight)       { error = true; this.console.error("Failed to find right header."); }
        if (!G.eBottomLeft)     { error = true; this.console.error("Failed to find left footer."); }
        if (!G.eBottomRight)    { error = true; this.console.error("Failed to find right footer."); }
        if (!G.eButtons)        { error = true; this.console.error("Failed to find buttons area."); }

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

        document.getElementById("loadCancel")
            .addEventListener("click", G.UI.closeLoadDialog);
        document.getElementById("loadGameButton")
            .addEventListener("click", G.UI.pickLoadGame);

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
        loadGameData.addEventListener("load", loadedDataFile);
        loadGameData.addEventListener("progress", loadProgress);
        loadGameData.addEventListener("error", failedToLoadGameData);
        loadGameData.addEventListener("abort", failedToLoadGameData);

        let gameFile = G.gameDir + "game.qvm";
        if ("URLSearchParams" in window) {
            const args = new URLSearchParams(window.location.search);
            if (args.has("game")) {
                let newName = args.get("game");
                const valid = newName.match(/^[a-zA-Z0-9_]+$/) !== null;
                if (valid) {
                    gameFile = G.gameDir + newName + ".qvm";
                } else {
                    G.eOutput.innerHTML +=
                        "<div class='error'>[Game file not valid: "
                        + newName + ".]</div>";
                }
            }
        }

        loadGameData.open("GET", gameFile);
        loadGameData.responseType = "arraybuffer";
        loadGameData.send();

        window.addEventListener("keydown", G.keyPressHandler);
    })

    function loadProgress(event) {
        const eText = document.getElementById("loadingText");
        const eProgress = document.getElementById("loadingProgress");
        if (!eText || !eProgress) return;

        if (event.lengthComputable) {
            eText.innerHTML = "<p>Loading: " + Math.round(event.loaded / event.total * 100) + "%";
            eProgress.max = event.total;
            eProgress.value = event.loaded;
        } else {
            eText.innerHTML = "<p>Loading: " + event.loaded + " bytes";
        }
    }
    function failedToLoadGameData(event) {
        G.eOutput.innerHTML = "<div class='error'>[Failed to load game data.]</div>";
    }

    function loadedDataFile(event) {
        if (event.target.status !== 200) {
            G.eOutput.innerHTML
                = "<div class='error'>Failed to load game data: "
                + event.target.status + " "
                + event.target.statusText + "</div>";
            return;
        }
        G.rawSource = event.target.response;
        G.gamedataSrc = new DataView(G.rawSource);
        G.parseGameFile();
    }

// ////////////////////////////////////////////////////////////////////////////
// Game file parser
// ////////////////////////////////////////////////////////////////////////////
    G.parseGameFile = function parseGameFile(event) {
        ///////////////////////////////////////////////////////////////////////
        // Read header data from datafile
        G.magicNumber = G.gamedataSrc.getUint32(0, true);
        G.formatVersion = G.gamedataSrc.getUint32(4, true);
        G.mainFunction = G.gamedataSrc.getUint32(8, true);
        G.gamenameId = G.gamedataSrc.getUint32(16, true);
        G.authorId = G.gamedataSrc.getUint32(20, true);
        G.versionId = G.gamedataSrc.getUint32(24, true);
        G.gameId = G.gamedataSrc.getUint32(28, true);
        G.buildNumber = G.gamedataSrc.getUint32(32, true);

        ///////////////////////////////////////////////////////////////////////
        // Read strings from datafile
        var filePos = 64;
        G.stringCount = G.gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        const decoder = new TextDecoder('utf8');
        for (var i = 0; i < G.stringCount; ++i) {
            const stringLength = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const rawStringData = new Uint8Array(G.rawSource, filePos,
                                                 stringLength);
            for (let i = 0; i < stringLength; ++i) {
                rawStringData[i] ^= 0x7B;
            }
            filePos += stringLength;
            G.strings.push({data:decoder.decode(rawStringData)});
        }

        ///////////////////////////////////////////////////////////////////////
        // Read lists from datafile
        G.listCount = G.gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.lists.push(undefined);
        for (var i = 0; i < G.listCount; ++i) {
            const thisList = [];
            const sourceFileIdx = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const listSize = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < listSize; ++j) {
                const itemType = G.gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const itemValue = G.gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                thisList.push(new G.Value(itemType, itemValue));
            }
            G.lists.push({
                data: thisList,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read maps from datafile
        G.mapCount = G.gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.maps.push(undefined);
        for (var i = 0; i < G.mapCount; ++i) {
            const thisMap = {};
            const sourceFileIdx = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const mapSize = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < mapSize; ++j) {
                const item1Type = G.gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const item1Value = G.gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                const valueOne = new G.Value(item1Type, item1Value);

                const item2Type = G.gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const item2Value = G.gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                const valueTwo = new G.Value(item2Type, item2Value);

                thisMap[valueOne.toKey()] = valueTwo;
            }
            G.maps.push({
                data: thisMap,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read game objects from datafile
        G.objectCount = G.gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.objects.push(undefined);
        for (var i = 0; i < G.objectCount; ++i) {
            const thisObject = {};
            const sourceName = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceFileIdx = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            // thisObject.key = G.gamedataSrc.getUint32(filePos, true);
            const objectSize = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            for (var j = 0; j < objectSize; ++j) {
                const propId = G.gamedataSrc.getUint16(filePos, true);
                filePos += 2;
                const itemType = G.gamedataSrc.getUint8(filePos, true);
                filePos += 1;
                const itemValue = G.gamedataSrc.getInt32(filePos, true);
                filePos += 4;
                thisObject[propId] = new G.Value(itemType, itemValue);
            }
            G.objects.push({
                data: thisObject,
                sourceName: sourceName,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read function headers from datafile
        G.functionCount = G.gamedataSrc.getUint32(filePos, true);
        filePos += 4;
        G.functions.push(undefined);
        for (var i = 0; i < G.functionCount; ++i) {
            const sourceName = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceFileIdx = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const sourceLine = G.gamedataSrc.getInt32(filePos, true);
            filePos += 4;
            const argCount = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const localCount = G.gamedataSrc.getUint16(filePos, true);
            filePos += 2;
            const codePosition = G.gamedataSrc.getUint32(filePos, true);
            filePos += 4;
            G.functions.push({
                data: [argCount, localCount, codePosition],
                sourceName: sourceName,
                sourceFile: sourceFileIdx,
                sourceLine: sourceLine
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Read bytecode section from datafile
        G.bytecodeSize = G.gamedataSrc.getInt32(filePos, true);
        filePos += 4;
        G.bytecodeBuffer = G.rawSource.slice(filePos);
        G.bytecode = new DataView(G.bytecodeBuffer);

        ///////////////////////////////////////////////////////////////////////
        // Store the none value for ease of use
        G.noneValue = new G.Value(G.ValueType.None, 0);

        //////////////////////////////////////////////
        // Update the credits window
        const gameNameStr = G.getString(G.gamenameId);
        document.getElementById("gamename").textContent = gameNameStr;
        document.title = gameNameStr;
        document.getElementById("version").textContent = G.versionId;
        document.getElementById("authorline").textContent = G.getString(G.authorId);
        document.getElementById("gameid").textContent = G.getString(G.gameId);
        document.getElementById("buildnumber").textContent = "0x" + G.buildNumber.toString(16);

        ///////////////////////////////////////////////////////////////////////
        // Start the game running
        while (G.eOutput.childElementCount > 0) {
            G.eOutput.removeChild(G.eOutput.firstChild);
        }
        G.gameLoaded = true;
        G.doEvent();
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

    G.newGame = function newGame() {
        G.setSetting(G.Settings.InfobarLeft, "");
        G.setSetting(G.Settings.InfobarRight, "");
        G.setSetting(G.Settings.InfobarFooter, "");

        G.gameLoaded = false;
        G.strings.length = G.stringCount;
        G.inPage = false;
        G.pages = {};
        G.callStack = undefined;
        const pageButtons = document.getElementsByClassName("pageButton");
        while (pageButtons.length > 0) {
            pageButtons[0].parentElement.removeChild(pageButtons[0]);
        }

        G.parseGameFile();
    }
})();