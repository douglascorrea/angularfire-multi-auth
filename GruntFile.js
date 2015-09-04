/* global module */
module.exports = function(grunt) {
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

        // Minify JavaScript
        uglify : {
            options: {
                preserveComments: 'some'
            },
            app : {
                files : {
                    'dist/angularfire-multi-auth.min.js' : ['dist/angularfire-multi-auth.js']
                }
            }
        },

        // Lint JavaScript
        jshint : {
            options : {
                jshintrc: '.jshintrc'
            },
            all : ['src/**/*.js']
        }


    });

    require('load-grunt-tasks')(grunt);

    // Build tasks
    grunt.registerTask('build', ['concat', 'jshint', 'uglify']);

    // Default task
    grunt.registerTask('default', ['build']);
};
