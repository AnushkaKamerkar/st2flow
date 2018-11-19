'use strict';

const gulp = require('gulp');
const settings = require('../settings.json');
const plugins = require('gulp-load-plugins')(settings.plugins);

gulp.task('production-scripts', gulp.series([ 'browserify' ], () =>
  gulp.src(settings.production.scripts, { base: '.' })
    .pipe(plugins.terser())
    .pipe(gulp.dest(settings.production.dest))
    .pipe(plugins.size({
      showFiles: true,
    }))
    .pipe(plugins.size({
      showFiles: true,
      gzip: true,
    }))
));
