'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var compass = require('gulp-compass');
var minifyCSS = require('gulp-minify-css');

var jsGlob = 'src/**/*.js';
var dest = 'dist';

// Common task aliases (use these)
gulp.task('default',['js']);

// Watch for file changes and run updates as necessary
gulp.task('watch', function() {
  var watcher = gulp.watch(jsGlob, ['js']);
});

// Compile the js files and deploy the result
gulp.task('js', function() {
  return gulp.src(jsGlob)
    .pipe(jshint({boss:true}))
    .pipe(jshint.reporter())
    .pipe(uglify())
    .pipe(rename({extname: '.min.js'}))
    .pipe(gulp.dest(dest));
});


// Compile the sass files and deploy the result
gulp.task('sass', function () {
  var env = argv.env || 'dev';
  return gulp.src(sassGlob)
    .pipe(compass({
      css: 'app/css',
      sass: 'src/sass',
      image: 'app/images',
      comments: env!='prod'
    }))
    .pipe(concat('app.css'))
    .pipe(rename({dirname:'css'}))
    .pipe(gulpif(env=='prod',minifyCSS()))
    .pipe(gulpif(env=='prod',rename({extname: '.min.css'})))
    .pipe(gulp.dest(dest));
});
