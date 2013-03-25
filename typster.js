/**
 * Typster v0.1.0
 */
var typewriter = (function($){
    var BACKSPACE = 8;
    var RETURN = 13;
    var SPACEBAR = 32;
    var TAB = 9;
    var NON_BLOCKING_MODIFIERS = [16, 17, 18, 91];
    var SFX_DIR = 'sfx/noisy-typer/';

    // infernal state
    var $carbon, $cursor;
    var col, row;
    // on enter key, store length of the line so we can backspace over newlines
    var rowlength = [];
    // sound effects
    var sfx = [];
    var blinky;
    var block = false;

    var font_config = {
        underwood: {
            font_class: 'underwood',
            center_chars: '.!\'"',
            monospaced: false
        },
        atype: {
            font_class: 'atype',
            col_width : 10,
            center_chars: '.!\'"',
            monospaced: false
        },
        carpal: {
            font_class: 'carpal',
            // col_width : 10,
            // center_chars: '.!\'"'
            monospaced: false
        },
    };

    // configuration options
    var config = {
        font_class : 'courier',
        monospaced : true,
        row_height : 18,
        col_width  : 11,
        backspace_over_newline : true,
        cursor_blink_interval : 0, // 500
        rate_limit: 50,
        enable_sounds: true,
        auto_scroll_buffer : 300,
        center_chars : ''
    };

    $.extend(config, font_config.carpal);
    // $.extend(config, font_config.underwood);
    // $.extend(config, font_config.atype);

    var log = {
        error_enabled : true,
        debug_enabled : !!window.location.hostname.match(/localhost/),
        trace_enabled : !!window.location.hostname.match(/localhost/),

        error : function(msg){
            if(this.error_enabled && console){
                console.error(msg);
            }
        },
        debug : function(msg){
            if(this.debug_enabled && console){
                console.debug(msg);
            }
        },
        trace : function(msg){
            if(this.trace_enabled && console){
                console.debug(msg);
            }
        }

    };

    // effects
    // shift stick - uppercase a letter
    // blur        - fuzz a letter
    // two letters - type an extra letter that is near the one typed
    // fade        - running low on toner
    // 80col       - keep hitting the last column
    // jammed      - type two letters next to eachother at once and stop responding
    // bold        - type the same letter over eachother (hard hit)

    function h2c(){
        if(html2canvas){
            $cursor.hide()
            var pwin = window.open('', 'printwin', '');
            html2canvas($carbon, {
                onrendered : function(canvas){
                    pwin.document.body.appendChild(canvas);
                    $cursor.show();
                }
            });
        }
    }

    // utility functions
    function style(topoff, leftoff){
        var top  = ((config.row_height * row) + (topoff  ? topoff  : 0)) + 'px;';
        var left = ((config.col_width  * col) + (leftoff ? leftoff : 0)) + 'px;';

        var topLeft = 'top:' + top + ' left:' + left;
        var widthHeight =  'width:' + config.col_width + 'px; height:' + config.row_height + 'px;'

        return  topLeft + ' ' + widthHeight;
    }

    function lastSpan(){
        return $('#carbon span.type:last-child');
    }

    function defspan(topoff, leftoff){
        return $('<span>', { 'class' : "type none", 'style' : style(topoff, leftoff) });
    }

    function writeCharacter(char){
        var $next = lastSpan();

        // // Don't generate an effect immediately after generating an effect.
        // // Don't generate an effect on the first column.
        // if($next.hasClass('none') && col > 0){
        //     // generate effect randomly, insert a new
        //     // maybe recalculate $next for new span
        //     var chance = Math.random();

        //     if(chance < 0.05){
        //         $next = defspan(0, -2).removeClass('none').addClass('left-shift');
        //         $carbon.append($next);
        //     } else if (chance < 0.10) {
        //         $next = defspan(0, 1).removeClass('none').addClass('right-shift');
        //         $carbon.append($next);
        //     } else if (chance < 0.20) {
        //         $next = defspan().removeClass('none').addClass('blur');
        //         $carbon.append($next);
        //     } else if (chance < 0.22) {
        //         $next = defspan().removeClass('none').addClass('wiggle');
        //         $carbon.append($next);
        //     } else if (chance < 0.25) {
        //         $next = defspan().removeClass('none').addClass('fade');
        //         $carbon.append($next);
        //     }

        // } else {
        //     $next = defspan();
        //     $carbon.append($next);
        // }

        if( config.monospaced === false ){
            $next = defspan();
            if(config.center_chars.indexOf(char) >= 0){
                $next.css('text-align', 'center');
            }
            $carbon.append($next);
        }

        // special case handling for the end of the line
        if(col >= config.max_col - 4){
            playSound('return');
        }

        $next.append(char);

        // TODO sometimes type a blank or a faded letter.
        // only move the cursor if we're not at the end of the page
        if(col < config.max_col){
            rowlength[row] = col;
            col++;
        }
    }

    function initializeSoundFX(){
        var opt = { pool: 5 };
        sfx['key1']      = new AudioFX(SFX_DIR+'key-new-01.mp3', opt);
        sfx['key2']      = new AudioFX(SFX_DIR+'key-new-02.mp3', opt);
        sfx['key3']      = new AudioFX(SFX_DIR+'key-new-03.mp3', opt);
        sfx['key4']      = new AudioFX(SFX_DIR+'key-new-04.mp3', opt);
        sfx['key5']      = new AudioFX(SFX_DIR+'key-new-05.mp3', opt);
        sfx['return']    = new AudioFX(SFX_DIR+'return.mp3',     opt);
        sfx['backspace'] = new AudioFX(SFX_DIR+'backspace.mp3',  opt);
        sfx['spacebar']  = new AudioFX(SFX_DIR+'space.mp3',      opt);
    }

    function scrollTo($el){
        $('html, body').stop().animate({
            scrollLeft: $el.offset().left,
            scrollTop:  $el.offset().top  - config.auto_scroll_buffer
        }, {
            easing: 'swing',
            duration: config.rate_limit - 50,
            complete: $.noop,
            step: $.noop
        });
    }

    function playSound(key){
        if(config.enable_sounds){
            sfx[key].play();
        }
    }

    function initialize() {
        row = 0;
        col = 0;
        $carbon = $('#carbon');
        $cursor = $('<span>', { 'class' : "cursor" });
        $carbon.attr('class', config.font_class);
        $carbon.html('').append($cursor).append(defspan());

        config.max_row = Math.floor($carbon.height() / config.row_height);
        config.max_col = Math.floor($carbon.width() / config.col_width);

        initializeSoundFX();
        scrollTo($('head'));

        // <blink>
        if(config.cursor_blink_interval > 0){
            clearInterval(blinky);
            blinky = setInterval(function(){
                $cursor.toggle();
            }, config.cursor_blink_interval);
        }

        $(document).unbind('keypress').bind('keypress',function(e){
            log.trace("[keypress] " + e.keyCode);
            playSound('key'+(1 + Math.floor(Math.random()*5)))
            writeCharacter(String.fromCharCode(e.which));
            $cursor.attr('style', style());
        });

        $(document).unbind('keydown').bind('keydown', function (e) {
            log.trace("[keydown] " + e.keyCode);

            if (block) {
                e&&e.preventDefault(); return;
            } else if ($.inArray(e.keyCode, NON_BLOCKING_MODIFIERS) >= 0) {
                log.debug("Modifier : " + e.keyCode);
            } else {
                log.trace("Blocking...")
                block = true;
            }

            if (e.keyCode === SPACEBAR){
                e.preventDefault();
                playSound(['spacebar']);
                writeCharacter('&nbsp;');
                $cursor.attr('style', style());
            }

            if (e.keyCode === RETURN || e.keyCode === BACKSPACE) {
                e.preventDefault();
                 // cleanup. empty spans are just waste.
                $("span.type").filter(function(){
                    return $(this).text().replace("&nbsp;","") === ""
                }).remove();

                if(config.backspace_over_newline && e.keyCode === BACKSPACE && col === 0){
                    row = Math.max(row-1, 0);
                    col = rowlength[row] ? rowlength[row]+2 : 0;
                }

                col = e.keyCode === RETURN ? 0 : Math.max(col-1, 0);
                row = Math.min(config.max_row, e.keyCode === RETURN ? row+1 : row);

                playSound(e.keyCode === RETURN ? 'backspace' : 'backspace');

                $carbon.append(defspan());
                $cursor.attr('style', style());
                scrollTo($cursor);
            }

            setTimeout(function(){
                log.trace("Unblocking");
                block = false;
            }, config.rate_limit);

        });

        $cursor.attr('style', style());
    }

    return { initialize : initialize, toPdf : h2c};

}(jQuery));

(function($){

    function fault(message){
        $('.message').hide().text(message).fadeIn();
        setTimeout(function(){ $('.message').fadeOut() }, 1000);
    }

    typewriter.initialize();

    $('.unavailable').bind('click', function(e){
        e&&e.preventDefault();
        fault("Not Implemented Yet. Coming in Typester v.0.3!");
    });


    $('.reset').bind('click', function(e){
        e&&e.preventDefault();
        typewriter.initialize();
    });

    $('.print').bind('click', function(e){
        e&&e.preventDefault();
        typewriter.toPdf();
    });
}(jQuery));

