/**
 * Handles everything to do with blacklisting, viewing the list and amending it
 */

window.blacklisted_buckets = null;

 /**
  * Display the blacklist button next to the admin button
  */
function resetBlacklistButton()
{
    var admin_button = document.getElementById('admin-button');
    var blacklist_button = document.createElement("button");
    blacklist_button.setAttribute("onclick", "showBlacklist();");
    blacklist_button.setAttribute("id", "blacklist-button");
    blacklist_button.setAttribute("class", "blue-button");
    blacklist_button.innerHTML = "Blacklist";
    admin_button.parentNode.insertBefore(blacklist_button, admin_button.nextSibling);
}

/**
 * Creates the admin popup for viewing the blacklist
 */
function showBlacklist()
{
    /**
     * Fetches the blacklist from a cgi-bin script
     */
    function getBlacklist()
    {
        $.get("/cgi-bin/get_blacklist.py")
        .done(function(resp) {
            window.blacklisted_buckets = resp;

            w2ui.grid.lock();

            w2popup.open({
                title: "Blacklist",
                body: composeHtml(),
                modal: false,
                showClose: true,
                onClose: w2ui.grid.unlock(),
                width: 600,
                height: 400,
                buttons: '<button class="btn" onclick="w2popup.close();">Close</button>'
            });
        })
        .fail(function() {
            w2alert('Failed to fetch blacklist. Try again later.');
        })
    }

    /**
     * Creates the HTML for the blacklist popup box
     */
    function composeHtml()
    {
        var html = '<button onclick=enterBucketForBlacklist("add");>Add to blacklist</button>';

        if (window.blacklisted_buckets.length === 0)
        {
            return html + '<p>Blacklist is empty.</p>';
        }

        html += '<button onclick=enterBucketForBlacklist("remove");>Remove from blacklist</button>'
      
        var scrollbox = document.createElement("div");
        scrollbox.style.overflow = "scroll";
        scrollbox.style.overflowX = "hidden";

        var string = "";

        for (var i=0; i<window.blacklisted_buckets.length; i++)
        {
            string += window.blacklisted_buckets[i] + "<br />";
        }
        
        scrollbox.innerHTML = string;
        html += scrollbox.outerHTML;
        return html;
    }

    getBlacklist();
}

/**
 * Creates the popup for the user to enter the name of the bucket they want to add or remove from the blacklist
 * This is based on the action parameter
 * @param {string} action - either "add" or "remove"
 */
function enterBucketForBlacklist(action)
{
    /**
     * Creates the HTML for the popup window.
     * @param {string} action - either "add" or "remove". Input box if "add", populated dropdown if "remove"
     */
    function composeHtml(action)
    {
        var html = ""; 

        var admin_warning = document.createElement("p");
        var text = document.createTextNode("WARNING: admin privileges are on. Any changes to the blacklist will affect live users.");
        admin_warning.appendChild(text);
        admin_warning.style.color = "red";
        admin_warning.style.textAlign = "center";
        html += admin_warning.outerHTML;

        var message = document.createElement('p');
        message.style.textAlign = "center";

        if (action === "add")
        {
            message.innerHTML = "Input the name of the bucket to blacklist";
            var input_div = document.createElement("div");
            input_div.style.textAlign = "center";
            var blacklist_bucket = document.createElement("input");
            blacklist_bucket.setAttribute("type", "text");
            blacklist_bucket.setAttribute("id", "blacklist_bucket");
            blacklist_bucket.setAttribute("name", "blacklist_bucket");
            input_div.appendChild(blacklist_bucket);

            html += message.outerHTML + input_div.outerHTML;
        }
        else
        {
            message.innerHTML = "Select bucket to remove from blacklist";
            var input_div = document.createElement("div");
            input_div.style.textAlign = "center";
            var blacklist_bucket = document.createElement("select");
            blacklist_bucket.setAttribute("id", "blacklist_bucket");
            blacklist_bucket.setAttribute("name", "blacklist_bucket");
            blacklist_bucket.style.textAlign = "center";
            var empty = document.createElement("option");
            empty.setAttribute("disabled", true);
            empty.setAttribute("selected", true);
            empty.setAttribute("style", "display: none");
            empty.innerHTML = "-- Select an option --";
            blacklist_bucket.appendChild(empty);

            for (var i=0; i<window.blacklisted_buckets.length; i++)
            {
                var bucket = document.createElement("option");
                bucket.setAttribute("value", window.blacklisted_buckets[i]);
                bucket.innerHTML = window.blacklisted_buckets[i];
                blacklist_bucket.appendChild(bucket);
            }

            input_div.appendChild(blacklist_bucket);

            html += message.outerHTML + input_div.outerHTML;
        }

        return html;
    }

    if (action === "add")        // set the action of the popup as blacklisting a bucket
    {
        w2popup.open({
            title: "Blacklist a bucket",
            body: composeHtml(action),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); bucket = document.getElementById(\'blacklist_bucket\').value; addToBlacklist(bucket);">Blacklist</button>'
        });
    }
    else        // removing from the blacklist instead
    {
        w2popup.open({
            title: "Remove from blacklist",
            body: composeHtml(action),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); bucket = document.getElementById(\'blacklist_bucket\').value; removeFromBlacklist(bucket);">Remove from blacklist</button>'
        });
    }
}

