var currentImage = 0; // the currently selected image
var imageCount = 7; // the maximum number of images available

var socket = NaN;

//Array that keeps track of the screens 
var tracked_screens = new Array();
var connected_screens = new Array();

//Keeps track of last clicked image
var lastClickedImageIndex = 0;

//Random number that identifies the remote tab...
var remoteId = Math.floor(Math.random()*10001);

//acceleration variable - Andrea
var restPosition = true; 
var counter = 0; 

//orientation variables
//1: max zoomed out, 4: max zoomed in 
var currentZoomLevel = 1; 


function trackScreen(screenName){
    // === Remove the default text first =============
    //Check if other screens tracked
    if (tracked_screens.length == 0){
    //Remove span
    var defaultText = document.getElementById("defaulttext");
    defaultText.parentNode.removeChild(defaultText);
    }
    // === Append screenName to array ================
    tracked_screens.push(screenName)

    // === Add new devide to the list =================
    //Get the menu element
    var menuList = document.getElementById('menu').children[0];
    
    //Create new li entry
    var entry = document.createElement('li');
    entry.id = screenName;

    //Append first the screen name
    var textNode = document.createTextNode(screenName);
    entry.appendChild(textNode);

    //Append some spaces
    entry.appendChild(document.createTextNode("  "));

    //Create the connect button and append it to li element
    var element = document.createElement('input');
    element.type='button';
    element.value = "Connect!";

    //Set the right onclick call
    element.onclick = function(onClickEvent){connectToScreen(onClickEvent); return false;};

    entry.appendChild(element);
    
    //Append new entry to menu
    menuList.appendChild(entry);
}

function untrackScreen(screenName){
    //Check if screen was in connected screens
    var screen_index = NaN;
    var found = false;
    for (var i = 0; i < connected_screens.length; i++){
    if (connected_screens[i].name == screenName){
        found = true;
        screen_index = i;
        break;
    }
    }
    if (found == true){
    //Remove screen from connected screens
    var screen_to_remove = connected_screens[screen_index];

    //Get old image index
    var old_index = screen_to_remove.index;

    //Re-compute indexes for screens that were connected later
    //than this one.

    //Iterate the screens that were connected later (the ones that
    //must be updated)
    for (var i = screen_index + 1; i < connected_screens.length; i++){
        connected_screens[i].index = old_index;
        old_index = (old_index + 1)%imageCount;
    }

    //Remove it from connected screens
    connected_screens.splice(screen_index, 1)

    //Call to update images (send new indexes)
    updateImages();

    //Emit remoteToScreenConnection message
    //var data = {screen: screenName, remote: remoteId};
    //socket.emit('remoteDisconnect', data);
    }

    //Remove screen from tracked screens too
    var screen_index = NaN;
    var found = false;
    for (var i = 0; i < tracked_screens.length; i++){
    if (tracked_screens[i] == screenName){
        screen_index = i;
        found = true;
        break;
    }
    }
    
    if (found == true){
    var screen_to_remove = tracked_screens[screen_index];
    tracked_screens.splice(screen_index, 1)
    
    //Check if other screens are present. If not, write default
    //message
    if (tracked_screens.length == 0){
        //Remove span
        var menuDiv = document.getElementById("menu");
        var parNode = document.createElement("p");
        var node = document.createTextNode("No devices detected");
        parNode.appendChild(node)
        parNode.id = 'defaulttext';
        menuDiv.appendChild(parNode);
    }
    
    //Remove screen from <ul> list
    var li_to_remove = document.getElementById(screen_to_remove);
    li_to_remove.parentNode.removeChild(li_to_remove);
    }
}

function connectToScreen(onClickEvent){
    //Get screenname
    var screenName = onClickEvent.target.parentElement.id;

    //Calculate image index for new screen
    if (connected_screens.length == 0){
    var last_index = lastClickedImageIndex;
    var new_index = last_index;
    var new_connected_screen = {name:screenName, index: new_index};
    }
    else {
    var last_index = connected_screens[connected_screens.length-1].index;
    var new_index = (last_index + 1)%imageCount;
    var new_connected_screen = {name:screenName, index: new_index};
    }
    
    //Put screenName on connectedScreens
    connected_screens.push(new_connected_screen);
    
    //Call to update images (send new indexes)
    updateImages();

    //Change button state!
    var button = document.getElementById(screenName);
    button = button.childNodes[2];
    button.setAttribute('value',  'Disconnect!');
    button.setAttribute('onclick',  'disconnectFromScreen(event);');

    //Emit remoteToScreenConnection message
    var data = {screen: screenName, remote: remoteId};
    socket.emit('remoteConnect', data);
    updateImages();
}

function disconnectFromScreen(onClickEvent){
    //Get screenname
    var screenName = onClickEvent.target.parentElement.id;

    //Search for screen index in connected screens array
    var screen_index = NaN;
    var found = false;
    for (var i = 0; i < connected_screens.length; i++){
    if (connected_screens[i].name == screenName){
        screen_index = i;    
        found = true;
        break;
    }
    }
    
    if (found == true){
    //Modify image indexes for screens connected later than the
    //disconnected screen
    
    //Get previous image index of screen to disconnect
    var old_index = connected_screens[screen_index].index;

    //Iterate the screens that were connected later (the ones that
    //must be updated)
    for (var i = screen_index + 1; i < connected_screens.length; i++){
        connected_screens[i].index = old_index;
        old_index = (old_index + 1)%imageCount;
    }

    //Remove screenName from connected screens
    connected_screens.splice(screen_index, 1)

    //Call to update images (send new indexes)
    updateImages(); 

    //Change button state!
    var button = document.getElementById(screenName);
    button = button.childNodes[2];
    button.setAttribute('value',  'Connect!');
    button.setAttribute('onclick',  'connectToScreen(event);');
    
    //Emit remoteToScreenConnection message
    var data = {screen: screenName, remote: remoteId};
    socket.emit('remoteDisconnect', data);
    }
}


