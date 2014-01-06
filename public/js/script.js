$(document).ready(function() {
	$("#toc").tocify({ 
		context: $('#content'),
		selectors: "h3,h4,h5,h6",
		showAndHide: false,
	}).data("toc-tocify");
});