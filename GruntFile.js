/* global module */
module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // merge files from src/ into angularfire-multi-auth.js
        concat: {
            app: {
                src: [
                    'src/module.js',
                    'src/**/*.js'
                ],
                dest: 'dist/angularfire-multi-auth.js'
            }
        },
        // Run shell commands
        shell: {
            options: {
                stdout: true
            },
            protractor_install: {
                command: 'node ./node_modules/protractor/bin/webdriver-manager update'
            },
            npm_install: {
                command: 'npm install'
            },
            bower_install: {
                command: 'bower install'
            }
        },

        // Minify JavaScript
        uglify: {
            options: {
                preserveComments: 'some'
            },
            app: {
                files: {
                    'dist/angularfire-multi-auth.min.js': ['dist/angularfire-multi-auth.js']
                }
            }
        },

        // Lint JavaScript
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: ['src/**/*.js']
        },

        // Create local server
        connect: {
            testserver: {
                options: {
                    hostname: 'localhost',
                    port: 3030
                }
            }
        },
        // End to end (e2e) tests
        protractor: {
            options: {
                configFile: "tests/local_protractor.conf.js"
            },
            singlerun: {}
        }


    });

    require('load-grunt-tasks')(grunt);

    // Installation
    grunt.registerTask('install', ['shell:protractor_install']);
    grunt.registerTask('update', ['shell:npm_install', 'shell:bower_install']);

    // Build tasks
    grunt.registerTask('build', ['concat', 'jshint', 'uglify']);
    grunt.registerTask('test:e2e', ['concat', 'connect:testserver', 'protractor:singlerun']);

    // Default task
    grunt.registerTask('default', ['build']);
};
