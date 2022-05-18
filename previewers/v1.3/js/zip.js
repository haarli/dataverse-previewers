
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

let entries;

async function readZip(fileUrl) {

    try {
        //Just a workaround, as current Dataverse delivers https links for localhost
        if (fileUrl.startsWith('https://localhost')) {
            fileUrl = fileUrl.replace('https://localhost', 'http://localhost');
        }


        const reader = new zip.ZipReader(new zip.HttpRangeReader(fileUrl));

        // get all entries from the zip
        entries = await reader.getEntries();
        if (entries.length) {

            const entryMap = {};
            //const rootList = $('<ul>');
            const entryList = [];
            //rootList.attr('id','tree');
            //$('#zip-preview').append(rootList);

            //entryMap['root'] = rootList.get(0);
            //entryMap['root'].setAttribute('id', 'tree');
            //document.getElementById('zip-preview').appendChild(entryMap['root']);
            //console.log(entries);

            entries.forEach(function(entry, index) {

                const treeObject = {};
                
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
                entry.filenameOnly = after;
                const humanReadableSize = fileSizeSI(entry.uncompressedSize);
                const parentListNode = entryMap[before];

                treeObject.title = after;
                treeObject.size = humanReadableSize;
                treeObject.folder = entry.directory;
                treeObject.index = index;
                treeObject.unselectable = true;
                treeObject.encrypted = entry.encrypted;

                if(entry.directory) {
                    treeObject.expanded=true;
                    entryMap[entry.filename] = treeObject;

                }

                if(parentListNode) {
                    if(!parentListNode.children){
                        parentListNode.children=[];
                    }
                    parentListNode.children.push(treeObject);
                }
                else {
                    entryList.push(treeObject);
                }

                //options for jsTree
                /*
                const jsTreeOptions = {};
                jsTreeOptions['opened'] = true;
                jsTreeOptions['disabled'] = true;
                if (entry.directory) {
                    jsTreeOptions['icon'] = 'glyphicon glyphicon-folder-open';
                }
                else {
                    jsTreeOptions['icon'] = 'glyphicon glyphicon-file';
                }
                */


                /*
                //create li element and set tree options and text
                const displayFileName = after + (!entry.directory ? humanReadableSize : "");
                
                const listNode = $('<li>');
                //listNode.attr('data-jstree', JSON.stringify(jsTreeOptions)).append('<span>')
                const textNode = $('<span>');
                if(index%2 == 0) {
                    //textNode.addClass('stripe');
                }
                
                textNode.append(displayFileName);

                const iconNode = $('<span>').addClass('glyphicon');
                listNode.append(iconNode);
                listNode.append(textNode);
                
                //const listNode = document.createElement("li");
                //listNode.setAttribute('data-jstree', JSON.stringify(jsTreeOptions))

                //const textnode = document.createTextNode(displayFileName);
                //listNode.appendChild(textnode);

                //Add li element to parent ul element
                parentListNode.appendChild(listNode.get(0));

                //Add new ul element, if entry is a directory
                if (entry.directory) {
                    //const ulNode = document.createElement('ul');
                    const ulNode = $('<ul>');
                    ulNode.addClass('nested active');
                    //textNode.addClass('treeCaret treeCaret-down')
                    iconNode.addClass('icon icon-folder glyphicon-folder-open');
                    listNode.append(ulNode)

                    entryMap[entry.filename] = ulNode.get(0);
                }
                else{
                    const downloadLink = $('<a href="#" data-entry-index="' + index + '"><span class="icon glyphicon glyphicon-download"></span><a>');
                    downloadLink.click(downloadFile);
                    $(listNode).append(downloadLink);

                    iconNode.addClass('icon icon-file glyphicon-file');
                    

                }


            */

            });

            // close the ZipReader
            await reader.close();

            createTree(entryList);

            /*
            //create a tree using jsTree
            $('#zip-preview').jstree({
                core: {
                    expand_selected_onload: true,
                    "themes": { "stripes": true },
                }
            });
            */
        }
    }
    catch (err) {
        //Display error message
        const errorMsg = document.createTextNode("Zip file structure could not be read (" + err + "). You can still download the zip file.");
        document.getElementById('zip-preview').appendChild(errorMsg);

    }
    finally {
        //remove throbber
        const throbber = document.getElementById("throbber");
        if (throbber)
            throbber.parentNode.removeChild(throbber);
    }





}


