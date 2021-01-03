/*
(c) Jordi Cenzano 2018
 */

'use strict';
/* jshint esversion: 6 */
/* jslint browser: true */
/* jshint devel: true */
/* global window */

let url_vars = {};

function readUrlVars(){
    url_vars = getUrlVars();

    console.log(`Vars read from URL: ${JSON.stringify(url_vars)}`);

    if ( (typeof (url_vars.m) != 'undefined') &&  (url_vars.m != "") ) {
        const manifest_url = url_vars.m;
        console.log("Detected manifest url: " + manifest_url);
    }
}

function getUrlVars() {
    const ret = {};
    // Use m in the last position if the querystring
    let m_is_set = false;
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        if (m_is_set) {
            ret.m = ret.m + '&' + key + '=' + value;
        }
        else {
            ret[key] = value;
        }

        if (key === 'm') {
            m_is_set = true;
        }
    });

    return ret;
}