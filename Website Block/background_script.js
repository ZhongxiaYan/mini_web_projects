//Runs the background script that handles all of the messages from popup.js and inject.js
//Stores lists of blocked websites and their blocked times, as well as reset time and usage time,
//in chrome.storage.sync

console.log = function(){};

console.log("Hello world!");
//Array contains websites to be blocked periodically
var blocked_websites_array = [];
//Array contains times that the corresponding websites were last blocked
var times_array = [];
//The amount of time (integer, not string) before the user can access the website again, measured from
//the beginning of the previous session
var reset_length;
//The amount of time (integer, not string) that the user can use the website before website automatically
//closes
var usage_length;

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

//Sets initial values from chrome.storage
chrome.storage.sync.get(function(item){
  //Sets websites and times arrays
  var blocked_websites = item["blocked_websites"];
  var times = item["times"];
  if (typeof blocked_websites == "undefined")
    blocked_websites = [];
    times = [];
  for (i = 0; i < blocked_websites.length; i++) {
    blocked_websites_array.push(blocked_websites[i]);
    times_array.push(times[i]);
  }
  //Sets reset_length and usage_length
  reset_length = item["reset_length"];
  usage_length = item["usage_length"];
  if (typeof reset_length == "undefined")
    reset_length = 3600000;
  if (typeof usage_length == "undefined")
    usage_length = 300000;
  console.log(blocked_websites_array);
  console.log(times_array);
});

//Receives and process messages from the popup.js and inject.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request.greeting);
    //Receives message from inject.js if a new tab is opened
    if (request.greeting == "new tab") {
    	var tab_hostname = request.var1;
      var blocked_index = blocked_websites_array.indexOf(tab_hostname)
      //How much time before session auto closes. Does not do anythign if it stays 0
      var count_down = 0;
      //Checks if hostname of new tab is in blocked_websites_array
      if (blocked_index > -1) {
        //Check how much time passed since beginning and end of last session
        var time = Date.now();
        if (typeof times_array[blocked_index] == "undefined")
          times_array[blocked_index] = [0];
        var reset_end_time = times_array[blocked_index] + reset_length;
        var usage_end_time = times_array[blocked_index] + usage_length;
        //Close the tab if usage time has passed but not reset time, sets the time of time
        //of visit to website if reset time has passed, set count_down if usage time still remains
        if (time <= reset_end_time && time >= usage_end_time && times_array[blocked_index] !== 0) {
          chrome.tabs.remove(sender.tab.id); 
        } else if (times_array[blocked_index] == 0) {
            times_array[blocked_index] = time;
            count_down = times_array[blocked_index] + usage_length - time;
        } else {
            if (time > reset_end_time) {
              times_array[blocked_index] = time;
            }
            count_down = times_array[blocked_index] + usage_length - time;
        }
        //Closes window after usage time expires
        if (count_down > 0 && reset_length !== 0) {
          sendResponse({count_down: count_down});
        }
      }
      
      console.log(times_array);
      console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
      //Receives messages from popup.js for adding websites
    } else if (request.greeting == "add url") {
        //Checks if website is in blocked_websites_array
        if (blocked_websites_array.indexOf(request.var1) == -1 && request.var1 !== "") {
            blocked_websites_array.push(request.var1);
            times_array.push(0);
        }
        //Saves blocked_websites_array to chrome.storage
        chrome.storage.sync.get(function(item) {
          chrome.storage.sync.set({"blocked_websites": blocked_websites_array, "times" : times_array}, function() {});
        });
        //Gives updated websites and times arrays to popup javascript
        sendResponse({blocked_websites: blocked_websites_array, times: times_array});
        console.log(blocked_websites_array);
        console.log(times_array);
      //Receives message from popup.js for deleting websites
    } else if (request.greeting == "delete url") {
        var website = request.var1;
        var website_index = blocked_websites_array.indexOf(website);
        console.log(blocked_websites_array);
        console.log(website_index);
        //Checks if website is in blocked_websites_array, if so, delete element from array
        //and its corresponding last visited time
        if (website_index > -1){
          blocked_websites_array.splice(website_index, 1);
          times_array.splice(website_index, 1);
          console.log(blocked_websites_array);
          console.log(times_array);
        }
        //Saves the array to chrome.storage
        chrome.storage.sync.get(function(item){
          chrome.storage.sync.set({"blocked_websites": blocked_websites_array, "times" : times_array}, function() {});
        });
        //Gives updated websites and times to popup.js
        sendResponse({blocked_websites:blocked_websites_array, times:times_array});
        //Receives message from popup.js. Initialize popup.js with the proper blocked websites, their corresonding
        //blocked times, and the usage length and reset length
    } else if (request.greeting == "popup opened") {
        sendResponse({blocked_websites:blocked_websites_array, times:times_array, reset_length:reset_length, usage_length:usage_length});
        //Receives message from popup.js. Changes the reset_length in background_script.js and chrome storage
    } else if (request.greeting == "change reset") {
        reset_length = parseInt(request.var1);
        console.log(reset_length);
        chrome.storage.sync.set({"reset_length": reset_length}, function() {});
        //Receives message from popup.js. Changes the usage_length in background_script.js and chrome storage
    } else if (request.greeting == "change usage") {
        usage_length = parseInt(request.var1);
        console.log(usage_length);
        chrome.storage.sync.set({"usage_length": usage_length}, function() {});
    } 
  }
);
