// Google Map
let map;

// Markers for map
let markers = [];

// Info window
let info = new google.maps.InfoWindow();


// Execute when the DOM is fully loaded
$(document).ready(function() {

    // Styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    let styles = [

        // Hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // Hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];

    // Options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    let options = {
        center: {lat: 37.405983, lng: -122.001474}, // Sunnyvale, California
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // Get DOM node in which map will be instantiated
    let canvas = $("#map-canvas").get(0);

    // Instantiate map
    map = new google.maps.Map(canvas, options);

    // Configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

});


// Add marker for place to map.
// This function adds a marker for place on the map, where place is a JavaScript object that represents a row from the places table in mashup.db.
function addMarker(place)
{
    // instantiate marker
    // Here we extract our Google-Map-friendly latitude and longitude.
    var aLatLng = new google.maps.LatLng(place.latitude, place.longitude);

    var placename = place.place_name + ", " + place.admin_name1

    // Here we define a basic marker.
    var marker = new google.maps.Marker({
    position: aLatLng,
    map: map,
    title: placename
    });


    // These next lines will also trigger an animation if the mouse cursor moves over a marker.
    // Source: https://developers.google.com/maps/documentation/javascript/markers
    //marker.addListener('mouseover', toggleBounce);
    //function toggleBounce() {
    //    if (marker.getAnimation() !== null) {
    //       marker.setAnimation(null);
    //    } else {
    //        marker.setAnimation(google.maps.Animation.BOUNCE);
    //    }
    //}

    // get articles for place
    google.maps.event.addListener(marker, "click", function(){
        showInfo(marker);
        let news = {
            geo: place.postal_code
        };
        $.getJSON(("/articles"), news, function(articles) {
            var articlelist = "<ul>";
            for (var i = 0; i < articles.length; i++) {
                articlelist += '<li><a target="_blank" href="' +
                                    articles[i].link +
                                    '">' +
                                    articles[i].title +
                                    "</a></li>";
            }
            articlelist += "</ul>";

            showInfo(marker, articlelist);
            });

        });


    // remember marker
    // Remember markers, the array defined at the beginning of the document?
    // We will be pushing our work to that array via the JavaScript array push() method.
    // Source: https://www.w3schools.com/jsref/jsref_push.asp
    markers.push(marker);


}


// Configure application
function configure()
{
    // Update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {

        // If info window isn't open
        // http://stackoverflow.com/a/12410385
        if (!info.getMap || !info.getMap())
        {
            update();
        }
    });

    // Update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // Configure typeahead
    $("#q").typeahead({
        highlight: false,
        minLength: 1
    },
    {
        display: function(suggestion) { return null; },
        limit: 10,
        source: search,
        templates: {
            suggestion: Handlebars.compile(
                "<div>" +
                "{{place_name}}, {{admin_name1}}, {{postal_code}}" +
                "</div>"
            )
        }
    });

    // Re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // Set map's center
        map.setCenter({lat: parseFloat(suggestion.latitude), lng: parseFloat(suggestion.longitude)});

        // Update UI
        update();
    });

    // Hide info window when text box has focus
    $("#q").focus(function(eventData) {
        info.close();
    });

    // Re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
        event.cancelBubble && event.cancelBubble();
    }, true);

    // Update UI
    update();

    // Give focus to text box
    $("#q").focus();
}


// Remove markers from map
// removeMarker: 1. remove all markers from the map and delete them. 2. Google Maps API
function removeMarkers()
{
    for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
    markers = [];
}


// Search database for typeahead's suggestions
function search(query, syncResults, asyncResults)
{
    // Get places matching query (asynchronously)
    let parameters = {
        q: query
    };
    $.getJSON("/search", parameters, function(data, textStatus, jqXHR) {

        // Call typeahead's callback with search results (i.e., places)
        asyncResults(data);
    });
}


// Show info window at marker with content
function showInfo(marker, content)
{
    // Start div
    let div = "<div id='info'>";
    if (typeof(content) == "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='/static/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // End div
    div += "</div>";

    // Set info window's content
    info.setContent(div);

    // Open info window (if not already open)
    info.open(map, marker);
}


// Update UI's markers
function update()
{
    // Get map's bounds
    let bounds = map.getBounds();
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    // Get places within bounds (asynchronously)
    let parameters = {
        ne: `${ne.lat()},${ne.lng()}`,
        q: $("#q").val(),
        sw: `${sw.lat()},${sw.lng()}`
    };
    $.getJSON("/update", parameters, function(data, textStatus, jqXHR) {

       // Remove old markers from map
       removeMarkers();

       // Add new markers to map
       for (let i = 0; i < data.length; i++)
       {
           addMarker(data[i]);
       }
    });
};
