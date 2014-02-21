$(document).ready(function() {
	$("#toc").tocify({ 
		theme: "bootstrap3",
		context: $('#content'),
		selectors: "h2,h3,h4,h5,h6",
		showAndHide: true,
		scrollTo: 60,
	}).data("toc-tocify");
	
	collapsible({
		container: "#content"
	});
})