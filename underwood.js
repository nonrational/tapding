var typewriter = (function($){
    var col = 0;
    var row = 0;
    var BACKSPACE = 8;
    var RETURN = 13;

    var effects = {
        10:'',
        12:'blur',
        14:'shift'
    };

    // effects
    // shift stick - uppercase a letter
    // blur        - fuzz a letter
    // two letters - type an extra letter that is near the one typed
    // fade        - running low on toner
    //

    // setInterval(function(){
    //     lastSpan().
    // }, 500);

    function lastSpan(){ return $('#carbon span:last-child'); }

    $(document).bind('keypress',function(e){
        var char = String.fromCharCode(e.which);
        lastSpan().append(char == ' ' ? '&nbsp;' : char);
        col++;
    });

    $(document).unbind('keydown').bind('keydown', function (e) {
        function top(){   return (20 * row) + 'px; '; }
        function left() { return (8  * col) + 'px; '; }
        function style(){ return 'top:'+ top() + 'left:' + left(); }

        if (e.keyCode === RETURN || e.keyCode === BACKSPACE) {
            e.preventDefault();

            col = e.keyCode === RETURN ? 0 : Math.max(col-1, 0);
            row = e.keyCode === RETURN ? row+1 : row;

            $('#carbon').append($('<span>', {
                'class' : effects[Math.round(Math.random()*(effects.length-1))],
                'style' : style()
            }));
        }
    });

})(jQuery);
