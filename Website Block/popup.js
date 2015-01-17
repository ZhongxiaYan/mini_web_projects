//javascript for popup.html. Runs all of its functions and communicates with background_script.js

console.log = function(){};

console.log("start");

//Assign a default value to an empty string
function define(x, default_value){
	if (x == "")
		x = default_value;
	return x;
}

//Converts time from input form to milliseconds
function timeToMilliseconds(time){
	var hours = time.hourLength.value;
	var minutes = time.minuteLength.value;
	var seconds = time.secondLength.value;
	//Assigns 0 to the inputs with nothing
	hours = define(hours, "0");
	minutes = define(minutes, "0");
	seconds = define(seconds, "0");
	var milliseconds = 1000*(parseInt(seconds)+60*(parseInt(minutes) + 60*parseInt(hours)));
	return milliseconds
}

//Converts time from millisecond to a readable string in Hr, Min, and Sec
function milliToTime(milliseconds){
	var seconds = Math.floor(milliseconds/1000);
	var minutes = Math.floor(seconds/60);
	var hours = Math.floor(minutes/60);
	seconds = seconds%60;
	minutes = minutes%60;
	var return_string = ""
	if (hours > 0)
		return_string += hours.toString() + " Hr ";
	if (minutes > 0)
		return_string += minutes.toString() + " Min ";
	if (seconds > 0)
		return_string += seconds.toString() + " Sec";
	return return_string;
}

//Parses hostname from an url. If url is invalid, return -1, else returns the hostname
function getHostname(url){
	var list = url.split('/');
	var i = 0;
	var hostname = -1;
	while (i < list.length){
		var matched_list = list[i].match(/([a-z]+\.){2,4}[a-z]+/);
		if (matched_list !== null && matched_list[0] == list[i]){
			hostname = list[i];
			i = list.length + 1;
		}
		i++;
	}
	return hostname;
}

//Sends "Popup opened" greeting to background_script.js. Receives info from background_script.js and update popup.html
chrome.runtime.sendMessage({greeting: "popup opened"}, function(response){
	//Receives and updates popup.html with list of blocked websites
	websites = response.blocked_websites;
	for (i=0; i < websites.length; i++){
		document.getElementById("blocked").innerHTML += websites[i] + "<br>";
	}
	//Receives and updates popup.html with the reset time and usage time
	document.getElementById("block_lengths").innerHTML += "Reset Time: " + milliToTime(response.reset_length) + "<br>"
	document.getElementById("block_lengths").innerHTML += "Usage Time: " + milliToTime(response.usage_length) + "<br>"
}
);

//Detects when enter key is pressed, submits the form whose content is not null, if any
document.addEventListener("keypress", function(event){
	if (event.keyCode == 13)
		event.preventDefault();
		if (document.submitWebsite.website.value !== "" && event.keyCode == 13){
			document.getElementById("input_button").click();
		} else if (document.deleteWebsite.website.value !== "" && event.keyCode == 13) {
			document.getElementById("delete_button").click();
		} else if (event.keyCode == 13 && (document.changeResetLength.hourLength.value !== "" || document.changeResetLength.minuteLength.value !== "" || document.changeResetLength.secondLength.value !== "")) {
			document.getElementById("reset_button").click();
		} else if (event.keyCode == 13 && (document.changeUsageLength.hourLength.value !== "" || document.changeUsageLength.minuteLength.value !== "" || document.changeUsageLength.secondLength.value !== "")) {
			document.getElementById("usage_button").click();
		}
});

//Waits until popup.html loads. If a button is clicked, run its corresponding function 
document.addEventListener("DOMContentLoaded", function() {
	document.getElementById("close_window").addEventListener("click", closeWindow); 
    document.getElementById("input_button").addEventListener("click", addWebsite);
    document.getElementById("delete_button").addEventListener("click", deleteWebsite);      
    document.getElementById("reset_button").addEventListener("click", changeResetLength); 
    document.getElementById("usage_button").addEventListener("click", changeUsageLength);
});

//Closes the window
function closeWindow(){
	location.reload();
	window.close();
}

//Blocks a new website
function addWebsite(){
	//Get website's value from popup.html's submitWebsite form
	var website = document.submitWebsite.website.value;
	//If hostname is invalid(-1), alert the user, else send hostname to background_script.js
	var hostname = getHostname(website);
	if (hostname === -1){
		window.alert(website + ' is an invalid hostname!\nHint: did you include the www.?');
	} else{
		//Send hostname to background_script.js with the greeting of 'add url'
		chrome.runtime.sendMessage({
		  greeting: "add url",
		  var1: hostname
		}, 
		function(response){});
		//Refreshes popup.html
		location.reload();
	}
}

//Removes the block from a website
function deleteWebsite(){
	//Get website's value from popup.html's deleteWebsite form
	var website = document.deleteWebsite.website.value;
	var hostname = getHostname(website);
	//If hostname is invalid(-1) or not in the list, alert the user
	if (websites.indexOf(hostname) === -1){
	  	window.alert(website + ' is not in blocked list');
	} else {
		//Send hostname to background_script.js with the greeting of 'delete url'
		chrome.runtime.sendMessage({
		  greeting: "delete url",
		  var1: hostname
		}, 
		function(response){});
		//Refreshes popup.html
		location.reload();
	}
}

//Changes the reset length
function changeResetLength(){
	//Send new reset length to background_script.js with the greeting of 'change reset'
	chrome.runtime.sendMessage({
	  greeting: "change reset",
	  var1: timeToMilliseconds(document.changeResetLength)
	}, 
	function(response){});
	//Refreshes popup.html
	location.reload();
}

//Changes the usage length
function changeUsageLength(){
	//Send new usage length to background_script.js with the greeting of 'change usage'
	chrome.runtime.sendMessage({
	  greeting: "change usage",
	  var1: timeToMilliseconds(document.changeUsageLength)
	}, 
	function(response){});
	//Refreshes popup.html
	location.reload();
}