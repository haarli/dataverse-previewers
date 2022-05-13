
$(document).ready(function () {
    startPreview(false);
});

function translateBaseHtmlPage() {
    var zipViewerText = $.i18n("zipViewerText");
    $('.zipViewerText').text(zipViewerText);
}

async function writeContent(fileUrl, file, title, authors) {
    addStandardPreviewHeader(file, title, authors);
    readZip(fileUrl);



}


async function readZip(fileUrl) {
    //const url = 'https://s3.gwdg.de/prod-edmond-objstor-hdd/markus/test.zip';    
    //const url = 'http://localhost:8080/api/access/datafile/15426';     
    //const url ='https://prod-edmond-objstor-hdd.s3.gwdg.de/10.15771/3./DUMG88/180b789bd97-bdf8a52a9cdd?response-content-disposition=attachment%3B+filename*%3DUTF-8%27%27BalsacGallery.zip&response-content-type=application%2Fzip&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20220512T091920Z&X-Amz-SignedHeaders=host&X-Amz-Expires=86400&X-Amz-Credential=EXO9K6TK51E5WUPNNVJ3%2F20220512%2Fdataverse%2Fs3%2Faws4_request&X-Amz-Signature=60e75aff6ccfb175e452f55d58aee06daa23118fa398b71d622ec305991aae26';    

    try {
        if (fileUrl.startsWith('https://localhost')) {
            fileUrl = fileUrl.replace('https://localhost', 'http://localhost');
        }
        const reader = new zip.ZipReader(new zip.HttpRangeReader(fileUrl));

        // get all entries from the zip
        const entries = await reader.getEntries();
        if (entries.length) {

            const entryMap = {};
            entryMap['root'] = document.createElement('ul');
            entryMap['root'].setAttribute('id', 'tree');
            document.getElementById('zip-preview').appendChild(entryMap['root']);
            //console.log(entries);

            entries.forEach(entry => {

                let filename = entry.filename;
                //remove slash at end of string if available
                if (filename.endsWith('/')) {
                    filename = filename.slice(0, filename.length - 1);
                }

                //split into parts before and after last slash
                const lastIndex = filename.lastIndexOf('/');
                let before = 'root';
                if (lastIndex != -1) {
                    before = filename.slice(0, lastIndex + 1);
                }
                const after = filename.slice(lastIndex + 1);
                //console.log(entry.filename + "   Before: " + before + "   After: " + after);
                //console.log(entry);
                const humanReadableSize = " (" + fileSizeSI(entry.uncompressedSize) + ")";
                const parentListNode = entryMap[before];

                //options for jsTree
                const jsTreeOptions = {};
                jsTreeOptions['opened'] = true;
                jsTreeOptions['disabled'] = true;
                if (entry.directory) {
                    jsTreeOptions['icon'] = 'glyphicon glyphicon-folder-open';
                }
                else {
                    jsTreeOptions['icon'] = 'glyphicon glyphicon-file';
                }


                //create li element and set tree options and text
                const listNode = document.createElement("li");
                listNode.setAttribute('data-jstree', JSON.stringify(jsTreeOptions))
                const textnode = document.createTextNode(after + (!entry.directory ? humanReadableSize : ""));
                listNode.appendChild(textnode);

                //Add li element to parent ul element
                parentListNode.appendChild(listNode);

                //Add new ul element, if entry is a directory
                if (entry.directory) {
                    const ulNode = document.createElement('ul');
                    listNode.appendChild(ulNode);
                    entryMap[entry.filename] = ulNode;
                }




            });

            // close the ZipReader
            await reader.close();


            //create a tree using jsTree
            $('#zip-preview').jstree({
                core: {
                    expand_selected_onload: true,
                    "themes": { "stripes": true },
                }
            });
        }
    }
    catch (err) {
        //Display error message
        const errorMsg = document.createTextNode("Zip file could not be read. " + err);
        document.getElementById('zip-preview').appendChild(errorMsg);

    }
    finally {
        //remove throbber
        const throbber = document.getElementById("throbber");
        if(throbber)
            throbber.parentNode.removeChild(throbber);
    }





}


function fileSizeSI(a, b, c, d, e) {
    return (b = Math, c = b.log, d = 1000, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2)
        + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes')
}

