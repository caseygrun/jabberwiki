module.exports = (grunt) ->

	# Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		coffee:
			compile:
				files: [{
					expand: true,
					src: ["core/**/*.coffee","routes/**/*.coffee", "public/js/**/*.coffee"]
					ext: ".js"
				}]
	});

	# Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-coffee');

	# Default task(s).
	grunt.registerTask('default', ['coffee']);