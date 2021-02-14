import { getFileIndex, getFile, saveFile, deleteFile } from "./filesystem.js";

interface HTMLFileButton extends HTMLButtonElement {
    fileIndex: string;
    fileId: string;
};

const eEditorFrame  = document.getElementById("editorFrame");
const eFileName     = (document.getElementById("filename") as HTMLFormElement);
const eFileGameId   = (document.getElementById("filegameid") as HTMLFormElement);
const eEditor       = (document.getElementById("fileeditor") as HTMLFormElement);
const eNewButton    = document.getElementById("newfile");
const eSaveButton   = (document.getElementById("saveFile") as HTMLFileButton);
const eCancelButton = document.getElementById("cancelFile");


function breakBase64(text:string) {
    let result = text.replace(/\n/g, "");
    for (let i = 79; i < result.length; i += 80) {
        result = result.slice(0, i) + "\n" + result.slice(i);
    }
    return result;
}

function updateFileList() {
    const eFilelist = document.getElementById("filelist");
    if (!eFilelist) return;
    const headers = document.getElementById("filelistheader");
    if (!headers) return;

    while (eFilelist.firstChild) {
        eFilelist.removeChild(eFilelist.firstChild);
    }
    eFilelist.append(headers);

    const fileIndex = getFileIndex();
    fileIndex.forEach(function(row) {
        const eFileRow = document.createElement("tr");
        const eFileName = document.createElement("td");
        eFileName.textContent = row.name;
        const eFileId = document.createElement("td");
        eFileId.textContent = row.gameid;
        const eFileModified = document.createElement("td");
        eFileModified.textContent = (new Date(row.timestamp)).toLocaleString();
        const eFileControls = document.createElement("td");

        const eEditButton = (document.createElement("button") as HTMLFileButton);
        eEditButton.textContent = "Edit";
        eEditButton.fileIndex = row.name;
        eEditButton.fileId = row.gameid;
        eEditButton.addEventListener("click", editHandler);
        const eDeleteButton = (document.createElement("button") as HTMLFileButton);
        eDeleteButton.textContent = "Delete";
        eDeleteButton.fileIndex = row.name;
        eDeleteButton.fileId = row.gameid;
        eDeleteButton.addEventListener("click", deleteHandler);

        eFileControls.append(eEditButton, eDeleteButton);
        eFileRow.append(eFileName, eFileId, eFileModified, eFileControls);
        eFilelist.append(eFileRow);
    });
}
/* ************************************************************************
************************************************************************
************************************************************************ */

function deleteHandler(forElem:MouseEvent) {
    const fileKey = (forElem.target as HTMLFileButton).fileIndex;
    const fileId = (forElem.target as HTMLFileButton).fileId;
    const file = getFile(fileKey);
    if (file && confirm("Are you sure you want to delete \"" + file.name + "\"?")) {
        deleteFile(fileKey);
        updateFileList();
    }
}

function editHandler(forElem:MouseEvent) {
    const fileKey = (forElem.target as HTMLFileButton).fileIndex;
    const fileId = (forElem.target as HTMLFileButton).fileId;
    const fileInfo = getFile(fileKey);
    if (!fileInfo) return;
    eFileName.value = fileInfo.name;
    eFileGameId.value = fileInfo.gameid;

    if (fileInfo.file) eEditor.value = breakBase64(fileInfo.file);
    eSaveButton.fileIndex = fileKey;
    eSaveButton.fileId = fileId;
    if (eEditorFrame) eEditorFrame.style.display = "block";
}

function saveHandler(forElem:MouseEvent) {
    const fileKey = (forElem.target as HTMLFileButton).fileIndex;
    if (!fileKey) return;
    const fileData = eEditor.value.replace("\n", "");
    saveFile(eFileName.value, eFileGameId.value, fileData);
    if (eFileName.value !== fileKey) deleteFile(fileKey);
    updateFileList();
}

function cancelHandler() {
    eSaveButton.fileIndex = "";
    if (eEditorFrame) eEditorFrame.style.display = "none";
}

function newHandler() {
    saveFile("New File", "unknown", "unknown");
    updateFileList();
}



function resetFileList() {
    localStorage.clear();
    let key = undefined;
    key = saveFile("Great File", "5B56C550-A391-40FF-85BD-D8144396D701", "TG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIG1hZ25hIGRpc3NlbnRpdW50IG1lbCBpZCwgcGVyIHNjcmlwdGEgaW52ZW5pcmUgbm8uIEVpIG5hbSBpbGx1bSBhZG1vZHVtLCBkdW8gZXQgaWxsdWQgZmFjZXRlLiBDdW0gY3UgdXRhbXVyIGVxdWlkZW0gZWxlaWZlbmQuIEV0IG5vbnVteSBub3N0cm8gaW5jb3JydXB0ZSB1c3UsIGVpIGVmZmljaWVuZGkgcmVmb3JtaWRhbnMgZHVvLiBRdW8gcG9zdGVhIHBlcnNlY3V0aSB0ZS4=");
    key = saveFile("Other File", "5B56C550-A391-40FF-85BD-D8144396D701", "SXVzIHJlcXVlIGVwaWN1cmVpIGVpLiBNZWkgbXVuZXJlIGxhYml0dXIgY2V0ZXJvcyBlYSwgcHJvIGxvYm9ydGlzIG1vZGVyYXRpdXMgZXQuIEFkIG1hbGlzIHNhbHV0YW5kaSBjb25zZWN0ZXR1ZXIgbmVjLiBJcHN1bSBtYWxpcyBxdW8gY3UuIFRyYWN0YXRvcyBkZXRlcnJ1aXNzZXQgaW4gZXVtLCBlc3QgaWQgdmVyaSB2ZXJ0ZXJlbSBldmVydGl0dXIu");
    key = saveFile("Third One", "1643809", "Tm8gbWVsIHBlcnNpdXMgaG9uZXN0YXRpcywgaXVzIGlkIG5vbnVtZXMgZXhwZXRlbmRhLiBJbGx1bSBtYWllc3RhdGlzIGVpIG1lbCwgZmFsbGkgbm9udW15IG1lYSB0ZS4gSW4gdXN1IHRpYmlxdWUgbmVnbGVnZW50dXIsIGVzdCBpZCBkb21pbmcgcHV0ZW50IG1lbGl1cy4gQXBwYXJlYXQgbWVkaW9jcmVtIHNjcmlwdG9yZW0gaWQgZXN0LiBBdHF1aSBzYWVwZSB2aXMgZWEsIHZlcml0dXMgYW50aW9wYW0gc3VzY2lwaWFudHVyIGFkIGhpcy4=");

    updateFileList();
    cancelHandler();
}


function startup() {
    eEditor.value = "";
    if (eNewButton)     eNewButton.addEventListener("click", newHandler);
    if (eSaveButton)    eSaveButton.addEventListener("click", saveHandler);
    if (eCancelButton)  eCancelButton.addEventListener("click", cancelHandler);

    updateFileList();
}

window.addEventListener("load", startup);
