/**
 * Handles admin functionality
 */

window.existing_groups = null;

/**
 * Called for every page reload. Checks to see if a user is a member of the DynaFed IAM admin group dynafed/admins.
 * If so, display a button for turning admin privileges on and off
 * If clicked, change the value of a cookie saying admin privileges are on/off
 * On page load, if this cookie is set to admin=true, load admin functionality
 */
function checkAdmin()
{
    var x = new XMLHttpRequest();
    x.open('PROPFIND', location, true);
    x.onload = function()
    {
        try 
        {
            window.user_groups = x.getResponseHeader('oidcgroups').split(",");
            if (window.user_groups.includes('dynafed/admins'))
            {
                var admin_button = document.createElement("button");
                admin_button.setAttribute("onclick", "changeAdmin();");
                admin_button.setAttribute("id", "admin-button");
                admin_button.setAttribute("class", "blue-button");
                admin_button.innerHTML = "Admin On/Off";
                document.body.appendChild(admin_button);

                var br = document.createElement("br");
                document.body.appendChild(br);

                var admin_status = document.createElement("p");
                admin_status.setAttribute("id", "admin-status");
                admin_status.style.display = "inline-block";
                admin_status.innerHTML = "Admin: ";
                document.body.appendChild(admin_status);
                var admin_status_onoff = document.createElement("p");
                admin_status_onoff.setAttribute("id", "admin-status-onoff");
                admin_status_onoff.style.display = "inline-block";
                admin_status_onoff.style.color = "red";
                admin_status_onoff.innerHTML = "OFF";
                document.body.appendChild(admin_status_onoff);

                if (getCookie("admin") === "true")
                {
                    loadAdmin();
                }
            }
        }
        catch (TypeError)
        {
            w2alert('Error - failed to fetch user groups. Bucket importing and removing is disabled.');
            w2ui.grid.unlock();
        }     
    };
    x.onerror = function() 
    {
        // Can't allow bucket importing and removing if we don't know the user's IAM groups
        w2alert('Error - failed to fetch user groups. Bucket importing and removing is disabled.');
        w2ui.grid.unlock();
    };
    x.send();
}

/**
 * Flip the value of the admin cookie, i.e. true to false or false to true
 * This is used by the page to determine if admin privileges should be on or off
 */
function changeAdmin()
{
    if (getCookie("admin") !== "true")
    {
        document.cookie = "admin=true";
        loadAdmin();
    }
    else
    {
        document.cookie = "admin=false";
        var blacklist_button = document.getElementById('blacklist-button');
        blacklist_button.remove();
        var admin_status_onoff = document.getElementById('admin-status-onoff');
        admin_status_onoff.style.color = "red";
        admin_status_onoff.innerHTML = "OFF";
    }
}

/**
 * Used to get the value of the admin cookie
 * @param {string} cname - the name of the cookie
 */
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

/**
 * Loads admin functionality on the page
 * Displays a blacklist button for admins to view and amend the blacklist
 * Used for adding elevated privileges to bucket import and remove popups
 */
function loadAdmin()
{
    if (window.existing_groups === null)
    {
        $.get("/cgi-bin/get_groups.py")
        .done(function(resp) {
            window.existing_groups = resp;
            resetBlacklistButton();
            var admin_status_onoff = document.getElementById('admin-status-onoff');
            admin_status_onoff.style.color = "#1CB200";
            admin_status_onoff.innerHTML = "ON";
        })
        .fail(function() {
            w2alert('Failed to set admin state. Admin functionality will not be available');
        })
    }
    else
    {
        resetBlacklistButton();
        var admin_status_onoff = document.getElementById('admin-status-onoff');
        admin_status_onoff.style.color = "#1CB200";
        admin_status_onoff.innerHTML = "ON";
    }
}

/**
 * Returns true or false if the user is an admin with admin functionality set to on
 */
function isAdmin()
{
    return getCookie("admin") === "true" && window.user_groups.includes('dynafed/admins')
}