/**
 * Sends data about bucket to blacklist to relevant cgi-bin script
 * @param {string} bucket - the bucket to blacklist
 */
function addToBlacklist(bucket)
{
    if (bucket && bucket != "-- Select an option --")
    {
        if (!validateInput("bucket", bucket))
        {
            w2alert("Bucket name is invalid.");
            return false;
        }

        $.post("/cgi-bin/add_to_blacklist.py", {
            'bucket': bucket,
            'groups': window.user_groups,
            'admin_operation': true
        })
        .done(function(resp) {
            w2alert("Successfully added " + bucket + " to blacklist.");   
        })
        .fail(function(resp) {
            blacklistAddResponse(resp, bucket);
        })
        .always(function() {
            $('html, body').animate({ scrollTop: 0 }, 'fast');
            w2ui.grid.unlock();
        });
    
        return true;
    }
    else
    {
        w2alert('Please enter a bucket name.');
        return false;
    }
}

/**
 * Display a popup alert to the user in the event of an error based on what failed
 * @param {JSON} resp - the response from the server, we are interested in the status code
 * @param {string} bucket - the bucket to display an error on
 */
function blacklistAddResponse(resp, bucket)
{
    switch(resp.status)
    {
        case 409: 
            w2alert('Failed to add bucket ' + bucket + ' to blacklist. The bucket is already in the blacklist.');
            break;
        case 500: 
            w2alert('Failed to add bucket ' + bucket + ' to blacklist. Blacklist could not be synchronised.');
            break;
        case 403: 
            w2alert('Failed to add bucket ' + bucket + ' to blacklist. Could not verify admin privileges.');
            break;
        case 400: 
            w2alert('Invalid request.');
            break;
    }
}

/**
 * Sends data about bucket to remove from blacklist to relevant cgi-bin script
 * @param {string} bucket - the bucket to remove from blacklist
 */
function removeFromBlacklist(bucket)
{
    if (bucket && bucket != "-- Select an option --")
    {
        if (!validateInput("bucket", bucket))
        {
            w2alert("Bucket name is invalid.");
            return false;
        }

        $.post("/cgi-bin/remove_from_blacklist.py", {
            'bucket': bucket,
            'groups': window.user_groups,
            'admin_operation': true
        })
        .done(function(resp) {
            w2alert("Successfully removed " + bucket + " from blacklist.");      
        })
        .fail(function(resp) {
            blacklistRemoveResponse(resp, bucket);
        })
        .always(function() {
            $('html, body').animate({ scrollTop: 0 }, 'fast');
            w2ui.grid.unlock();
        });
    
        return true;
    }
    else
    {
        w2alert('Please enter a bucket name.');
        return false;
    }
}

/**
 * Display a popup alert to the user in the event of an error based on what failed
 * @param {JSON} resp - the response from the server, we are interested in the status code
 * @param {string} bucket - the bucket to display an error on
 */
function blacklistRemoveResponse(resp, bucket)
{
    switch(resp.status)
    {
        case 409: 
            w2alert('Failed to remove bucket ' + bucket + ' from blacklist. The bucket is not in the blacklist.');
            break;
        case 500: 
            w2alert('Failed to remove bucket ' + bucket + ' from blacklist. Blacklist could not be synchronised.');
            break;
        case 403: 
            w2alert('Failed to remove bucket ' + bucket + ' from blacklist. Could not verify admin privileges.');
            break;
        case 400: 
            w2alert('Invalid request.');
            break;
    }
}