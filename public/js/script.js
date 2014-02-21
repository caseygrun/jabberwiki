$(document).ready(function() {
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