/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('sensor', function() {
    return {
        build: function(info, report) {
            var sensor_info = [
                ['Temperatur', '°C', {}],
                ['Licht', 'lx', {}],
                ['Luftdruck', 'hPa', {}],
                ['Luftfeuchte', null, 'percent']
            ];
            $.each(raspy.ui.sensortabs.cnts, function(index, sensorui) {
                var info = sensor_info[index];

                $.each(sensorui.locationtabs.cnts, function(index, locationui) {

                    for(var i=0;i<locationui.items.length;++i) {
                        raspy.tools.samplelogger.create(
                            locationui.items[i],
                            {
                                label: info[0],
                                unit: info[1],
                                interval: raspy.period * 15 * 1000,
                                // mode: raspy.tools.samplelogger.MODE_ALL
                            },
                            info[2]
                        );
                    }
                    sensorui.locationtabs.btns[index].on('shown.bs.tab', function (e) {
                        for(var i=0;i<locationui.items.length;++i) {
                            locationui.items[i].reflow();
                        }
                    });
                });

                raspy.ui.sensortabs.btns[index].on('shown.bs.tab', function (e) {
                    for(var i=0;i<sensorui.locationtabs.cnts.length;++i) {
                        for(var j=0;j<sensorui.locationtabs.cnts[i].items.length;++j) {
                            sensorui.locationtabs.cnts[i].items[j].reflow();
                        }
                    }
                });
            });
        },
        show: function(info, report) {
            $.each(raspy.ui.sensortabs.cnts, function(index, sensorui) {
                for(var i=0;i<sensorui.locationtabs.cnts.length;++i) {
                    for(var j=0;j<sensorui.locationtabs.cnts[i].items.length;++j) {
                        sensorui.locationtabs.cnts[i].items[j].reflow();
                    }
                }
            });
        },
        update: function(info, report) {
            var types = ['temp', 'light', 'humidity', 'pressure'];
            $.each(raspy.ui.sensortabs.cnts, function(index, sensorui) {
                for(var i=0;i<sensorui.locationtabs.cnts.length;++i) {
                    for(var j=0;j<sensorui.locationtabs.cnts[i].items.length;++j) {
                        sensorui.locationtabs.cnts[i].items[j].update(
                            report[types[index]].locations[i].items[j].sensor.log,
                            {}
                        );
                    }
                }
            });
        }
    };
});
