# $ () ->
# 	ed = $('#editor').jwEditor()

(($) ->
	$.fn.jwEditor = (options) ->

		options = $.extend({
			
			# selectors
			contents: '.jw-ed-contents'
			commit: '.jw-ed-commit'
			tbar: '.jw-ed-tbar'
			bbar: '.jw-ed-bbar'
			linkDialog: '.jw-ed-linkdialog'
			imgDialog: '.jw-ed-imgdialog'
			preview: '.jw-ed-preview'

			page: ''
			path: ''
		}, options)

		# select elements
		contents = this.find(options.contents)
		commit = this.find(options.commit)
		tbar = this.find(options.tbar)
		bbar = this.find(options.bbar)
		preview = $(options.preview)

		# state
		state = {
			fullscreen: false
		}

		# functions
		actions = {
			"showPreview" : () ->
				$.ajax '/api/preview', {
					data: { text: ed.getValue() },
					type: 'POST',
					success: (data, status, xhr) ->
						preview.html(data)
					failure: (xhr, status, err) ->
						preview.html("Error generating preview.")
						console.log err
				}
			"showLinkDialog": (btn) ->
				$(options.linkDialog).css({
			        position: 'absolute',
			        top: btn.offset().top + btn.outerHeight() + 10,
			        left: btn.offset().left
			    }).show().find('input').focus();

			"showImageDialog": () ->


			"fullscreen": () ->
				ed.setOption('fullScreen',!ed.getOption("fullScreen"))
		}

		# bind toolbar buttons
		tbar.find('.btn').each () ->
			$this = $(this)
			cmd = $this.data('cmd')
			if cmd
				$this.on 'click', () ->
					ed.operation () -> 
						ed.execCommand(cmd)
					false

			action = $this.data('action')
			if action and (action of actions)
				$this.on 'click', () ->
					actions[action]($this)
					false


		# bind bbar buttons
		bbar.find('.btn').each () ->
			$this = $(this)
			action = $this.data('action')
			if action and (action of actions)
				$this.on 'click', () ->
					actions[action]($this)
					false

		# initialize editor
		ed = CodeMirror.fromTextArea(contents.get(0),{
			mode: 'pandoc',
			theme: 'default',
			indentWithTabs: true,
			indentUnit: 4,
			lineNumbers: true,

			# brackets
			autoCloseBrackets: "()[]{}''\"\"**$$^^~~",
			matchBrackets: true,

			# folding
			foldGutter: {
				rangeFinder: CodeMirror.fold.markdown 
			},
			gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
			

			# keymap
			keymap: "sublime",
			extraKeys: {
				"Enter": "newlineAndIndentContinueMarkdownList", 
				"Cmd-B":"markdownBold",
				"Cmd-I":"markdownItalic",
				# "Esc": (cm) -> actions["fullscreen"]()
				"Cmd-Ctrl-Alt-F": (cm) -> actions["fullscreen"]()
				# "Tab": "indentContinueMarkdownList", 
				# "Shift-Tab": "outdentContinueMarkdownList"
			}
		})

		inlineAttach.attachToCodeMirror(ed, {
			uploadUrl: '/api/upload',
			uploadFieldName: 'upload',
			urlText: "![]({filename})",
			extraParams: {
				'path': (if options.path then options.path+'/' else '') + 'images'
			}
		});

)(jQuery)