$(document).ready(function() {
    $("#navbar").css("left", 0);
    setTimeout(function() {
        $("#navbar").removeAttr("style");
    }, 1000);
});