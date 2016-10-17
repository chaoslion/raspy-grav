/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('fritz', function() {

    var update_router = function(info, report) {

        raspy.ui.router.model.text(report.router.model);
        raspy.ui.router.software.text(report.router.software);
        raspy.ui.router.uptime.text(
            moment.duration(report.router.uptime, 'second'
        ).humanize());

        raspy.ui.router.localtime.text(
            raspy.tools.time2human(
                report.router.localtime
            )
        );
        raspy.ui.router.upgrade.text(report.router.upgrade?'Ja':'Nein');
    }

    var update_dsl = function(info, report) {
        // fritz returns rates in kbits/s

        // rx == upload
        raspy.ui.dslrx.bytes.text(raspy.tools.mem2human(report.dsl.rx.rate.total_bytes));
        raspy.ui.dslrx.ratemax.text(raspy.tools.bits2human(report.dsl.rx.ratemax*1000));
        raspy.ui.dslrx.ratelimit.text(raspy.tools.bits2human(report.dsl.rx.ratelimit*1000));


        raspy.ui.dslrx.log.update(
            report.dsl.rx.rate.rates,
            {
                max: report.dsl.rx.ratemax * 1000
            }
        );

        // tx == download
        raspy.ui.dsltx.bytes.text(raspy.tools.mem2human(report.dsl.tx.rate.total_bytes));
        raspy.ui.dsltx.ratemax.text(raspy.tools.bits2human(report.dsl.tx.ratemax*1000));
        raspy.ui.dsltx.ratelimit.text(raspy.tools.bits2human(report.dsl.tx.ratelimit*1000));


        raspy.ui.dsltx.log.update(
            report.dsl.tx.rate.rates,
            {
                max: report.dsl.tx.ratemax * 1000
            }
        );
    }

    var update_devices = function(info, report) {

        if(!raspy.authorized()) {
            return;
        }

        $.each(raspy.ui.devtabs.cnts, function(index, deviceui) {
            device = report.landevicectrl.devices[index];
            var ton = moment.duration(device.ton, "minutes").humanize();
            var toff = moment.duration(device.toff, "minutes").humanize();
            var tlease = moment.duration(device.leasetime).humanize();

            deviceui.state
                .attr('class', 'pull-right fa fa-lg ' + (device.state?'fa-thumbs-up':'fa-thumbs-down'))
                .css('color', device.state?raspy.colors.green:raspy.colors.red)
                .prop('title', device.state?'ja':'nein');

            deviceui.time.text(device.state?ton:toff);

            deviceui.mac.text(device.mac);
            deviceui.interface.text(device.interface);
            deviceui.hostname.text(device.hostname);
            deviceui.ip.text(device.ip);
            deviceui.lease.text(tlease);

            // logchart
            deviceui.log.update(device.log, {});
        });

    }


    return {
        build: function(info, report) {
              raspy.tools.samplelogger.create(
                raspy.ui.dslrx.log,
                {
                    mode: raspy.tools.samplelogger.MODE_ALL,
                    label: 'Download',
                    unit: 'bit/s',
                    min: 0,
                    plot: {
                        show_stats: false
                    }
                },
                {}
            );

            raspy.tools.samplelogger.create(
                raspy.ui.dsltx.log,
                {
                    mode: raspy.tools.samplelogger.MODE_ALL,
                    label: 'Upload',
                    unit: 'bit/s',
                    min: 0,
                    plot: {
                        show_stats: false
                    }
                },
                {}
            );

            if(!raspy.authorized())
                return;

            // build devices
            $.each(raspy.ui.devtabs.cnts, function(index, device){
                raspy.tools.samplelogger.create(
                    device.log,
                    {
                        label: 'Status',
                    },
                    'binary'
                );
                raspy.ui.devtabs.btns[index].on('shown.bs.tab', function (e) {
                    device.log.reflow();
                });
            });
        },
        show: function(info, report) {
            raspy.ui.dslrx.log.reflow();
            raspy.ui.dsltx.log.reflow();
            if(!raspy.authorized())
                return;
            for(var i=0;i<raspy.ui.devtabs.cnts.length;++i) {
                raspy.ui.devtabs.cnts[i].log.reflow();
            }
        },
        update: function(info, report) {
            update_router(info, report);
            update_dsl(info, report);
            update_devices(info, report);
        }
    };
});
