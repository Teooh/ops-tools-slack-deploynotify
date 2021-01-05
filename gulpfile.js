// gulpfile.js

const gulp = require('gulp')
const babel = require('gulp-babel')
const sourcemaps = require('gulp-sourcemaps')
const ts = require('gulp-typescript')

const tsProj = ts.createProject('tsconfig.json')

gulp.task('build', async () => {
    gulp.src('src/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProj())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'))
})

gulp.task('default', gulp.series('build'))