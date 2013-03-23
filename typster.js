/**
 * Typster v0.1.0
 */
var typewriter = (function($){
    var BACKSPACE = 8;
    var RETURN = 13;
    var SPACEBAR = 32;
    var SHIFT = 16;

    var SFX_DIR = 'sfx/noisy-typer/'

    // infernal state
    var $carbon, $cursor;
    var col, row;
    // on enter key, store length of the line so we can backspace over newlines
    var rowlength = [];
    // sound effects
    var sfx = [];
    var blinky;
    var block = false;

    // configuration options
    var config = {
        row_height : 15,
        col_width  : 11, // 8 (default)
        max_column : 59,
        max_row    : 63,
        cursor    : '_',
        backspace_over_newline : true,
        cursor_blink_interval : 0, // 500
        key_timing: 275,
        enable_sounds: true,
        auto_scroll_buffer : 300
    };

    var log = console ? console : {error : function(){}, debug : function(){}};

    // effects
    // shift stick - uppercase a letter
    // blur        - fuzz a letter
    // two letters - type an extra letter that is near the one typed
    // fade        - running low on toner
    // 80col       - keep hitting the last column
    // jammed      - type two letters next to eachother at once and stop responding
    // bold        - type the same letter over eachother (hard hit)

    // features
    // export to PDF
    function print(){
        $cursor.hide();
        var pwin = window.open('', 'printwin', 'left=400,top=100,width=400,height=400');
        pwin.document.write('<html><head><link rel="stylesheet" href="typster.css"></head>');
        pwin.document.write('<body>');
        pwin.document.write($carbon.html());
        pwin.document.write('</body></html>');
        pwin.print();
        $cursor.show();
    }

    function h2c(){
        if(html2canvas){
            var pwin = window.open('', 'printwin', '');
            html2canvas($carbon, {
                onrendered : function(canvas){
                    pwin.document.body.appendChild(canvas);
                }
            });
        }
    }

    // utility functions
    function style(topoff, leftoff){
        var top  = ((config.row_height * row) + (topoff  ? topoff  : 0)) + 'px;';
        var left = ((config.col_width  * col) + (leftoff ? leftoff : 0)) + 'px;';
        return 'top:' + top + ' left:' + left;
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
        if($next.hasClass('none') && col > 0){
            // generate effect randomly, insert a new
            // maybe recalculate $next for new span
            var chance = Math.random();

            if(chance < 0.05){
                $next = defspan(0, -2).removeClass('none').addClass('left-shift');
                $carbon.append($next);
            } else if (chance < 0.10) {
                $next = defspan(0, 1).removeClass('none').addClass('right-shift');
                $carbon.append($next);
            } else if (chance < 0.20) {
                $next = defspan().removeClass('none').addClass('blur');
                $carbon.append($next);
            } else if (chance < 0.22) {
                $next = defspan().removeClass('none').addClass('wiggle');
                $carbon.append($next);
            } else if (chance < 0.25) {
                $next = defspan().removeClass('none').addClass('fade');
                $carbon.append($next);
            }

        } else {
            $next = defspan();
            $carbon.append($next);
        }

        // special case handling for the end of the line
        if(col === config.max_column){
            $next = defspan();
            $carbon.append($next);
            playSound('return');
        }

        $next.append(char);

        // TODO sometimes type a blank or a faded letter.
        // only move the cursor if we're not at the end of the page
        if(col < config.max_column){
            rowlength[row] = col;
            col++;
        }
    }

    function initializeSoundFX(){
        sfx['key1']      = new Audio(SFX_DIR+'key-new-01.mp3');
        sfx['key2']      = new Audio(SFX_DIR+'key-new-02.mp3');
        sfx['key3']      = new Audio(SFX_DIR+'key-new-03.mp3');
        sfx['key4']      = new Audio(SFX_DIR+'key-new-04.mp3');
        sfx['key5']      = new Audio(SFX_DIR+'key-new-05.mp3');
        sfx['return']    = new Audio(SFX_DIR+'return.mp3');
        sfx['backspace'] = new Audio(SFX_DIR+'backspace.mp3');
        sfx['spacebar']  = new Audio(SFX_DIR+'space.mp3');
    }

    function scrollTo($el){
        $('html, body').stop().animate({
            scrollLeft: $el.offset().left,
            scrollTop:  $el.offset().top  - config.auto_scroll_buffer
        }, {
            easing: 'swing',
            duration: config.key_timing - 50,
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
        $cursor = $('<span>', { 'class' : "cursor" }).text(config.cursor);
        $carbon.html('').append($cursor).append(defspan());

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
            log.debug("[keypress] " + e.keyCode);
            playSound('key'+(1 + Math.floor(Math.random()*5)))
            writeCharacter(String.fromCharCode(e.which));
            $cursor.attr('style', style());
        });

        $(document).unbind('keydown').bind('keydown', function (e) {
            log.debug("[keydown] " + e.keyCode);

            if (block) {
                e&&e.preventDefault(); return;
            } else if (e.keyCode !== SHIFT) {
                block = true;
            }

            if (e.keyCode === SPACEBAR){
                e.preventDefault();
                playSound(['spacebar']);
                writeCharacter('&nbsp;');
                $cursor.attr('style', style());
            }

            if (e.keyCode === RETURN || e.keyCode === BACKSPACE) {
                 // cleanup. empty spans are just waste.
                $('span.type:empty').remove();
                e.preventDefault();

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
                block = false;
            }, config.key_timing);
        });
    }

    return { initialize : initialize, toPdf : h2c };

}(jQuery));

(function($){
    typewriter.initialize();

    $('.reset').bind('click', function(e){
        e&&e.preventDefault();
        typewriter.initialize();
    });

    $('.print').bind('click', function(e){
        e&&e.preventDefault();
        typewriter.toPdf();
    });
}(jQuery));

