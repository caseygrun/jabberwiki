$ () ->
	ed = $('#editor').jwEditor()

(($) ->
	$.fn.jwEditor = (options) ->

		options = $.extend({}, options)

		contents = this.find('.jw-ed-contents')
		commit = this.find('.jw-ed-commit')
		toolbar = this.find('.jw-toolbar')

		toolbar.find('.btn').each () ->
			$this = $(this)
			cmd = $this.data('cmd')
			$this.on 'click', () ->
				ed.execCommand(cmd)
				false

		ed = CodeMirror.fromTextArea(contents.get(0),{
			mode: 'gfm',
			theme: 'default',
			indentUnit: 4,
			lineNumbers: true,
			extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"}
		})

		inlineAttach.attachToCodeMirror(ed, {
			uploadUrl: '/api/upload',
			uploadFieldName: 'upload',
			
		});

)(jQuery)