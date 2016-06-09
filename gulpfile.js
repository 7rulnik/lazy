'use strict';

const gulp = require('gulp');
const postcss = require('gulp-postcss');
const sugarss = require('sugarss')
const sourcemaps = require('gulp-sourcemaps');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const remember = require('gulp-remember');
const cached = require('gulp-cached');
const concat = require('gulp-concat')
const del = require('del');
const rename = require('gulp-rename')
const pug = require('gulp-pug')
const path = require('path')
const stringHash = require('string-hash')
const browserSync = require('browser-sync')
const fs = require('fs')
const {reload} = browserSync


const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

const paths = {
	styles: {
		sss: 'src/components/**/*.sss',
		json: 'src/components/**/*.sss.json'
	},
	pug: {
		pages: 'src/*.pug',
		all: 'src/**/*.pug'
	},
	dist: 'dist/'
}

// cached.caches = {}
// remember.forgetAll('styles')

gulp.task('styles', () => {
	const postcssPlugins = [
		require('postcss-import'),
		require('postcss-cssnext'),
		require('postcss-assets'),
		require('postcss-modules')({
			generateScopedName: (name, filename, css) => {
				const i = css.indexOf('.' + name);
				const numLines = css.substr(0, i).split(/[\r\n]/).length;
				const file = path.basename(filename, '.sss');
				const hash = stringHash(css).toString(36).substr(0, 5);

				return `${file}__${name}__${numLines}__${hash}`;
			}
		})
	]

	return gulp.src(['./src/common.sss', paths.styles.sss])
		.pipe(debug({title: 'Styles:'}))
		.pipe(gulpIf(isDevelopment, sourcemaps.init()))
		.pipe(cached('styles'))
		.pipe(postcss(postcssPlugins, { parser: sugarss }))
		.pipe(remember('styles'))
		.pipe(concat('main.css'))
		.pipe(gulpIf(isDevelopment, sourcemaps.write()))
		.pipe(gulp.dest(paths.dist));
});


function requireJSON(file) {
	const ext = '.sss.json'
	const filePath = `./src/components/${file.substring(2, file.length - ext.length)}/${file.substring(2)}`

	console.log(JSON.parse(fs.readFileSync(filePath, 'utf8')))
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

gulp.task('pug', () => {
	return gulp.src(paths.pug.pages)
		.pipe(pug({
			locals: {
				require: requireJSON
			}
		}))
		.pipe(gulp.dest(paths.dist))
})


gulp.task('clean', () => del(paths.dist))

gulp.task('assets', () => {
	return gulp.src('frontend/assets/**', {since: gulp.lastRun('assets')})
		.pipe(debug({title: 'assets'}))
		.pipe(gulp.dest('public'))
})


gulp.task('build', gulp.series(
		'clean',
		gulp.parallel(
			gulp.series('styles', 'pug'),
			'assets'
		)
	)
)


gulp.task('watch', () => {
	gulp.watch('src/**/*.sss', gulp.series('styles'))
		.on('unlink', filepath => {
			remember.forget('styles', path.resolve(filepath));
			delete cached.caches.styles[path.resolve(filepath)];
		})

	// gulp.watch(paths.styles.sss, gulp.series('styles'))
	gulp.watch([paths.pug.all, paths.styles.json], gulp.series('pug'))
});


gulp.task('serve', () => {
	browserSync.init({
		server: 'dist'
	});

	gulp.watch('dist/*.html').on('change', reload)
});


gulp.task('dev',
		gulp.series('build', gulp.parallel('watch', 'serve'))
);
