/**
 * Nano namespace object
 * @author Carlos Soto <carlos.soto@lognllc.com>
 */
var nano = {
    utils : {},
    views : {},
    instances : {},
    containers : {},
    models : {},
    strings : {},
    conf : {},
    session : {},
    device : 'computer'
};

/**
* Checks on the strings object for the specified key. If the value doesn't exist the key is returned
* @author Carlos Soto <carlos.soto@lognllc.com>
* @param string key for the translation requested
* @return mixed The translated value for that key
*/
nano.utils.translate = function translate(key) {
    var value = key;
    if (typeof nano.strings[key] != 'undefined') {
        value = nano.strings[key];
    }

    // replace the rest of the arguments into the string
    for( var i = 1; i < arguments.length; i++) {
        value = value.replace('%' + i + '$s', args[i]);
    }

    return value;
}

/**
 * Fetches the session from it's container (cookie)
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return Object: Session data
 */
nano.utils.getSession = function() {
    var session = null;

    if ($.cookie)
    {
        session = $.cookie( nano.conf.sessionCookieName )
    }

    return session;
};

/**
 * Tells whether the session has been created or not.
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return boolean
 */
nano.utils.loggedIn = function() {
    var session = this.getSession();
    nano.session = session;
    return (session != null);
};

/**
 * Logs the user into the system
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param string username: username to log in
 * @param string password: user's password
 * @param object callbacks: object with success and error callback
 * @return boolean
 */
nano.utils.login = function(username, password, callbacks) {
        $.ajax({
            url : nano.conf.urls.login,
            type : 'POST',
            headers : nano.utils.getHttpHeaders(),
            dataType : 'json',
            data : JSON.stringify({
                username : username,
                password : password
            }),
            success : function(data, textStatus, jqXHR){

                //Store the session info in the cookie.
                var info = {
                    username : username,
                    accountid : data.accountid,
                    profileid : data.profileid,
                    authToken : data.authToken
                };
                nano.session = info;
                $.cookie( nano.conf.sessionCookieName, info);
                if (_.isFunction(callbacks.success))
                {
                    callbacks.success(info);
                }
            },
            error : function(jqXHR, textStatus, errorThrown){
                if (_.isFunction(callbacks.error))
                {
                    callbacks.error(jqXHR, textStatus, errorThrown);
                }
            }
        });
};

/**
 * Logouts the user (deletes the cookie)
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return void
 */
nano.utils.logout = function(callbacks){
    $.ajax({
        url : nano.conf.urls.logout,
        type : 'GET',
        headers : nano.utils.getHttpHeaders(),
        dataType : 'json',
        success : function(data, textStatus, jqXHR) {

            if (_.isObject(callbacks) && _.isFunction(callbacks.success)) {
                callbacks.success();
            }

            // Clear the html from the containers
            for (var i in nano.containers)
            {
                if( i !== 'login' && i !== 'marketSummary' ){
                    nano.containers[i].empty();
                }
            }
        },
        error : function(jqXHR, textStatus, errorThrown) {
            if (_.isObject(callbacks) && _.isFunction(callbacks.error)) {
                callbacks.error(jqXHR, textStatus, errorThrown);
            }
        }
    });
    $.cookie( nano.conf.sessionCookieName, null);
};

/**
 * Builds the HTTP headers array for the api calls. Includes the session token.
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return Object
 */
nano.utils.getHttpHeaders = function(){
    var headers = {
        "Content-Type" : "application/json"
    };
    // Add the authentication token to if if logged in
    if ( nano.utils.loggedIn() )
    {
        headers.API_TOKEN = nano.session.authToken;
    }
    return headers;
};

/**
 * Hides all of the different UI components fon the User except from the Footer and the Market Summary
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param boolean showMarketSummary: tells whether to show the Market Summary section or not
 * @return Object
 */
nano.utils.hideAll = function(showMarketSummary) {
    if ( !_.isBoolean(showMarketSummary) )
    {
        var showMarketSummary = true;
    }

    if( showMarketSummary ) {
        nano.containers['marketSummary'].show();
    }

    for (var i in nano.containers)
    {
        if ( i != 'footer' && (i != 'marketSummary' || (i == 'marketSummary'&& !showMarketSummary)) )
        {
            nano.containers[i].hide();
        }
    }
};

/**
 * Rounds up a number. Default decimals are two.
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return Object
 */
nano.utils.round = function (number, decimals) {
  if (typeof decimals == 'undefined')
  {
      var decimals = 2;
  }
  var newNumber = Math.round(number*Math.pow(10,decimals))/Math.pow(10,decimals);
  return parseFloat(newNumber);
}

/**
 * Fetches an html template synchronously
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return Object
 */
nano.utils.getTemplate = function(url){
    var response = $.ajax(url, {
        async : false,
        dataTypeString : 'html'
    });
    return response.responseText;
};

/**
 * Redirects to a different url/application widget
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param string url: new location to go to
 * @return Object
 */
nano.utils.goTo = function(url) {
    window.location = url;
}

/**
 * Renders a pie chart on the desired html id
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param string htmlId: id of the container (div) for the pie chart
 * @param array data: info to be rendered, array of array pairs of label and value
 * @return Object: plotter object.
 */
