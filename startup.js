
function gameDataLoaded(event) {
    var rawSource = event.target.response;
    var gameDataSrc = new DataView(rawSource);
    const gameData = {
        strings: {},
        objects: {},
        lists: {},
        maps: {},
        functions: {},
        gameLoaded: false
    };

    ///////////////////////////////////////////////////////////////////////////
    // Read header data from datafile
    gameData.magicNumber = gameDataSrc.getUint32(0, true);
    gameData.formatVersion = gameDataSrc.getUint32(4, true);
    gameData.mainFunction = gameDataSrc.getUint32(8, true);

    ///////////////////////////////////////////////////////////////////////////
    // Read strings from datafile
    var filePos = 12;
    gameData.stringCount = gameDataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < gameData.stringCount; ++i) {
        const stringLength = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        var stringData = "";
        const rawStringData = new Uint8Array(rawSource, filePos, stringLength);
        filePos += stringLength;
        for (var j = 0; j < stringLength; ++j) {
            const theString = String.fromCharCode.apply(null, rawStringData);
            gameData.strings[i] = theString;
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Read lists from datafile
    gameData.listCount = gameDataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < gameData.listCount; ++i) {
        const thisList = [];
        const key = gameDataSrc.getUint32(filePos, true);
        filePos += 4;
        const listSize = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < listSize; ++j) {
            const itemType = gameDataSrc.getUint8(filePos, true);
            filePos += 1;
            const itemValue = gameDataSrc.getInt32(filePos, true);
            filePos += 4;
            thisList.push([itemType, itemValue]);
        }
        gameData.lists[key] = thisList;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Read maps from datafile
    gameData.mapCount = gameDataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < gameData.mapCount; ++i) {
        const thisMap = {};
        const key = gameDataSrc.getUint32(filePos, true);
        filePos += 4;
        const mapSize = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < mapSize; ++j) {
            const item1Type = gameDataSrc.getUint8(filePos, true);
            filePos += 1;
            const item1Value = gameDataSrc.getInt32(filePos, true);
            filePos += 4;
            const item2Type = gameDataSrc.getUint8(filePos, true);
            filePos += 1;
            const item2Value = gameDataSrc.getInt32(filePos, true);
            filePos += 4;
            thisMap[[item1Type+"_"+item1Value]] = [item2Type,item2Value];
        }
        gameData.maps[key] = thisMap;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Read game objects from datafile
    gameData.objectCount = gameDataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < gameData.objectCount; ++i) {
        const thisObject = {};
        const key = gameDataSrc.getUint32(filePos, true);
        filePos += 4;
        const objectSize = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        for (var j = 0; j < objectSize; ++j) {
            const propId = gameDataSrc.getUint16(filePos, true);
            filePos += 2;
            const itemType = gameDataSrc.getUint8(filePos, true);
            filePos += 1;
            const itemValue = gameDataSrc.getInt32(filePos, true);
            filePos += 4;
            thisObject[propId] = [itemType, itemValue];
        }
        gameData.objects[key] = thisObject;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Read function headers from datafile
    gameData.functionCount = gameDataSrc.getUint32(filePos, true);
    filePos += 4;
    for (var i = 0; i < gameData.functionCount; ++i) {
        const thisFunction = {};
        const key = gameDataSrc.getUint32(filePos, true);
        filePos += 4;
        const argCount = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        const localCount = gameDataSrc.getUint16(filePos, true);
        filePos += 2;
        const codePosition = gameDataSrc.getUint32(filePos, true);
        filePos += 4;
        gameData.functions[key] = [argCount, localCount, codePosition];
    }

    ///////////////////////////////////////////////////////////////////////////
    // Read bytecode section from datafile
    gameData.bytecodeSize = gameDataSrc.getInt32(filePos, true);
    filePos += 4;
    gameData.bytecodeBuffer = rawSource.slice(filePos);
    gameData.bytecode = new DataView(gameData.bytecodeBuffer);

    console.log(gameData);

    gameData.gameLoaded = true;
    try {
        callFunction(gameData, gameData.mainFunction);
    } catch (error) {
        if (!(error instanceof RuntimeError))    throw error;
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML += "<div class='error'>[" + error + "]</div>";
    }
}

function failedToLoadGameData(event) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML += "<div class='error'>[Failed to load game data.]</div>";
}

window.addEventListener("load", function() {
    var loadGameData = new XMLHttpRequest();
    loadGameData.addEventListener("load", gameDataLoaded);
    loadGameData.addEventListener("error", failedToLoadGameData);
    loadGameData.addEventListener("abort", failedToLoadGameData);
    loadGameData.open("GET", "./game.bin");
    loadGameData.responseType = "arraybuffer";
    loadGameData.send();
})


