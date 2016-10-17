/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('supply', function() {

    var build_logs = function(info, report) {

        raspy.tools.samplelogger.create(
            raspy.ui.logs[0],
            {
                label: 'Spannung',
                unit: 'V',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            {
                gauge: {
                    yAxis: [{
                        min: 4.4,
                        max: 5.6,
                        tickInterval: 0.2,
                        minorTickInterval: 0.1,
                        plotBands: raspy.tools.samplelogger.plotbands(
                            [4.4, 4.7, 4.8, 5.2, 5.3, 5.6],
                            ['-','+','++','+','-']
                        )
                    }]
                }
            }
        );

        raspy.tools.samplelogger.create(
            raspy.ui.logs[1],
            {
                label: 'Strom',
                unit: 'A',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            {
                gauge: {
                    yAxis: [{
                        min: 0,
                        max: 2,
                        tickInterval: 0.5,
                        minorTickInterval: 0.1,
                        plotBands: raspy.tools.samplelogger.plotbands(
                            [0, 0.3, 1, 2],
                            ['++','+','-']
                        )
                    }]
                }
            }
        );

        raspy.tools.samplelogger.create(
            raspy.ui.logs[2],
            {
                label: 'Leistung',
                unit: 'W',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            {
                gauge: {
                    yAxis: [{
                        min: 0,
                        max: 12,
                        tickInterval: 1,
                        minorTickInterval: 0.5,
                        plotBands: raspy.tools.samplelogger.plotbands(
                            [0, 1.5, 5, 12],
                            ['++','+','-']
                        )
                    }]
                },
            }
        );
    };

    var build_energymeter = function(info, report) {
        raspy.tools.energymeter.create(raspy.ui.energy);
    };


    return {
        build: function(info, report) {
            build_logs(info, report);
            build_energymeter(info, report);
        },
        show: function(info, report) {
            for(var i=0;i<3;++i) {
                raspy.ui.logs[i].reflow();
            }
            raspy.ui.energy.reflow();
        },
        update: function(info, report) {
            var data = [
                report.voltage,
                report.current,
                report.power,
            ];

            for(var i=0;i<3;++i) {
                raspy.ui.logs[i].update(
                    data[i],
                    {}
                );
            }

            raspy.ui.energy.update(
                info.timestamp,
                report.energy
            );
        }
    };
});
