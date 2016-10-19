/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
var raspy = (function(period, decimals) {

    var _taskevents = {};
    var _instance_id = null;
    var _taskname = null;
    var _taskui = {};
    var _last_timestamp = null;
    var _last_schedtime = null;
    var _apikey = null;
    var _colordefs = {
        bs: {
            panel: {
                // @panel-default-heading-bg
                heading: '#F5F5F5',
                // @panel-bg
                body: '#FFF'
            },
            // @badge-bg
            badge: '#AEA79F',
            // @navbar-default-bg
            navbar: '#E95420'
        },
        text: '#000000',
        yellow: '#baba00',
        red: '#c63c3c',
        green: '#00cf00',
        gray: '#7A8288'
    };

    var errors = {
        ERR_NONE: 'E00',
        ERR_NOTRUNYET: 'E01',
        ERR_NOTUPDATED: 'E02',
        ERR_REQUEST_FAILED: 'E03',
        ERR_INVALID_QUERY: 'E04',
        ERR_NOT_AUTHORIZED: 'E21',
        ERR_INVALID_TASK: 'E22',
        ERR_MISSING_TASK: 'E23',
        ERR_NOT_RUNNING: 'E24',
        ERR_SOCKET: 'E25',
        ERR_MISSING_CMD: 'E26',
        ERR_MISSING_ARG: 'E27',
        ERR_INVALID_CMD: 'E28',
        ERR_INVALID_ARG: 'E29'
    };

    var _tools = {
        nice_number: function(number, threshold, decimals, unit) {
            // 1300 V ==> 1.3 kV
            // 1300 => 1.3k
            // 1000 => 1000
            // 900 => 900
            // 5 => 5
            // 0.1 V => 0.1 V
            // 0.0001 V => 0.1 mV
            // kilo lowercase
            // see https://www.reddit.com/r/Metric/comments/1d4c3m/why_is_kilo_lowercase_while_all_the_other/
            var prefix = null;
            var isneg = number < 0;
            var prefixes = [
                'f', 'p', 'u', 'm', '', 'k', 'M', 'G', 'T'
            ];

            number = math.abs(number);
            var index = math.fix(
                math.log(number) / math.log(threshold)
            );
            // add offset so that index 0 equals no prefix
            var prefix_index = index + 4;
            if( prefix_index >= 0 && prefix_index < prefixes.length ) {
                prefix = prefixes[prefix_index];
                number /= math.pow(threshold, index);
            }
            number = (isneg?-1:+1) * math.round(number, decimals);
            // append unit and prefix
            // keep space between unit and prefix
            return (
                number +
                ((null !== unit)?' ':'') +
                ((null !== prefix)?prefix:'') +
                ((null !== unit)?unit:'')
            );
        },
        ms2human: function(ms) {
            if( ms < 60000 ) {
                return this.nice_number(ms / 1000, 1000, decimals, 's');
                /*return _number_compress(ms, 1000, ['s', 'ms']);*/
            }
            return moment.duration(ms).humanize();
        },
        num2human: function(number, unit) {
            return this.nice_number(number, 1000, decimals, unit);
        },
        mem2human: function(byte) {
            return this.nice_number(byte, 1024, decimals, 'Byte');
            /*return _number_compress(byte, 1024, [ 'TB', 'GB', 'MB', 'kB', 'Byte']);*/
        },
        bits2human: function(bits) {
            return this.nice_number(bits, 1000, decimals, 'Bit/s');
            /*return _number_compress(bits, 1000, [ 'TBit/s', 'GBit/s', 'MBit/s', 'kBit/s', 'Bit/s']);*/
        },
        time2human_timeonly: function(timestamp) {
            if(null === timestamp) {
                return '-';
            }
            return moment.unix(timestamp).format('HH:mm') + ' Uhr';
        },
        time2human: function(timestamp) {
            if(null === timestamp) {
                return '-';
            }
            return moment.unix(timestamp).format('dd, DD.MM.YY HH:mm') + ' Uhr';
        },
        bs: ajdebs
    };

    var _get_report = function(taskname, timestamp, reduced, apikey, success, failure) {

        var postdata = {
            task: taskname,
            reduced: reduced
        };

        if( apikey != null ) {
            postdata.apikey = apikey;
        }

        if( timestamp != null ) {
            postdata.timestamp = timestamp;
        }


        $.get({
            url: '/api/raspy/getrep',
            dataType: 'json',
            data: postdata,
            success: function(result) {
                if( result.success ) {
                    success(result.payload.info, result.payload.report);
                } else {
                    failure(result.payload);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var msg = 'RasPy AJAX Error';
                if( textStatus !== null ) {
                    msg += ': ' + textStatus;
                }
                alert(msg);
            }
        });
    };

    var _statusbox = (function() {
        var style_old_update = function() {
            _taskui.statusbox.container
                .removeClass('alert-success')
                .addClass('alert-info');
        };
        var style_new_update = function() {
            _taskui.statusbox.container
                .removeClass('alert-info')
                .addClass('alert-success');
        };

        return {
            init: function(update_callback) {
                _taskui.statusbox.update.on('click', function(e) {
                    // deactivate button
                    $(this).prop('disabled', true);
                    update_callback();
                });

                _tools.bs.collapse_style(
                    _taskui.statusbox.morestats.collapse,
                    _taskui.statusbox.more
                );


                _taskui.statusbox.morestats.collapse.on('shown.bs.collapse', function (e) {
                    _taskui.statusbox.morestats.runtimelog.reflow();
                });
            },
            update_start: function() {
                style_old_update();
                // set icon and status text
                _taskui.statusbox.icon.removeClass('fa-thumbs-up');
                _taskui.statusbox.icon.addClass('fa-spinner fa-spin');
                _taskui.statusbox.status.text('Bitte warten...');
            },
            update_end_notnew: function() {
                // no update yet
                style_old_update();
                _taskui.statusbox.update.prop('disabled', false);
                // calc time till next update in seconds:
                // get average total time
                var tnextupd = moment.unix(_last_timestamp)
                    .add(period + math.ceil(_last_schedtime), 'seconds')
                    .diff(moment(), 'seconds');

                var status_text = 'Daten sind aktuell!';
                if( tnextupd > 0 ) {
                    status_text += ' Nächstes Update in ~' + tnextupd + ' s';
                } else {
                    status_text += ' Nächstes Update seit ~' + tnextupd + ' s überfällig';
                }
                _taskui.statusbox.icon.removeClass('fa-spinner fa-spin');
                _taskui.statusbox.icon.addClass('fa-thumbs-up');
                _taskui.statusbox.status.text(status_text);
            },
            update_end_new: function(info) {
                // first or new update
                style_new_update();
                _taskui.statusbox.update.prop('disabled', false);

                var status_text = 'Daten wurden geladen!';
                if( _last_timestamp != null ) {
                    // new update
                    var diff_sec = moment.unix(info.timestamp).diff(moment.unix(_last_timestamp), 'seconds');
                    var missed = diff_sec / period - 1;
                    status_text = 'Daten wurden aktualisiert! Updates verpasst: ' + missed;
                }
                // set icon and status text
                _taskui.statusbox.icon.removeClass('fa-spinner fa-spin');
                _taskui.statusbox.icon.addClass('fa-thumbs-up');
                _taskui.statusbox.status.text(status_text);

                // updates
                _taskui.statusbox.updates.text(
                    _tools.num2human(info.updates, null) +
                    ' (' +
                    _tools.ms2human(
                        period * info.updates * 1000
                    ) +
                    ')'
                );

                // runtime
                _taskui.statusbox.runtime.text(
                    _tools.ms2human(info.runtime * 1000)
                );

                // tasktime
                var task_percent = math.round(info.tasktime/info.runtime * 100, 2);
                _taskui.statusbox.tasktime.text(
                    _tools.ms2human(info.tasktime * 1000) +
                    ' (' +
                    task_percent +
                    ' %)'
                );

                _taskui.statusbox.loaded
                    .show()
                    .removeClass('hidden');
            },
            error: function(reason) {
                _taskui.statusbox.container
                    .removeClass('alert-info alert-success')
                    .addClass('alert-danger');

                // set icon and status text
                _taskui.statusbox.icon.removeClass('fa-spinner fa-spin');
                _taskui.statusbox.icon.addClass('fa-thumbs-down');
                _taskui.statusbox.status.text(reason);
                _taskui.statusbox.loaded.hide();
            }
        };
    })();

    var _update_start = function() {
        _statusbox.update_start();
    };
    var _update_end_new = function(info) {
        _statusbox.update_end_new(info);
    };
    var _update_end_notnew = function() {
        _statusbox.update_end_notnew();
    };
    var _update_success = function(info, report) {
        _taskevents[_taskname].success(info, report);
    };
    var _update_showui = function(info, report) {
        _taskevents[_taskname].show(info, report);
    };
    var _update_buildui = function(info, report) {
        _taskevents[_taskname].build(info, report);
    };
    var _update_updateui = function(info, report) {
        _taskevents[_taskname].update(info, report);
    };
    var _update_error = function(reason) {
        _taskevents[_taskname].error(reason);
        _statusbox.error(reason);
        _taskui.dashboard.hide();
    };

    var _start_update = function(initital) {

        _update_start();

        _get_report(
            _taskname,
            _last_timestamp,
            false,
            _apikey,
            function(info, report) {

                // correct instance check
                if( _instance_id === null ) {
                    _instance_id = info.instance;
                } else if( _instance_id != info.instance ) {
                    _update_error('raspy instance has changed');
                    return;
                }

                var start = new Date().getTime();

                if( initital ) {
                    _tools.samplelogger.create(
                        _taskui.statusbox.morestats.runtimelog,
                        {
                            label: 'Schedulezeit',
                            unit: 's'
                        },
                        {}
                    );
                    _update_buildui(info, report);
                }

                _update_success(info, report);

                _taskui.statusbox.morestats.runtimelog.update(
                    info.totaltime,
                    {}
                );
                _update_updateui(info, report);

                // show dashboard
                _taskui.dashboard
                    .removeClass('hidden')
                    .show()
                ;

                _taskui.statusbox.morestats.runtimelog.reflow();
                _update_showui(info, report);

                _update_end_new(info);

                _last_timestamp = info.timestamp;
                // 0 -> 5min
                // 1 -> 15min
                // 2 -> 60min
                _last_schedtime = info.totaltime.averages[0];

                if( initital ) {
                    var time = new Date().getTime() - start;
                    console.log('task rendered in %f seconds', time);
                }
            },
            function(error) {
                if( error === errors.ERR_NOTUPDATED ) {
                    // info will contain old timestamp
                    // statusbar shows that no update occured
                    _update_end_notnew();
                } else {
                    _update_error(error);
                }
            }
        );
    };

    return {
        colors: _colordefs,
        // export
        tools: _tools,
        ui: _taskui,
        get_report: _get_report,
        decimals: decimals,
        period: period,
        //
        authorized: function() {
            return _apikey !== null;
        },
        //
        register_task: function(name, factory) {
            if( 'undefined' !== typeof _taskevents[name] ) {
                throw 'task is already registered';
            }
            // do not create factory yet
            // prevents wasting of memory of unused tasks
            _taskevents[name] = factory;
        },
        register_tool: function(name, factory) {
              if( 'undefined' !== typeof _tools[name] ) {
                throw 'tool is already registered';
            }
            _tools[name] = factory();
        },
        init: function(options) {
            _taskname = options.taskname;
            _apikey = options.apikey;
            _taskui = $.extend(
                true,
                _taskui,
                options.ui
            );

            _statusbox.init(function() {
                _start_update(false);
            });

            if( 'undefined' === typeof _taskevents[options.taskname] ) {
                _statusbox.error('no task registered!');
                return;
            }

            // create task events
            _taskevents[options.taskname] = $.extend(
                true,
                {
                    build: function(info, report) {},
                    success: function(info, report) {},
                    update: function(info, report) {},
                    show: function(info, report) {},
                    error: function(info, report) {}
                },
                _taskevents[options.taskname]()
            );

            _start_update(true);
        }
    };
})(60, 3);
