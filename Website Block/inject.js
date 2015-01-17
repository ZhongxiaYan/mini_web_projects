//Content script that runs whenever a new tab is opened
//Sends a message with the tab's url name and the greeting 'new tab'
//to background_script.js
chrome.runtime.sendMessage({
  greeting: "new tab",
  var1: window.location.hostname, 
}, 
function(response) { //Receives the remaining usage time left from background_script.js
	if (response.count_down > 10000) {
		//Implement a countdown that closes the window after the remaining usage time passes
		setTimeout(function() {
			window.alert("Ten seconds before window closes!");
			setTimeout(function() { //Close window after 10 more seconds, timer starts when user clicks away the alert
				location.reload();
				window.close();
			}, 10000);
		}, response.count_down - 10000);
	} else { // close window when time runs out
		setTimeout(function() { 
			location.reload();
			window.close();
		}, response.count_down);
	}
});
