/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('rcsocket', function() {

    function update_tx433(info, report) {
        // tx433
        raspy.ui.tx433.count.text(report.socketctrl.switch.count);
        raspy.ui.tx433.timestamp.text(
            raspy.tools.time2human(report.socketctrl.switch.timestamp)
        );
        raspy.ui.tx433.code.text(report.socketctrl.switch.code);
    }

    function update_sockets(info, report) {

        $.each(raspy.ui.socketstabs.cnts, function(index, socketui) {
            var socketdata = report.socketctrl.sockets[index];

            var minute_on = moment.duration(
                socketdata.energy.ton / 60, "minutes"
            ).humanize();

            var minute_off = moment.duration(
                socketdata.energy.toff / 60, "minutes"
            ).humanize();

            socketui.state
                .css('color', socketdata.state?raspy.colors.green:raspy.colors.red)
                .prop('title', socketdata.state?'ein':'aus');

            socketui.mode.text(socketdata.mode?'Automat':'Manuell');


            socketui.ton.text(minute_on);
            socketui.toff.text(minute_off);
            socketui.prms.text(socketdata.prms + ' W');

            // energy stats
            socketui.energy.update(info.timestamp, socketdata.energy);

            // log
            if( !raspy.authorized() ) {
                return;
            }
            socketui.automat.text(socketdata.automat);
            socketui.automat_msg.text(socketdata.automat_msg);
            socketui.log.update(socketdata.log, {});
        });
    }

    return {
        build: function(info, report) {
            $.each(raspy.ui.socketstabs.cnts, function(index, socket) {

                raspy.tools.energymeter.create(socket.energy, {
                    show_logs: raspy.authorized()
                });

                raspy.ui.socketstabs.btns[index].on('shown.bs.tab', function (e) {
                    socket.energy.reflow();
                    if( !raspy.authorized() ) {
                        return;
                    }
                    socket.log.reflow();
                });

                if( !raspy.authorized() ) {
                    // socket.log.slcontainer.remove();
                    socket.automat.parent().remove();
                    socket.automat_msg.parent().remove();
                    return;
                }

                raspy.tools.samplelogger.create(
                    socket.log,
                    {
                        label: 'Status'
                    },
                    'binary'
                );

            });
        },
        show: function(info, report) {
            for(var i=0;i<raspy.ui.socketstabs.cnts.length;++i) {
                raspy.ui.socketstabs.cnts[i].energy.reflow();
                if( !raspy.authorized() ) {
                    continue;
                }
                raspy.ui.socketstabs.cnts[i].log.reflow();
            }
        },
        update: function(info, report) {
            update_tx433(info, report);
            raspy.ui.automats.active.text(report.automatctrl.active);
            raspy.ui.automats.count.text(report.automatctrl.count);
            update_sockets(info, report);
        },
    };
});
