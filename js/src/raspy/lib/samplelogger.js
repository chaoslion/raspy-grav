/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_tool('samplelogger', function() {

    var _MODE_PLOT = 0x01;
    var _MODE_GAUGE = 0x02;
    var _MODE_AVGS = 0x04;

    var _colors = {
        min: 'rgb(100, 100, 200)',
        max: 'rgb(200, 100, 100)',
        average: 'rgb(100, 200, 100)',
        gauge: {
            dial: raspy.colors.text,
            text: raspy.colors.text,
            line: raspy.colors.text,
            background1: raspy.colors.bs.panel.heading,
            background2: raspy.colors.bs.badge,
            band_good: '#00CF00',
            band_ok: '#CFCF00',
            band_bad: '#CF0000'
        }
    };

    // set default theme for all charts
    Highcharts.theme = {
        colors: [
            raspy.colors.yellow,
            raspy.colors.gray,
            raspy.colors.red,
            raspy.colors.green
        ],
        chart: {
            style: {
                fontFamily: '"Open Sans",Arial,sans-serif'
            },
            plotBackgroundColor: raspy.colors.bs.panel.heading,
            // backgroundColor: 'transparent',
            borderWidth: 0, // better off :)
            borderColor: raspy.colors.bs.badge
        },
        title: {
            style: {
                color: raspy.colors.text,
                //fontWeight: 'bold'
            }
        },
        subtitle: {
            style: {
                color: raspy.colors.text,
                //fontWeight: 'bold'
            }
        },
        /*legend: {
            itemHiddenStyle: {
                color: colors.chart.legend_hidden,
            },
            itemStyle: {
                color: colors.chart.legend,
                fontWeight: 'bold'
            }
        },*/
        tooltip: {

        },
        xAxis: {
            lineColor: raspy.colors.text,
            lineWidth: 1,

            labels: {
                style: {
                    color: raspy.colors.text
                }
            },
            title: {
                style: {
                    color: raspy.colors.text
                }
            }
        },
        yAxis: {
            lineColor: raspy.colors.text,
            lineWidth: 1,

            gridLineColor: raspy.colors.bs.badge,
            gridLineWidth: 1,
            minorGridLineWidth: 0,

            labels: {
                style: {
                    color: raspy.colors.text
                }
            },
            title: {
                style: {
                    color: raspy.colors.text
                }
            }
        },
        plotOptions: {
            errorbar: {
                //color: 'white'
            }
       }
    };

    // apply theme
    Highcharts.setOptions(Highcharts.theme);
    // apply options
    Highcharts.setOptions({
        global: {
            useUTC: false
        },
        chart: {
            animation: false
        },
        lang: {
            shortMonths: [ 'Jan' , 'Feb' , 'Mar' , 'Apr' , 'Mai' , 'Jun' , 'Jul' , 'Aug' , 'Sep' , 'Okt' , 'Nov' , 'Dez'],
            months: [ 'Januar' , 'Februar' , 'März' , 'April' , 'Mai' , 'Juni' , 'Juli' , 'August' , 'September' , 'Oktober' , 'November' , 'Dezember'],
            weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
            noData: 'Keine Daten zum anzeigen vorhanden!',
            resetZoom: 'Zoom 1:1',
            resetZoomTitle: 'Zoom zurücksetzen'
        }
    });

    // never hide all series
    var _plot_legendItemClick = function() {
        var visible_cnt = 0;
        for(var i=0;i<this.chart.series.length;++i) {
            if( this.chart.series[i].visible ) {
                visible_cnt++;
            }
        }
        return !this.visible || visible_cnt > 1;
    };

    var _create_plotband = function(min, max, color) {
        if( color === '+' ) {
            color = _colors.gauge.band_ok;
        } else if( color === '-' ) {
            color = _colors.gauge.band_bad;
        } else if( color === '++' ) {
            color = _colors.gauge.band_good;
        }
        return {
            from: min,
            to: max,
            color: color,
            innerRadius: '100%',
            outerRadius: '110%'
        };
    };

    /*
    1,2: 1-2
    1,2,3: 1-2 2-3
    1,2,3,4: 1-2 2-3 3-4
    1,2,3,4,5: 1-2 2-3 3-4 4-5
    plotbands([1,2,3,4], [ok, bad, ok])
    */
    var _create_plotbands = function(ranges, colors) {
        if( !(ranges.length > 1)) {
            throw 'length of ranges must be greater 1';
        }
        if( ranges.length-1 != colors.length ) {
            throw 'length of ranges must be one less then length of colors';
        }
        var bands = ranges.length - 1;
        var result = [];
        for(var i=0;i<bands;++i) {
            result.push(
                _create_plotband(
                    ranges[i],
                    ranges[i+1],
                    colors[i]
                )
            );
        }
        return result;
    };

    var _plotband_good = function(min, max) {
        return _create_plotband(min, max, _colors.gauge.band_good);
    };

    var _plotband_ok = function(min, max) {
        return _create_plotband(min, max, _colors.gauge.band_ok);
    };

    var _plotband_bad = function(min, max) {
        return _create_plotband(min, max, _colors.gauge.band_bad);
    };

    var _format_binary = function(value) {
        return value == 1?'Ein':'Aus';
    };

    var _format_percent = function(value) {
        return math.round(value, this.format_decimals) + ' %';
    }

    var _format_generic = function(value) {
        if( null === this.format_threshold ) {
            value = math.round(value, this.format_decimals);
            if( null !== this.unit ) {
                value += ' ' + this.unit;
            }
            return value;
        }
        return raspy.tools.nice_number(value, this.format_threshold, this.format_decimals, this.unit)
    };

    var _preprocess_sample_log = function(sample, minimum) {
        if( sample == 0 ) {
            return minimum;
        }
        return sample;
    };

    var _preprocess_samples_log = function(samples, minimum) {
        for(var i=0;i<samples.length;++i) {
            samples[i] = _preprocess_sample_log(samples[i], minimum);
        }
        return samples;
    };


    var _preprocess_data_gauge = function(last, config) {
        if( 'logarithmic' === config.type ) {
            last = _preprocess_sample_log(last, config.min);
        }
        return last;
    };

    var _preprocess_data_plot = function(samples, config) {
        if( 'logarithmic' === config.type ) {
            samples = _preprocess_samples_log(samples, config.min);
        }
        return samples;
    };

    var _preprocess_data_gauge_ranges = function(ranges, config) {
        if( 'logarithmic' === config.type ) {
            for(var i=0;i<ranges.length;++i) {
                ranges[i] = [
                    _preprocess_sample_log(ranges[i][0], config.min),
                    _preprocess_sample_log(ranges[i][1], config.min),
                ];
            }
        }
        return ranges;
    };

    var _preprocess_data_gauge_averages = function(averages, config) {
        if( 'logarithmic' === config.type ) {
            averages = _preprocess_samples_log(averages, config.min);
        }
        return averages;
    };

    var _create_settings = function(config) {
        return {
            plot: {
                chart: {
                    height: config.height + 50 + (config.plot.show_stats?100:0),
                    zoomType: 'xy',
                    panning: true,
                    panKey: 'ctrl',
                    resetZoomButton: {
                        relativeTo: 'plot',
                        position: {
                            align: 'left',
                            verticalAlign: 'bottom'
                        }
                    }
                },
                plotOptions: {
                    spline: {
                        pointInterval: config.interval,
                        marker: {
                            enabled: false,

                        },
                        events: {
                            legendItemClick: _plot_legendItemClick
                        }
                    },
                    column: {
                        pointInterval: config.interval,
                        minPointLength: 5,
                        events: {
                            legendItemClick: _plot_legendItemClick
                        }
                    },
                    line: {
                        pointInterval: config.interval,
                        marker: {
                            enabled: false
                        },
                        events: {
                            legendItemClick: _plot_legendItemClick
                        }
                    }
                },
                title: {
                    useHTML: false,
                    text: ''
                },
                subtitle: {
                    text: 'vergrößern: Klick+ziehen, verschieben: STRG+Klick+ziehen'
                },
                credits: {
                    enabled: false
                },
                tooltip: {
                    shared: true,
                    formatter: function() {
                        /*
                        Mo 23.02.15 14:34 (vor 3 Stunden)
                        foo: 13 V
                        */
                        var mom = moment(this.x);
                        var timstr = raspy.tools.time2human(this.x / 1000);
                        var timdst = mom.fromNow();

                        // add time
                        var result = '<b>' + timstr + '</b><br/>';
                        result += '(' + timdst + ')';

                        // add series data points
                        for(var i=0;i<this.points.length;++i) {
                            result += '<br/><b>' + this.points[i].series.name + '</b>: <i>' + config.format(this.points[i].y) + '</i>';
                        }
                        return result;
                    }
                },
                yAxis:[
                    {
                        type: config.type,
                        min: config.min,
                        max: config.max,
                        labels: {
                            formatter: function() {
                                return config.format(this.value);
                                //return math.round(this.value, config.decimals);
                            }
                        },
                        title: null
                        /*title: {
                            text: config.label + (config.unit.length>0?' (' + config.unit + ')':'')
                        }*/
                    }
                ],
                xAxis: [{
                    type: 'datetime',
                    minTickInterval: config.interval,
                    dateTimeLabelFormats: {
                        minute: '%H:%M'
                    },
                    crosshair: true
                }],
                series: [
                    {
                        name: config.label
                    }
                ]
            },
            gauge: {
                chart: {
                    height: config.height,
                    type: 'gauge',
                    plotBackgroundColor: null
                },
                title: null,
                credits: {
                enabled: false
                },
                pane: [{
                    center: ['50%', '50%'],
                    startAngle: -120,
                    endAngle: 120,
                    size: '65%',
                    background: [
                        {
                            backgroundColor: _colors.gauge.background1,
                            borderWidth: 2,
                            outerRadius: '160%',
                            innerRadius: '0%'
                        },
                        {
                            backgroundColor: _colors.gauge.background2,
                            shape: 'arc',
                            outerRadius: '100%',
                            innerRadius: '90%'
                        }
                    ]
                }],
                tooltip: {
                    enabled: false
                    },
                yAxis: [{
                    type: config.type,
                    min: config.min,
                    max: config.max,
                    /*tickInterval: 10,
                    minorTickInterval: 5,*/
                    minorTickPosition: 'outside',
                    tickPosition: 'outside',
                    tickLength: 25,
                    minorTickLength: 15,

                    lineColor: _colors.gauge.line,
                    labels: {
                        rotation: 'auto',
                        distance: 30,
                        style: {
                            color: _colors.gauge.text
                        },
                        formatter: function() {
                            return config.format(this.value);
                            //return math.round(this.value, config.decimals);
                        }
                    },
                    title: null,
                }],
                plotOptions: {
                    gauge: {
                        dataLabels: {
                            /*borderColor: '#000000',*/
                            y: 65,
                            borderRadius: 10,
                            style: {
                                fontSize: '16px',
                                color: _colors.gauge.text
                            },
                            formatter: function() {
                                return config.format(this.y);
                                //return math.round(this.value, config.decimals);
                            }
                        },
                        dial: {
                            backgroundColor: _colors.gauge.dial,
                            baseWidth: 8,
                            radius: '110%',
                            rearLength: '15%'
                        }
                    }
                },
                series: [{
                    name: 'gauge',
                    data: []
                }]
            },
            avgs: {
                chart: {
                    height: config.height
                },
                title: null,
                credits: {
                    enabled: false
                },
                tooltip: {
                    shared: true,
                    formatter: function() {
                        var fmt_avgs = function(caption, value) {
                            var f = '<b>' + caption + '</b>: <i>';
                            f += config.format(value) + '</i>';
                            return f;
                        };

                        /*
                        if( this.points.length < 2 )
                            return '';
                        */

                        var fmt = '';
                        fmt += fmt_avgs('Max', this.points[0].point.high) + '<br/>';
                        fmt += fmt_avgs('Mittel', this.points[1].y) + '<br/>';
                        fmt += fmt_avgs('Min', this.points[0].point.low);
                        return fmt;
                    }
                },
                xAxis: [{
                        categories: config.avgs.windows
                }],
                yAxis: [{
                    type: config.type,
                    min: config.min,
                    max: config.max,
                    labels: {
                        formatter: function() {
                            return config.format(this.value);
                            //math.round(this.value, config.decimals);
                        }
                    },
                    title: null
                    /*title: {
                        text: config.label + (config.unit.length>0?' (' + config.unit + ')':'')
                    }*/
                }],
                series: [
                    {
                        type: 'errorbar',
                        showInLegend: false
                    },
                    {
                        type: 'spline',
                        name: 'Mittelwert',
                        showInLegend: false
                    }
                ]
            }
        };
    };

    return {
        MODE_PLOT: _MODE_PLOT,
        MODE_GAUGE: _MODE_GAUGE,
        MODE_AVGS: _MODE_AVGS,
        MODE_PLOT_GAUGE: _MODE_PLOT|_MODE_GAUGE,
        MODE_PLOT_AVGS: _MODE_PLOT|_MODE_AVGS,
        MODE_GAUGE_AVGS: _MODE_GAUGE|_MODE_AVGS,
        MODE_ALL: _MODE_PLOT|_MODE_GAUGE|_MODE_AVGS,
        band_good: _colors.gauge.band_good,
        band_ok: _colors.gauge.band_ok,
        band_bad: _colors.gauge.band_bad,
        plotband: _create_plotband,
        plotbands: _create_plotbands,
        plotband_good: _plotband_good,
        plotband_ok: _plotband_ok,
        plotband_bad: _plotband_bad,
        create: function(logobj, userconfig, usersettings) {
            var config = $.extend(true, {
                mode: _MODE_PLOT,
                label: 'Messwert',
                unit: null,
                height: 300,

                format: _format_generic,
                format_threshold: 1000,
                format_decimals: raspy.decimals,

                // global plot, gauge and avgs options
                interval: raspy.period * 1000,
                min: null,
                max: null,
                // beware: min is needed if type is logarithmic
                type: 'linear',
                // specific options
                plot: {
                    show_stats: true
                },
                gauge: {

                },
                avgs: {

                }
            }, userconfig);

            var settings = _create_settings(config);


            if( usersettings === 'percent') {
                // apply predefined config+settings
                config.threshold = null;
                config.unit = null;
                config.format = _format_percent;
                settings = $.extend(true, _create_settings(config), {
                    plot: {
                        yAxis:[{
                            min: 0,
                            max: 100,
                            tickInterval: 20,
                            labels: {
                                formatter: null
                            }
                        }],
                        series:[{
                            type: 'column'
                        }]
                    },
                    gauge: {
                        yAxis: [{
                            min: 0,
                            max: 100,
                            tickInterval: 10,
                            minorTickInterval: 5,
                            plotBands: [
                                _plotband_good(0, 40),
                                _plotband_ok(40, 80),
                                _plotband_bad(80, 100)
                            ]
                        }]
                    },
                    avgs: {
                         yAxis:[{
                            min: 0,
                            max: 100,
                            tickInterval: 20
                        }]
                    }
                });
            } else if( usersettings === 'binary' ) {
                // apply predefined config+settings
                config.threshold = null;
                config.unit = null;
                config.mode = _MODE_PLOT;
                config.plot.show_stats = false;
                config.format = _format_binary;
                settings = $.extend(true, _create_settings(config), {
                    plot: {
                        yAxis:[{
                            gridLineWidth: 0,
                            max: 1,
                            min: 0,
                            categories: ['Aus', 'Ein'],
                            labels: {
                                formatter: function() {
                                    return this.value;
                                }
                            }
                        }],
                        series:[{
                            type: 'line',
                            step: 'left'
                        }]
                    }
                });
            } else {
                // merge with user settings
                settings = $.extend(true, settings, usersettings);
            }

            if( config.plot.show_stats ) {
                /*// insert right after data series
                settings.plot.series.splice(1,0,
                    {
                        color: colors.average,
                        type: 'line',
                        name: 'Mittelwert'
                    }
                );*/
                settings.plot.series.push(
                    {
                        id: 'stats',
                        color: _colors.average,
                        type: 'line',
                        name: 'Mittelwert'
                    }
                );
            }

            var plot_container = $('<div>')/*.addClass('samplelogger-plot')*/;
            var gauge_container = $('<div>')/*.addClass('samplelogger-gauge')*/;
            var avgs_container = $('<div>')/*.addClass('samplelogger-avgs')*/;

            switch(config.mode) {
                case _MODE_PLOT:
                case _MODE_GAUGE:
                case _MODE_AVGS:

                    var item_container = $('<div>')
                        .addClass('col-sm-12')
                    ;

                    logobj.slcontainer
                        .append($('<div>')
                            .addClass('row')
                            .append(item_container)
                        )
                    ;

                    if( config.mode == _MODE_PLOT ) {
                        item_container.append(plot_container);
                        logobj.plot = plot_container.highcharts(settings.plot).highcharts();
                    } else if( config.mode == _MODE_GAUGE ) {
                        item_container.append(gauge_container);
                        logobj.gauge = gauge_container.highcharts(settings.gauge).highcharts();
                    } else {
                        item_container.append(avgs_container);
                        logobj.avgs = avgs_container.highcharts(settings.avgs).highcharts();
                    }
                    break;
                case _MODE_GAUGE|_MODE_PLOT:
                case _MODE_AVGS|_MODE_PLOT:
                case _MODE_AVGS|_MODE_GAUGE:
                    var item_container1 = $('<div>')
                        .addClass('col-sm-3')
                    ;
                    var item_container2 = $('<div>')
                        .addClass('col-sm-9')
                    ;
                    logobj.slcontainer
                        .append($('<div>')
                            .addClass('row')
                            .append(item_container1)
                            .append(item_container2)
                        )
                    ;
                    if( config.mode == (_MODE_GAUGE|_MODE_PLOT) ) {
                        item_container1.append(gauge_container);
                        item_container2.append(plot_container);
                        logobj.gauge = gauge_container.highcharts(settings.gauge).highcharts();
                        logobj.plot = plot_container.highcharts(settings.plot).highcharts();
                    } else if( config.mode == (_MODE_AVGS|_MODE_PLOT) ) {
                        item_container1.append(avgs_container);
                        item_container2.append(plot_container);
                        logobj.avgs = avgs_container.highcharts(settings.avgs).highcharts();
                        logobj.plot = plot_container.highcharts(settings.plot).highcharts();
                    } else {
                        item_container1.append(gauge_container);
                        item_container2.append(avgs_container);
                        logobj.gauge = gauge_container.highcharts(settings.gauge).highcharts();
                        logobj.avgs = avgs_container.highcharts(settings.avgs).highcharts();
                    }
                    break;
                case _MODE_AVGS|_MODE_GAUGE|_MODE_PLOT:
                    var item_container1 = $('<div>')
                        .addClass('col-sm-6')
                    ;
                    var item_container2 = $('<div>')
                        .addClass('col-sm-6')
                    ;
                    var item_container3 = $('<div>')
                        .addClass('col-sm-12')
                    ;
                    logobj.slcontainer
                        .append($('<div>')
                            .addClass('row')
                            .append(item_container1)
                            .append(item_container2)
                        )
                        .append($('<div>')
                            .addClass('row')
                            .append(item_container3)
                        )
                    ;

                    item_container1.append(gauge_container);
                    item_container2.append(avgs_container);
                    item_container3.append(plot_container);
                    logobj.gauge = gauge_container.highcharts(settings.gauge).highcharts();
                    logobj.avgs = avgs_container.highcharts(settings.avgs).highcharts();
                    logobj.plot = plot_container.highcharts(settings.plot).highcharts();
                    break;
                default:
                    throw 'invalid mode';
            }

            // highcharts need reflow, if parent container
            // is hidden at chart creation
            logobj.reflow = function() {

                if( config.mode & _MODE_PLOT ) {
                    logobj.plot.reflow();
                }

                if( config.mode & _MODE_GAUGE ) {
                    logobj.gauge.reflow();
                }

                if( config.mode & _MODE_AVGS ) {
                    logobj.avgs.reflow();
                }
            };

            logobj.update = function(data, options) {

                options = $.extend(
                    true,
                    {
                        max: null
                    },
                    options
                );

                if( config.mode & _MODE_PLOT ) {
                    logobj.plot.series[0].update(
                        {
                            data: _preprocess_data_plot(data.samples, config),
                            pointStart: data.starttime * 1000
                        },
                        false
                    );
                    if( config.plot.show_stats ) {
                        // mean is always /last/ 2nd series
                        logobj.plot.series[/*1*/logobj.plot.series.length-1].update(
                            {
                                data: _preprocess_data_plot(data.avgsamples, config),
                                pointStart: data.starttime * 1000
                            },
                            false
                        );

                        // update plotines
                        logobj.plot.xAxis[0].update({
                            plotLines: [
                                {
                                    color: _colors.min,
                                    value: data.mintime * 1000,
                                    dashStyle: 'Solid',
                                    zIndex: 4,
                                    width: 2
                                },
                                {
                                    color: _colors.max,
                                    value: data.maxtime * 1000,
                                    dashStyle: 'Solid',
                                    zIndex: 4,
                                    width: 2
                                }
                            ]
                        });

                        // update title
                        logobj.plot.setTitle(
                            {
                                style: {
                                    align: 'left'
                                },
                                text: (function() {
                                    if( data.samples.length == 0 ) {
                                        return 'Keine Daten vorhanden!';
                                    }
                                    var format_val = function(text, value, color, timestamp) {
                                        return '<span style="color:' + color + '">' + text + ': ' + config.format(value) + ' (' + raspy.tools.time2human(timestamp) + ')</span>';
                                    };
                                    var range = data.ranges[data.ranges.length-1];
                                    var average = data.averages[data.averages.length-1];

                                    var result = format_val('Maximum', range[1], _colors.max, data.maxtime) + '<br/>';
                                    result += format_val('Mittel', average, _colors.average, data.starttime) + '<br/>';
                                    result += format_val('Minimum', range[0], _colors.min, data.mintime);
                                    return result;
                                })()
                            },
                            {},
                            false
                        );
                    }
                    logobj.plot.redraw();
                }

                if( config.mode & _MODE_GAUGE ) {
                    if( null !== options.max ) {
                        logobj.gauge.yAxis[0].update({
                            max: options.max
                        });
                    }
                    logobj.gauge.series[0].update(
                        {
                            data: [_preprocess_data_gauge(data.last, config)]
                        },
                        false
                    );
                    logobj.gauge.redraw();
                }

                if( config.mode & _MODE_AVGS ) {
                    // show in minutes
                    var windows = data.windows.slice(0,-1)
                    for(var i=0;i<windows.length;++i) {
                        // in minutes
                        windows[i] = windows[i] * raspy.period / 60;
                        windows[i] += ' min';
                    }

                    logobj.avgs.xAxis[0].update({
                        categories: windows
                    });
                    logobj.avgs.series[0].update(
                        {
                            data: _preprocess_data_gauge_ranges(data.ranges.slice(0,-1), config)
                        },
                        false
                    );
                    logobj.avgs.series[1].update(
                        {
                            data: _preprocess_data_gauge_averages(data.averages.slice(0,-1), config)
                        },
                        false
                    );
                    logobj.avgs.redraw();
                }
            };
        }
    };
});
