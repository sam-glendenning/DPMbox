/**
 * Handles importing and removing of buckets
 */

/**
 * Reads form fields for importing a bucket and POSTs it to /cgi-bin/import.py, which creates the bucket config
 */
function importBucket() 
{
    // Read form fields
	group = document.getElementById('group_input').value;
    bucket = document.getElementById('bucket').value;
    access_key = document.getElementById('access_key').value;
    secret_key = document.getElementById('secret_key').value;

    if (group && bucket && access_key && secret_key && group != "-- Select an option --")
    {
        if (!validateInput("group", group))
        {
            w2alert("Group name is invalid.");
            return false;
        }
        else if (!validateInput("bucket", bucket))
        {
            w2alert("Bucket name is invalid.");
            return false;
        }

        $.post("/cgi-bin/import.py", {
            'group': group,
            'bucket': bucket,
            'public_key': access_key,
            'private_key': secret_key
        })
        // TODO display more dynamic error message based on returned error code
        .done(function(resp) {
            w2alert('Successfully imported ' + bucket + ' for ' + group + '. It may take up to 10 mins to be accessible.');
        })
        .fail(function(resp) {
            importResponse(resp, group, bucket);
        })
        .always(function(resp) {
            $('html, body').animate({ scrollTop: 0 }, 'fast');
            w2ui.grid.unlock();
        });

        return true;
    }
    else
    {
        w2alert('Please fill out all fields.');
        return false;
    }
}

/**
 * Display a popup alert to the user in the event of an error based on what failed
 * @param {JSON} resp - the response from the server, we are interested in the status code
 * @param {string} group - the group to display an error on
 * @param {string} bucket - the bucket to display an error on
 */
function importResponse(resp, group, bucket)
{
    switch(resp.status)
    {
        case 409: 
            w2alert('Failed to import bucket ' + bucket + ' for group ' + group + '. The bucket already exists for this group.');
            break;
        case 500: 
            w2alert('Failed to import bucket ' + bucket + ' for group ' + group + '. A server configuration error occurred.');
            break;
        case 404: 
            w2alert('Failed to import bucket ' + bucket + ' for group ' + group + '. The bucket does not exist or its keys are incorrect.');
            break;
        case 403: 
            w2alert('Failed to import bucket ' + bucket + ' for group ' + group + '. The bucket has been blacklisted by the server admins.');
            break;
        case 400: 
            w2alert('Invalid request.');
            break;
    }
}

/**
 * Reads form fields for removing a bucket and POSTs it to /cgi-bin/remove.py, which removes the bucket config
 */
function removeBucket() 
{
	group = document.getElementById('group_input').value;
    bucket = document.getElementById('bucket').value;

    if (getCookie("admin") !== "true")
    {
        access_key = document.getElementById('access_key').value;
        secret_key = document.getElementById('secret_key').value;

        if (group && bucket && access_key && secret_key && group != "-- Select an option --")
        {
            if (!validateInput("group", group))
            {
                w2alert("Group name is invalid.");
                return false;
            }
            else if (!validateInput("bucket", bucket))
            {
                w2alert("Bucket name is invalid.");
                return false;
            }

            $.post("/cgi-bin/remove.py", {
                'group': group,
                'bucket': bucket,
                'public_key': access_key,
                'private_key': secret_key
            })
            .done(function(resp) {
                w2popup.open({
                    title: "Notification",
                    body: "<p>Successfully removed " + bucket + " from group " + group + ".</p>",
                    modal: false,
                    showClose: true,
                    onClose: w2ui.grid.unlock(),
                    width: 450,
                    height: 220,
                    buttons: '<button class="btn" onclick="w2popup.close(); window.location.href = config.server;">Close</button>'
                });
                //window.location.href = config.server;      
            })
            .fail(function(resp) {
                removeResponse(resp, group, bucket);
                //w2alert('Failed to remove bucket ' + bucket + ' for group ' + group + '. The bucket may not exist or its information may be incorrect.');
            })
            .always(function(resp) {
                $('html, body').animate({ scrollTop: 0 }, 'fast');
                w2ui.grid.unlock();
            });
        
            return true;
        }
        else
        {
            w2alert('Please fill out all fields.');
            return false;
        }
    }
    else        // admin does not need to provide bucket keys
    {
        if (group && bucket && group != "-- Select an option --")
        {
            $.post("/cgi-bin/remove.py", {
                'group': group,
                'bucket': bucket,
                'groups': window.user_groups,
                'admin_operation': true
            })
            .done(function(resp) {
                w2popup.open({
                    title: "Notification",
                    body: "<p>Successfully removed " + bucket + " from group " + group + ". The change may take up to 10 mins to propogate.</p>",
                    modal: false,
                    showClose: true,
                    onClose: w2ui.grid.unlock(),
                    width: 450,
                    height: 220,
                    buttons: '<button class="btn" onclick="w2popup.close(); window.location.href = config.server;">Close</button>'
                });
                //window.location.href = config.server;      
            })
            .fail(function(resp) {
                removeResponse(resp, group, bucket);
                //w2alert('Failed to remove bucket ' + bucket + ' for group ' + group + '. The bucket may not exist or its information may be incorrect.');
            })
            .always(function() {
                $('html, body').animate({ scrollTop: 0 }, 'fast');
                w2ui.grid.unlock();
            });
        
            return true;
        }
        else
        {
            w2alert('Please fill out all fields.');
            return false;
        }
    }
}

