var gulp = require('gulp'),
    njkRender = require('gulp-nunjucks-render'), // Render Nunjucks templates
    data = require('gulp-data'), // Gulp-data proposes a common API for attaching data to the file object for other plugins to consume
    mergeJSON = require('gulp-merge-json'), //  Plugin for deep-merging multiple JSON files into one file. Export as JSON or a node module
    less = require('gulp-less'), // Dynamic preprocessor style sheet language
    lessImport = require('gulp-less-import'),

    autoprefixer = require("gulp-autoprefixer"), // Plugin to parse CSS and add vendor prefixes to CSS rules using values from https://caniuse.com/.
    prettify = require('gulp-html-prettify'), // Prettify HTML
    inlinesource = require('gulp-inline-source'), // Inline all <script>, <link> and <img> tags that contain the "inline" attribute with inline-source.
    group_media = require("gulp-group-css-media-queries"), // Combine matching media queries into one media query definition. Useful for CSS generated by preprocessors using nested media queries.
    sourcemaps = require('gulp-sourcemaps'), // Write source maps
    g_concat = require('gulp-concat'), // Concatenates files
    htmlmin = require('gulp-htmlmin'), // Gulp plugin to minify HTML
    uglify = require('gulp-uglify'), // Minify JavaScript with UglifyJS2
    cleanCSS = require('gulp-clean-css'), // Plugin to minify CSS, using clean-css
    imagemin = require('gulp-imagemin'), // Minify PNG, JPEG, GIF and SVG images with imagemin
    pngquant = require('imagemin-pngquant'), // Pngquant imagemin plugin
    //styleInject  = require("gulp-style-inject"), //style-inject plugin for gulp. Style included into <style> by the directive for example  <!-- inject-style src="./path/file.css" -->

    connect = require("gulp-connect"), // Gulp plugin to run a webserver (with LiveReload)
    opn = require('opn'), // Open a file or url in the user's preferred application.
    plumber = require('gulp-plumber'), // Prevent pipe breaking caused by errors from gulp plugins
    notify = require("gulp-notify"), // Send messages to Mac, Linux or Windows Notification Center
    del = require('del'), // Delete files and folders
    rigger = require('gulp-rigger'), // Rigger is a build time include engine for Javascript, CSS, CoffeeScript and in general any type of text file that you wish to might want to "include" other files into. Use directive "//= path/to/file"
    spritesmith = require('gulp.spritesmith'); // Convert a set of images into a spritesheet and CSS variable
var gulpsync = require('gulp-sync')(gulp);// Sync for dependency tasks of gulp.task method

var server = { host: 'localhost', port: '3000' };

var dir = { src: 'src/', build: 'build/' };

var path = {
    build: {
        html: dir.build,
        js: dir.build + 'js/',
        css: dir.build + 'css/',
        img: dir.build + 'images/',
        fonts: dir.build + 'fonts/',
        icons: dir.src + 'images/',
        favicon: dir.build,
        htmlFiles: dir.build + '**/*.html'
    },
    src: {
        html: dir.src + '*.html',
        js: dir.src + 'js/main.js',
        css: dir.src + 'less/**/*.less',
        img: dir.src + 'images/**/*',
        fonts: dir.src + 'fonts/*.*',
        icons: dir.src + 'images/icons/*.png',
        retinaIcons: dir.src + 'images/icons/*@2x.png',
        favicon: dir.src + '*.ico',
        svg: dir.src + 'svg/*.svg',
        templates: dir.src,
        data: './cached/data.json'
    },
    watch: {
        html: dir.src + '**/*.html',
        js: dir.src + 'js/**/*.js',
        css: dir.src + 'less/**/*.less',
        img: dir.src + 'images/**/*',
        fonts: dir.src + 'fonts/*.*',
        icons: dir.src + 'images/icons/*',
        svg: dir.src + 'svg/*.svg',
        data: dir.src + 'data/**/*.json'
    }
};

function watch() {
    gulp.watch([path.watch.html, path.watch.data], html_build);
    gulp.watch(path.watch.css, style_build);

    gulp.watch(path.watch.js, js_build);
    gulp.watch(path.watch.img, images_build);
    gulp.watch(path.watch.fonts, fonts_build);
    gulp.watch(path.watch.icons, sprite_build);
    gulp.watch(path.watch.svg, svg_build);
};



// **************************************
// *
// *           Build Tasks
// *
// **************************************


function style_build() {
    return gulp.src(path.src.css, { sourcemaps: true })
        .pipe(plumber({ errorHandler: notify.onError("Style build error: <%= error.message %>") }))
        .pipe(lessImport('main.less'))
        .pipe(less())
        .pipe(g_concat('style.css'))
        .pipe(group_media())
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(gulp.dest(path.build.css));
};


function js_build() {
    return gulp.src(path.src.js, { sourcemaps: true })
        .pipe(gulp.dest(path.build.js));
};

function images_build() {
    return gulp.src(path.src.img)
        .pipe(gulp.dest(path.build.img))
        ;
};

function svg_build() {
    return gulp.src(path.src.svg)
        .pipe(rigger())
        .pipe(gulp.dest(path.build.img));
};

function fonts_build() {
    return gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
        ;
};

function favicon_build() {
    return gulp.src(path.src.favicon)
        .pipe(gulp.dest(path.build.favicon));
};

// **************************************
// *
// *           Service Tasks
// *
// **************************************

function open_browser() {
    opn('http://' + server.host + ':' + server.port + '/');
};

function run_webserver() {
    connect.server({
        host: server.host,
        port: server.port,
        root: path.build.html,
        livereload: true
    });
};

function delete_html() {
    return del(path.build.htmlFiles);
};

function merge_json() {
    return gulp.src(path.watch.data)
        .pipe(mergeJSON({ fileName: 'data.json' }))
        .pipe(gulp.dest('cached/'));
};

function prepair_html() {
    return gulp.src(path.src.html)
        .pipe(plumber({ errorHandler: notify.onError("HTML build error: <%= error.message %>") }))
        .pipe(data(function () {
            return requireUncached(path.src.data);
        }))
        .pipe(njkRender({
            path: path.src.templates
        }))
        .pipe(prettify({
            indent_size: 2
        }))
        .pipe(rigger())
        .pipe(inlinesource({ compress: false }))
        .pipe(gulp.dest(path.build.html));
};

function update_html() {
    return gulp.src('./src/**/*.*')
        .pipe(connect.reload());
};


function sprite_build() {
    var spriteData = gulp.src(path.src.icons).pipe(spritesmith({
        imgName: 'sprite.png',
        imgPath: '../images/sprite.png',
        cssName: '../less/sprite.less',
        padding: 5,
        retinaImgName: '../images/sprite@2x.png',
        retinaSrcFilter: path.src.retinaIcons
    }));
    return spriteData.pipe(gulp.dest(path.build.icons));
};

function clean_build() {
    return del(path.build.html);
};

// Default node.js require function caching data. This de-caching function for Data files
function requireUncached($module) {
    delete require.cache[require.resolve($module)];
    return require($module);
}

var html_build = gulp.series(merge_json, delete_html, prepair_html, update_html);
var open = gulp.series(clean_build, sprite_build, html_build, js_build, style_build, fonts_build, images_build, favicon_build, gulp.parallel(run_webserver, open_browser, watch));

exports.default = open;

exports.clean = clean_build;