nano.utils.renderPieChart = function(htmlId, data) {

    var error = false;
    if (data.length < 1)
    {
        error = true;
        $('#' + htmlId).html( _.template(nano.utils.getTemplate(nano.conf.tpls.warning))({msg:'noDataAvailable'}) );
    }

    if (!error)
    {
        // Options: http://www.jqplot.com/docs/files/jqPlotOptions-txt.html
        var plot = $.jqplot(htmlId, [data], {
            /**
             * Colors that will be assigned to the series.  If there are more series 
             * than colors, colors will wrap around and start at the beginning again.
             */
            seriesColors: [ "#f17961", "#f4b819", "#efe52e", "#7cb940", "#47b7e9", "#4bb2c5", "#c5b47f", "#EAA228", "#579575", "#839557", "#958c12", "#953579", "#4b5de4", "#d8b83f", "#ff5800", "#0085cc"],

            grid: {
                    background: '#ffffff',      // CSS color spec for background color of grid.
                    borderColor: '#ffffff',     // CSS color spec for border around grid.
                    shadow: false               // draw a shadow for grid.
            },
            seriesDefaults: {
                // Make this a pie chart.
                renderer: jQuery.jqplot.PieRenderer,
                rendererOptions: {
                    // Put data labels on the pie slices.
                    // By default, labels show the percentage of the slice.
                    showDataLabels: true,
                    sliceMargin: 5
                },
                trendline:{ show: false }
            },
            legend: { show:true, location: 'e' }
        });
    }
    return plot;
};

/**
 * Prints an amount with it's currency in proper format
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param int amount: number to add the currency to
 * @return Object
 */
nano.utils.printCurrency = function(amount, decimals) {
    var value = '';
    if (amount < 0)
    {
        value += '-';
        amount = Math.sqrt(Math.pow(amount, 2)); //Turn it into a positive value.
    }
    value += nano.conf.currency + nano.utils.round(amount, decimals);
    return value;
}

/**
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * Handles API errors
 * @param int amount: number to add the currency to
 * @return Object
 */
nano.utils.onApiError = function(model, error){
    // What do we do?
    switch( error.status ) {
        case 403:
            nano.utils.logout();
            nano.utils.goTo( nano.conf.hash.login + '/sessionExpired' );
            break;
        default:
            // Error Message!
            alert('An unknown error has occured, please try again later.');
            break;
    }
};

/**
 * Sets the right collapsable properties to a view's content
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param object view: Backbone View Object
 * @return void
 */
nano.utils.setCollapsable = function(view) {
    view.$('.collapse').collapse('hide');
    view.$('.collapse').on('hide', function () {
        view.$('.title').removeClass('active');
    });
    view.$('.collapse').on('show', function () {
        view.$('.title').addClass('active');
    });
};

/**
 * Tells whether the viewer is using a mobile device or not
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return boolean
 */
nano.utils.isMobile = function() {
    return nano.conf.device == 'mobile';
};

/**
 * Sync function to be used by the Backbone.js Collections in order to include pagination of the results
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param string method: HTTP method
 * @param object model: the model calling the request
 * @param object options: request options
 * @return boolean
 */
nano.utils.collectionSync = function(method, model, options) {
    if ( method == 'read' )
    {
        if ( _.isUndefined(options.data) ) {
            options.data = {};
        }
        options.data.pageSize = nano.conf.pageSize;
        options.data.page = (options.data.page || this.page) -1;
    }
    return Backbone.sync(method, model, options);
}

/**
 * Sync function to be used by the Backbone.js Collections in order to parse the response from the fetch calls
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @param object response: result from the server
 * @return object
 */
nano.utils.collectionParse = function(response) {
    this.pageSize = response.pageSize;
    this.totalRecords = response.totalRecords
    this.page = response.page;
    return response.results;
}

/**
 * Validates that the input can only receive digits
 * @author Carlos Soto <carlos.soto@lognllc.com>
 * @return boolean
 */
nano.utils.validateNumber = function(event) {
    var allow = true;
    var key = window.event ? event.keyCode : event.which;
    
    var keyCodes = {
        8  : '?',
        9  : 'tab',
        35 : 'end',
        36 : 'home',
        37 : '?',
        39 : '?',
        46 : '?'
    };

    if ( !keyCodes[event.keyCode] && (key < 48 || key > 57) ) {
        allow = false;
    }

    return allow;
};


/**
 * Whoever wrote this should document the code
 * @author ??? (somebody at VMware)
 */
nano.utils.setUsers = function(userCount, callbacks) {
        $.ajax({
            url : nano.conf.urls.admin + "?count=" + userCount,
            type : 'POST',
            headers : nano.utils.getHttpHeaders(),
            success : function(data, textStatus, jqXHR){
                //logout current user.
                nano.utils.logout();
            },
            error : function(jqXHR, textStatus, errorThrown){
                if (_.isFunction(callbacks.error))
                {
                    callbacks.error(jqXHR, textStatus, errorThrown);
                }
            }
        });
};


/**
 * Aliases for the functions used in the views to make them shorter
 * @author Carlos Soto <carlos.soto@lognllc.com>
 */
var translate = nano.utils.translate;
var printCurrency = nano.utils.printCurrency;
var round = nano.utils.round;