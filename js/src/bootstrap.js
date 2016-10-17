/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
var ajdebs = (function() {
    var _DIALOG_ERROR = 0;
    var _DIALOG_SUCCESS = 1;
    var _DIALOG_INFO = 2;

    var _fontawesome = function(font, config) {
        return $('<span>')
            .prop('class', 'fa fa-' + font + (config!==null?' ' + config:''))
            .prop('aria-hidden', true)
        ;
    };

    var _fatext = function(text, font, config)  {
        return $('<span>')
            .addClass('fatext')
            .append(_fontawesome(font, config))
            .append(/*'&nbsp;'*/' ')
            .append(text)
        ;
    };

    var _fatext_right = function(text, font, config)  {
        return $('<span>')
            .addClass('fatext')
            .append(text)
            .append(/*'&nbsp;'*/' ')
            .append(_fontawesome(font, config))
        ;
    };

    var _collapse_style = function(collapse, btn) {
        var btn_more = function() {
            btn.empty().append(
                _fatext('mehr', 'arrow-down', null)
            );
        };
        var btn_less = function() {
            btn.empty().append(
                _fatext('weniger', 'arrow-up', null)
            );
        };
        // initial
        btn_more();
        // events
        collapse.on('shown.bs.collapse', function(e) {
            btn_less();
        });
        collapse.on('hidden.bs.collapse', function(e) {
            btn_more();
        });
    };

    var _dialog = function(type, content) {

        var title = '';
        var symbol = '';
        var color = '';

        switch(type) {
            case _DIALOG_ERROR:
                title = 'Fehler';
                symbol = 'exclamation';
                color = '#ff0000';
                break;
            case _DIALOG_SUCCESS:
                title = 'Erfolg';
                symbol = 'check';
                color = '#00ff00';
                break;
            case _DIALOG_INFO:
                title = 'Information';
                symbol = 'info';;
                color = '#0000ff';
                break;
            default:
                throw 'Invalid Dialog Type';
        }

        var title = _fatext(title, symbol, null);
        title.children().first().css('color', color);

        $('<div>')
            .addClass('modal')
            .prop('tabindex', '-1')
            .prop('role', 'dialog')
            .attr('aria-labelledby', 'ajdebs-dialog')
            .append($('<div>')
                .addClass('modal-dialog')
                .prop('role', 'document')
                .append($('<div>')
                    .addClass('modal-content')
                    .append($('<div>')
                        .addClass('modal-header')
                        .append($('<button>')
                            .addClass('close')
                            .attr('type', 'button')
                            .attr('data-dismiss', 'modal')
                            .attr('aria-label', 'Close')
                            .append($('<span>')
                                .attr('aria-hidden', 'true')
                                .append('&times;')
                            )
                        )
                        .append($('<h4>')
                            .attr('id', 'ajdebs-dialog')
                            .addClass('modal-title')
                            .append(title)
                        )
                    )
                    .append($('<div>')
                        .addClass('modal-body')
                        .append(content)
                    )
                )
            )
            .modal()
        ;
    };


    return {
        DIALOG_ERROR: _DIALOG_ERROR,
        DIALOG_SUCCESS: _DIALOG_SUCCESS,
        DIALOG_INFO: _DIALOG_INFO,
        dialog: _dialog,
        fontawesome: _fontawesome,
        fatext: _fatext,
        fatext_right: _fatext_right,
        collapse_style: _collapse_style
    };
})();
