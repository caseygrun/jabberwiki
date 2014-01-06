collapsible = function(options) {

	options || (options = {});
	options.container = (options.container || "body");

	$(document).ready(function() {

		$(options.container).delegate("li","click",function(e) {
			$(e.target).toggleClass("collapsed");
			e.stopPropagation();
		});

		$(options.container).delegate("li","mouseover",function (e) {
			$(this).addClass("hover");
			e.stopPropagation();
		})

		$(options.container).delegate("li","mouseout",function (e) {
			$(this).removeClass("hover");
			e.stopPropagation();
		});

		me.collapseAll();

	});

	var me = {
		collapseAll: function() {
			$(options.container).find("li").addClass("collapsed")
		},
		expandAll: function () {
			$(options.container).find("li").removeClass("collapsed")
		}
	};

	return me;

}({
	container: "#content"
});

