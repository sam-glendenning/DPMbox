var zip = null;
var remainingFilesToDownload = -1;
var remainingFilesToCalculateSizeOf = -1;
var totalDownloaded = -1;
var totalDownloadSize = -1;
var fullyCalculated = false;
var bar = null;
window.currentRequests = [];

function cancelDownloads()
{
    for (var i=0; i<window.currentRequests.length; i++)
    {
        window.currentRequests[i].abort();
    }
}

function resetGlobalVars()
{
    window.zip = null;
    window.remainingFilesToDownload = -1;
    window.remainingFilesToCalculateSizeOf = -1;
    window.totalDownloaded = -1;
    window.totalDownloadSize = -1;
    window.currentRequests = [];
}

function getTotalDownloadSize(filesize)
{
    if (window.totalDownloadSize === -1)
    {
        window.totalDownloadSize = 0;
    }

    window.totalDownloadSize += filesize;
    window.remainingFilesToCalculateSizeOf--;

    if (window.remainingFilesToCalculateSizeOf === 0)
    {
        document.getElementById('container').innerHTML = "";
        document.getElementById('cancel_container').innerHTML = "";
        window.bar = new ProgressBar.Line('#container', {
            strokeWidth: 4,
            easing: 'easeInOut',
            duration: 100,
            color: '#3861AA',
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: {width: '100%', height: '50%'},
            text: {
                style: {
                // Text color.
                // Default: same as stroke color (options.color)
                color: '#999',
                position: 'relative',
                right: '0',
                padding: 0,
                margin: 0,
                transform: null
                },
                autoStyleContainer: false
            },
            from: {color: '#FFEA82'},
            to: {color: '#ED6A5A'},
            step: (state, bar) => {
                if (bar.value() === 1.0)
                {
                    bar.setText('Please wait...');
                }
                else
                {
                    bar.setText('Compiling zip... ' + (bar.value() * 100).toFixed(1) + '%');
                } 
            }
        });

        var cancelButton = document.createElement("button");
        cancelButton.setAttribute("id", "cancel-button");
        cancelButton.innerHTML = "Cancel";
        cancelButton.onclick = function() {
            cancelDownloads(); 
            resetGlobalVars();
            document.getElementById('container').innerHTML = "";
            document.getElementById('cancel_container').innerHTML = "";
        };
        var container = document.getElementById('cancel_container');
        container.appendChild(cancelButton);
    }
}

function updateProgress(bytes)
{
    if (window.totalDownloaded === -1)
    {
        window.totalDownloaded = 0;
    }

    if (window.remainingFilesToCalculateSizeOf === 0)
    {
        window.totalDownloaded += bytes;
        window.bar.animate(window.totalDownloaded / window.totalDownloadSize);
    }
}

function zipFile(filepath, blob)
{
    if (window.zip === null)
    {
        window.zip = new JSZip();
    }

    // This puts just the files in the zip. If paths and directories are desired, include the slashes
    var split_path = filepath.split('/');
    var filename = split_path[split_path.length-1];
    window.zip.file(filename, blob);
    window.remainingFilesToDownload--;

    if (window.remainingFilesToDownload === 0)
    {
        //Send zip to user
        window.zip.generateAsync({type:"blob"})
        .then(function(base64) {
            saveAs(base64, "DynaFed " + getDateTime());
        });

        resetGlobalVars();
        document.getElementById('container').innerHTML = "";
        document.getElementById('cancel_container').innerHTML = "";
    }
}

function downloadAndZip(files)
{
    cancelDownloads();

    if (files.length > 500)
    {
        w2popup.open({
            title: "Download Error",
            body: 'Maximum number of allowable downloads is 500 (' + files.length + ' selected).',
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close();">Ok</button>'
        });

        document.getElementById('container').innerHTML = "";
        document.getElementById('cancel_container').innerHTML = "";
        resetGlobalVars();
        return;
    }

    window.remainingFilesToDownload = files.length;
    window.remainingFilesToCalculateSizeOf = files.length;

    for (var i=0; i<files.length; i++)
    {
        getBlobSize(files[i]);
        downloadBlob(files[i]);
    }
}

function getBlobSize(filepath)
{
    var xhr = new XMLHttpRequest();
    xhr.open('GET', config.server + filepath + '?metalink', true);
    xhr.onload = function(e) {
        if (this.status === 200)
        {
            var xml = this.response;
            var firstvariable = "<size>";
            var secondvariable = "</size>";
            var size = parseInt(xml.match(new RegExp(firstvariable + "(.*)" + secondvariable))[1]);
            getTotalDownloadSize(size);
        }
    }
    xhr.onerror = function(e) {
        w2ui.grid.lock();
        w2popup.open({
            title: "Download Error",
            body: 'An error occurred during file download. Refresh the page and try again.',
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close();">Ok</button>'
        });

        cancelDownloads();
        document.getElementById('container').innerHTML = "";
        document.getElementById('cancel_container').innerHTML = "";
        resetGlobalVars();
    }

    xhr.send();
}

function downloadBlob(filepath)
{
    var lastReceived = 0;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', config.server + filepath, true);
    xhr.responseType = 'blob';
    xhr.addEventListener("progress", function(evt)
    {
        if (evt.lengthComputable)
        {
            var bytesReceived = evt.loaded;
            var difference = bytesReceived - lastReceived;
            lastReceived = bytesReceived;
            updateProgress(difference);
        }
    }, false);

    xhr.onload = function(e) {
        if (this.status === 200)
        {
            var blob = this.response; 
            zipFile(filepath, blob);
        }
    };

    xhr.onerror = function(e) {
        w2ui.grid.lock();
        w2popup.open({
            title: "Download Error",
            body: 'An error occurred during file download. Refresh the page and try again.',
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close();">Ok</button>'
        });

        document.getElementById('container').innerHTML = "";
        document.getElementById('cancel_container').innerHTML = "";
        cancelDownloads();
        resetGlobalVars();
    };

    window.currentRequests.push(xhr);
    xhr.send();
}

function getDateTime()
{
    var currentdate = new Date(); 
    var datetime = currentdate.getHours() + "-"  
        + currentdate.getMinutes() + "-" 
        + currentdate.getSeconds() + " "
        + currentdate.getDate() + "-"
        + (currentdate.getMonth()+1) + "-" 
        + currentdate.getFullYear();

    return datetime;
}