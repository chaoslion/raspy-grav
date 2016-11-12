/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('weather', function() {

    var dobson_to_kgperm2 = function(du) {
        return math.round( du * 2.1415 * 0.0001, 2);
    };
    var wind_to_beaufort = function(speed) {
        bf = math.pow(speed/0.8360, 2);
        bf = math.nthRoot(bf, 3);
        bf = math.round(bf);
        if( bf < 0 )
            return 0;
        else if( bf > 12 )
            return 12;
        else
            return bf;
    };
    // 326 => NNW
    var wind_to_cardinal = function(dir) {
        if(dir >= 348.75 && dir <= 11.25)
            return 'n';
        else if( dir >= 11.25 && dir <= 33.75 )
            return 'nne';
        else if( dir >= 33.75 && dir <= 56.25 )
            return 'ne';
        else if( dir >= 56.25 && dir <= 78.75 )
            return 'ene';
        else if( dir >= 78.75 && dir <= 101.25 )
            return 'e';
        else if( dir >= 101.25 && dir <= 123.75 )
            return 'ese';
        else if( dir >= 123.75 && dir <= 146.25 )
            return 'se';
        else if( dir >= 146.25 && dir <= 168.75 )
            return 'sse';
        else if( dir >= 168.75 && dir <= 191.25 )
            return 's';
        else if( dir >= 191.25 && dir <= 213.75 )
            return 'ssw';
        else if( dir >= 213.75 && dir <= 236.25 )
            return 'sw';
        else if( dir >= 236.25 && dir <= 258.75 )
            return 'wsw';
        else if( dir >= 258.75 && dir <= 281.25 )
            return 'w';
        else if( dir >= 281.25 && dir <= 303.75 )
            return 'wnw';
        else if( dir >= 303.75 && dir <= 326.25 )
            return 'nw';
        else
            return 'nnw';
    };

    var update_report = function(wui, wdata) {

        wui.time.text(raspy.tools.time2human(wdata.time));

        wui.summary.text(wdata.summary);
        wui.icon.attr('class', 'wi wi-forecast-io-' + wdata.icon);

        wui.dewPoint.text(wdata.dewPoint + ' °C');
        wui.humidity.text(math.round(100 * wdata.humidity) + ' %');

        if(wdata.visibility != null) {
            wui.visibility.text(wdata.visibility + ' km'); // &#8734;
        } else {
            wui.visibility.text('-');
        }

        wui.cloudCover.text(math.round(100 * wdata.cloudCover) + ' %');
        wui.pressure.text(wdata.pressure + ' hPa');
        wui.ozone.html(dobson_to_kgperm2(wdata.ozone) + ' kg/m^2');


        // precipation
        if(wdata.precipIntensity == 0) {
            wui.precipType.text('keiner');
            wui.precipIntensity.text('-');
            wui.precipProbability.text('-');
        } else {
            wui.precipIntensity.text(wdata.precipIntensity + ' mm/h');
            wui.precipProbability.text(wdata.precipProbability + ' %');

            switch(wdata.precipType) {
                case 'rain':
                    wui.precipType.text('Regen');
                    break;
                case 'snow':
                    wui.precipType.text('Schnee');
                    break;
                case 'sleet':
                    wui.precipType.text('Graupel');
                    break;
                case 'hail':
                    wui.precipType.text('Hagel');
                    break;
                default:
                    wui.precipType.text(wdata.precipType);
            }
        }

        // wind speed
        bf = wind_to_beaufort(wdata.windSpeed);
        wui.windSpeed
            .attr('class', 'wi wi-wind-beaufort-' + bf)
            .prop('title', math.round(wdata.windSpeed, 2) + ' m/s');

        // wind dir
        cardinal = wind_to_cardinal(wdata.windBearing);
        wui.windBearing
            .attr('class', 'wi wi-wind wi-from-' + cardinal)
            .prop('title', math.round(wdata.windBearing, 2) + ' °');
    };

    var update_report_currently = function(wui, wdata) {
        if(wdata == null)
            return;

        update_report(wui, wdata);
        // add head info
        wui.head.html(
            wdata.temperature + ' °C' + '<br>' +
            'gefühlt wie ' + wdata.apparentTemperature + ' °C'
        );
    };


    var update_cam = function(report) {

        // destroy if exists
        if ( $( "#webcamlapse" ).length ) {
            videojs("webcamlapse").dispose();
        }


        raspy.ui.currently.sidebar.cambody.empty();
        raspy.ui.currently.sidebar.videobody.empty();

        var cambtn = $('<button>').appendTo(raspy.ui.currently.sidebar.cambody);
        var cam = $('<img>').appendTo(raspy.ui.currently.sidebar.cambody);


        raspy.ui.camsky = false;
        raspy.ui.sourceraw = '/api/raspy/webcam';
        raspy.ui.sourcesky = '/api/raspy/webcam?sky';
        raspy.ui.btnsky_raw = 'markiere Himmel';
        raspy.ui.btnsky_sky = 'demarkiere Himmel';

        cam.prop('src', raspy.ui.sourceraw + '?' + (new Date()).getTime());
        cam.attr('class', 'img-responsive center-block');
        cam.prop('width', report.cam.width);
        cam.prop('height', report.cam.height);
        cam.on('load', function() {
            cambtn.prop('disabled', false);
        });


        cambtn.prop('disabled', true);
        cambtn.prop('type', 'button');
        cambtn.attr('class', 'btn btn-default');
        cambtn.text(raspy.ui.btnsky_raw);
        cambtn.click(function() {
            // get cam source
            $(this).prop('disabled', true);
            src = cam.prop('src');

            // add random argument, so browser updatees cache
            var d = new Date();
            if( !raspy.ui.camsky ) {
                src = raspy.ui.sourcesky + '&' + d.getTime();
                $(this).text(raspy.ui.btnsky_sky);
            } else {
                src = raspy.ui.sourceraw + '?' + d.getTime();
                $(this).text(raspy.ui.btnsky_raw);
            }
            cam.prop('src', src);
            raspy.ui.camsky = !raspy.ui.camsky;
        });

        if( !report.cam.online)
            cambtn.hide();

        $('<video>')
            .appendTo(raspy.ui.currently.sidebar.videobody)
            .attr('id', 'webcamlapse')
            .attr('class', 'embed-responsive-item video-js vjs-default-skin')
            .prop('controls', true)
            .prop('preload', 'none')
            .attr('width', report.cam.width)
            .attr('height', report.cam.height)
            .html(
                '<source src="/api/raspy/webcamlapse" type="video/mp4">'
            );

        videojs(
            "webcamlapse",
            {
                controlBar: {
                    volumeMenuButton: false
                }
            },
            function() {}
            );
    };

    var update_alert = function(alertsui, alertsdata) {

        // clear old alerts
        alertsui.empty();

        $.each(alertsdata, function(index, alert) {

            var title = $('<h3>')
                .text(alert.title);


            var description = $('<h4>')
                .text(alert.description);

            var expires = $('<p>')
                .text('Verfällt ' + raspy.tools.time2human(alert.expires * 1000));


            var link = $('<a>')
                .attr('href', alert.link)
                .attr('class', 'alert-link')
                .text('mehr Informationen');

            var div = $('<div>')
                .attr('class', 'alert alert-danger')
                .attr('role', 'alert')
                .append(title)
                .append(description)
                .append(expires)
                .append(link);

            alertsui.append(div);
        });
    };

    var update_current = function(report) {
        update_cam(report);
        update_alert(raspy.ui.currently.alerts, report.forecast.alerts);

        update_report_currently(
            raspy.ui.currently.report,
            report.forecast.currently
        );

        // update rate is 15min
        raspy.ui.currently.sidebar.temp.update(
            report.forecast.logs.temp,
            {}
        );

        raspy.ui.currently.sidebar.preci.update(
            report.forecast.logs.preci,
            {}
        );

        raspy.ui.currently.sidebar.clouds.update(
            report.forecast.logs.clouds,
            {}
        );
    };


    var update_report_daily = function(wui, wdata) {
        var fmt_temp = function(value, time) {
            return value + ' °C um ' + raspy.tools.time2human_timeonly(time);
        };


        update_report(wui, wdata);

        // add head info
        wui.head.html(
            fmt_temp(wdata.temperatureMax, wdata.temperatureMaxTime) +
            '<br>' +
            fmt_temp(wdata.temperatureMin, wdata.temperatureMinTime)
        );

        // add precipation max
        if(wdata.precipIntensity == 0) {
            wui.precipIntensityMax.text('-');
        } else {
            wui.precipIntensityMax.text(
                wdata.precipIntensityMax + ' mm/h'
                //+ ' um ' + raspy.tools.time2human_timeonly(wdata.precipIntensityMaxTime)
            );
        }
        // add sunrise/fall
        wui.sunriseTime.text(raspy.tools.time2human_timeonly(wdata.sunriseTime));
        wui.sunsetTime.text(raspy.tools.time2human_timeonly(wdata.sunsetTime));

        // add moonphase
        moonday = math.round(wdata.moonPhase * 28) + 1;
        wui.moonPhase
            .attr('class', 'wi wi-moon-' + (moonday>27?0:moonday))
            .prop('title', moonday + ' Tag' + (moonday>1?'e':''));

        // add apperant temp
        wui.apparentTemperatureMax.text(
            wdata.apparentTemperatureMax + ' °C'
        );
        wui.apparentTemperatureMin.text(
            wdata.apparentTemperatureMin + ' °C'
        );
    };


    var update_forecasts = function(report) {

        if( report.forecast.daily === null )
            return;

        $.each(raspy.ui.daily.forecasts, function(index, fcui) {
            if( report.forecast.daily.data.length > index ) {
                update_report_daily(
                    fcui,
                    report.forecast.daily.data[index]
                );
            }
        });
    };

    return {
        build: function(info, report) {
            raspy.tools.samplelogger.create(
                raspy.ui.currently.sidebar.temp,
                {
                    label: 'Temperatur',
                    unit: '°C',
                    interval: raspy.period * 15 * 1000
                },
                {}
            );

            raspy.tools.samplelogger.create(
                raspy.ui.currently.sidebar.preci,
                {
                    label: 'Niederschlag',
                    interval: raspy.period * 15 * 1000
                },
                'percent'
            );

            raspy.tools.samplelogger.create(
                raspy.ui.currently.sidebar.clouds,
                {
                    label: 'Wolken',
                    interval: raspy.period * 15 * 1000
                },
                'percent'
            );

            // update charts on last panel click
            raspy.ui.currently.sidebar.tabs.btns[0].on('shown.bs.tab', function (e) {
                raspy.ui.currently.sidebar.temp.reflow();
                raspy.ui.currently.sidebar.preci.reflow();
                raspy.ui.currently.sidebar.clouds.reflow();
            });

            // forecast more button change title after clicked
            $.each(raspy.ui.daily.forecasts, function(index, daily) {
                raspy.tools.bs.collapse_style(daily.more, daily.morebtn);
            });
        },
        show: function(info, report) {
            raspy.ui.currently.sidebar.temp.reflow();
            raspy.ui.currently.sidebar.preci.reflow();
            raspy.ui.currently.sidebar.clouds.reflow();
        },
        update: function(info, report) {
            raspy.ui.updates.text(
                raspy.tools.num2human(report.forecast.updates, '')
            );
            raspy.ui.synctime.text(
                raspy.tools.time2human(report.forecast.synctime)
            );
            update_current(report);
            update_forecasts(report);
        }
    };
});
