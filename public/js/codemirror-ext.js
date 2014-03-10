(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
		mod(require("../../lib/codemirror"));
	else if (typeof define == "function" && define.amd) // AMD
		define(["../../lib/codemirror"], mod);
	else // Plain browser env
		mod(CodeMirror);
})(function(CodeMirror) {
	"use strict";

	var listRE = /^(\s*)([*+-]|(\d+)\.)(\s*)/,
			unorderedBullets = "*+-";

	function applyOuter(left, right) {
		return function(cm) {
			if (cm.getOption("disableInput")) return CodeMirror.Pass;
			var ranges = cm.getSelections(), replacements = [];
			replacements = _.map(ranges,function (x) {
				return left + x + right
			})
			cm.replaceSelections(replacements, null, "+insert");
		};
	}

	CodeMirror.commands.markdownBold = applyOuter("**","**")
	CodeMirror.commands.markdownItalic = applyOuter("_","_")


	function beginMarkdownList(char) {
		return function(cm) {
			if (cm.getOption("disableInput")) return CodeMirror.Pass;
			var ranges = cm.listSelections(), replacements = [];
			for (var i = 0; i < ranges.length; i++) {
				var pos = ranges[i].head, match;
				var inList = cm.getStateAfter(pos.line).list !== false;

				if (!ranges[i].empty() || !inList || !(match = cm.getLine(pos.line).match(listRE))) {
					
					return
				}
			}

		}
	}

	CodeMirror.commands.indentContinueMarkdownList = function(cm) {
		if (cm.getOption("disableInput")) return CodeMirror.Pass;
		var ranges = cm.listSelections(), replacements = [];
		for (var i = 0; i < ranges.length; i++) {
			var pos = ranges[i].head, match;
			var inList = cm.getStateAfter(pos.line).list !== false;

			if (!ranges[i].empty() || !inList || !(match = cm.getLine(pos.line).match(listRE))) {
				// cm.indentLine(pos.line, "smart")
				cm.execCommand('defaultTab')
				return
			}
			cm.indentLine(pos.line,"add")
		}
	};	
	CodeMirror.commands.outdentContinueMarkdownList = function(cm) {
		if (cm.getOption("disableInput")) return CodeMirror.Pass;
		var ranges = cm.listSelections(), replacements = [];
		for (var i = 0; i < ranges.length; i++) {
			var pos = ranges[i].head, match;
			var inList = cm.getStateAfter(pos.line).list !== false;

			if (!ranges[i].empty() || !inList || !(match = cm.getLine(pos.line).match(listRE))) {
				cm.indentLine(pos.line, "smart")
				return
			}
			cm.indentLine(pos.line,"subtract")
		}
	};	

	CodeMirror.fold.markdown = function(cm, start) {
	  var maxDepth = 100;

	  function isHeader(lineNo) {
	    var tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0));
	    return tokentype && /\bheader\b/.test(tokentype);
	  }

	  function headerLevel(lineNo, line, nextLine) {
	    var match = line && line.match(/^#+/);
	    if (match && isHeader(lineNo)) return match[0].length;
	    match = nextLine && nextLine.match(/^[=\-]+\s*$/);
	    if (match && isHeader(lineNo + 1)) return nextLine[0] == "=" ? 1 : 2;
	    return maxDepth;
	  }

	  var firstLine = cm.getLine(start.line), nextLine = cm.getLine(start.line + 1);
	  var level = headerLevel(start.line, firstLine, nextLine);
	  if (level === maxDepth) return undefined;

	  var lastLineNo = cm.lastLine();
	  var end = start.line, nextNextLine = cm.getLine(end + 2);
	  while (end < lastLineNo) {
	    if (headerLevel(end + 1, nextLine, nextNextLine) <= level) break;
	    ++end;
	    nextLine = nextNextLine;
	    nextNextLine = cm.getLine(end + 2);
	  }

	  return {
	    from: CodeMirror.Pos(start.line, firstLine.length),
	    to: CodeMirror.Pos(end, cm.getLine(end).length)
	  };
	};

	CodeMirror.defineMode("pandoc", function(config) {
		return CodeMirror.getMode(config,"markdown")
		// return CodeMirror.multiplexingMode(
		// 	CodeMirror.getMode(config, "gfm"),
		// 	{
		// 		open: "$$", close: "$$",
		// 	 	mode: CodeMirror.getMode(config, "stex"),
		// 	 	delimStyle: "delimit"
		// 	},
		// 	{
		// 		open: "$", close: "$",
		// 	 	mode: CodeMirror.getMode(config, "stex"),
		// 	 	delimStyle: "delimit"
		// 	}
		// 	// .. more multiplexed styles can follow here
		// );
	});
	
});