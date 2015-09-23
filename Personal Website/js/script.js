"use strict";

$(document).ready(function() {
    $("#navbar").css("left", 0);
    setTimeout(function() {
        $("#navbar").removeAttr("style");
    }, 1000);

    var slider = new Slider($("#slider ul"), $("#slider-button-bar"), 7000);

});

var Slider = function(slider_ul, slider_button_bar, time_ms) {
    var self = this;

    this.panel = slider_ul;
    this.button_bar = slider_button_bar;
    this.time = time_ms;

    this.page_width = this.panel.parent().width();
    this.panel.parent().width(this.page_width);
    this.panel.children().width(this.page_width);

    this.total_pages = this.panel.children().length;
    this.panel.width(this.page_width * (this.total_pages + 1));
    
    this.index = 0;

    {
        for (var i = 0; i < self.total_pages; i++) {
            self.button_bar.append("<button class=\"slider-button\"></button>");
        }
        self.button_bar.children().on("click", function() {
            self.button_bar.children().eq(self.index).css("background-color", "");
            self.go_to($(this).index());
            $(this).css("background-color", "yellow");
        });
    }

    window.setInterval(this.next_page.bind(this), this.time);
};


Slider.prototype.go_to = function(index) {
    this.index = index;
    this.panel.css("left", -index * this.page_width + "px");
};

Slider.prototype.next_page = function() {
    console.log(this);
    this.go_to((this.index + 1) % this.total_pages);
};

Slider.prototype.update_screen = function() {
    this.page_width = this.panel.parent().width();
    this.panel.children().width(this.page_width);
    this.total_pages = this.panel.children().length;

    this.panel.width(this.page_width * (this.total_pages + 1));

    this.panel.css("transition", "0s");
    this.panel.css("left", -this.index * this.page_width + "px");
    setTimeout(function() {
        this.panel.css("transition", "");
    }, 1000);
};  