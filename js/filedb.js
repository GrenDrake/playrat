(function() {
    "use strict";

    G.fileIndexName = "quollvm_file_index";
    G.filePrefix = "quollvm_file_";

    G.getFileIndex = function getFileIndex() {
        const index = JSON.parse(localStorage.getItem(G.fileIndexName));
        if (index) return index;
        return {};
    }

    G.saveFileIndex = function saveFileIndex(newIndex) {
        localStorage.setItem(G.fileIndexName, JSON.stringify(newIndex));
    }

    G.getFile = function getFile(fileName, gameId) {
        const key = G.getKey(fileName, gameId);
        const fileIndex = G.getFileIndex();
        if (!fileIndex.hasOwnProperty(key)) return undefined;
        const fileRecord = fileIndex[key];
        fileRecord.file = localStorage.getItem(key);
        return fileRecord;
    }

    G.getKey = function getFile(fileName, gameId) {
        return G.filePrefix + fileName + "_" + gameId;
    }

    G.saveFile = function saveFile(fileName, fileGame, fileData) {
        const key = G.getKey(fileName, fileGame);
        localStorage.setItem(key, fileData);

        const fileIndex = G.getFileIndex();
        fileIndex[key] = {"name":fileName, "gameid":fileGame, "timestamp":Date.now()};
        G.saveFileIndex(fileIndex);
    }

    G.deleteFile = function deleteFile(fileName, gameId) {
        const fileKey = G.getKey(fileName, gameId);
        const fileIndex = G.getFileIndex();
        if (!fileIndex.hasOwnProperty(fileKey)) return;
        fileIndex[fileKey] = undefined;
        G.saveFileIndex(fileIndex);
        localStorage.removeItem(fileKey);
    }

    G.decodeData = function decodeData(rawStr) {
        const str = atob(rawStr);
        let realLength = str.length;
        while (realLength % 4) ++realLength;
        const rawArray = new ArrayBuffer(realLength);
        const arr = new DataView(rawArray);
        for (let i = 0; i < str.length; ++i) {
            arr.setUint8(i, str.codePointAt(i));
        }
        return arr;
    }

    G.encodeData = function encodeData(arr) {
        const strArr = [];
        for (let i = 0; i < arr.byteLength; ++i) {
            const v = String.fromCodePoint(arr.getUint8(i));
            strArr.push(v);
        }
        return btoa(strArr.join(""));
    }
})();
