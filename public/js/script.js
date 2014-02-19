$(document).ready(function() {
	$("#toc").tocify({ 
		theme: "bootstrap3",
		context: $('#content'),
		selectors: "h3,h4,h5,h6",
		showAndHide: true,
	}).data("toc-tocify");
});