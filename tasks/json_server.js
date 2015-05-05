/*
 * grunt-json-server
 * https://github.com/tfiwm/grunt-json-server
 *
 * Copyright (c) 2014 Mitko Tschimev
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    var jsonServer = require('json-server'),
        request  = require('superagent'),
        path = require('path');

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('json_server', 'Give it a JSON or JS seed file and it will serve it through REST routes.', function () {
        var done = this.async();


        //-- var low = jsonServer.low;
        var server = jsonServer.create();         // Express server
        server.use(jsonServer.defaults);          // Default middlewares (logger, public, cors)

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            port: 13337,
            hostname: '0.0.0.0',
            keepalive: true,
            db: ''
        });
        var source = options.db; //filename of json file containing the database, or Json object, or url of Json file
        var port = options.port;
        var taskTarget = this.target;
        var keepAlive = this.flags.keepalive || options.keepalive;

        // Start server
        function start(router,port) {
            server.use(router); //Express router
            server
            .listen(port, options.hostname)
            .on('listening', function() {
                var hostname = options.hostname;
                var target = 'http://' + hostname + ':' + port;

                 //print list of entities contained in the database (i.e. name of first level objects
                 for (var prop in router.db.object) {
                     grunt.log.write(target + '/' + prop);
                 }
                grunt.log.writeln('Started json rest server on ' + target);
                grunt.config.set('json_server.' + taskTarget + '.options.hostname', hostname);
                grunt.config.set('json_server.' + taskTarget + '.options.port', port);

                grunt.event.emit('json_server.' + taskTarget + '.listening', hostname, port);

                if (!keepAlive) {
                    done();
                }
            })
            .on('error', function(err) {
                if (err.code === 'EADDRINUSE') {
                    grunt.fatal('Port ' + port + ' is already in use by another process.');
                } else {
                    grunt.fatal(err);
                }
            });
        }

        grunt.log.write('Loading database from ' + source + '\n');

        if (/\.json$/.test(source)) {
            //-- low.path = source;
            //--low.db   = jsonServer.low.db = grunt.file.readJSON(source);
            var router = jsonServer.router(source); //directly link to source file in order to allow autosave of db changes: todo add option to avoid autosave and discard changes made
            start(router,port);
        }

        if (/\.js$/.test(source)) { //if input file is a javascript, then use the output of the run as the json object on which the database is based
            grunt.log.write(path.resolve(source));
            //-- low.db   = require(path.resolve(source)).run();
            var dbobject   = require(path.resolve(source)).run();
            var router = jsonServer.router(dbobject);
            start(router,port);
        }

        if (/^http/.test(source)) { //if input file is an url, then fetch the data from the url, parse it and set it as the database
            request
            .get(source)
            .end(function(err, res) {
                if (err) {
                    console.error(err);
                } else {
                    //-- low.db = JSON.parse(res.text);
                    var dbobject = JSON.parse(res.text);
                    var router = jsonServer.router(dbobject);
                    start(router, port);
                }
            });
        }

        // So many people expect this task to keep alive that I'm adding an option
        // for it. Running the task explicitly as grunt:keepalive will override any
        // value stored in the config. Have fun, people.
        if (keepAlive) {
            // This is now an async task. Since we don't call the "done"
            // function, this task will never, ever, ever terminate. Have fun!
            grunt.log.write('Waiting forever...\n');
        }
    });

};
