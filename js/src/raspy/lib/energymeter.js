/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_tool('energymeter', function() {
    var _kwh_cost = 0.28;

    var _colors = {
        history: raspy.colors.gray,
        current: raspy.colors.yellow
    };


    var _update_eurosign = function(container, data) {
        if( data.current > 0 ) {
            container.euro.addClass('fa-spin');
            container.euro.prop('title', 'Verbraucher ist aktiv');
            container.euro.css('color', raspy.colors.red);
        } else {
            container.euro.removeClass('fa-spin');
            container.euro.prop('title', 'Verbraucher ist inaktiv');
            // use inverse color, stopped == good
            container.euro.css('color', raspy.colors.green);
        }
    };

    var _update_table = function(updatetime, container, data) {

        var fmtval = function(val) {
            var cost = math.round(val * _kwh_cost/1000.0, 2);
            if( cost < 1 )
                cost = '<1';
            return raspy.tools.num2human(val, 'Wh') + ' @ ' + cost +  ' €';
        };

        var fmtitem = function(item, current, approx) {
            item.now.text( fmtval(current) );
            item.app.text( fmtval(approx) );
        };

        fmtitem( container.table.stats[0], data.counters.hour, data.approx.hour );
        fmtitem( container.table.stats[1], data.counters.day, data.approx.day );
        fmtitem( container.table.stats[2], data.counters.week, data.approx.week );
        fmtitem( container.table.stats[3], data.counters.month, data.approx.month );

        // progress bars
        var mm = moment(updatetime).endOf('month');

        var percent = [
            updatetime.minute() / 60,
            (updatetime.hour() + updatetime.minute() / 60) / 24,
            (updatetime.weekday() + updatetime.hour() / 24 + updatetime.minute() / 60 / 24) / 7,
            (updatetime.date() + updatetime.hour() / 24 + updatetime.minute() / 60 / 24) / (mm.date() + 1)
        ];

        for(var i=0;i<4;++i) {
            percent[i] = math.round(100 * percent[i]);
        }

        for(var i=0;i<4;++i) {
            container.table.stats[i].progress
                .css('width', percent[i] +'%')
                .attr('aria-valuenow', percent[i])
                .text(percent[i] + '%')
            ;
        }

        container.table.total.text(fmtval(data.counters.total));
        container.table.start.text(
            raspy.tools.time2human(data.tstart)
        );
    };

    var _update_plots = function(updatetime, container, data) {
        // start relative to update moment
        ts_startof_hour = moment([
            updatetime.year(),
            updatetime.month(),
            updatetime.date(),
            updatetime.hour()
        ]).valueOf();

        ts_startof_day = moment([
            updatetime.year(),
            updatetime.month(),
            updatetime.date()
        ]).valueOf();

        var update_plot = function(log, logdata, current, tstart) {

            log.plot.series[1].update(
                {
                    data: [current],
                    pointStart: tstart
                },
                false
            );
            log.update(
                logdata,
                {}
            );
        }

        update_plot(container.logtabs.cnts[0], data.logs.day, data.counters.hour, ts_startof_hour);
        update_plot(container.logtabs.cnts[1], data.logs.week, data.counters.day, ts_startof_day);
        update_plot(container.logtabs.cnts[2], data.logs.month, data.counters.day, ts_startof_day);
    };

   return {
        create: function(container, config) {

            config = $.extend(
                true,
                {
                    show_logs: true
                },
                config
            );

            var intervals = [
                1000 * 60 * 60,
                1000 * 60 * 60 * 24,
                1000 * 60 * 60 * 24
            ];

            var axis_formats = [
                {},
                {
                    day: '%A'
                },
                {}
            ];


            if( !config.show_logs ) {
                // remove items
                container.logtabsdiv.remove();
            } else {
                // create the 3 plots
                $.each(container.logtabs.cnts, function(index, log) {
                    raspy.tools.samplelogger.create(
                        log,
                        {
                            mode: raspy.tools.samplelogger.MODE_PLOT,
                            label: 'Energieverbrauch',
                            unit: 'Wh',
                            min: 0,
                            interval: intervals[index]
                        },
                        {
                            plot: {
                                xAxis: [{
                                    dateTimeLabelFormats: axis_formats[index]
                                }],
                                plotOptions: {
                                    column: {
                                        stacking: 'normal'
                                    }
                                },
                                series: [
                                    {
                                        name: 'Verbrauch (vergangen)',
                                        type: 'column',
                                        color: _colors.history
                                    },
                                    {
                                        name: 'Verbrauch (aktuell)',
                                        type: 'column',
                                        color: _colors.current
                                    }
                                ]
                            }
                        }
                    );
                    // register tab change event
                    container.logtabs.btns[index].on('shown.bs.tab', function (e) {
                        log.plot.reflow();
                    });
                });
            }

            container.update = function(timestamp, data) {
                var updatetime = moment.unix(timestamp);
                _update_eurosign(container, data);
                _update_table(updatetime, container, data);

                if( !config.show_logs ) {
                    return;
                }
                _update_plots(updatetime, container, data);
            }

            container.reflow = function() {
                if( !config.show_logs ) {
                    return;
                }
                for(var i=0;i<3;++i) {
                    container.logtabs.cnts[i].reflow();
                }
            }
        }
    };
});
