collapsible = function(options) {

	options || (options = {});
	options.container = (options.container || "body");
	options.expandAll = (options.expandAll || ".collapsible-expand-all")
	options.collapseAll = (options.collapseAll || ".collapsible-collapse-all")

	$(document).ready(function() {

		$(options.container).delegate("li, li > *","click",function(e) {
			$(e.target).closest("li").toggleClass("collapsed");
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

		$(options.expandAll).on("click",function() { me.expandAll() })
		$(options.collapseAll).on("click",function() { me.collapseAll() })

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

}

