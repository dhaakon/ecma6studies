module.exports = function( grunt ){
  require('matchdep').filterDev('*').forEach(grunt.loadNpmTasks);

  var path = require('path');
  var sassPaths =  [require('node-bourbon').includePaths, require('node-neat').includePaths ];
  console.log(sassPaths);

  var options = {
    watch : {
       app: {
            files: ['src/js/**/*.jsx', 'src/js/**/*.jade'],
            tasks: ['browserify:dist'],
        },
        sass: {
            files: 'src/sass/**/*.scss',
            tasks: ['sass:dist'],
            options: {
              spawn: true
            }
        }
    },

    sass:{
      dist:{
        options:{
          includePaths: sassPaths,
					sourcemap:true
        },
        files:{
          'public/css/main.css': [
            'src/sass/main.scss'
          ]
        },
      },
    },

    concurrent:{
        dev:{
          tasks: ['nodemon', 'watch'],
          options: {
            logConcurrentOutput: true
          }
        }
    },

    svg2json:{
      dev:{
        files:{
          './public/json/logo.json':['./svg/logo.svg']
        }
      }
    },

    nodemon:{
        src: {
            options: {
                file: './server/index.js',
                ignoredFiles: ['*.md', 'node_modules/**','src/js/**', 'src/sass/**', 'public/**'],
                delayTime: 1,
                env: {
                    PORT: 3000
                },
                cwd: __dirname
            }
        }
    },

    browserify:{
      dist:{
        options:{
          transform: [
            ["babelify",
              { "presets": ["es2015"] }
            ]
          ]
        },
        files:{
          'public/js/main.js':['src/js/**/*.jsx']
        }
      }
    }
  };

  grunt.initConfig( options );

  grunt.registerTask( 'default', [ 'browserify:dist','concurrent' ] );
};

