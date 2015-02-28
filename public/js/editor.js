(function() {
  (function($) {
    return $.fn.jwEditor = function(options) {
      var actions, bbar, commit, contents, ed, preview, state, tbar;
      options = $.extend({
        contents: '.jw-ed-contents',
        commit: '.jw-ed-commit',
        tbar: '.jw-ed-tbar',
        bbar: '.jw-ed-bbar',
        linkDialog: '.jw-ed-linkdialog',
        imgDialog: '.jw-ed-imgdialog',
        preview: '.jw-ed-preview',
        page: '',
        path: ''
      }, options);
      contents = this.find(options.contents);
      commit = this.find(options.commit);
      tbar = this.find(options.tbar);
      bbar = this.find(options.bbar);
      preview = $(options.preview);
      state = {
        fullscreen: false
      };
      actions = {
        "showPreview": function() {
          return $.ajax('/api/preview', {
            data: {
              text: ed.getValue()
            },
            type: 'POST',
            success: function(data, status, xhr) {
              preview.html(data);
              return MathJax.Hub.Typeset();
            },
            failure: function(xhr, status, err) {
              preview.html("Error generating preview.");
              return console.log(err);
            }
          });
        },
        "showLinkDialog": function(btn) {
          return $(options.linkDialog).css({
            position: 'absolute',
            top: btn.offset().top + btn.outerHeight() + 10,
            left: btn.offset().left
          }).show().find('input').focus();
        },
        "showImageDialog": function() {},
        "fullscreen": function() {
          return ed.setOption('fullScreen', !ed.getOption("fullScreen"));
        }
      };
      tbar.find('.btn').each(function() {
        var $this, action, cmd;
        $this = $(this);
        cmd = $this.data('cmd');
        if (cmd) {
          $this.on('click', function() {
            ed.operation(function() {
              return ed.execCommand(cmd);
            });
            return false;
          });
        }
        action = $this.data('action');
        if (action && (action in actions)) {
          return $this.on('click', function() {
            actions[action]($this);
            return false;
          });
        }
      });
      bbar.find('.btn').each(function() {
        var $this, action;
        $this = $(this);
        action = $this.data('action');
        if (action && (action in actions)) {
          return $this.on('click', function() {
            actions[action]($this);
            return false;
          });
        }
      });
      ed = CodeMirror.fromTextArea(contents.get(0), {
        mode: 'pandoc',
        theme: 'default',
        indentWithTabs: true,
        indentUnit: 4,
        lineNumbers: true,
        autoCloseBrackets: "()[]{}''\"\"**$$^^~~",
        matchBrackets: true,
        foldGutter: {
          rangeFinder: CodeMirror.fold.markdown
        },
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        keymap: "sublime",
        extraKeys: {
          "Enter": "newlineAndIndentContinueMarkdownList",
          "Cmd-B": "markdownBold",
          "Cmd-I": "markdownItalic",
          "Cmd-Ctrl-Alt-F": function(cm) {
            return actions["fullscreen"]();
          }
        }
      });
      return inlineAttach.attachToCodeMirror(ed, {
        uploadUrl: '/api/upload',
        uploadFieldName: 'upload',
        urlText: "![]({filename})",
        extraParams: {
          'path': (options.path ? options.path + '/' : '') + 'images'
        }
      });
    };
  })(jQuery);

}).call(this);
