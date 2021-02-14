// ////////////////////////////////////////////////////////////////////////////
// Virtual Filesystem Functions
// ////////////////////////////////////////////////////////////////////////////

const fileIndexName = "ratvm_file_index";
const filePrefix = "ratvm_file_";

interface SaveFileData {
    name: string;
    gameid: string;
    timestamp: number;
    file?: string;
};
type SaveFileIndex = Array<SaveFileData>;

export function getFileIndex(): SaveFileIndex {
    const raw = localStorage.getItem(fileIndexName);
    if (!raw) return [];
    const index = JSON.parse(raw);
    if (index) return index;
    return [];
}

export function saveFileIndex(newIndex:SaveFileIndex) {
    localStorage.setItem(fileIndexName, JSON.stringify(newIndex));
}

export function getFile(fileName:string) {
    const fileIndex = getFileIndex();
    let fileRecord:SaveFileData | undefined = undefined;
    for (let i = 0; i < fileIndex.length; ++i) {
        if (fileIndex[i].name === fileName) {
            fileRecord = fileIndex[i];
            break;
        }
    }
    if (!fileRecord) return undefined;
    const data = localStorage.getItem(filePrefix + fileName);
    if (data) fileRecord.file = data;
    return fileRecord;
}

export function saveFile(fileName:string, fileGame:string, fileData:string) {
    localStorage.setItem(filePrefix + fileName, fileData);
    const newFileMeta:SaveFileData = {
        "name":fileName,
        "gameid":fileGame,
        "timestamp":Date.now()
    };

    const fileIndex = getFileIndex();
    let exists = false;
    for (let i = 0; i < fileIndex.length; ++i) {
        if (fileIndex[i].name === fileName) {
            fileIndex[i] = newFileMeta;
            exists = true;
        }
    }
    if (!exists) fileIndex.push(newFileMeta);
    saveFileIndex(fileIndex);
}

export function deleteFile(fileName:string) {
    const fileIndex = getFileIndex();
    for (let i = 0; i < fileIndex.length; ++i) {
        if (fileIndex[i].name === fileName) {
            fileIndex.splice(i, 1);
            saveFileIndex(fileIndex);
            localStorage.removeItem(filePrefix + fileName);
            return;
        }
    }
}

export function decodeData(rawStr:string) {
    const str = atob(rawStr);
    let realLength = str.length;
    while (realLength % 4) ++realLength;
    const rawArray = new ArrayBuffer(realLength);
    const arr = new DataView(rawArray);
    for (let i = 0; i < str.length; ++i) {
        const cp = str.codePointAt(i);
        arr.setUint8(i, cp || 0);
    }
    return arr;
}

export function encodeData(arr:DataView) {
    const strArr = [];
    for (let i = 0; i < arr.byteLength; ++i) {
        const v = String.fromCodePoint(arr.getUint8(i));
        strArr.push(v);
    }
    return btoa(strArr.join(""));
}