function fileSizeSI(a, b, c, d, e) {
    return (b = Math, c = b.log, d = 1000, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2)
        + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes')
}


async function downloadFile(event) {
    const target = event.currentTarget;
    let href = target.getAttribute("href");
    if (target.dataset.entryIndex !== undefined && !target.download) {
        target.removeAttribute("href");
        event.preventDefault();
        try {
            await download(entries[Number(target.dataset.entryIndex)], target.parentElement, target);
            href = target.getAttribute("href");
        } catch (error) {
            alert(error);
        }
        target.setAttribute("href", href);
    }
}

async function download(entry, li, a) {
    if (!li.classList.contains("busy")) {
        
        $('#modalTextContent').text(entry.filename);
        const controller = new AbortController();
        const signal = controller.signal;

        $('#modalAbortButton').click(() => controller.abort());
        li.classList.add("busy");
        $('#myModal').modal('show');
        try {
            const blobURL = URL.createObjectURL(await entry.getData(new zip.BlobWriter(), {
                onprogress: (index, max) => {
                    const percent = Math.round(index/max*100);
                    setProgressBarValue(percent);
                    
                },
                signal
            }))

            a.href = blobURL;
            a.download = entry.filenameOnly;
            const clickEvent = new MouseEvent("click");
            a.dispatchEvent(clickEvent);
        } catch (error) {
            if (error.message != zip.ERR_ABORT) {
                throw error;
            }
        } finally {
            li.classList.remove("busy");
            $('#myModal').modal('hide');
            $('#modalAbortButton').unbind();
            setProgressBarValue(0);
        }
    }
}

async function setProgressBarValue(val) {
    $('#modalProgressBar').css('width', val+'%').attr('aria-valuenow', val).text(val + ' %');
}

//Create Tree
async function createTree(dataStructure) {
    $("#treegrid").fancytree({
        extensions: ["table", "glyph"],
        checkbox: false,
        unselectable: true,
        table: {
          indentation: 20,      // indent 20px per node level
          nodeColumnIdx: 0,     // render the node title into the 2nd column
          //checkboxColumnIdx: 0  // render the checkboxes into the 1st column
        },
        source: dataStructure,
        tooltip: function(event, data){
          return data.node.data.author;
        },
        glyph: {
            // The preset defines defaults for all supported icon types.
            preset: "bootstrap3",
        },
        activate: function(event, data) {
            return false;
          },
    
    
        renderColumns: function(event, data) {
          
            var node = data.node,
            $tdList = $(node.tr).find(">td");
  
            if(!node.folder) {
                $tdList.eq(1).text(node.data.size);

                if(!node.data.encrypted) {
                const downloadLink = $('<a href="#" data-entry-index="' + node.data.index + '">');
                downloadLink.click(downloadFile);
                downloadLink.append('<span class="icon glyphicon glyphicon-download"></span>');
                
                $tdList.eq(2).html(downloadLink);
                }
            }
          // (index #0 is rendered by fancytree by adding the checkbox)
          //$tdList.eq(1).text(node.getIndexHier());
          // (index #2 is rendered by fancytree)
          //$tdList.eq(3).text(node.data.qty);
          // Rendered by row template:
  //        $tdList.eq(4).html("<input type='checkbox' name='like' value='" + node.key + "'>");
        }
      });
  
    
    /*
    var toggler = document.getElementsByClassName("icon-folder");
    var i;

    for (i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener("click", function() {
        if(this.classList.contains("glyphicon-folder-open")) {
            this.classList.remove("glyphicon-folder-open");
            this.classList.add("glyphicon-folder-close");
        }
        else {
            this.classList.remove("glyphicon-folder-close");
            this.classList.add("glyphicon-folder-open");
        }
        
        this.parentElement.querySelector(".nested").classList.toggle("active");
        this.classList.toggle("treeCaret-down");
    });
    
    
    }
    */
    

} 

