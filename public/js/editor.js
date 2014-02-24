(function() {
  $(function() {
    var ed;
    return ed = $('#editor').jwEditor();
  });

  (function($) {
    return $.fn.jwEditor = function(options) {
      var commit, contents, ed, toolbar;
      options = $.extend({}, options);
      contents = this.find('.jw-ed-contents');
      commit = this.find('.jw-ed-commit');
      toolbar = this.find('.jw-toolbar');
      toolbar.find('.btn').each(function() {
        var $this, cmd;
        $this = $(this);
        cmd = $this.data('cmd');
        return $this.on('click', function() {
          ed.execCommand(cmd);
          return false;
        });
      });
      ed = CodeMirror.fromTextArea(contents.get(0), {
        mode: 'gfm',
        theme: 'default',
        indentUnit: 4,
        lineNumbers: true,
        extraKeys: {
          "Enter": "newlineAndIndentContinueMarkdownList"
        }
      });
      return inlineAttach.attachToCodeMirror(ed, {
        uploadUrl: '/api/upload',
        uploadFieldName: 'upload'
      });
    };
  })(jQuery);

}).call(this);
