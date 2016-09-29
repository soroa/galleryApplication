var devicename; // the name of this screen and specified in the URL
var imageCount = 7; // the maximum number of images available

//Variable that keeps track of the remoteId to which the screen is
//connected. By design, a screen can only be connected to one remote.
var connectedRemote = -1;

document.addEventListener("DOMContentLoaded", function(event) {
    //Gets the name of the screen from the query parameters
    devicename = getQueryParams().name; 
    if (devicename) {
        var text = document.querySelector('#name');
        text.textContent = devicename;
    }
    //ConnectToServer(devicename);
    socket = io.connect('', {query: {type: "Screen", name: devicename}});       

    //Deal with remote connect message ----------------------------------------
    socket.on("remoteConnect", function(data){
	var remoteId = data.remote;
	var screenName = data.screen;
	
	//Deal with message only if it is scoped to this screen
	if (screenName == devicename){
	    if (connectedRemote == -1){
		connectedRemote = remoteId;
	    }
	    else {
	    clearImage();
		alert("Screen is already connected to a remote!");

	    }
	}
    });


    //Deal with remote disconnect message -------------------------------------
    socket.on("remoteDisconnect", function(data){
	var remoteId = data.remote;
	var screenName = data.screen;
	
	//Deal with message only if it is scoped to this screen
	if (screenName == devicename){
	    if (connectedRemote != -1 && remoteId == connectedRemote){
		connectedRemote = -1;
	    }
	    else {
		alert("Error found!");
	    }
	}
    });


      //Deal with remote close message -------------------------------------
    socket.on("remoteClose", function(remoteId){

	
	    if (connectedRemote != -1 && remoteId == connectedRemote){
		connectedRemote = -1;
		clearImage();
	    }
	 //    else {
		// alert("Error found!");
	 //    }
	
    });



    //Deal with new index event ------------------------------------------------
    socket.on("message", function(data){
	//Separate remote id and indexes
	var remoteId = data.remote;
	var indexes = data.indexes;
	
	//Parse data only if message comes from connected
	//remote. Otherwise, ignore message.
	if (remoteId == connectedRemote){
	    //Parse indexes structure to search which index image should
	    //this screen display
	    var found = false;
	    for (var i = 0; i < indexes.length; i++){
		if (indexes[i].screen == devicename && indexes[i].index != null){
		    showImage(indexes[i].index);
		    found = true;
		}
	    }
	    if (found == false){
		//Remove image from screen if nothing is sent to that
		//screen
		clearImage();
	    }
	}
    });
   	
    //New zoom level
    socket.on('zoom', function(data){

    	if(connectedRemote==data.remote){
    	var z = 50 + data.zoom * 10; 
       	document.getElementById("image").style.width = z+ "%";
    	document.getElementById("image").style.height = z + "%";
   		}
    });



});




// Gets an image index and modifies the screen.html accordingly to show the image
function showImage (index){
    var img = document.querySelector('#image');
    var msg = document.querySelector('#msg');
    if (index >= 0 && index <= imageCount){
        img.setAttribute("src", "images/" +index +".jpg");
        msg.style.display = 'none';
        img.style.display = 'block';
    }
}

// Removes the image from the screen, and no image is shown.
function clearImage(){
    var img = document.querySelector('#image');
    var msg = document.querySelector('#msg');
    img.style.display = 'none';
    msg.style.display = 'block';
}

// Parse the parameters in the query URL
function getQueryParams() {
    var qs =  window.location.search.split("+").join(" ");
    var params = {}, tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])]
            = decodeURIComponent(tokens[2]);
    }
    return params;
}

function connectToServer(devicename){
    //Connect to the socket.io server
    socket = io.connect('', {query: {type: "Screen", name: devicename}});
}

