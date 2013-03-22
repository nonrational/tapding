var typewriter = (function($){
    var col = 0;
    var row = 0;
    var BACKSPACE = 8;
    var RETURN = 13;
    var $carbon;

    var config = {
        row_height : 14,
        col_width  :  8,
        cursor    : '_',
        backspace_over_newline : true
    };

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

    // utility functions
    function top(offset)  { return ((config.row_height * row) + (offset ? offset : 0)) + 'px; '; }
    function left(offset) { return ((config.col_width * col)  + (offset ? offset : 0)) + 'px; '; }

    function style(topoff, leftoff){ return 'top:' + top(topoff) + 'left:' + left(leftoff); }

    function lastSpan(){ return $('#carbon span.type:last-child'); }

    function defspan(topoff, leftoff){
        return $('<span>', { 'class' : "type none", 'style' : style(topoff, leftoff) });
    }

    function initialize() {
        row = 0;
        col = 0;
        $carbon = $('#carbon');
        $cursor = $('<span>', { 'class' : "cursor" }).text(config.cursor);
        $carbon.html('').append($cursor).append(defspan());

        $(document).unbind('keypress').bind('keypress',function(e){
            if(col >= 80){
                // probably a more elegant way to handle this, right?
                return;
            }

            // $('span.cursor').remove();
            var char = String.fromCharCode(e.which);
            var $next = lastSpan();

            // Don't generate an effect immediately after generating an effect.
            // Don't generate an effect on the first column.
            if($next.hasClass('none') && col > 0){
                // generate effect randomly, insert a new
                // maybe recalculate $next for new span
                var chance = Math.random();

                if(chance < .05){
                    $next = defspan(0, -2).removeClass('none').addClass('left-shift');
                    $carbon.append($next);
                } else if (chance < .10) {
                    $next = defspan(0, 1).removeClass('none').addClass('right-shift');
                    $carbon.append($next);
                } else if (chance < .20) {
                    $next = defspan().removeClass('none').addClass('blur');
                    $carbon.append($next);
                }

            } else {
                $next = defspan();
                $carbon.append($next);
            }

            $next.append(char == ' ' ? '&nbsp;' : char);
            col++;

            $cursor.attr('style', style());
        });

        $(document).unbind('keydown').bind('keydown', function (e) {
            if (e.keyCode === RETURN || e.keyCode === BACKSPACE) {
                 // cleanup. empty spans are just waste.
                $('span.type:empty').remove();
                e.preventDefault();

                if(config.backspace_over_newline && e.keyCode === BACKSPACE && col == 0){
                    row = Math.max(row-1, 0)
                }

                // $('span.cursor').remove();
                col = e.keyCode === RETURN ? 0 : Math.max(col-1, 0);
                row = e.keyCode === RETURN ? row+1 : row;

                $carbon.append(defspan());
                $cursor.attr('style', style());
            }
        });
    }

    return { initialize : initialize }

})(jQuery);

(function($){
    typewriter.initialize();

    $('.reset').bind('click', function(e){
        e&&e.preventDefault()
        typewriter.initialize();
    });
}(jQuery));

