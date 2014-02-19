$(document).ready(function() {
	$("#toc").tocify({ 
		theme: "bootstrap3",
		context: $('#content'),
		selectors: "h3,h4,h5,h6",
		showAndHide: true,
	}).data("toc-tocify");


	pages = new Bloodhound({
		datumTokenizer: function(d) { 
			return [d]; 
		},
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		limit: 10,
		prefetch: {
			url: '/api/all',
			ttl: 0,
			filter: function (pages) {
				return _.map(pages, function (d) {
					return d.path.substr(1)
				})
			}
		},
	});
	 
	pages.initialize();
	 
	// $('#search').typeahead(null, {
	// 	name: 'pages',
	// 	displayKey: 'path',
	// 	source: pages.ttAdapter()
	// });
	// 
	$("#search").typeahead({
		items: 4,
		source: pages.ttAdapter()
	})

});