/**
 * Display a popup alert to the user in the event of an error based on what failed
 * @param {JSON} resp - the response from the server, we are interested in the status code
 * @param {string} group - the group to display an error on
 * @param {string} bucket - the bucket to display an error on
 */
function removeResponse(resp, group, bucket)
{
    switch(resp.status)
    {
        case 409: 
            w2alert('Failed to remove bucket ' + bucket + ' from group ' + group + '. The bucket is not mapped to this group.');
            break;
        case 500: 
            w2alert('Failed to remove bucket ' + bucket + ' from group ' + group + '. A server configuration error occurred.');
            break;
        case 404: 
            w2alert('Failed to remove bucket ' + bucket + ' from group ' + group + '. The bucket does not exist or its keys are incorrect.');
            break;
        case 400: 
            w2alert('Invalid request.');
            break;
    }
}

/**
 * Display a popup with input fields for the user to either import or remove a bucket
 * Creates the HTML for the popup and sets a submit action based on what action the user wants to take
 * @param {string} action - either of "import" or "remove". Displays the relevant popup based on what the user wants to do with a bucket
 */
function userInputPopup(action)
{
    /**
     * Creates the four input boxes that make up the info we need from the user. Their group, the bucket, the access key and secret key
     */
    function composeHtml(){
        var html = "";
        
        if (isAdmin())
        {
            var admin_warning = document.createElement("p");
            var text = document.createTextNode("WARNING: admin privileges are on. Any changes to buckets will affect live users.");
            admin_warning.appendChild(text);
            admin_warning.style.color = "red";
            admin_warning.style.textAlign = "center";
            html += admin_warning.outerHTML;
        }

        var input_form = document.createElement("form");
        input_form.setAttribute("id", "input_form");
        input_form.setAttribute("align", "center");
    
        var group_label = document.createElement("label");
        group_label.setAttribute("for", "groupname");
        group_label.innerHTML = "Group name:";
    
        var group_input;
        if (isAdmin() && action === "import")
        {
            group_input = document.createElement("input");
            group_input.setAttribute("type", "text");
        }
        else
        {
            var user_groups;

            if (isAdmin() && action === "remove")
            {
                user_groups = window.existing_groups;
            }
            else
            {
                user_groups = window.user_groups;
            }

            group_input = document.createElement("select");
            var empty = document.createElement("option");
            empty.setAttribute("disabled", true);
            empty.setAttribute("selected", true);
            empty.setAttribute("style", "display: none");
            empty.innerHTML = "-- Select an option --";
            group_input.appendChild(empty);

            for (var i=0; i<user_groups.length; i++)
            {
                var group = document.createElement("option");
                group.setAttribute("value", user_groups[i]);
                group.innerHTML = user_groups[i];
                group_input.appendChild(group);
            }
        }
        
        group_input.setAttribute("name", "group_input");
        group_input.setAttribute("id", "group_input");
    
        var bucket_label = document.createElement("label");
        bucket_label.setAttribute("for", "bucketname");
        bucket_label.innerHTML = "Bucket name:";
        var bucket = document.createElement("input");
        bucket.setAttribute("type", "text");
        bucket.setAttribute("id", "bucket");
        bucket.setAttribute("name", "bucket");

        input_form.appendChild(group_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(group_input);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(bucket_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(bucket);
        var br = document.createElement("br");
        input_form.appendChild(br);

        var adminRemoving = isAdmin() && action === "remove";
        if (!adminRemoving)     // admins don't need to provide bucket keys to remove buckets
        {
            var access_key_label = document.createElement("label");
            access_key_label.setAttribute("for", "access_key");
            access_key_label.innerHTML = "Access key:";
            var access_key = document.createElement("input");
            access_key.setAttribute("type", "text");
            access_key.setAttribute("id", "access_key");
            access_key.setAttribute("name", "access_key");
        
            var secret_key_label = document.createElement("label");
            secret_key_label.setAttribute("for", "bucketname");
            secret_key_label.innerHTML = "Secret key:";
            var secret_key = document.createElement("input");
            secret_key.setAttribute("type", "password");
            secret_key.setAttribute("id", "secret_key");
            secret_key.setAttribute("name", "secret_key");

            input_form.appendChild(access_key_label);
            var br = document.createElement("br");
            input_form.appendChild(br);
            input_form.appendChild(access_key);
            var br = document.createElement("br");
            input_form.appendChild(br);
            input_form.appendChild(secret_key_label);
            var br = document.createElement("br");
            input_form.appendChild(br);
            input_form.appendChild(secret_key);
        }

        html += input_form.outerHTML;
        return html;
    }

    w2ui.grid.lock();

    if (action === "import")        // set the action of the popup as importing a bucket
    {
        w2popup.open({
            title: "Import",
            body: composeHtml(),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); importBucket();">Import</button>'
        });
    }
    else if (action === "remove")   // set the action of the popup as removing a bucket
    {
        w2popup.open({
            title: "Remove",
            body: composeHtml(),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); removeBucket();">Remove</button>'
        });
    }
}