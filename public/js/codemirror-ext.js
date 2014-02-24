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

  CodeMirror.commands.markdownBold = function(cm) {
    if (cm.getOption("disableInput")) return CodeMirror.Pass;
    var ranges = cm.listSelections(), replacements = [];
    replacements = _.map(ranges,function (x) {
      return '**' + x + '**'
    })
    cm.replaceSelections(replacements, null, "+insert");
  };
});