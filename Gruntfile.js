(function() {
  module.exports = function(grunt) {
    grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      coffee: {
        compile: {
          files: [
            {
              expand: true,
              src: ["*.coffee", "core/**/*.coffee", "routes/**/*.coffee", "public/js/**/*.coffee"],
              ext: ".js"
            }
          ]
        }
      }
    });
    grunt.loadNpmTasks('grunt-contrib-coffee');
    return grunt.registerTask('default', ['coffee']);
  };

}).call(this);
