/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/

raspy.register_task('system', function() {

    var build_processor = function(report) {
        raspy.tools.samplelogger.create(
            raspy.ui.processor[0],
            {
                label: 'Temperatur',
                unit: '°C',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            {
                gauge: {
                    yAxis: [{
                        min: 20,
                        max: 80,
                        tickInterval: 10,
                        minorTickInterval: 5,
                        plotBands: raspy.tools.samplelogger.plotbands(
                            [20, 40, 60, 80],
                            ['++','+','-']
                        )
                    }],
                    series: [
                        {
                        },
                        {
                            dial: {
                                baseWidth: 4,
                                radius: '95%',
                                rearLength: '0%',
                                backgroundColor: raspy.colors.reference
                            }
                        }
                    ]
                }
            }
        );

        raspy.tools.samplelogger.create(
            raspy.ui.processor[1],
            {
                label: 'Lüfter',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            'percent'
        );

        raspy.tools.samplelogger.create(
            raspy.ui.processor[2],
            {
                label: 'Auslastung',
                mode: raspy.tools.samplelogger.MODE_ALL
            },
            'percent'
        );
    };

    var build_cpus = function(report) {
        var tr = $('<tr>').appendTo(raspy.ui.cpubody);
        // raspy.ui.cpubody
        raspy.ui.cpu_usages = $.map(report.system.cpus, function(cpu, index) {
            // only return usage, rest is static
            var usage = $('<span>').attr('class', 'badge');
            $('<td>')
                .append(
                    $('<span>')
                        .attr('class', 'badge')
                        .text(cpu.name)
                )
                .appendTo(tr);

            $('<td>')
                .append(
                    $('<span>')
                        .attr('class', 'badge')
                        .text(raspy.tools.num2human(cpu.freq, 'Hz'))
                )
                .appendTo(tr);

            $('<td>')
                .append(usage)
                .appendTo(tr);

            $('<td>')
                .append(
                    $('<span>')
                        .attr('class', 'badge')
                        .text(cpu.model)
                )
                .appendTo(tr);

            return usage;

        });
    };

    var build_disk = function(report) {
        var min_bytes = 0.01;

        raspy.tools.samplelogger.create(
            raspy.ui.disk.writerate,
            {
                label: 'Schreibrate',
                unit: 'B/s',
                mode: raspy.tools.samplelogger.MODE_PLOT,
                plot: {
                    show_stats: false
                }
            },
            {
            plot: {
                yAxis:[{
                    min: 0
                }]
            }
        }
        );

        raspy.tools.samplelogger.create(
            raspy.ui.disk.readrate,
            {
                label: 'Leserate',
                unit: 'B/s',
                mode: raspy.tools.samplelogger.MODE_PLOT,
                plot: {
                    show_stats: false
                }
            },
            {
            plot: {
                yAxis:[{
                    min: 0
                }]
            }
        }
        );
    };

    var build_net = function(report) {
          raspy.tools.samplelogger.create(
            raspy.ui.net.rxrate,
            {
                label: 'Empfangsrate',
                unit: 'bit/s',
                mode: raspy.tools.samplelogger.MODE_PLOT,
                plot: {
                    show_stats: false
                }
            },
            {
            plot: {
                yAxis:[{
                    min: 0
                }]
            }
        }
        );

        raspy.tools.samplelogger.create(
            raspy.ui.net.txrate,
            {
                label: 'Senderate',
                unit: 'bit/s',
                mode: raspy.tools.samplelogger.MODE_PLOT,
                plot: {
                    show_stats: false
                }
            },
            {
            plot: {
                yAxis:[{
                    min: 0
                }]
            }
        }
        );
    };


    var update_mem = function(ui, value, total) {
        var p = 0;
        if( total != 0 )
            p = math.round(value / total * 100);
        ui.size.text(raspy.tools.mem2human(value));
        ui.usage
            .css('width', p +'%')
            .attr('aria-valuenow', p)
            .text(p + '%');
    };

    var update_processor = function(report) {

        // update temp reference dial
        raspy.ui.processor[0].gauge.series[1].update(
            {
                data: [report.tempctrl.fan.profile]
            },
            false
        );
        raspy.ui.processor[0].update(report.tempctrl.temp, {});
/*
        // add temp setpoint plotline
        var temp_min = math.min(
            report.tempctrl.temp.rng[0][1],
            report.tempctrl.fan.active
        );

        var temp_max = math.max(
            report.tempctrl.temp.rng[1][1],
            report.tempctrl.fan.active
        );

        raspy.ui.processor[0].chart.yAxis[0].update({
            max: temp_max + 2,
            min: temp_min - 2,
            plotLines: [
                {
                    value: report.tempctrl.fan.active,
                    color: '#0a0a0a',
                    dashStyle: 'LongDash',
                    zIndex: 5,
                    width: 2
                },
                {
                    value: report.tempctrl.temp.avg,
                    color: raspy.colors.samplelogger.average,
                    dashStyle: 'Solid',
                    zIndex: 5,
                    width: 2
                }
            ]
        });*/

        raspy.ui.processor[1].update(report.tempctrl.speed, {});
        raspy.ui.processor[2].update(report.system.usage, {});
    };

    var update_fan = function(report) {
        raspy.ui.fan.ecomode
            .css('color', report.tempctrl.fan.ecomode?raspy.colors.green:raspy.colors.red)
            .prop('title', report.tempctrl.fan.ecomode?'aktiv':'inaktiv');

        raspy.ui.fan.minspeed.text(
            math.round(report.tempctrl.fan.minspeed, 2) + ' %'
        );

        raspy.ui.fan.maxload.text(
            math.round(report.tempctrl.fan.maxload, 4) + ' A'
        );

        raspy.ui.fan.cal_time.text(
            raspy.tools.time2human(report.tempctrl.fan.calibration)
        );

        // update profile and make active big
        raspy.ui.fan.profiles.empty();


        var selected = '<span class="badge">' + report.tempctrl.fan.profile + ' °C</span>';

        var profcnt = report.tempctrl.fan.profiles.length;
        if( profcnt == 1 ) {
            $('<li>').html(selected).appendTo(raspy.ui.fan.profiles);
        } else if( profcnt == 2 ) {
            if( report.tempctrl.fan.profile == raspy.ui.fan.profiles[0] ) {
                $('<li>').html(selected).appendTo(raspy.ui.fan.profiles);
                $('<li>').html(raspy.ui.fan.profiles[1]).appendTo(raspy.ui.fan.profiles);
            } else {
                $('<li>').html(raspy.ui.fan.profiles[0]).appendTo(raspy.ui.fan.profiles);
                $('<li>').html(selected).appendTo(raspy.ui.fan.profiles);
            }
        } else {

        }


        $.each(report.tempctrl.fan.profiles, function(index, profile) {
            if( report.tempctrl.fan.profile == profile )
                profile = '<span class="badge">' + profile + ' °C</span>';
            var li = $('<li>').html(profile);
            /*if( report.tempctrl.fan.active == profile )
                li.css('font-size', '150%');*/
            li.appendTo(raspy.ui.fan.profiles);
        });
    };

    var update_process = function(report) {
        var mp = math.round(
            report.process.rss / report.memory.vmem.total * 100,
            2
        );

        raspy.ui.process.mem.text(raspy.tools.mem2human(report.process.rss) + ' (' + mp + ' %)');
        raspy.ui.process.usage.text(report.process.cpu_usage + ' %');

        raspy.ui.process.wcount.text(raspy.tools.num2human(report.process.write.count, null));
        raspy.ui.process.wbytes.text(raspy.tools.mem2human(report.process.write.bytes));
        raspy.ui.process.rcount.text(raspy.tools.num2human(report.process.read.count, null));
        raspy.ui.process.rbytes.text(raspy.tools.mem2human(report.process.read.bytes));
    };

    var update_cpu = function(report) {
        $.each(raspy.ui.cpu_usages, function(index, usage) {
            usage.text(
                math.round(
                    report.system.cpus[index].usage,
                    2
                ) + ' %'
            );
        });
    };

    var update_os = function(report) {
        raspy.ui.os.kernel.text(report.system.kernel);
        raspy.ui.os.distro.text(report.system.distro);


        var idle_ratio = math.round(
            100 * report.system.idletime / report.system.uptime
        );
        raspy.ui.os.uptime.text(
            raspy.tools.ms2human(report.system.uptime * 1000)
        );

        raspy.ui.os.idletime.text(
            raspy.tools.ms2human(report.system.idletime * 1000) +
            ' (' + idle_ratio + ' %)'
        );
    };


    var update_net = function(report) {
        raspy.ui.net.rxbytes.text(raspy.tools.mem2human(report.net.rx.total_bytes));
        raspy.ui.net.txbytes.text(raspy.tools.mem2human(report.net.tx.total_bytes));

        raspy.ui.net.rxrate.update(report.net.rx.rates, {});
        raspy.ui.net.txrate.update(report.net.tx.rates, {});

    };

    var update_disk = function(report) {

        raspy.ui.disk.total.text(
            raspy.tools.mem2human(report.disk.total)
        );

        data = [
            report.disk.used,
            report.disk.free
        ];

        $.each(raspy.ui.disk.mem, function(index, ui) {
            update_mem(
                ui,
                data[index],
                report.disk.total
            );
        });


        var table_entry = function(ui, data) {
            ui.bytes.text(raspy.tools.mem2human(data.rate.total_bytes));
            ui.count.text(raspy.tools.num2human(data.count, null));
            ui.time.text(raspy.tools.ms2human(data.time));
        };
        table_entry(raspy.ui.disk.write, report.disk.write);
        table_entry(raspy.ui.disk.read, report.disk.read);


        raspy.ui.disk.writerate.update(report.disk.write.rate.rates, {});
        raspy.ui.disk.readrate.update(report.disk.read.rate.rates, {});

    };

    var update_vmem = function(report) {
        raspy.ui.vmemtotal.text(
            raspy.tools.mem2human(report.memory.vmem.total)
        );

        data = [
            report.memory.vmem.used,
            report.memory.vmem.available,
            report.memory.vmem.free,
            report.memory.vmem.buffers,
            report.memory.vmem.cached
        ];

        $.each(raspy.ui.vmem, function(index, ui) {
            update_mem(
                ui,
                data[index],
                report.memory.vmem.total
            );
        });
    };

    var update_swap = function(report) {
        raspy.ui.swaptotal.text(
            raspy.tools.mem2human(report.memory.swap.total)
        );

        data = [
            report.memory.swap.used,
            report.memory. swap.free
        ];

        $.each(raspy.ui.swap, function(index, ui) {
            update_mem(
                ui,
                data[index],
                report.memory.swap.total
            );
        });
    };

    return {
        build: function(info, report) {
            build_processor(report);
            build_cpus(report);
            build_net(report);
            build_disk(report);
        },
        show: function(info, report) {
            for(var i=0;i<3;++i) {
                raspy.ui.processor[i].reflow();
            }
            raspy.ui.disk.writerate.reflow();
            raspy.ui.disk.readrate.reflow();
            raspy.ui.net.rxrate.reflow();
            raspy.ui.net.txrate.reflow();
        },
        update: function(info, report) {
            update_processor(report);
            update_fan(report);
            update_process(report);
            update_cpu(report);
            update_os(report);
            update_net(report);
            update_disk(report);
            update_vmem(report);
            update_swap(report);
        }
    };
});
