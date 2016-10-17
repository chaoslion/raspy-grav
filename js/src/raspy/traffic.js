/*!
    * aj.de (http://alexanderjaehnel.de/)
    * @copyright 2016 Alexander Jähnel
    * @license GNU (https://github.com/chslion/raspy/blob/master/LICENSE)
*/
raspy.register_task('traffic', function() {

    var MODE_DRIVING = 0x01;
    var MODE_TRANSIT = 0x02;
    var MODE_BIKEING = 0x04;
    var MODE_WALKING = 0x08;

    var ROUTE_COLORS = [
        '#0074D9',
        '#7FDBFF',
        '#39CCCC',
        '#3D9970',
        '#2ECC40',
        '#01FF70',
        '#FFDC00',
        '#FF851B',
        '#FF4136',
        '#001f3f',
        '#85144b',
        '#F012BE',
        '#B10DC9',
        '#111111',
        '#AAAAAA',
        '#DDDDDD'
    ];
    var MAX_ROUTES = ROUTE_COLORS.length;

    var create_modal_route = function(content) {
        raspy.tools.bs.dialog(
            raspy.tools.bs.DIALOG_INFO,
            content
        );
    };

    var create_tabledata_info = function(routedata) {
        return $('<td>')
            .append($('<button>')
                .addClass('btn btn-primary btn-xs')
                .append(raspy.tools.bs.fontawesome('info', null))
                .append($('<span>')
                    .prop('class', 'sr-only')
                    .append('Route')
                )
                .on('click', function() {
                    var list = $('<ol>');
                    for(var j=0;j<routedata.steps.length;++j) {
                        var list_item = $('<li>').html(
                            routedata.steps[j].html_instructions
                        );
                        if( routedata.steps[j].travel_mode == "TRANSIT" ) {
                            var td = routedata.steps[j].transit_details;
                            list_item.append($('<ul>')
                                .append($('<li>')
                                    .append('Start: ' + td.departure_stop)
                                    .append($('<ul>')
                                        .append($('<li>')
                                            .append('Richtung: ' + td.headsign)
                                        )
                                        .append($('<li>')
                                            .append('Linie: ' + td.line)
                                        )
                                        .append($('<li>')
                                            .append('Abfahrtszeit: ' + raspy.tools.time2human_timeonly(td.departure_time))
                                        )
                                    )
                                )
                                .append($('<li>')
                                    .append('Ende: ' + td.arrival_stop)
                                    .append($('<ul>')
                                        .append($('<li>')
                                            .append('Ankunftszeit: ' + raspy.tools.time2human_timeonly(td.arrival_time))
                                        )
                                    )
                                )
                            );
                        }
                        list.append(list_item);
                    }
                    create_modal_route(list);
                })
            )
        ;
    };

    var create_tabledata_text = function(text) {
        return $('<td>')
            .append($('<span>')
                .addClass('badge')
                .append(text)
            )
        ;
    };

    var update_direction = function(dirui, dirdata) {

        // driving
        if( (dirdata.mode & MODE_DRIVING) > 0 ) {
            dirui.tdriving.empty();
            var map_bounds = new google.maps.LatLngBounds();

            $.each(dirdata.routes.driving, function(index, routedata) {
                dirui.tdriving.append($('<tr>')
                    .append(create_tabledata_info(routedata))
                    .append(create_tabledata_text(
                        raspy.tools.ms2human(routedata.duration * 1000)
                    ))
                    .append(create_tabledata_text(
                        raspy.tools.ms2human(routedata.duration_traffic * 1000)
                    ))
                    .append(create_tabledata_text(
                        raspy.tools.num2human(routedata.distance, 'm')
                    ))
                );

                // map
                map_bounds.extend(
                    new google.maps.LatLng(
                        routedata.bounds.southwest
                    )
                );
                map_bounds.extend(
                    new google.maps.LatLng(
                        routedata.bounds.northeast
                    )
                );

                var routepoly = google.maps.geometry.encoding.decodePath(
                    routedata.polyline
                );

                var route = new google.maps.Polyline({
                    path: routepoly,
                    clickable: false,
                    strokeColor: ROUTE_COLORS[index],
                    strokeOpacity: 1,
                    strokeWeight: 6,
                    visible: true// (i>0?false:true)
                });
                route.setMap(dirui.map);
            });

            // update traffic layer
            trafficLayer = new google.maps.TrafficLayer();
            trafficLayer.setMap(dirui.map);

            // set bounds
            dirui.map.fitBounds(map_bounds);
        }

        // transit
        if( (dirdata.mode & MODE_TRANSIT) > 0 ) {
            //dirui.table_transit.empty();
            dirui.ttransit.empty();
            $.each(dirdata.routes.transit, function(index, routedata) {

                dirui.ttransit.append($('<tr>')
                    .append(create_tabledata_info(routedata))
                    .append(create_tabledata_text(
                        raspy.tools.time2human_timeonly(routedata.departure_time)
                    ))
                    .append(create_tabledata_text(
                        raspy.tools.time2human_timeonly(routedata.arrival_time)
                    ))
                    .append(create_tabledata_text(
                        raspy.tools.ms2human(routedata.duration * 1000)
                    ))
                    .append(create_tabledata_text(
                        raspy.tools.num2human(routedata.distance, 'm')
                    ))
                );
            });
        }
    };


    return {
        build: function(info, report) {
            $.each(raspy.ui.directions, function(index, dir) {

                // create driving table and table entries
                if( (report.directions[index].mode & MODE_DRIVING) > 0 ) {

                    dir.map = new google.maps.Map(
                        document.getElementById(dir.driving_map.attr('id')),
                        {
                            center: new google.maps.LatLng(0,0),
                            zoom: 1,
                            clickableIcons: false
                        }
                    );
                }
            });
        },
        show: function(info, report) {
        },
        update: function(info, report) {

            $.each(raspy.ui.directions, function(index, dir) {
                update_direction(dir, report.directions[index]);
            });

            raspy.ui.updates.text(report.updates);
            raspy.ui.synctime.text(
                raspy.tools.time2human(report.synctime)
            );
        }
    };
});