function showImage (index){
    //Update global variable
    lastClickedImageIndex = index;

    //Parameter index is the last picture index that was clicked: it
    //has to be assigned to the first connected screen
    
    // Update selection on remote
    currentImage = index;
    var images = document.querySelectorAll("img");
    document.querySelector("img.selected").classList.toggle("selected");
    images[index].classList.toggle("selected");

    // Send the command to the screens: every time a new image has
    // been clicked, all indexes must be updated!

    //Compute new indexes
    var indexes = createIndexes(index);

    //Send remoteId too
    var data = {remote: remoteId, indexes: indexes};

    //Send message
    socket.emit('image index', data);
}


function updateImages(){
    //Get the last clicked image 
    var head_index = lastClickedImageIndex;

    //Create new indexes
    var indexes = createIndexes(head_index);
    
    //Send remoteId too
    var data = {remote: remoteId, indexes: indexes};

    //Send new   to screens
    socket.emit('image index', data);
}


//This function creates the image indexes corresponding to the
//connected screens
function createIndexes(index){
    //parameter index is the lastly clicked image index
    
    //Store results here
    var indexes = new Array();

    var new_index = index;
    for (var i = 0; i < connected_screens.length; i++){
    
    //Populate new indexes variable
    indexes.push({screen: connected_screens[i].name, index: new_index});

    //Increment new_index modulus 7
    new_index = (new_index + 1)%imageCount;
    }
    return indexes;
}

function initialiseGallery(){
    var container = document.querySelector('#gallery');
    var i, img;
    for (var i = 0; i < imageCount; i++) {
        img = document.createElement("img");
        img.src = "images/" +i +".jpg";
        document.body.appendChild(img);
        var handler = (function(index) {
            return function() {
                showImage(index);
            }
        })(i);
        img.addEventListener("click",handler);
    }
    document.querySelector("img").classList.toggle('selected');
}


document.addEventListener("DOMContentLoaded", function(event) {
    //Start gallery first
    initialiseGallery();
    addEventListenerDevMotion();
    addEventListenerDevOrient()
    document.querySelector('#toggleMenu').addEventListener("click", function(event){
        var style = document.querySelector('#menu').style;
        style.display = style.display == "none" || style.display == ""  ? "block" : "none";
    });
    
    // Then connect to the server
    connectToServer();
});


function connectToServer(){
    // Connect to the socket.io server
    socket = io.connect('', {query: {type: "Remote", remote: remoteId}});

    //Add screenName to list of devices when event occurs
    socket.on('screenConnectedToServer', function(screenName){
    trackScreen(screenName);
    });

     socket.on('preExistingScreens', function(data){
    if(data.remote ==remoteId){

            for (i = 0; i < data.screens.length; i++) { 
                scr = data.screens[i];
                trackScreen(scr);
            }
        
            
        }

    
    });

    //Deal with screenName disconnect
    socket.on('screenDisconnectedFromServer', function(screenName){
    untrackScreen(screenName);
    });

   


   




}



// new Stuff Andrea -- from here it's all new stuff
///Device Orientetion Event is gives the current alpha, beta, gamma angles of the cellphone

function addEventListenerDevOrient(){
    if(window.DeviceOrientationEvent){
         window.addEventListener('deviceorientation', function(eventData) {
    // gamma is the left-to-right tilt in degrees, where right is positive
    var tiltLR = eventData.gamma;

    // beta is the front-to-back tilt in degrees, where front is positive
    var tiltFB = eventData.beta;

    // alpha is the compass direction the device is facing in degrees
    var dir = eventData.alpha

    // call our orientation event handler
    deviceOrientationHandler(tiltLR, tiltFB, dir);
  }, false);
        
    }else{
        //orientation events not supported
    }

}

//called from within addEventListenerDevOrient whenever the device orientation event is fired
function deviceOrientationHandler(tiltLR, tiltFB, dir){

    if(currentZoomLevel!=1 &&  tiltFB>40){
        currentZoomLevel = 1; 

    }
    if(currentZoomLevel!=2 && tiltFB<=40 && tiltFB>30){
        currentZoomLevel = 2; 
    }
    if(currentZoomLevel!=3 && tiltFB<=30 && tiltFB>20){
        currentZoomLevel = 3; 
    }
    if(currentZoomLevel!=4 && tiltFB<=20 && tiltFB>0){
         currentZoomLevel = 4; 
    }
    updateZoom(currentZoomLevel);


}
//sends new message to server telling to inform screens to update zoom 
function updateZoom(zoom){
    var data = {remote: remoteId, zoom:zoom};
    socket.emit('zoom', data);
}

function addEventListenerDevMotion(){
    if(window.DeviceMotionEvent){
        window.addEventListener('devicemotion', deviceMotionHandler,false); 
    }
}


function deviceMotionHandler(eventData){
     // Grab the acceleration from the results  
    var acceleration = eventData.acceleration;


    if(restPosition==false){
        if(counter*eventData.interval<200){
         counter = counter +1; 
        }else{
            counter = 0; 
            restPosition=true; 
        }
    }

    // Grab the rotation rate from the results
     var rotation = eventData.rotationRate;
    if(rotation.gamma >6){
     if(restPosition==true){
          restPosition = false;
          var nextImg = (currentImage + imageCount - 1) % imageCount;
          showImage(nextImg);
        }
     }
   if(rotation.gamma < -6){
     if(restPosition==true){
      restPosition = false;
      var nextImg = (currentImage +1) % imageCount;
      showImage(nextImg);}

          
   }
 
}

