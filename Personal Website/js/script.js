"use strict";

$(document).ready(function() {
    var page_index = choose_index_num();
    $("#navbar").css("left", 0);
    setTimeout(function() {
        $("#navbar").removeAttr("style");
    }, 1000);

    var slider = new Slider($("#slider ul"), $("#slider-button-bar"), 7000);
    $(".navbar-item").each(function(index) {
        if ($(this).has("map").length) {
            var map = new Map($(this).children("map"), $(this).children(".navbar-tile"));
        }
    });
    var navbar = new Navbar($("#navbar"), 150, page_index);
});

function choose_index_num() {
    var full_url = window.location.href;
    var sub_page = full_url.split("/");
    sub_page = sub_page[sub_page.length - 1];
    if (sub_page === "index.html") {
        return 0;
    } else if (sub_page === "projects.html") {
        return 1;
    }
}

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
    this.started = false;

    {
        for (var i = 0; i < self.total_pages; i++) {
            self.button_bar.prepend("<button class=\"slider-button\"></button>");
        }
        self.button_bar.children().on("click", function() {
            self.button_bar.children().css("background-color", "");
            self.button_bar.children().css("border-left-color", "");
            // the play button
            if ($(this).index() == self.total_pages) {
                self.start_slider_loop();
                $(this).css("border-left-color", "green");
            } else {
                self.go_to($(this).index());
                $(this).css("background-color", "yellow");
                self.stop_slider_loop();
            }
        });
    }

    this.start_slider_loop();
    this.started = true;
};


Slider.prototype.go_to = function(index) {
    this.index = index;
    this.panel.css("left", -index * this.page_width + "px");
};

Slider.prototype.next_page = function() {
    this.go_to((this.index + 1) % this.total_pages);
};

Slider.prototype.start_slider_loop = function() {
    if (!this.started) {
        this.interval_id = window.setInterval(this.next_page.bind(this), this.time);
    }
};

Slider.prototype.stop_slider_loop = function() {
    window.clearInterval(this.interval_id);
    this.started = false;
};

var Navbar = function(navbar, separation, page_index) {
    var all_navbar_items = navbar.children(".navbar-item");
    var navbar_items = all_navbar_items.slice(1);
    var prev_link = "";
    all_navbar_items.eq(0).css("top", -separation);
    navbar_items.each(function(n) {
        $(this).css("top", separation * n);
    });
    setTimeout(function() {
        navbar_items.eq(page_index).css("top", separation * (page_index + 0.5));
        var bottom_items = navbar_items.slice(page_index + 1);
        bottom_items.each(function(n) {
            $(this).css("top", separation * (page_index + n + 2));
        });
    }, 1000);
        
    navbar_items.each(function() {
        if (prev_link) {
            console.log("found" + prev_link);
            $(this).find("map").children().eq(0).attr("href", prev_link);
        }
        prev_link = $(this).find("map").children().eq(1).attr("href");
        console.log(prev_link);
    });
}

var Map = function(map, img) {
    var self = this;
    var areas = map.children("area");
    var len = areas.length;
    var original_coords = [];
    var original_width = 0, original_height = 0;

    $("<img/>").attr("src", "images/puzzle.png")
               .load(function() {
                   original_width = this.width;
                   original_height = this.height;
                   self.resize();
                   // window.onresize = self.resize;
                });
    for (var n = 0; n < len; n++) {
        original_coords[n] = areas[n].coords.split(",");
    }

    this.resize = function() {
        var n, m, clen;
        var x_factor = img.width() / original_width;
        var y_factor = img.height() / original_height;
        for (n = 0; n < len; n++) {
            clen = original_coords[n].length;
            var new_coords = [];
            for (m = 0; m < clen; m += 2) {
                new_coords[m] = original_coords[n][m] * x_factor;
                new_coords[m + 1] = original_coords[n][m + 1] * y_factor;
            }
            areas[n].coords = new_coords.join(',');
        }
        return true;
    };
}