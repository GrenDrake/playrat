const G = {};

(function() {
    "use strict";

    const eEditorFrame = document.getElementById("editorFrame");
    const eFileName = document.getElementById("filename");
    const eFileGameId = document.getElementById("filegameid");
    const eEditor = document.getElementById("fileeditor");
    const eNewButton = document.getElementById("newfile");
    const eSaveButton = document.getElementById("saveFile");
    const eCancelButton = document.getElementById("cancelFile");

    function breakBase64(text) {
        let result = text.replace(/\n/g, "");
        for (let i = 79; i < result.length; i += 80) {
            result = result.slice(0, i) + "\n" + result.slice(i);
        }
        return result;
    }

    function updateFileList() {
        const eFilelist = document.getElementById("filelist");
        const headers = document.getElementById("filelistheader");

        while (eFilelist.firstChild) {
            eFilelist.removeChild(eFilelist.firstChild);
        }
        eFilelist.append(headers);

        const fileIndex = G.getFileIndex();
        const fileList = Object.keys(fileIndex);

        fileList.forEach(function(fileName) {
            const row = fileIndex[fileName];

            const eFileRow = document.createElement("tr");
            const eFileName = document.createElement("td");
            eFileName.textContent = row.name;
            const eFileId = document.createElement("td");
            eFileId.textContent = row.gameid;
            const eFileModified = document.createElement("td");
            eFileModified.textContent = (new Date(row.timestamp)).toLocaleString();
            const eFileControls = document.createElement("td");

            const eEditButton = document.createElement("button");
            eEditButton.textContent = "Edit";
            eEditButton.fileIndex = row.name;
            eEditButton.fileId = row.gameid;
            eEditButton.addEventListener("click", editHandler);
            const eDeleteButton = document.createElement("button");
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

    function deleteHandler(forElem) {
        const fileKey = forElem.target.fileIndex;
        const fileId = forElem.target.fileId;
        const file = G.getFile(fileKey, fileId);
        if (confirm("Are you sure you want to delete \"" + file.name + "\"?")) {
            G.deleteFile(fileKey, fileId);
            updateFileList();
        }
    }

    function editHandler(forElem) {
        const fileKey = forElem.target.fileIndex;
        const fileId = forElem.target.fileId;
        const fileInfo = G.getFile(fileKey, fileId);
        eFileName.value = fileInfo.name;
        eFileGameId.value = fileInfo.gameid;

        eEditor.value = breakBase64(fileInfo.file);
        eSaveButton.fileIndex = fileKey;
        eSaveButton.fileId = fileId;
        eEditorFrame.style.display = "block";
    }

    function saveHandler(forElem) {
        const fileKey = forElem.target.fileIndex;
        if (!fileKey) return;
        const fileData = eEditor.value.replace("\n", "");
        G.saveFile(eFileName.value, eFileGameId.value, fileData);
        if (eFileName.value !== fileKey) G.deleteFile(fileKey, eFileGameId.value);
        updateFileList();
    }

    function cancelHandler(forElem) {
        eSaveButton.fileIndex = undefined;
        eEditorFrame.style.display = "none";
    }

    function newHandler() {
        G.saveFile("New File", "unknown", "unknown", "");
        updateFileList();
    }



    G.reset = function reset() {
        localStorage.clear();
        let key = undefined;
        key = G.saveFile("Great File", "5B56C550-A391-40FF-85BD-D8144396D701", "TG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIG1hZ25hIGRpc3NlbnRpdW50IG1lbCBpZCwgcGVyIHNjcmlwdGEgaW52ZW5pcmUgbm8uIEVpIG5hbSBpbGx1bSBhZG1vZHVtLCBkdW8gZXQgaWxsdWQgZmFjZXRlLiBDdW0gY3UgdXRhbXVyIGVxdWlkZW0gZWxlaWZlbmQuIEV0IG5vbnVteSBub3N0cm8gaW5jb3JydXB0ZSB1c3UsIGVpIGVmZmljaWVuZGkgcmVmb3JtaWRhbnMgZHVvLiBRdW8gcG9zdGVhIHBlcnNlY3V0aSB0ZS4=");
        key = G.saveFile("Other File", "5B56C550-A391-40FF-85BD-D8144396D701", "SXVzIHJlcXVlIGVwaWN1cmVpIGVpLiBNZWkgbXVuZXJlIGxhYml0dXIgY2V0ZXJvcyBlYSwgcHJvIGxvYm9ydGlzIG1vZGVyYXRpdXMgZXQuIEFkIG1hbGlzIHNhbHV0YW5kaSBjb25zZWN0ZXR1ZXIgbmVjLiBJcHN1bSBtYWxpcyBxdW8gY3UuIFRyYWN0YXRvcyBkZXRlcnJ1aXNzZXQgaW4gZXVtLCBlc3QgaWQgdmVyaSB2ZXJ0ZXJlbSBldmVydGl0dXIu");
        key = G.saveFile("Third One", "1643809", "Tm8gbWVsIHBlcnNpdXMgaG9uZXN0YXRpcywgaXVzIGlkIG5vbnVtZXMgZXhwZXRlbmRhLiBJbGx1bSBtYWllc3RhdGlzIGVpIG1lbCwgZmFsbGkgbm9udW15IG1lYSB0ZS4gSW4gdXN1IHRpYmlxdWUgbmVnbGVnZW50dXIsIGVzdCBpZCBkb21pbmcgcHV0ZW50IG1lbGl1cy4gQXBwYXJlYXQgbWVkaW9jcmVtIHNjcmlwdG9yZW0gaWQgZXN0LiBBdHF1aSBzYWVwZSB2aXMgZWEsIHZlcml0dXMgYW50aW9wYW0gc3VzY2lwaWFudHVyIGFkIGhpcy4=");

        updateFileList();
        cancelHandler();
    }


    function startup() {
        eEditor.value = "";
        eNewButton.addEventListener("click", newHandler);
        eSaveButton.addEventListener("click", saveHandler);
        eCancelButton.addEventListener("click", cancelHandler);

        updateFileList();
    }

    window.addEventListener("load", startup);
})();
